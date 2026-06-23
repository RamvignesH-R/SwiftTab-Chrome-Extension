const fs = require('fs');

// 1. Fix sd-item click bug
let popupJs = fs.readFileSync('c:/Users/ramvi/OneDrive/Desktop/SwiftTab/extension/popup/popup.js', 'utf8');
popupJs = popupJs.replace(
  'document.querySelectorAll(\'.sd-item\').forEach(item => {',
  'document.querySelectorAll(\'#support-dropdown .sd-item\').forEach(item => {'
);
fs.writeFileSync('c:/Users/ramvi/OneDrive/Desktop/SwiftTab/extension/popup/popup.js', popupJs);

// 2. Fix App Hub Header & Calculator/Cleaner Icons
let popupHtml = fs.readFileSync('c:/Users/ramvi/OneDrive/Desktop/SwiftTab/extension/popup/popup.html', 'utf8');

const oldIcons = `<div id="btn-apphub-calc" class="sd-item" style="padding:12px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="16" y2="14"></line><line x1="8" y1="18" x2="16" y2="18"></line></svg>
              <span style="margin-left:8px;">Calculator</span>
            </div>
            <div id="btn-apphub-cleaner" class="sd-item" style="padding:12px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span style="margin-left:8px;">Tab Cleaner</span>
            </div>`;

const newIcons = `<div id="btn-apphub-calc" class="sd-item" style="padding:12px;">
              <span style="font-size:16px;">🧮</span>
              <span style="margin-left:8px;">Calculator</span>
            </div>
            <div id="btn-apphub-cleaner" class="sd-item" style="padding:12px;">
              <span style="font-size:16px;">🧹</span>
              <span style="margin-left:8px;">Tab Cleaner</span>
            </div>`;

popupHtml = popupHtml.replace(oldIcons, newIcons);

// Make the circle perfectly symmetric
popupHtml = popupHtml.replace(
  '<button id="btn-apphub-settings" class="icon-btn" title="System Tools" style="padding:6px; border-radius:50%; background:var(--bg-secondary); cursor:pointer;">',
  '<button id="btn-apphub-settings" class="icon-btn" title="System Tools" style="width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--bg-secondary); cursor:pointer;">'
);

// Bring back read-me-before
const clipTitleOld = '<h2>Session Clipboard</h2>';
const clipTitleNew = `<h2>Session Clipboard</h2>
            <div id="btn-clip-help" style="display:flex; align-items:center; cursor:pointer; margin-left:10px; color:var(--text-secondary);" title="Read before use!">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>`;
popupHtml = popupHtml.replace(clipTitleOld, clipTitleNew);

fs.writeFileSync('c:/Users/ramvi/OneDrive/Desktop/SwiftTab/extension/popup/popup.html', popupHtml);
console.log('done');
