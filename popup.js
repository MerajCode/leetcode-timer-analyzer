import controller from "./controller.js";

const liveTimerEl = document.getElementById("live-timer");
const easyEl = document.querySelector("#target-easy");
const mediumEl = document.querySelector("#target-medium");
const hardEl = document.querySelector("#target-hard");
const saveBtn = document.querySelector("#save-reminder-btn");

let popupInterval = null;

/* ---------- LIVE TIMER (sync with background) ---------- */
function startLiveTimer() {
  if (popupInterval) return;

  popupInterval = setInterval(() => {
    chrome.runtime.sendMessage({ action: "tick" }, (res) => {
      if (!res) return;
      liveTimerEl.textContent = `Elapsed: ${controller.format(res.timer)}`;
    });
  }, 1000);
}

/* ---------- LOAD SAVED REMINDER VALUES ---------- */
function loadReminder() {
  console.log("load reminder");
  controller.getReminder((r) => {
    easyEl.value = r.easy;
    mediumEl.value = r.medium;
    hardEl.value = r.hard;
  });
}

/* ---------- SAVE REMINDER VALUES ---------- */
function saveReminder() {
  const data = {
    easy: parseInt(easyEl.value),
    medium: parseInt(mediumEl.value),
    hard: parseInt(hardEl.value),
  };
  controller.saveReminder(data);

  saveBtn.textContent = "Saved ✔";
  setTimeout(() => (saveBtn.textContent = "Save"), 1000);
}

/* ---------- POPUP INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log("%c Popup Loaded", "color:#0f0;font-weight:bold");

  // Start live sync
  startLiveTimer();

  // load previous
  loadReminder();

  // save button
  saveBtn.addEventListener("click", saveReminder);
});

// ---------- Load Submission History ----------
function loadSubmissionHistory() {
  chrome.storage.local.get({ leetcodeLogs: [] }, (data) => {
    const list = document.querySelector("#recent-list");
    list.innerHTML = "";

    if (data.leetcodeLogs.length === 0) {
      list.innerHTML = `<p style="text-align:center;opacity:.6;margin-top:10px">No history yet</p>`;
      return;
    }

    data.leetcodeLogs.slice().reverse().forEach((item, index) => {

      const div = document.createElement("div");
      div.className = "problem-item";

      div.innerHTML = `
      <div class="prob-info">
        <span class="prob-name" title="${item.title}">${item.title}</span>
        <div class="prob-meta">
          <span class="badge ${item.difficulty}">${item.difficulty}</span>
        </div>
      </div>
      <div class="time-val">${controller.format(item.timeTaken)}</div>

      <button class="del-item-btn btn-danger" style="background:none;border:none;padding:2px;cursor:pointer">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          <path d="M3 6h18"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
      `;

      list.appendChild(div);

      /* 🔥 Individual delete function */
      div.querySelector(".del-item-btn").addEventListener("click", () => {

        chrome.storage.local.get({ leetcodeLogs: [] }, (d) => {

          // because reverse() was used → map back to real index
          const realIndex = d.leetcodeLogs.length - 1 - index;

          d.leetcodeLogs.splice(realIndex, 1);

          chrome.storage.local.set({ leetcodeLogs: d.leetcodeLogs }, () => {
            div.remove(); // UI update instantly

            if (d.leetcodeLogs.length === 0)
              list.innerHTML = `<p style="text-align:center;opacity:.6;margin-top:10px">No history yet</p>`;
          });
        });
      });

    });
  });
}
document.addEventListener("DOMContentLoaded", loadSubmissionHistory);


//Load Analytics
function formatMinutes(ms) {
  if (!ms) return "--";
  const m = Math.round(ms / 60000);
  return m + "m";
}

function calculateStats() {
  chrome.storage.local.get({ leetcodeLogs: [] }, (data) => {
    const logs = data.leetcodeLogs;

    let easy = [],
      medium = [],
      hard = [];

    logs.forEach((item) => {
      if (!item.timeTaken) return;

      if (item.difficulty === "easy") easy.push(item.timeTaken);
      if (item.difficulty === "medium") medium.push(item.timeTaken);
      if (item.difficulty === "hard") hard.push(item.timeTaken);
    });

    const avg = (arr) =>
      arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;

    document.getElementById("avg-easy").textContent = formatMinutes(avg(easy));
    document.getElementById("avg-medium").textContent = formatMinutes(
      avg(medium)
    );
    document.getElementById("avg-hard").textContent = formatMinutes(avg(hard));

    console.log("Avg Stats:", {
      easy: avg(easy),
      medium: avg(medium),
      hard: avg(hard),
    });
  });
}

document.addEventListener("DOMContentLoaded", calculateStats);

//History Reset
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("detete-history-btn");

  btn.addEventListener("click", () => {
    if (!confirm("Delete all history? This cannot be undone.")) return;

    chrome.storage.local.set({ leetcodeLogs: [] }, () => {
      loadSubmissionHistory();
      calculateStats();

      btn.textContent = "Cleared ✔";
      setTimeout(() => (btn.textContent = "Reset Data"), 1200);
    });
  });
});
