class Handler {
  constructor() {
    this.state = {
      startTime: null,
      pauseStart: null,
      pauseTime: 0,
      timer: 0,
      timerActive: false,
      activeTabId: null,
    };

    // restore state from storage
    chrome.storage.local.get({ timerState: this.state }, (data) => {
      this.state = data.timerState;
    });
  }

  /* ───────────── INTERNAL SYNC ───────────── */
  sync() {
    chrome.storage.local.set({ timerState: this.state });
  }

  /* ───────────── TAB ───────────── */
  setActiveTab(tabId) {
    this.state.activeTabId = tabId;
    this.sync();
  }

  /* ───────────── TIMER CONTROLS ───────────── */
  startTimer() {
    this.state.startTime = Date.now();
    this.state.pauseStart = null;
    this.state.pauseTime = 0;
    this.state.timer = 0;
    this.state.timerActive = true;

    this.sync();
    this.updateIcon();
  }

  pauseTimer() {
    if (!this.state.timerActive) return;
    if (!this.state.pauseStart) {
      this.state.pauseStart = Date.now();
      this.state.timerActive = false;
      this.sync();
      this.updateIcon();
    }
  }

  resumeTimer() {
    if (this.state.pauseStart) {
      this.state.pauseTime += Date.now() - this.state.pauseStart;
      this.state.pauseStart = null;
      this.state.timerActive = true;
      this.sync();
      this.updateIcon();
    }
  }

  stopTimer() {
    this.state = {
      startTime: null,
      pauseStart: null,
      pauseTime: 0,
      timer: 0,
      timerActive: false,
      activeTabId: this.state.activeTabId,
    };

    this.sync();
    this.updateIcon();
  }

  /* ───────────── TIMER UPDATE ───────────── */
  updateTimer() {
    if (!this.state.startTime) return 0;

    if (this.state.pauseStart) {
      this.state.timer =
        this.state.pauseStart -
        this.state.startTime -
        this.state.pauseTime;
    } else {
      this.state.timer =
        Date.now() -
        this.state.startTime -
        this.state.pauseTime;
    }

    this.sync();
    return this.state.timer;
  }

  /* ───────────── ICON ───────────── */
  updateIcon() {
    chrome.action.setIcon({
      path: this.state.timerActive
        ? "icons/running.png"
        : "icons/initial.png",
      tabId: this.state.activeTabId,
    });
  }

  /* ───────────── STORE SUBMISSION ───────────── */
  storeSubmission({ title, link, difficulty,submitted_at }) {
    const entry = {
      title,
      link,
      difficulty,
      timeTaken: this.state.timer,
      date: new Date().toLocaleString(),
      submitted_at
    };

    chrome.storage.local.get({ leetcodeLogs: [] }, (data) => {
      const logs = data.leetcodeLogs || [];
      logs.push(entry);
      chrome.storage.local.set({ leetcodeLogs: logs });
    });
  }
}

export default new Handler();
