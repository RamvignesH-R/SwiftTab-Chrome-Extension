document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('schedule-form');
  const taskName = document.getElementById('task-name');
  const taskUrl = document.getElementById('task-url');
  const taskTime = document.getElementById('task-time');
  const taskTimer = document.getElementById('task-timer');
  const taskList = document.getElementById('active-tasks-list');
  const pastTaskList = document.getElementById('past-tasks-list');
  const btnClearHistory = document.getElementById('clear-history-btn');

  // Settings UI
  const btnSettings = document.getElementById('schedule-settings-btn');
  const settingsPage = document.getElementById('schedule-settings-page');
  const btnCloseSettings = document.getElementById('close-settings-btn');
  const soundSelect = document.getElementById('sound-select');
  const soundUpload = document.getElementById('sound-upload');
  const btnAddSound = document.getElementById('btn-add-sound');
  const btnDeleteSound = document.getElementById('btn-delete-sound');

  function loadSettings() {
    chrome.storage.local.get(['customSounds', 'activeSound'], (res) => {
      soundSelect.innerHTML = '<option value="default">Default Sound</option>';
      if (res.customSounds) {
        Object.keys(res.customSounds).forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          soundSelect.appendChild(opt);
        });
      }
      soundSelect.value = res.activeSound || 'default';
    });
  }

  if(btnSettings) {
    btnSettings.addEventListener('click', () => {
      settingsPage.style.display = 'flex';
      loadSettings();
    });
  }
  
  if(btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      settingsPage.style.display = 'none';
    });
  }

  if(soundSelect) soundSelect.addEventListener('change', (e) => chrome.storage.local.set({ activeSound: e.target.value }));
  if(btnAddSound) btnAddSound.addEventListener('click', () => soundUpload.click());

  if(soundUpload) {
    soundUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Security/Stability Fix: Prevent storage corruption by limiting file size to 1.5MB
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Audio file too large! Please select a file smaller than 1.5MB to prevent Chrome storage crashes.");
        soundUpload.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        chrome.storage.local.get(['customSounds'], (res) => {
          const sounds = res.customSounds || {};
          sounds[file.name] = ev.target.result;
          chrome.storage.local.set({ customSounds: sounds, activeSound: file.name }, () => {
            soundUpload.value = '';
            loadSettings();
          });
        });
      };
      reader.readAsDataURL(file);
    });
  }

  if(btnDeleteSound) {
    btnDeleteSound.addEventListener('click', () => {
      const active = soundSelect.value;
      if (active === 'default') {
        alert("Cannot delete the default sound.");
        return;
      }
      chrome.storage.local.get(['customSounds'], (res) => {
        const sounds = res.customSounds || {};
        delete sounds[active];
        chrome.storage.local.set({ customSounds: sounds, activeSound: 'default' }, loadSettings);
      });
    });
  }

  function loadTasks() {
    chrome.storage.local.get(['scheduledTasks', 'completedTasks'], (res) => {
      let pastTasks = res.completedTasks || [];
      
      // Strict Deduplication based on Name + URL
      const uniquePast = [];
      const seen = new Set();
      // Iterate from the end to keep the most recent completion
      for (let i = pastTasks.length - 1; i >= 0; i--) {
        const t = pastTasks[i];
        const key = t.name + '|' + t.url;
        if (!seen.has(key)) {
          seen.add(key);
          uniquePast.unshift(t);
        }
      }
      
      // Save cleaned array back to storage if duplicates were found
      if (uniquePast.length !== pastTasks.length) {
        chrome.storage.local.set({ completedTasks: uniquePast });
        pastTasks = uniquePast;
      }

      renderTasks(res.scheduledTasks || [], pastTasks);
    });
  }

  function renderTasks(activeTasks, pastTasks) {
    taskList.innerHTML = '';
    if (activeTasks.length === 0) {
      taskList.innerHTML = '<p class="placeholder-text" style="margin-top:10px;">No active tasks.</p>';
    } else {
      activeTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        
        const details = document.createElement('div');
        details.className = 'item-details';
        
        const title = document.createElement('div');
        title.className = 'item-title';
        
        const d = new Date(task.timestamp);
        let timeText = '';
        if (task.type === 'datetime') {
          const dStr = task.dateInput ? d.toLocaleDateString() + ' ' : '';
          timeText = `(${dStr}at ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
        } else if (task.type === 'timer') {
          timeText = `<span class="countdown" data-time="${task.timestamp}"></span>`;
        } else if (task.type === 'recurring') {
          timeText = `(Every ${task.recurrence === 1440 ? 'Day' : 'Week'} at ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
        } else {
          timeText = `(at ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`;
        }
        
        title.innerHTML = `<strong>${window.escapeHTML(task.name)}</strong> <span style="font-size:11px; color:var(--text-secondary);">${timeText}</span>`;
        
        const url = document.createElement('div');
        url.className = 'item-url';
        url.textContent = task.url;

        details.appendChild(title);
        details.appendChild(url);

        const actions = document.createElement('div');
        actions.className = 'item-actions';
        
        const btnEdit = document.createElement('button');
        btnEdit.className = 'icon-btn';
        btnEdit.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        btnEdit.title = 'Edit';
        btnEdit.style.marginRight = '5px';
        btnEdit.addEventListener('click', () => {
          chrome.alarms.clear(task.id);
          chrome.alarms.clear(task.id + '_warning');
          activeTasks.splice(index, 1);
          chrome.storage.local.set({ scheduledTasks: activeTasks });
          
          document.getElementById('task-name').value = task.name;
          document.getElementById('task-url').value = task.url;
          
          const tSel = document.getElementById('task-type');
          if(tSel) {
            tSel.value = task.type || 'timer';
            tSel.dispatchEvent(new Event('change'));
          }

          if (task.type === 'timer') {
             document.getElementById('task-timer').value = task.timerInput || '';
          } else if (task.type === 'datetime') {
             document.getElementById('task-date').value = task.dateInput || '';
             document.getElementById('task-time').value = task.timeInput || '';
          } else if (task.type === 'recurring') {
             document.getElementById('task-recurring-time').value = task.timeInput || '';
             document.getElementById('task-recurrence').value = task.recurrence ? task.recurrence : '1440';
          }
          
          loadTasks();
          window.showToast("Task loaded for editing.");
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger';
        delBtn.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        delBtn.title = 'Remove';
        delBtn.addEventListener('click', () => deleteTask(task.id, index));

        actions.appendChild(btnEdit);
        actions.appendChild(delBtn);
        li.appendChild(details);
        li.appendChild(actions);
        taskList.appendChild(li);
      });
    }

    if(pastTaskList) {
      pastTaskList.innerHTML = '';
      if (pastTasks.length === 0) {
        pastTaskList.innerHTML = '<p class="placeholder-text" style="margin-top:10px;">No past tasks.</p>';
      } else {
        pastTasks.forEach((task, index) => {
          const li = document.createElement('li');
          li.className = 'list-item';
          
          const details = document.createElement('div');
          details.className = 'item-details';
          
          const title = document.createElement('div');
          title.className = 'item-title';
          title.textContent = task.name;
          
          const url = document.createElement('div');
          url.className = 'item-url';
          url.textContent = task.url;

          details.appendChild(title);
          details.appendChild(url);

          const actions = document.createElement('div');
          actions.className = 'item-actions';
          
          const addBtn = document.createElement('button');
          addBtn.className = 'icon-btn';
          addBtn.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
          addBtn.title = 'Reuse Task';
          addBtn.addEventListener('click', () => {
            taskName.value = task.name;
            taskUrl.value = task.url;
            if (task.type) {
               const tSel = document.getElementById('task-type');
               if (tSel) {
                 tSel.value = task.type;
                 tSel.dispatchEvent(new Event('change'));
               }
            }
          });

          const delBtn = document.createElement('button');
          delBtn.className = 'icon-btn danger';
          delBtn.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
          delBtn.title = 'Remove';
          delBtn.addEventListener('click', () => deletePastTask(index));

          actions.appendChild(addBtn);
          actions.appendChild(delBtn);
          
          li.appendChild(details);
          li.appendChild(actions);
          pastTaskList.appendChild(li);
        });
      }
    }
  }

  // -- DYNAMIC SCHEDULE UI --
  const taskTypeSel = document.getElementById('task-type');
  const timerInputs = document.getElementById('schedule-timer-inputs');
  const dtInputs = document.getElementById('schedule-datetime-inputs');
  const recurInputs = document.getElementById('schedule-recurring-inputs');
  
  if (taskTypeSel) {
    taskTypeSel.addEventListener('change', () => {
       timerInputs.style.display = 'none';
       dtInputs.style.display = 'none';
       recurInputs.style.display = 'none';
       
       if (taskTypeSel.value === 'timer') timerInputs.style.display = 'flex';
       else if (taskTypeSel.value === 'datetime') dtInputs.style.display = 'flex';
       else if (taskTypeSel.value === 'recurring') recurInputs.style.display = 'flex';
    });
  }

  const syncGcal = document.getElementById('sync-gcal');
  if (syncGcal) {
    syncGcal.addEventListener('change', (e) => {
      if (e.target.checked) {
        alert("📅 GOOGLE CALENDAR SYNC GUIDE\n\nYou will be redirected to a new tab. Please note:\n\n1. The Start Time is the exact time your task will trigger.\n2. REMINDERS: Google automatically defaults your reminder to '30 minutes before'. If you want a 15-minute or 2-minute reminder, you must change it manually!\n3. Simply click 'Save' at the top to sync it to your phone and smartwatch!");
      }
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let triggerMs = 0;
    let recurVal = 'none';
    
    const tType = taskTypeSel ? taskTypeSel.value : 'timer';
    
    let savedDate = '';
    let savedTime = '';
    
    if (tType === 'timer') {
      if (!taskTimer.value) return alert("Please set a timer in minutes.");
      triggerMs = Date.now() + parseInt(taskTimer.value) * 60000;
    } else if (tType === 'datetime') {
      const tTime = document.getElementById('task-time');
      const tDate = document.getElementById('task-date');
      if (!tTime.value) return alert("Please set a specific time.");
      
      savedTime = tTime.value;
      savedDate = tDate ? tDate.value : '';
      
      const [hours, minutes] = tTime.value.split(':');
      let date = new Date();
      if (tDate && tDate.value) {
        const [y, m, d] = tDate.value.split('-');
        date.setFullYear(parseInt(y), parseInt(m) - 1, parseInt(d));
      }
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if ((!tDate || !tDate.value) && date.getTime() < Date.now()) {
        date.setDate(date.getDate() + 1);
      }
      triggerMs = date.getTime();
      if (triggerMs < Date.now()) return alert("The selected date/time is in the past! Please select a future time.");
      
    } else if (tType === 'recurring') {
      const rTime = document.getElementById('task-recurring-time');
      recurVal = document.getElementById('task-recurrence').value;
      if (!rTime.value) return alert("Please set a recurring time.");
      
      savedTime = rTime.value;
      
      const [hours, minutes] = rTime.value.split(':');
      let date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (date.getTime() < Date.now()) date.setDate(date.getDate() + 1);
      triggerMs = date.getTime();
    }
    
    const newTask = {
      id: Date.now().toString(),
      name: taskName.value,
      url: taskUrl.value,
      timestamp: triggerMs,
      recurrence: recurVal === 'none' ? null : parseInt(recurVal),
      type: tType,
      timerInput: taskTimer.value,
      dateInput: savedDate,
      timeInput: savedTime
    };

    chrome.storage.local.get(['scheduledTasks'], (res) => {
      const tasks = res.scheduledTasks || [];
      tasks.push(newTask);
      chrome.storage.local.set({ scheduledTasks: tasks }, () => {
        let warningTime = triggerMs - 10000;
        if (warningTime < Date.now()) warningTime = Date.now();
        chrome.alarms.create(newTask.id + '_warning', { when: warningTime });
        chrome.alarms.create(newTask.id, { when: triggerMs });
        
        const syncGcal = document.getElementById('sync-gcal');
        if (syncGcal && syncGcal.checked) {
          const gcalTitle = encodeURIComponent("SwiftTab Task: " + newTask.name);
          const gcalDetails = encodeURIComponent("SwiftTab scheduled URL:\\n" + newTask.url);
          const startDate = new Date(triggerMs).toISOString().replace(/-|:|\\.\\d\\d\\d/g,"");
          const endDate = new Date(triggerMs + 15 * 60000).toISOString().replace(/-|:|\\.\\d\\d\\d/g,"");
          const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&details=${gcalDetails}&dates=${startDate}/${endDate}`;
          chrome.tabs.create({ url: gcalUrl });
        }
        
        form.reset();
        if (taskTypeSel) taskTypeSel.dispatchEvent(new Event('change'));
        loadTasks();
      });
    });
  });

  function deleteTask(id, index) {
    chrome.storage.local.get(['scheduledTasks'], (res) => {
      const tasks = res.scheduledTasks || [];
      tasks.splice(index, 1);
      chrome.storage.local.set({ scheduledTasks: tasks }, () => {
        chrome.alarms.clear(id);
        chrome.alarms.clear(id + '_warning');
        loadTasks();
      });
    });
  }

  function deletePastTask(index) {
    chrome.storage.local.get(['completedTasks'], (res) => {
      let tasks = res.completedTasks || [];
      tasks.splice(index, 1);
      chrome.storage.local.set({ completedTasks: tasks }, loadTasks);
    });
  }

  if (btnClearHistory) {
     btnClearHistory.addEventListener('click', () => {
       chrome.storage.local.set({ completedTasks: [] }, loadTasks);
     });
  }

  loadTasks();

  // -- LIVE COUNTDOWN TICKER --
  setInterval(() => {
    document.querySelectorAll('.countdown').forEach(span => {
      const target = parseInt(span.getAttribute('data-time'));
      if (!target) return;
      const diff = target - Date.now();
      if (diff > 0) {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        span.textContent = `(in ${m}m ${s}s)`;
      } else {
        span.textContent = `(triggering...)`;
      }
    });
  }, 1000);
});
