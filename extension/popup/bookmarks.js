document.addEventListener('DOMContentLoaded', () => {
  const bookmarkList = document.getElementById('bookmark-list');
  const searchInput = document.getElementById('bookmark-search');
  const btnNewGroup = document.getElementById('btn-new-group');
  const dropzone = document.getElementById('bookmark-dropzone');
  
  const subnavAll = document.getElementById('subnav-all');
  const subnavGroups = document.getElementById('subnav-groups');
  const viewAll = document.getElementById('view-all-bookmarks');
  const viewGroups = document.getElementById('view-groups');
  const viewSingleGroup = document.getElementById('view-single-group');
  const groupsGrid = document.getElementById('groups-grid');
  
  const singleGroupTitle = document.getElementById('single-group-title');
  const singleGroupList = document.getElementById('single-group-list');
  const btnBackGroups = document.getElementById('btn-back-groups');
  const btnDeleteGroup = document.getElementById('btn-delete-group');

  const actionBar = document.getElementById('bookmark-action-bar');
  const selectedCountSpan = document.getElementById('selected-count');
  const btnOpenSelected = document.getElementById('btn-open-selected');
  const moveDestSelect = document.getElementById('move-dest-select');
  const copyDestSelect = document.getElementById('copy-dest-select');
  const btnDeleteSelected = document.getElementById('btn-delete-selected');
  
  const sortSelect = document.getElementById('bookmark-sort-select');
  const selectAllAllBms = document.getElementById('select-all-allbms');
  const selectAllGroup = document.getElementById('select-all-group');
  
  let currentOpenGroupId = null;
  let currentRenderedAllBms = [];
  let currentRenderedGroupBms = [];

  // Startup Collection
  const startupSelect = document.getElementById('startup-collection-select');
  const btnSaveStartup = document.getElementById('btn-save-startup');

  let allBookmarks = [];
  let allFolders = [];
  let selectedIds = new Set();
  let defaultBookmarksBarId = '1';
  let historyVisitCounts = {};

  chrome.history.search({ text: '', maxResults: 100000, startTime: 0 }, (results) => {
    results.forEach(item => {
      if (item.url) historyVisitCounts[item.url] = item.visitCount || 0;
    });
  });

  // Fallback for clicks done strictly via the extension if history API is somehow delayed
  let usageFrequency = {};
  chrome.storage.local.get(['bookmarkClicks'], (res) => {
    usageFrequency = res.bookmarkClicks || {};
  });

  function trackClick(id) {
    usageFrequency[id] = (usageFrequency[id] || 0) + 1;
    chrome.storage.local.set({ bookmarkClicks: usageFrequency });
  }

  function safeCreateBookmark(createData) {
     return new Promise((resolve) => {
        chrome.bookmarks.create(createData, (result) => {
           if (chrome.runtime.lastError) {
              console.warn("Fallback triggered for bookmark creation:", chrome.runtime.lastError.message);
              delete createData.parentId;
              chrome.bookmarks.create(createData, (res2) => {
                 if (chrome.runtime.lastError) console.error("Bookmark creation completely failed:", chrome.runtime.lastError.message);
                 resolve(res2);
              });
           } else {
              resolve(result);
           }
        });
     });
  }
  
  // -- SUBNAV LOGIC --
  subnavAll.addEventListener('click', () => {
    subnavAll.classList.add('active');
    subnavGroups.classList.remove('active');
    subnavAll.style.borderBottomColor = 'var(--accent-color)';
    subnavGroups.style.borderBottomColor = 'transparent';
    subnavAll.style.color = 'var(--text-primary)';
    subnavGroups.style.color = 'var(--text-secondary)';
    viewAll.style.display = 'flex';
    viewGroups.style.display = 'none';
    viewSingleGroup.style.display = 'none';
    currentOpenGroupId = null;
    renderGroupsGrid();
    if(btnAddCurrentTab) btnAddCurrentTab.style.display = 'block';
    if(sortSelect) sortSelect.style.display = 'inline-block';
    if(btnNewGroup) btnNewGroup.style.display = 'none';
  });

  subnavGroups.addEventListener('click', () => {
    subnavGroups.classList.add('active');
    subnavAll.classList.remove('active');
    subnavGroups.style.borderBottomColor = 'var(--accent-color)';
    subnavAll.style.borderBottomColor = 'transparent';
    subnavGroups.style.color = 'var(--text-primary)';
    subnavAll.style.color = 'var(--text-secondary)';
    viewAll.style.display = 'none';
    viewGroups.style.display = 'flex';
    viewSingleGroup.style.display = 'none';
    currentOpenGroupId = null;
    renderGroupsGrid();
    if(btnAddCurrentTab) btnAddCurrentTab.style.display = 'none';
    if(sortSelect) sortSelect.style.display = 'none';
    if(btnNewGroup) btnNewGroup.style.display = 'inline-block';
  });

  btnBackGroups.addEventListener('click', () => {
    currentOpenGroupId = null;
    renderGroupsGrid();
    viewSingleGroup.style.display = 'none';
    viewGroups.style.display = 'flex';
    if(sortSelect) sortSelect.style.display = 'none';
    if(btnNewGroup) btnNewGroup.style.display = 'inline-block';
  });

  if (btnDeleteGroup) {
    btnDeleteGroup.addEventListener('click', () => {
      if (currentOpenGroupId) {
        if (confirm("Are you sure you want to delete this entire group and all its bookmarks?")) {
          chrome.bookmarks.removeTree(currentOpenGroupId, () => {
            selectedIds.clear();
            updateActionBar();
            currentOpenGroupId = null;
            viewGroups.style.display = 'flex';
            viewSingleGroup.style.display = 'none';
            fetchBookmarks();
            window.showToast("Group deleted successfully!");
          });
        }
      }
    });
  }

  // -- DRAG AND DROP COLLECTIONS --
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'bookmarks') {
      dropzone.style.display = 'block';
    }
  });
  
  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget || e.relatedTarget.nodeName === "HTML") {
      dropzone.style.display = 'none';
    }
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.display = 'none';
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.dataset.tab === 'bookmarks') {
      const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
      if (url && (url.startsWith('http') || url.startsWith('chrome'))) {
        safeCreateBookmark({ parentId: defaultBookmarksBarId, url, title: url }).then(() => {
          fetchBookmarks();
          window.showToast("Link saved successfully!");
        });
      }
    }
  });

  // -- NEW GROUP (FOLDER) CREATION --
  btnNewGroup.addEventListener('click', () => {
    const title = prompt("Enter new Collection/Group name:");
    if (title && title.trim()) {
      safeCreateBookmark({ parentId: defaultBookmarksBarId, title: title.trim() }).then(() => {
        fetchBookmarks();
        window.showToast("Group created!");
      });
    }
  });

  // -- STARTUP COLLECTION --
  const freqSelect = document.getElementById('startup-frequency-select');
  const startupDate = document.getElementById('startup-date');
  if (freqSelect && startupDate) {
    freqSelect.addEventListener('change', () => {
      startupDate.style.display = freqSelect.value === 'specific_date' ? 'block' : 'none';
    });
  }

  if (btnSaveStartup) {
    btnSaveStartup.addEventListener('click', () => {
      const folderId = startupSelect.value;
      const freq = freqSelect ? freqSelect.value : 'always';
      let sDate = '';
      
      if (freq === 'specific_date' && startupDate) {
         if (startupDate.value) {
            const [y, m, d] = startupDate.value.split('-');
            const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            sDate = dt.toDateString();
         } else {
            alert("Please pick a specific date!");
            return;
         }
      }
      
      if (folderId === 'none') {
        chrome.storage.local.remove(['startupCollection', 'startupFrequency', 'startupDate'], () => {
          window.showToast("Startup collection disabled.");
        });
      } else {
        chrome.storage.local.set({ startupCollection: folderId, startupFrequency: freq, startupDate: sDate }, () => {
          window.showToast("Startup settings saved!");
        });
      }
    });
  }

  const btnResetStartup = document.getElementById('btn-reset-startup');
  if (btnResetStartup) {
    btnResetStartup.addEventListener('click', () => {
      chrome.storage.local.remove('lastStartupRun', () => {
         window.showToast("Daily memory reset! Try restarting Chrome.");
      });
    });
  }

  function fetchBookmarks() {
    chrome.bookmarks.getTree((tree) => {
      if (tree[0] && tree[0].children && tree[0].children.length > 0) {
         defaultBookmarksBarId = tree[0].children[0].id;
      }
      allBookmarks = [];
      allFolders = [];
      processNode(tree[0]);
      populateStartupSelect();
      renderAllBookmarks();
      renderGroupsGrid();
      
      // FIX: Real-time UI synchronization for active Group view
      if (currentOpenGroupId) {
        const updatedFolder = allFolders.find(f => f.id === currentOpenGroupId);
        if (updatedFolder) {
          openSingleGroup(updatedFolder);
        } else {
          // If the group was deleted, go back to groups view
          btnBackGroups.click();
        }
      }
    });
  }

  function processNode(node) {
    if (node.url) {
      allBookmarks.push(node);
    } else if (node.id && node.id !== '0') {
      allFolders.push(node);
    }
    if (node.children) {
      node.children.forEach(processNode);
    }
  }

  function populateStartupSelect() {
    if(startupSelect) {
      chrome.storage.local.get(['startupCollection', 'startupFrequency'], (res) => {
        startupSelect.innerHTML = '<option value="none">None (Disabled)</option>';
        allFolders.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.id;
          opt.textContent = f.title;
          startupSelect.appendChild(opt);
        });
        if (res.startupCollection && Array.from(startupSelect.options).some(o => o.value === res.startupCollection)) {
          startupSelect.value = res.startupCollection;
        }
        
        const freqSelect = document.getElementById('startup-frequency-select');
        if (freqSelect && res.startupFrequency) {
          freqSelect.value = res.startupFrequency;
          const sDateInput = document.getElementById('startup-date');
          if (sDateInput) {
             if (res.startupFrequency === 'specific_date' && res.startupDate) {
               sDateInput.style.display = 'block';
               const dt = new Date(res.startupDate);
               if (!isNaN(dt.getTime())) {
                 const y = dt.getFullYear();
                 const m = String(dt.getMonth() + 1).padStart(2, '0');
                 const d = String(dt.getDate()).padStart(2, '0');
                 sDateInput.value = `${y}-${m}-${d}`;
               }
             } else {
               sDateInput.style.display = 'none';
             }
          }
        }
      });
    }
    
    if(moveDestSelect) {
      moveDestSelect.innerHTML = '<option value="">Move To...</option>';
      if(copyDestSelect) copyDestSelect.innerHTML = '<option value="">Copy To...</option>';
      
      allFolders.forEach(f => {
        if(moveDestSelect) {
          const optM = document.createElement('option');
          optM.value = f.id; optM.textContent = f.title;
          moveDestSelect.appendChild(optM);
        }
        if(copyDestSelect) {
          const optC = document.createElement('option');
          optC.value = f.id; optC.textContent = f.title;
          copyDestSelect.appendChild(optC);
        }
      });
    }
  }

  searchInput.addEventListener('input', () => {
    if (viewGroups.style.display === 'flex') {
      renderGroupsGrid();
    } else if (viewSingleGroup.style.display === 'flex') {
      const folder = allFolders.find(f => f.id === currentOpenGroupId);
      if (folder) openSingleGroup(folder);
    } else {
      renderAllBookmarks();
    }
  });
  
  if (sortSelect) {
    sortSelect.addEventListener('change', renderAllBookmarks);
  }

  function getMatchScore(str, query) {
    if (!str || !query) return 0;
    const lowerStr = str.trim().toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerStr.startsWith(lowerQuery)) return 3;
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escapedQuery, 'i');
    if (regex.test(str)) return 2;
    
    if (lowerStr.includes(lowerQuery)) return 1;
    
    return 0;
  }

  // Renders the flat list of all bookmarks (filtered by search)
  function renderAllBookmarks() {
    const query = searchInput.value.trim();
    let filtered = [...allBookmarks]; // FIX: clone to prevent in-place mutation
    if (query) {
      filtered = filtered.map(bm => ({ ...bm, _matchScore: getMatchScore(bm.title || '', query) }))
                         .filter(bm => bm._matchScore > 0);
    }
    
    const sort = sortSelect ? sortSelect.value : 'none';
    if (sort !== 'none' || query) {
      filtered.sort((a, b) => {
        if (query && a._matchScore !== b._matchScore) {
          return b._matchScore - a._matchScore;
        }
        if (sort === 'frequent') {
          const aCount = (historyVisitCounts[a.url] || 0) + (usageFrequency[a.id] || 0);
          const bCount = (historyVisitCounts[b.url] || 0) + (usageFrequency[b.id] || 0);
          return bCount - aCount;
        }
        if (sort === 'newest') return (b.dateAdded || 0) - (a.dateAdded || 0);
        if (sort === 'oldest') return (a.dateAdded || 0) - (b.dateAdded || 0);
        
        const titleA = (a.title || '').trim();
        const titleB = (b.title || '').trim();
        if (sort === 'az') return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
        if (sort === 'za') return titleB.localeCompare(titleA, undefined, { sensitivity: 'base' });
        return 0;
      });
    }
    
    bookmarkList.innerHTML = '';
    currentRenderedAllBms = filtered;
    
    if (filtered.length === 0) {
      bookmarkList.innerHTML = '<p class="placeholder-text" style="margin-top:10px;">No bookmarks found.</p>';
      if(selectAllAllBms) { selectAllAllBms.checked = false; selectAllAllBms.disabled = true; }
    } else {
      if(selectAllAllBms) { 
        selectAllAllBms.disabled = false;
        selectAllAllBms.checked = filtered.every(bm => selectedIds.has(bm.id));
      }
      filtered.forEach(bm => bookmarkList.appendChild(createBookmarkChip(bm)));
    }
    updateActionBar();
  }

  const showDefaultGroupsCb = document.getElementById('show-default-groups');
  let showDefaultGroups = false;
  if (showDefaultGroupsCb) {
     showDefaultGroupsCb.addEventListener('change', (e) => {
        showDefaultGroups = e.target.checked;
        renderGroupsGrid();
     });
  }

  // Renders the grid of folders
  function renderGroupsGrid() {
    const query = searchInput.value.trim();
    groupsGrid.innerHTML = '';
    
    let renderedCount = 0;
    let scoredFolders = allFolders.map(folder => ({ ...folder, _matchScore: query ? getMatchScore(folder.title || '', query) : 1 }));
    
    if (query) {
      scoredFolders = scoredFolders.filter(f => f._matchScore > 0);
      scoredFolders.sort((a, b) => b._matchScore - a._matchScore);
    }
    
    scoredFolders.forEach(folder => {
      if (!showDefaultGroups && folder.parentId === '0') return;
      
      renderedCount++;
      
      const tile = document.createElement('div');
      tile.className = 'group-tile';
      tile.style.position = 'relative';
      tile.innerHTML = `
        <input type="checkbox" class="group-checkbox" style="position:absolute; top:8px; left:8px; cursor:pointer;" ${selectedIds.has(folder.id) ? 'checked' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <div class="group-title">${folder.title}</div>
      `;
      tile.style.backgroundColor = 'var(--bg-secondary)';
      tile.style.border = '1px solid var(--border-color)';
      tile.style.borderRadius = '8px';
      tile.style.padding = '15px';
      tile.style.cursor = 'pointer';
      tile.style.textAlign = 'center';
      tile.style.transition = '0.2s';
      
      tile.addEventListener('mouseover', () => tile.style.borderColor = 'var(--accent-color)');
      tile.addEventListener('mouseout', () => tile.style.borderColor = 'var(--border-color)');
      
      const cb = tile.querySelector('.group-checkbox');
      cb.addEventListener('click', e => e.stopPropagation());
      cb.addEventListener('change', e => {
        if(e.target.checked) selectedIds.add(folder.id);
        else selectedIds.delete(folder.id);
        updateActionBar();
      });

      tile.addEventListener('click', () => {
        openSingleGroup(folder);
      });
      
      groupsGrid.appendChild(tile);
    });
    
    if (renderedCount === 0 && query) {
       groupsGrid.innerHTML = '<p class="placeholder-text" style="width:100%; text-align:center; margin-top:20px;">No groups match your search.</p>';
    }
  }

  function openSingleGroup(folder) {
    currentOpenGroupId = folder.id;
    singleGroupTitle.textContent = folder.title;
    singleGroupList.innerHTML = '';
    
    const query = searchInput.value.trim();
    let children = allBookmarks.filter(bm => bm.parentId === folder.id);
    if (query) {
       children = children.map(bm => ({ ...bm, _matchScore: getMatchScore(bm.title || '', query) }))
                           .filter(bm => bm._matchScore > 0);
       children.sort((a, b) => b._matchScore - a._matchScore);
    }
    currentRenderedGroupBms = children;
    
    if (children.length === 0) {
       singleGroupList.innerHTML = '<p class="placeholder-text" style="margin-top:10px;">This group is empty.</p>';
       if(selectAllGroup) { selectAllGroup.checked = false; selectAllGroup.disabled = true; }
    } else {
       if(selectAllGroup) {
         selectAllGroup.disabled = false;
         selectAllGroup.checked = children.every(bm => selectedIds.has(bm.id));
       }
       children.forEach(bm => singleGroupList.appendChild(createBookmarkChip(bm)));
    }
    
    viewGroups.style.display = 'none';
    viewSingleGroup.style.display = 'flex';
    if(sortSelect) sortSelect.style.display = 'none';
    if(btnNewGroup) btnNewGroup.style.display = 'none';
  }

  function createBookmarkChip(bm) {
    const li = document.createElement('li');
    li.className = 'bookmark-chip';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.id = bm.id;
    checkbox.checked = selectedIds.has(bm.id);
    checkbox.addEventListener('change', handleSelection);

    let faviconUrl = '';
    try {
      const faviconApiUrl = new URL(chrome.runtime.getURL("/_favicon/"));
      faviconApiUrl.searchParams.set("pageUrl", bm.url);
      faviconApiUrl.searchParams.set("size", "16");
      faviconUrl = faviconApiUrl.toString();
    } catch (e) {
      faviconUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHBhdGggZD0iTThgOCBhNCA0IDAgMSAwIDAtOCA0IDQgMCAwIDAgMCA4em0wIDJhNiA2IDAgMCAwLTYgNnYyYTEgMSAwIDAgMCAxIDFwMTBhMSAxIDAgMCAwIDEtMXYtMmE2IDYgMCAwIDAtNi02eiIgZmlsbD0iIzk0YTNiOCIvPjwvc3ZnPg==';
    }

    const icon = document.createElement('img');
    icon.className = 'bookmark-icon';
    icon.src = faviconUrl;
    icon.alt = '';
    icon.onerror = () => icon.style.display = 'none';

    const title = document.createElement('div');
    title.className = 'bookmark-title';
    title.textContent = bm.title || bm.url;
    title.title = bm.title || bm.url; 
    title.style.cursor = 'pointer';
    
    // Direct click opens the tab immediately
    title.addEventListener('click', () => {
      trackClick(bm.id);
      chrome.tabs.create({ url: bm.url, active: true });
    });
    icon.style.cursor = 'pointer';
    icon.addEventListener('click', () => {
      trackClick(bm.id);
      chrome.tabs.create({ url: bm.url, active: true });
    });
    
    li.appendChild(checkbox);
    li.appendChild(icon);
    li.appendChild(title);
    return li;
  }

  function handleSelection(e) {
    const id = e.target.dataset.id;
    if (e.target.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateActionBar();
  }

  function updateActionBar() {
    if (selectedIds.size > 0) {
      actionBar.classList.remove('hidden');
      actionBar.classList.add('visible');
      selectedCountSpan.textContent = `${selectedIds.size} selected`;
      
      const containsFolder = Array.from(selectedIds).some(id => allFolders.some(f => f.id === id));
      if (moveDestSelect) moveDestSelect.style.display = containsFolder ? 'none' : 'inline-block';
      if (copyDestSelect) copyDestSelect.style.display = containsFolder ? 'none' : 'inline-block';
    } else {
      actionBar.classList.remove('visible');
      actionBar.classList.add('hidden');
    }
  }

  btnOpenSelected.addEventListener('click', () => {
    selectedIds.forEach(id => {
      trackClick(id);
      const bm = allBookmarks.find(b => b.id === id);
      if (bm && bm.url) {
        chrome.tabs.create({ url: bm.url, active: false });
      } else {
        const folder = allFolders.find(f => f.id === id);
        if (folder) {
          const children = allBookmarks.filter(b => b.parentId === folder.id);
          if (children.length > 0) chrome.windows.create({ url: children.map(c => c.url) });
        }
      }
    });
    selectedIds.clear();
    updateActionBar();
    fetchBookmarks();
  });

  btnDeleteSelected.addEventListener('click', () => {
    if (selectedIds.size === 0) return;
    
    const containsFolder = Array.from(selectedIds).some(id => allFolders.some(f => f.id === id));
    if (containsFolder) {
      if (!confirm("WARNING: You have selected one or more Groups. Deleting them will PERMANENTLY erase all bookmarks inside them. Are you sure you want to proceed?")) {
        return;
      }
    }
    
    const promises = Array.from(selectedIds).map(id => {
       const isFolder = allFolders.some(f => f.id === id);
       if (isFolder) return new Promise(resolve => chrome.bookmarks.removeTree(id, resolve));
       return new Promise(resolve => chrome.bookmarks.remove(id, resolve));
    });
    Promise.all(promises).then(() => {
      selectedIds.clear();
      updateActionBar();
      fetchBookmarks();
      window.showToast("Bookmarks deleted successfully!");
    });
  });

  if (moveDestSelect) {
    moveDestSelect.addEventListener('change', () => {
      const destId = moveDestSelect.value;
      if (destId && selectedIds.size > 0) {
        const promises = Array.from(selectedIds).map(id => {
           return new Promise(resolve => {
             chrome.bookmarks.move(id, { parentId: destId }, () => {
               if (chrome.runtime.lastError) console.warn("Move operation bypassed:", chrome.runtime.lastError.message);
               resolve();
             });
           });
        });
        Promise.all(promises).then(() => {
           selectedIds.clear();
           updateActionBar();
           moveDestSelect.value = '';
           fetchBookmarks();
           window.showToast("Bookmarks moved successfully!");
        });
      }
    });
  }
  
  if (copyDestSelect) {
    copyDestSelect.addEventListener('change', () => {
      const destId = copyDestSelect.value;
      if (destId && selectedIds.size > 0) {
        const promises = Array.from(selectedIds).map(id => {
          const bm = allBookmarks.find(b => b.id === id);
          if (bm) return safeCreateBookmark({ parentId: destId, title: bm.title, url: bm.url });
          return Promise.resolve();
        });
        Promise.all(promises).then(() => {
          selectedIds.clear();
          updateActionBar();
          copyDestSelect.value = '';
          fetchBookmarks();
          window.showToast("Bookmarks copied successfully!");
        });
      }
    });
  }

  const btnAddCurrentTab = document.getElementById('btn-add-current-tab');
  const btnAddToGroup = document.getElementById('btn-add-to-group');

  if (btnAddCurrentTab) {
      btnAddCurrentTab.addEventListener('click', () => {
        chrome.tabs.query({highlighted: true, currentWindow: true}, (tabs) => {
           if (tabs && tabs.length > 0) {
              const promises = tabs.map(tab => {
                 return safeCreateBookmark({ parentId: defaultBookmarksBarId, title: tab.title, url: tab.url });
              });
              Promise.all(promises).then(() => {
                 fetchBookmarks();
                 window.showToast(tabs.length > 1 ? `${tabs.length} tabs saved!` : "Tab saved to bookmarks!");
              });
           }
        });
     });
  }

  if (btnAddToGroup) {
     btnAddToGroup.addEventListener('click', () => {
        if (!currentOpenGroupId) return;
        chrome.tabs.query({highlighted: true, currentWindow: true}, (tabs) => {
           if (tabs && tabs.length > 0) {
              const promises = tabs.map(tab => {
                 return safeCreateBookmark({ parentId: currentOpenGroupId, title: tab.title, url: tab.url });
              });
              Promise.all(promises).then(() => {
                 fetchBookmarks();
                 window.showToast(tabs.length > 1 ? `${tabs.length} tabs added to group!` : "Tab added to group!");
              });
           }
        });
     });
  }

  if (selectAllAllBms) {
    selectAllAllBms.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      currentRenderedAllBms.forEach(bm => {
        if (isChecked) selectedIds.add(bm.id);
        else selectedIds.delete(bm.id);
      });
      renderAllBookmarks();
      updateActionBar();
    });
  }
  
  if (selectAllGroup) {
    selectAllGroup.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      currentRenderedGroupBms.forEach(bm => {
        if (isChecked) selectedIds.add(bm.id);
        else selectedIds.delete(bm.id);
      });
      const folder = allFolders.find(f => f.id === currentOpenGroupId);
      if (folder) openSingleGroup(folder);
      updateActionBar();
    });
  }

  fetchBookmarks();
});
