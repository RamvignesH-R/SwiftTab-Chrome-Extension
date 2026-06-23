const fs = require('fs');
let html = fs.readFileSync('c:/Users/ramvi/OneDrive/Desktop/SwiftTab/extension/popup/popup.html', 'utf8');

const cleanerStartIdx = html.indexOf('<!-- View: Tab Cleaner & Health -->');
const actionbarIdx = html.indexOf('<div id="bookmark-action-bar" class="floating-action-bar hidden">');
if (cleanerStartIdx !== -1 && actionbarIdx !== -1) {
  const cleanerBlock = html.substring(cleanerStartIdx, actionbarIdx);
  html = html.replace(cleanerBlock, '');

  const endMainIdx = html.indexOf('</main>');
  const newCleanerSection = `      <section id="cleaner-panel" class="tab-panel" style="display:none; flex-direction:column; padding:0 5px; overflow-y:auto;">\n` + cleanerBlock + `      </section>\n    `;
  html = html.slice(0, endMainIdx) + newCleanerSection + html.slice(endMainIdx);
  
  // Also rename id="view-tab-cleaner" to id="view-tab-cleaner-inner" so we don't conflict
  html = html.replace('id="view-tab-cleaner"', 'id="view-tab-cleaner-inner"');
  // Wait, if I rename it, `cleaner.js` expects `view-tab-cleaner`. So I should keep it. The inner div can just be an ordinary div.
  
  fs.writeFileSync('c:/Users/ramvi/OneDrive/Desktop/SwiftTab/extension/popup/popup.html', html);
  console.log('Moved cleaner successfully');
}
