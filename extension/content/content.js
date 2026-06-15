function handleClipboardEvent() {
  let selectedText = '';
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
    selectedText = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd);
  } else {
    selectedText = window.getSelection().toString();
  }
  
  selectedText = selectedText.trim();
  
  if (selectedText) {
    try {
      chrome.runtime.sendMessage({ action: 'auto_save_clipboard', text: selectedText }).catch(() => {
        // Ignore disconnected port errors
      });
    } catch (e) {
      // Ignore synchronous extension context invalidated errors
    }
  }
}

document.addEventListener('copy', handleClipboardEvent);
document.addEventListener('cut', handleClipboardEvent);
