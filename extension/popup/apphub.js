// apphub.js

const DEFAULT_APPS = {
  'general-ai': [
    { id: 'app_gpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://chat.openai.com/favicon.ico' },
    { id: 'app_gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'https://www.gstatic.com/lamda/images/favicon_v1_150160cddff7f294ce30.svg' },
    { id: 'app_grok', name: 'Grok', url: 'https://grok.com/?referrer=grok', icon: 'https://www.google.com/s2/favicons?domain=grok.com&sz=32' },
    { id: 'app_claude', name: 'Claude', url: 'https://claude.ai', icon: 'https://claude.ai/favicon.ico' }
  ],
  'ppt-ai': [
    { id: 'app_gamma', name: 'Gamma AI', url: 'https://gamma.app', icon: 'https://gamma.app/favicon.ico' },
    { id: 'app_canva', name: 'Canva', url: 'https://www.canva.com', icon: 'https://www.canva.com/favicon.ico' },
    { id: 'app_manus', name: 'Manus AI', url: 'https://manus.ai', icon: 'https://manus.ai/favicon.ico' }
  ],
  'google-suite': [
    { id: 'app_docs', name: 'Google Docs', url: 'https://docs.google.com', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
    { id: 'app_sheets', name: 'Google Sheets', url: 'https://docs.google.com/spreadsheets', icon: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico' },
    { id: 'app_slides', name: 'Google Slides', url: 'https://docs.google.com/presentation', icon: 'https://ssl.gstatic.com/docs/presentations/favicon3.ico' },
    { id: 'app_colab', name: 'Google Colab', url: 'https://colab.research.google.com', icon: 'https://colab.research.google.com/favicon.ico' },
    { id: 'app_gmail', name: 'Gmail', url: 'https://mail.google.com', icon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico' },
    { id: 'app_drive', name: 'Google Drive', url: 'https://drive.google.com', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' }
  ],
  'image-tools': [
    { id: 'app_img_enhance', name: 'Cutout Pro', url: 'https://www.cutout.pro/photo-enhancer-sharpener-upscaler', icon: 'https://www.cutout.pro/favicon.ico' },
    { id: 'app_letsenhance', name: 'LetsEnhance', url: 'https://letsenhance.io/', icon: 'https://letsenhance.io/favicon.ico' }
  ],
  'webcam-tools': [
    { id: 'app_webcamtest', name: 'Webcam Test', url: 'https://webcamtests.com/', icon: 'https://webcamtests.com/favicon.ico' },
    { id: 'app_mic_test', name: 'Mic Test', url: 'https://mictests.com/', icon: 'https://mictests.com/favicon.ico' }
  ],
  'converters': [
    { id: 'app_png2jpg', name: 'PNG to JPG', url: 'https://png2jpg.com/', icon: 'https://png2jpg.com/favicon.ico' },
    { id: 'app_pdf2word', name: 'PDF to Word', url: 'https://www.ilovepdf.com/pdf_to_word', icon: 'https://www.ilovepdf.com/img/favicons/favicon-32x32.png' },
    { id: 'app_word2ppt', name: 'Word to PPT', url: 'https://www.adobe.com/acrobat/online/word-to-pdf.html', icon: 'https://www.adobe.com/favicon.ico' }
  ]
};

const DEFAULT_CATEGORIES = [
  { id: 'general-ai', title: 'General AI' },
  { id: 'ppt-ai', title: 'Presentation AI' },
  { id: 'google-suite', title: 'Google Suite' },
  { id: 'image-tools', title: 'Image Tools' },
  { id: 'webcam-tools', title: 'Webcam Tools' },
  { id: 'converters', title: 'Converters' }
];

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-hub-dynamic-container');
  const btnCreateCategory = document.getElementById('btn-create-category');

  // Top-right App Hub native tool icons
  const btnApphubSettings = document.getElementById('btn-apphub-settings');
  const apphubSettingsDropdown = document.getElementById('apphub-settings-dropdown');
  
  if (btnApphubSettings && apphubSettingsDropdown) {
    btnApphubSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      apphubSettingsDropdown.classList.toggle('visible');
    });
    
    document.addEventListener('click', () => {
      apphubSettingsDropdown.classList.remove('visible');
    });
  }

  const btnApphubCalc = document.getElementById('btn-apphub-calc');
  if (btnApphubCalc) {
    btnApphubCalc.addEventListener('click', () => {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('calculator').classList.add('active');
    });
  }

  const btnApphubCleaner = document.getElementById('btn-apphub-cleaner');
  if (btnApphubCleaner) {
    btnApphubCleaner.addEventListener('click', () => {
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      const cleanerPanel = document.getElementById('cleaner-panel');
      if (cleanerPanel) {
        cleanerPanel.classList.add('active');
        // Do not force inline display:flex so it can be correctly hidden by tab routers!
      }
      
      const innerDiv = document.getElementById('view-tab-cleaner-inner');
      if (innerDiv) innerDiv.style.display = 'flex';
      
      if (window.runAnalyzeTabs) window.runAnalyzeTabs();
    });
  }

  function renderAppHub() {
    chrome.storage.local.get(['customApps', 'customCategories'], (res) => {
      const customApps = res.customApps || [];
      const customCategories = res.customCategories || [];

      if (!container) return;
      container.innerHTML = '';

      const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

      allCategories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'app-hub-category';
        
        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';

        const h3 = document.createElement('h3');
        h3.textContent = cat.title;
        headerDiv.appendChild(h3);

        const isDefaultCat = DEFAULT_CATEGORIES.some(d => d.id === cat.id);
        if (!isDefaultCat) {
          const delCatBtn = document.createElement('button');
          delCatBtn.className = 'action-btn danger';
          delCatBtn.style.padding = '2px 6px';
          delCatBtn.style.fontSize = '10px';
          delCatBtn.textContent = 'Delete Category';
          delCatBtn.addEventListener('click', () => deleteCategory(cat.id));
          headerDiv.appendChild(delCatBtn);
        }

        catDiv.appendChild(headerDiv);

        const grid = document.createElement('div');
        grid.className = 'app-hub-grid';

        // Add default apps if this is a default category
        if (DEFAULT_APPS[cat.id]) {
          DEFAULT_APPS[cat.id].forEach(app => {
            grid.appendChild(createTile(app, false));
          });
        }

        // Add custom apps for this category
        const appsInCat = customApps.filter(a => a.categoryId === cat.id || (!a.categoryId && cat.id === 'general-ai'));
        appsInCat.forEach(app => {
          grid.appendChild(createTile(app, true));
        });

        // Add the "+" tile
        const addTile = document.createElement('a');
        addTile.className = 'app-tile add-tile-btn';
        addTile.href = '#';
        addTile.innerHTML = `
          <div style="width:32px; height:32px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:var(--accent-color); color:white; margin-bottom:8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <span>Add Custom</span>
        `;
        addTile.addEventListener('click', (e) => {
           e.preventDefault();
           handleAddCustomApp(cat.id);
        });
        grid.appendChild(addTile);

        catDiv.appendChild(grid);
        container.appendChild(catDiv);
      });
    });
  }

  function createTile(app, isCustom) {
    const a = document.createElement('a');
    a.className = 'app-tile';
    a.href = '#';
    
    // Handle clicks
    a.addEventListener('click', (e) => {
       e.preventDefault();
       chrome.tabs.create({ url: app.url, active: false });
    });

    // Handle generic fallback for missing favicons via Google's generic S2 API
    let fallbackIcon = '';
    try {
      fallbackIcon = `https://s2.googleusercontent.com/s2/favicons?domain=${new URL(app.url).hostname}&sz=32`;
    } catch(e) {
      fallbackIcon = 'icon.png';
    }
    
    a.innerHTML = `
      <img alt="${window.escapeHTML(app.name)}">
      <span>${window.escapeHTML(app.name)}</span>
    `;
    
    const img = a.querySelector('img');
    img.src = app.icon || fallbackIcon;
    img.addEventListener('error', () => {
      img.src = fallbackIcon;
    });

    if (isCustom) {
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '×';
      delBtn.title = 'Remove';
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteCustomApp(app.id);
      });
      a.appendChild(delBtn);
    }
    return a;
  }

  function deleteCustomApp(id) {
    chrome.storage.local.get(['customApps'], (res) => {
      let apps = res.customApps || [];
      apps = apps.filter(a => a.id !== id);
      chrome.storage.local.set({ customApps: apps }, renderAppHub);
    });
  }

  function deleteCategory(categoryId) {
    if (!confirm("Delete this category and all its custom apps?")) return;
    chrome.storage.local.get(['customCategories', 'customApps'], (res) => {
      let cats = res.customCategories || [];
      let apps = res.customApps || [];
      
      cats = cats.filter(c => c.id !== categoryId);
      apps = apps.filter(a => a.categoryId !== categoryId);
      
      chrome.storage.local.set({ customCategories: cats, customApps: apps }, renderAppHub);
    });
  }

  function handleAddCustomApp(categoryId) {
    const name = prompt("Enter the App Name:");
    if (!name) return;
    let url = prompt("Enter the App URL (e.g. https://example.com):");
    if (!url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    
    const newApp = {
      id: 'custom_' + Date.now(),
      categoryId: categoryId,
      name: name.trim(),
      url: url.trim(),
      icon: ''
    };

    chrome.storage.local.get(['customApps'], (res) => {
      const apps = res.customApps || [];
      apps.push(newApp);
      chrome.storage.local.set({ customApps: apps }, renderAppHub);
    });
  }

  if (btnCreateCategory) {
    btnCreateCategory.addEventListener('click', () => {
      const title = prompt("Enter new category name:");
      if (!title || !title.trim()) return;
      const newCat = {
        id: 'cat_' + Date.now(),
        title: title.trim()
      };
      chrome.storage.local.get(['customCategories'], (res) => {
        const cats = res.customCategories || [];
        cats.push(newCat);
        chrome.storage.local.set({ customCategories: cats }, renderAppHub);
      });
    });
  }

  // Initial render
  renderAppHub();
});
