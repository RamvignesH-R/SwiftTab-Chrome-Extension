document.addEventListener('DOMContentLoaded', () => {
  const btnTabCleaner = document.getElementById('btn-tab-cleaner');
  const btnBackFromCleaner = document.getElementById('btn-back-from-cleaner');
  const viewTabCleaner = document.getElementById('view-tab-cleaner-inner');
  
  // Existing views from bookmarks.js that need to be hidden when cleaner opens
  const viewAllBookmarks = document.getElementById('view-all-bookmarks');
  const viewGroups = document.getElementById('view-groups');
  const viewSingleGroup = document.getElementById('view-single-group');

  // btnTabCleaner moved to App Hub

  // Mascot Elements
  const mascotBody = document.getElementById('mascot-body');
  const mascotMouth = document.getElementById('mascot-mouth');
  const healthStatusText = document.getElementById('health-status-text');
  const healthScoreText = document.getElementById('health-score-text');
  const healthBarFill = document.getElementById('health-bar-fill');

  // Lists
  const listDuplicates = document.getElementById('duplicates-list');
  const listSaved = document.getElementById('saved-matches-list');
  const listInactive = document.getElementById('inactive-list');
  const listHeavy = document.getElementById('heavy-list');

  // Badges
  const badgeDuplicates = document.getElementById('badge-duplicates');
  const badgeSaved = document.getElementById('badge-saved');
  const badgeInactive = document.getElementById('badge-inactive');
  const badgeHeavy = document.getElementById('badge-heavy');

  // Accordion Logic
  document.querySelectorAll('.cleaner-cat-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const targetContent = document.getElementById(targetId);
      if (targetContent.style.display === 'none') {
        targetContent.style.display = 'flex';
        header.style.background = 'rgba(0,0,0,0.2)';
      } else {
        targetContent.style.display = 'none';
        header.style.background = 'rgba(0,0,0,0.1)';
      }
    });
  });

  // Navigation triggered from apphub.js 
  if (btnBackFromCleaner) {
    btnBackFromCleaner.addEventListener('click', () => {
      if (viewTabCleaner) viewTabCleaner.style.display = 'none';
      
      const cleanerPanel = document.getElementById('cleaner-panel');
      if (cleanerPanel) {
        cleanerPanel.classList.remove('active');
      }
      
      // Since we open Cleaner from App Hub, return to App Hub
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      const appHubTabPanel = document.getElementById('app-hub');
      if (appHubTabPanel) appHubTabPanel.classList.add('active');
      
      const appHubTabBtn = document.querySelector('.tab-btn[data-tab="app-hub"]');
      if (appHubTabBtn) appHubTabBtn.classList.add('active');
    });
  }
  
  window.runAnalyzeTabs = analyzeTabs;

  function getDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch(e) {
      return 'Other';
    }
  }

  function analyzeTabs() {
    chrome.tabs.query({}, (tabs) => {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        const groups = [];
        
        // Recursively extract all Bookmark Folders as "Groups"
        function extractFolders(nodes) {
          nodes.forEach(node => {
            if (node.children) {
              const bms = node.children.filter(c => c.url);
              if (bms.length > 0) {
                // If title is empty (e.g. root node), name it appropriately
                groups.push({ name: node.title || 'Bookmarks Root', bookmarks: bms });
              }
              extractFolders(node.children);
            }
          });
        }
        extractFolders(bookmarkTreeNodes);
        
        let domainMap = {};
        let heavyTabs = [];
        let inactiveTabs = [];
        let savedMatchesMap = {};
        let savedCount = 0;
        
        // Helper to normalize URLs (remove hashes and trailing slashes for accurate matching)
        function normalizeUrl(u) {
          try {
            const urlObj = new URL(u);
            urlObj.hash = ''; // Remove fragment (like #gid=0)
            urlObj.search = ''; // Remove query params (like ?usp=sharing)
            return urlObj.href.replace(/\/$/, ''); // Remove trailing slash
          } catch(e) {
            return u.replace(/\/$/, '').split('#')[0].split('?')[0];
          }
        }
        
        // 1. Group URLs in saved groups for fast lookup
        const urlToGroups = new Map();
        groups.forEach(g => {
          g.bookmarks.forEach(b => {
             const norm = normalizeUrl(b.url);
             if (!urlToGroups.has(norm)) urlToGroups.set(norm, []);
             urlToGroups.get(norm).push(g.name);
          });
        });

        // 2. known heavy domains
        const heavyDomains = ['youtube.com', 'figma.com', 'netflix.com', 'twitch.tv', 'maps.google.com', 'canva.com', 'docs.google.com'];

        const now = Date.now();
        const inactiveThreshold = 1000 * 60 * 60 * 2; // 2 hours

        // Iterate through open tabs
        tabs.forEach(tab => {
          if (!tab.url) return;

          // Track for duplicates by domain (Category)
          let domain = 'Other';
          try {
            if (tab.url.startsWith('chrome://newtab')) {
              domain = 'New Tab';
            } else if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
              domain = 'Chrome System Tabs';
            } else {
              let hostname = new URL(tab.url).hostname.replace(/^www\./, '');
              const parts = hostname.split('.');
              if (parts.length > 2) {
                const tld = parts[parts.length - 1];
                const sld = parts[parts.length - 2];
                if (['co', 'com', 'org', 'net', 'edu', 'gov'].includes(sld) && tld.length === 2) {
                  domain = parts.slice(-3).join('.');
                } else {
                  domain = parts.slice(-2).join('.');
                }
              } else {
                domain = hostname;
              }
            }
          } catch(e) {}
          
          if (!domainMap[domain]) domainMap[domain] = [];
          domainMap[domain].push(tab);
          
          // Check if saved
          const normTabUrl = normalizeUrl(tab.url);
          if (urlToGroups.has(normTabUrl)) {
             const groupNames = urlToGroups.get(normTabUrl);
             groupNames.forEach(gName => {
               if (!savedMatchesMap[gName]) savedMatchesMap[gName] = [];
               savedMatchesMap[gName].push(tab);
               savedCount++;
             });
          }
          
          // Check if Heavy
          if (heavyDomains.some(d => domain.includes(d)) || tab.audible) {
            heavyTabs.push(tab);
          }

          // Check if Inactive (Not active window tab & older than 2 hours)
          if (!tab.active && tab.lastAccessed && (now - tab.lastAccessed > inactiveThreshold)) {
            inactiveTabs.push(tab);
          }
        });

        // Process duplicates map (only keep domains that appear > 1 time)
        let actualDuplicates = {};
        let duplicateCount = 0;
        for (const [dom, tabsList] of Object.entries(domainMap)) {
          if (tabsList.length > 1) {
            actualDuplicates[dom] = tabsList;
            duplicateCount += tabsList.length;
          }
        }

        // Render Lists
        renderAccordionList(listDuplicates, badgeDuplicates, actualDuplicates, duplicateCount, 'Looking good! No duplicates.');
        renderAccordionList(listSaved, badgeSaved, savedMatchesMap, savedCount, 'Looking good! No tabs here.');
        renderSimpleList(listInactive, inactiveTabs, badgeInactive);
        renderSimpleList(listHeavy, heavyTabs, badgeHeavy);

        // Update Mascot Health
        updateHealth(tabs.length, duplicateCount, heavyTabs.length);
      });
    });
  }

  function createTabUI(tab) {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.background = 'rgba(255,255,255,0.05)';
    div.style.padding = '6px';
    div.style.borderRadius = '4px';
    div.style.gap = '8px';
    
    const fallbackIcon = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
    
    const img = document.createElement('img');
    img.src = tab.favIconUrl || fallbackIcon;
    img.onerror = function() {
      this.onerror = null;
      this.src = fallbackIcon;
    };
    img.style.width = '16px';
    img.style.height = '16px';
    
    const title = document.createElement('span');
    title.textContent = tab.title;
    title.style.fontSize = '11px';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.style.flex = '1';
    
    const btnClose = document.createElement('button');
    btnClose.textContent = 'Close';
    btnClose.className = 'action-btn danger';
    btnClose.style.padding = '2px 6px';
    btnClose.style.fontSize = '10px';
    
    btnClose.addEventListener('click', () => {
      chrome.tabs.remove(tab.id, () => {
        div.remove();
        // Trigger a re-analysis after closing a tab to update badges and health bar
        setTimeout(analyzeTabs, 200);
      });
    });

    div.appendChild(img);
    div.appendChild(title);
    div.appendChild(btnClose);
    return div;
  }

  function renderSimpleList(container, tabsArray, badgeElement) {
    container.innerHTML = '';
    badgeElement.textContent = `${tabsArray.length} Tabs`;
    if (tabsArray.length === 0) {
      container.innerHTML = '<span style="font-size:11px; color:var(--text-secondary);">Looking good! No tabs here.</span>';
      return;
    }
    
    // Add close all button
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'flex-end';
    
    const btnCloseAll = document.createElement('button');
    btnCloseAll.textContent = 'Close All';
    btnCloseAll.className = 'action-btn danger';
    btnCloseAll.style.padding = '2px 8px';
    btnCloseAll.style.fontSize = '10px';
    btnCloseAll.style.marginBottom = '5px';
    
    btnCloseAll.addEventListener('click', () => {
      const tabIds = tabsArray.map(t => t.id);
      chrome.tabs.remove(tabIds, () => {
        setTimeout(analyzeTabs, 200);
      });
    });
    
    headerRow.appendChild(btnCloseAll);
    container.appendChild(headerRow);

    tabsArray.forEach(tab => {
      container.appendChild(createTabUI(tab));
    });
  }

  const openAccordionFolders = new Set();

  function renderAccordionList(container, badgeElement, dataMap, count, emptyMessage) {
    container.innerHTML = '';
    badgeElement.textContent = `${count} Tabs`;
    
    if (Object.keys(dataMap).length === 0) {
      container.innerHTML = `<span style="font-size:11px; color:var(--text-secondary);">${emptyMessage}</span>`;
      return;
    }

    // Render folders
    for (const [folderName, tabs] of Object.entries(dataMap)) {
      const folder = document.createElement('div');
      folder.style.background = 'rgba(0,0,0,0.2)';
      folder.style.borderRadius = '4px';
      folder.style.marginBottom = '5px';
      folder.style.overflow = 'hidden';
      
      const folderHeader = document.createElement('div');
      folderHeader.style.display = 'flex';
      folderHeader.style.justifyContent = 'space-between';
      folderHeader.style.alignItems = 'center';
      folderHeader.style.padding = '8px';
      folderHeader.style.cursor = 'pointer';
      folderHeader.style.background = 'rgba(255,255,255,0.05)';
      
      const folderKey = container.id + '_' + folderName;
      const isOpen = openAccordionFolders.has(folderKey);

      const titleSpan = document.createElement('span');
      titleSpan.innerHTML = `${isOpen ? '▲' : '▼'} 📁 <span style="color:var(--accent-color);">${window.escapeHTML(folderName)}</span> (${tabs.length})`;
      titleSpan.style.fontSize = '11px';
      titleSpan.style.fontWeight = 'bold';
      
      const btnCloseGroup = document.createElement('button');
      btnCloseGroup.textContent = 'Close Group';
      btnCloseGroup.className = 'action-btn danger';
      btnCloseGroup.style.padding = '2px 6px';
      btnCloseGroup.style.fontSize = '10px';
      
      btnCloseGroup.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent accordion toggle
        const tabIds = tabs.map(t => t.id);
        chrome.tabs.remove(tabIds, () => {
          setTimeout(analyzeTabs, 200);
        });
      });
      
      folderHeader.appendChild(titleSpan);
      folderHeader.appendChild(btnCloseGroup);
      folder.appendChild(folderHeader);
      
      const listContainer = document.createElement('div');
      listContainer.style.display = isOpen ? 'flex' : 'none'; // restore previous state
      listContainer.style.flexDirection = 'column';
      listContainer.style.padding = '5px';
      listContainer.style.gap = '5px';
      
      if (isOpen) {
         folderHeader.style.background = 'rgba(255,255,255,0.1)';
      }
      
      folderHeader.addEventListener('click', () => {
        if (listContainer.style.display === 'none') {
          listContainer.style.display = 'flex';
          titleSpan.innerHTML = `▲ 📁 <span style="color:var(--accent-color);">${window.escapeHTML(folderName)}</span> (${tabs.length})`;
          folderHeader.style.background = 'rgba(255,255,255,0.1)';
          openAccordionFolders.add(folderKey);
        } else {
          listContainer.style.display = 'none';
          titleSpan.innerHTML = `▼ 📁 <span style="color:var(--accent-color);">${window.escapeHTML(folderName)}</span> (${tabs.length})`;
          folderHeader.style.background = 'rgba(255,255,255,0.05)';
          openAccordionFolders.delete(folderKey);
        }
      });
      
      tabs.forEach(tab => {
        listContainer.appendChild(createTabUI(tab));
      });
      
      folder.appendChild(listContainer);
      container.appendChild(folder);
    }
  }

  function updateHealth(totalTabs, duplicates, heavy) {
    // Hardware-Aware Algorithm
    // navigator.deviceMemory returns Total System RAM in GB (e.g., 2, 4, 8, 16, 32)
    // navigator.hardwareConcurrency returns Logical CPU Cores (e.g., 4, 8, 16)
    const totalRamGB = navigator.deviceMemory || 8; // Fallback to 8GB average
    const cpuCores = navigator.hardwareConcurrency || 4; // Fallback to 4 cores

    // MULTITASKING RESERVE: 
    // We cannot assume Chrome gets 100% of the RAM. Other apps (Spotify, VS Code, OS) need memory.
    // We strictly allocate only ~50% of the total RAM to Chrome's "Safe Limit" calculations.
    let availableChromeRam = totalRamGB;
    if (totalRamGB > 4) {
      availableChromeRam = totalRamGB * 0.5; // Reserve 50% for other apps
    } else {
      availableChromeRam = 2; // Budget laptops only get 2GB allocated for Chrome
    }

    // Calculate dynamic safe limits
    // Estimate: A computer can safely handle ~4-5 tabs per GB of *Available* Chrome RAM
    const safeTabsLimit = Math.max(10, availableChromeRam * 5); 

    let penalty = 0;

    // Penalty for Exceeding Safe Tab Limit
    if (totalTabs > safeTabsLimit) {
      // Weaker CPUs get punished harder when exceeding memory limits
      const overagePenaltyMult = Math.max(0.5, 12 / cpuCores); 
      penalty += (totalTabs - safeTabsLimit) * overagePenaltyMult;
    }

    // Heavy Tabs Penalty (Scales inversely with Available RAM)
    // A heavy tab hurts a 4GB machine much more than a 32GB machine
    const heavyPenaltyMult = Math.max(1, 16 / availableChromeRam);
    penalty += (heavy * heavyPenaltyMult);

    // Duplicate Penalty (Clutter penalty, mild scale)
    const duplicatePenaltyMult = Math.max(0.5, 8 / availableChromeRam);
    penalty += (duplicates * duplicatePenaltyMult);
    
    let health = Math.max(0, 100 - Math.round(penalty));
    healthScoreText.textContent = `${health}%`;
    healthBarFill.style.width = `${health}%`;

    if (health >= 80) {
      mascotBody.setAttribute('fill', '#4CAF50'); // Green
      healthBarFill.style.background = '#4CAF50';
      healthStatusText.textContent = 'Healthy & Fast';
      healthStatusText.style.color = '#4CAF50';
      mascotMouth.setAttribute('d', 'M35 65 Q50 80 65 65'); // Happy Smile
    } else if (health >= 40) {
      mascotBody.setAttribute('fill', '#FFC107'); // Yellow/Orange
      healthBarFill.style.background = '#FFC107';
      healthStatusText.textContent = 'Under Pressure';
      healthStatusText.style.color = '#FFC107';
      mascotMouth.setAttribute('d', 'M35 70 L65 70'); // Straight Line mouth
    } else {
      mascotBody.setAttribute('fill', '#F44336'); // Red
      healthBarFill.style.background = '#F44336';
      healthStatusText.textContent = 'Overloaded! Clean me!';
      healthStatusText.style.color = '#F44336';
      mascotMouth.setAttribute('d', 'M35 75 Q50 60 65 75'); // Sad face
    }
  }

});
