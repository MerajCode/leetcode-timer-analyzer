class Controller {
  constructor() {
    this.interval = null;
    this.difficulty = "";
  }

  start(cb) {
    chrome.runtime.sendMessage({ action: "start" });
    this.run(cb);
  }

  pause() {
    chrome.runtime.sendMessage({ action: "pause" });
    clearInterval(this.interval);
  }

  resume(cb) {
    chrome.runtime.sendMessage({ action: "resume" });
    this.run(cb);
  }

  stop() {
    chrome.runtime.sendMessage({ action: "stop" });
    clearInterval(this.interval);
  }

  run(cb) {
    clearInterval(this.interval);
    this.interval = setInterval(() => {
      chrome.runtime.sendMessage({ action: "tick" }, (res) => cb(res.timer));
    }, 1000);
  }

  format(ms) {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(
      Math.floor((s % 3600) / 60)
    ).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  getReminder(cb) {
    chrome.storage.local.get(
      { rem: { easy: 5, medium: 10, hard: 30 } },
      (data) => cb(data.rem)
    );
  }
  saveReminder(cb) {
    chrome.storage.local.set({
      rem: { easy: cb.easy, medium: cb.medium, hard: cb.hard },
    });
  }

  storeSubmission(data) {
    chrome.runtime.sendMessage({ action: "storeSubmission", data });
  }

  async isSubmissionAvailable(title, timestamp) {
    //is Old submission
    if (!this.isWithinOneMinute(timestamp)) return true;

    //is already in my db
    const data = await new Promise((resolve) => {
      chrome.storage.local.get({ leetcodeLogs: [] }, resolve);
    });

    return data.leetcodeLogs.some(
      (item) => item.title === title && item.submitted_at === timestamp
    );
  }

  isWithinOneMinute(timeStr) {
    const pastTs = new Date(timeStr).getTime();
    const nowTs = Date.now();

    const diff = Math.abs(nowTs - pastTs);
    return diff <= 60 * 1000; // 1 minute
  }
}

export default new Controller();
