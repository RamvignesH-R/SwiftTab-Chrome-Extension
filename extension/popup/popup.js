
window.escapeHTML = function(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

document.addEventListener('DOMContentLoaded', () => {
  // --- Theme Management ---
  const themeToggle = document.getElementById('theme-toggle');
  
  const contrastIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0 0 20z" fill="currentColor"></path></svg>`;

  chrome.storage.local.get(['theme'], (res) => {
    if (res.theme === 'light') {
      document.body.classList.add('light-theme');
    }
    if (themeToggle) themeToggle.innerHTML = contrastIcon;
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
    });
  }

  // --- Toast Notifications ---
  window.showToast = function(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '20px';
    toast.style.color = 'white';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = 'bold';
    toast.style.background = type === 'error' ? 'var(--danger-color)' : 'var(--accent-color)';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.transform = 'translateY(20px)';
    container.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // --- Global UX Throttling ---
  let lastClickTime = 0;
  document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.app-tile')) {
      const now = Date.now();
      if (now - lastClickTime < 300) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      lastClickTime = now;
    }
  }, true);

  // --- Support Buttons ---
  const supportLink = 'https://docs.google.com/forms/d/e/1FAIpQLSeZRubqmDq0hSWheOTx4hEDIoSh_eyblSjrCJi42BHMMiuYhA/viewform?usp=dialog';
  
  const btnSupportCenter = document.getElementById('btn-support-center');
  const supportDropdown = document.getElementById('support-dropdown');
  
  if (btnSupportCenter && supportDropdown) {
    btnSupportCenter.addEventListener('click', (e) => {
      e.stopPropagation();
      supportDropdown.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
      if (!supportDropdown.contains(e.target) && !btnSupportCenter.contains(e.target)) {
        supportDropdown.classList.remove('visible');
      }
    });

    document.querySelectorAll('#support-dropdown .sd-item').forEach(item => {
      item.addEventListener('click', () => {
        supportDropdown.classList.remove('visible');
        const type = item.getAttribute('data-type');
        let msg = "Thank you for reaching out!";
        if(type === 'bug') msg = "Thank you for reporting this issue. We will investigate it.";
        if(type === 'feedback') msg = "Your feedback is highly appreciated!";
        if(type === 'donate') msg = "Thank you so much for supporting our work!";
        
        window.showToast(msg);
        setTimeout(() => chrome.tabs.create({ url: supportLink, active: true }), 1000);
      });
    });
  }

  // --- Tab Navigation & Keyboard Shortcuts ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  function switchTab(tabId) {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanels.forEach(panel => panel.classList.remove('active'));
    const btn = document.querySelector(`[data-tab="${tabId}"]`);
    const panel = document.getElementById(tabId);
    if(btn && panel) { btn.classList.add('active'); panel.classList.add('active'); }
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (e.key === '1') { e.preventDefault(); switchTab('bookmarks'); }
      if (e.key === '2') { e.preventDefault(); switchTab('schedule'); }
      if (e.key === '3') { e.preventDefault(); switchTab('clipboard'); }
      if (e.key === '4') { e.preventDefault(); switchTab('calculator'); }
    }
  });

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });
});
