document.addEventListener('DOMContentLoaded', () => {
  const clipboardInput = document.getElementById('clipboard-input');
  const btnSave = document.getElementById('btn-save-clipboard');
  const itemsContainer = document.getElementById('clipboard-items');

  function loadClipboard() {
    chrome.storage.local.get(['clipboardData'], (res) => {
      const data = res.clipboardData || [];
      renderClipboard(data);
    });
  }

  const btnClipHelp = document.getElementById('btn-clip-help');
  if (btnClipHelp) {
    btnClipHelp.addEventListener('click', () => {
      alert("📋 HOW TO USE THE CLIPBOARD:\n\n• TEXT: Highlight & press `Ctrl+C` on any webpage.\n\n• SECURE PAGES: On Chrome Settings/Web Store, use Right-Click -> \"Save Text to SwiftTab\".\n\n• IMAGES: Right-click an image on any website -> \"Save Image to SwiftTab\".\n\n⚠️ NOTE: Screenshots taken using OS tools (PrintScreen/Snipping Tool) cannot be captured!. But can be added manually into the extension.");
    });
  }

  function renderClipboard(data) {
    itemsContainer.innerHTML = '';
    if (data.length === 0) {
      itemsContainer.innerHTML = '<p class="placeholder-text" style="margin-top:10px;">Clipboard is empty for this session.</p>';
      return;
    }

    data.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'clip-item';
      const content = document.createElement('div');
      if (item.type === 'image') {
        const img = document.createElement('img');
        img.src = item.data;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '150px';
        img.style.borderRadius = '4px';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
           const w = window.open("");
           w.document.write(`<img src="${item.data}" style="max-width:100%;">`);
        });
        content.appendChild(img);
      } else {
        const text = document.createElement('div');
        text.className = 'clip-text';
        text.textContent = item.data;
        content.appendChild(text);
      }
      
      const actions = document.createElement('div');
      actions.className = 'clip-actions';
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'action-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', () => {
        if (item.type === 'image') {
          fetch(item.data)
            .then(res => res.blob())
            .then(blob => {
               try {
                 navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
                 window.showToast("Image copied!");
               } catch(e) {
                 window.showToast("Browser block: Use right-click on image.");
               }
            });
        } else {
          navigator.clipboard.writeText(item.data);
          window.showToast("Copied to clipboard!");
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 1000);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'action-btn danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteItem(index));

      actions.appendChild(copyBtn);
      actions.appendChild(delBtn);
      
      div.appendChild(content);
      div.appendChild(actions);
      itemsContainer.appendChild(div);
    });
  }

  clipboardInput.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let index in items) {
      const item = items[index];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = function(event) {
          const base64Data = event.target.result;
          saveClip({ type: 'image', data: base64Data, id: Date.now().toString() });
        };
        reader.readAsDataURL(blob);
        e.preventDefault(); 
        break;
      }
    }
  });

  btnSave.addEventListener('click', () => {
    const text = clipboardInput.value.trim();
    if (!text) return;
    saveClip({ type: 'text', data: text, id: Date.now().toString() });
  });

  function saveClip(clipObj) {
    chrome.storage.local.get(['clipboardData'], (res) => {
      const items = res.clipboardData || [];
      items.unshift(clipObj);
      if (items.length > 50) items.pop();
      chrome.storage.local.set({ clipboardData: items }, () => {
        if (chrome.runtime.lastError) {
          if (window.showToast) window.showToast("Error: Image too large! Please snip a smaller area.");
          return;
        }
        clipboardInput.value = '';
        loadClipboard();
        if (window.showToast) window.showToast("Saved to clipboard!");
      });
    });
  }

  function deleteItem(index) {
    chrome.storage.local.get(['clipboardData'], (res) => {
      const data = res.clipboardData || [];
      data.splice(index, 1);
      chrome.storage.local.set({ clipboardData: data }, () => {
        loadClipboard();
      });
    });
  }

  const btnClearClipboard = document.getElementById('btn-clear-clipboard');
  if (btnClearClipboard) {
    btnClearClipboard.addEventListener('click', () => {
      if (confirm("Are you sure you want to clear all clipboard items? This cannot be undone.")) {
        chrome.storage.local.set({ clipboardData: [] }, () => {
          loadClipboard();
          window.showToast("Clipboard cleared!");
        });
      }
    });
  }

  loadClipboard();
});
