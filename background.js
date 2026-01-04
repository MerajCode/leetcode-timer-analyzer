import handler from "./background-handler.js";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender?.tab?.id) handler.setActiveTab(sender.tab.id);

  switch (msg.action) {
    case "start":
      handler.startTimer();
      break;

    case "pause":
      handler.pauseTimer();
      break;

    case "resume":
      handler.resumeTimer();
      break;

    case "stop":
      handler.stopTimer();
      break;

    case "tick":
      sendResponse({ timer: handler.updateTimer() });
      break;

    case "storeSubmission":
      handler.storeSubmission(msg.data);
      sendResponse({ status: true });
      break;
  }
});
