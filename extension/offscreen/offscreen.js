chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'offscreen' && msg.action === 'play_audio') {
    playAudio(msg.data);
    sendResponse(true);
  }
});

function playAudio({ base64 }) {
  if (!base64 || base64 === 'default') {
    const audio = new Audio('default.wav');
    audio.play();
  } else {
    const audio = new Audio(base64);
    audio.play();
  }
}
