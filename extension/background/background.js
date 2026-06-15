// background.js - Service Worker for SwiftTab

chrome.runtime.onStartup.addListener(() => {
  cleanSessionClipboard();
});

chrome.runtime.onSuspend.addListener(() => {
  cleanSessionClipboard();
});

function cleanSessionClipboard() {
  chrome.storage.local.get(['clipboardData'], (result) => {
    if (result.clipboardData) {
      chrome.storage.local.remove('clipboardData');
    }
  });
}

async function playSound() {
  chrome.storage.local.get(['activeSound', 'customSounds'], async (res) => {
    let soundData = { base64: 'default' };
    if (res.activeSound && res.activeSound !== 'default' && res.customSounds && res.customSounds[res.activeSound]) {
      soundData = { base64: res.customSounds[res.activeSound] };
    }
    await setupOffscreenDocument();
    chrome.runtime.sendMessage({ target: 'offscreen', action: 'play_audio', data: soundData });
  });
}

let creatingOffscreenPromise;

async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (existingContexts.length > 0) return;

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  creatingOffscreenPromise = chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Notification sound for scheduled tasks'
  });

  await creatingOffscreenPromise;
  creatingOffscreenPromise = null;
}

function restoreAlarms() {
  chrome.storage.local.get(['scheduledTasks'], (res) => {
    const tasks = res.scheduledTasks || [];
    tasks.forEach(task => {
      // ONLY recreate alarms if their absolute deadline hasn't passed yet.
      // If the deadline passed while Chrome was closed, we DO NOT recreate it.
      // Instead, we will let a new startup routine process missed tasks safely.
      if (task.timestamp > Date.now()) {
        let warningTime = task.timestamp - 10000;
        if (warningTime > Date.now()) {
          chrome.alarms.create(task.id + '_warning', { when: warningTime });
        }
        chrome.alarms.create(task.id, { when: task.timestamp });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  restoreAlarms();
  chrome.contextMenus.create({
    id: "swifttab_save_image",
    title: "Save Image to SwiftTab Clipboard",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "swifttab_save_image" && info.srcUrl) {
    try {
      const response = await fetch(info.srcUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = function() {
        saveImageToClipboard(reader.result);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      // Fallback: If CORS blocks the fetch, save the direct URL
      saveImageToClipboard(info.srcUrl);
    }
  }
});

function saveImageToClipboard(imageData) {
  chrome.storage.local.get(['clipboardData'], (res) => {
    const items = res.clipboardData || [];
    items.unshift({ type: 'image', data: imageData, id: Date.now().toString() });
    if (items.length > 50) items.pop();
    chrome.storage.local.set({ clipboardData: items });
  });
}

chrome.runtime.onStartup.addListener(() => {
  restoreAlarms();
  chrome.storage.local.get(['startupCollection', 'startupFrequency', 'lastStartupRun', 'startupDate'], (res) => {
    if (res.startupCollection) {
      const freq = res.startupFrequency || 'always';
      const now = new Date();
      const todayStr = now.toDateString();
      const dayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat

      if (freq.startsWith('weekdays') && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return; // Skip on weekends
      }
      
      if (freq === 'specific_date') {
        if (!res.startupDate || res.startupDate !== todayStr) return;
      }

      if (freq === 'daily' || freq === 'weekdays_once') {
        if (res.lastStartupRun === todayStr) {
          return; // Already ran today
        }
      }

      // Mark as run today
      chrome.storage.local.set({ lastStartupRun: todayStr });

      chrome.bookmarks.getChildren(res.startupCollection, (children) => {
        if (children) {
          children.forEach(child => {
            if (child.url) chrome.tabs.create({ url: child.url, active: false });
          });
        }
      });
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.endsWith('_warning')) {
    const taskId = alarm.name.replace('_warning', '');
    chrome.storage.local.get(['scheduledTasks'], (res) => {
      const tasks = res.scheduledTasks || [];
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        playSound();
        // If this warning alarm is firing more than 1 minute late, it's a missed task!
        const isMissed = Date.now() - (task.timestamp - 10000) > 60000;
        
        chrome.notifications.create(taskId + "_notif", {
          type: 'basic',
          iconUrl: 'icon.png',
          title: isMissed ? 'Missed Task: ' + task.name : 'Reminder: ' + task.name,
          message: isMissed ? 'This task was scheduled while you were away.' : (task.url ? 'Deadline is approaching! You will be redirected to the link shortly.' : 'Deadline is approaching!'),
          priority: 2,
          requireInteraction: true,
          silent: true
        });
      }
    });
  } else {
    chrome.storage.local.get(['scheduledTasks'], (res) => {
      const tasks = res.scheduledTasks || [];
      const taskIndex = tasks.findIndex(t => t.id === alarm.name);
      if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        
        // Prevent opening duplicate tabs if Chrome fired this natively multiple times
        if (task._hasOpenedTab) return;
        task._hasOpenedTab = true;
        
        chrome.tabs.create({ url: task.url });
        
        if (task.recurrence) {
          task.timestamp += task.recurrence * 60000;
          let warningTime = task.timestamp - 10000;
          if (warningTime < Date.now()) warningTime = Date.now() + 1000;
          chrome.alarms.create(task.id + '_warning', { when: warningTime });
          chrome.alarms.create(task.id, { when: task.timestamp });
          chrome.storage.local.set({ scheduledTasks: tasks });
        } else {
          tasks.splice(taskIndex, 1);
          chrome.storage.local.get(['completedTasks'], (cRes) => {
            const completed = cRes.completedTasks || [];
            completed.push(task);
            chrome.storage.local.set({ scheduledTasks: tasks, completedTasks: completed });
          });
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'auto_save_clipboard') {
    chrome.storage.local.get(['clipboardData'], (res) => {
      const clipboard = res.clipboardData || [];
      clipboard.unshift({ id: Date.now().toString(), type: 'text', data: request.text, timestamp: Date.now() });
      if (clipboard.length > 50) clipboard.pop();
      chrome.storage.local.set({ clipboardData: clipboard });
    });
  }
});
