(async () => {
  /* ─────────────────────────────── Pulse CSS (Reminder) ─────────────────────────────── */
  const pulseStyle = document.createElement("style");
  pulseStyle.textContent = `
  @keyframes lc-pulse {
    0%   { transform: scale(1); opacity:1; }
    50%  { transform: scale(1.13); opacity:.6; }
    100% { transform: scale(1); opacity:1; }
  }
  .lc-pulse{
    animation: lc-pulse 1s infinite ease-in-out;
    color:#ff4d4d !important;
    font-weight:900 !important;
  }`;
  document.head.appendChild(pulseStyle);

  /* ───────────────────────────── Import Controller ───────────────────────────── */
  const controllerModule = await import(chrome.runtime.getURL("controller.js"));
  const controller = controllerModule.default;

  /* ───────────────────────────── GLOBAL STATE ───────────────────────────── */
  let isRunning = false;
  let isPaused = false;
  let firstStart = true;

  /* ───────────────────────────── UI CREATION ───────────────────────────── */
  function getOrCreateTimerUI() {
    let el = document.getElementById("lc-floating-timer");
    if (el) return el;

    el = document.createElement("div");
    el.id = "lc-floating-timer";

    Object.assign(el.style, {
      position: "fixed",
      left: "30px",
      top: "30px",
      background: "rgba(20,25,40,0.85)",
      color: "#fff",
      padding: "8px 15px",
      fontSize: "18px",
      borderRadius: "12px",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontFamily: "monospace",
      userSelect: "none",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,.15)",
      boxShadow: "0 4px 18px rgba(0,0,0,.30)",
      zIndex: "999999",
    });

    const dragIcon = `<svg width="18" height="18" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round">
     <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
     <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
     </svg>`;

    const resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-timer-reset-icon lucide-timer-reset"><path d="M10 2h4"/><path d="M12 14v-4"/><path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6"/><path d="M9 17H4v5"/></svg>`;

    el.innerHTML = `
     <div id="lc-drag" style="cursor:grab">${dragIcon}</div>
     <div id="lc-time">00:00:00</div>
     <div id="lc-action" style="cursor:pointer">❚❚</div>
     <div id="reset-timer-btn" style="cursor:pointer">${resetIcon}</div>
    `;

    document.body.appendChild(el);
    enableDrag(el);

    chrome.storage.local.get({ tpos: { x: 30, y: 30 } }, (res) => {
      el.style.left = res.tpos.x + "px";
      el.style.top = res.tpos.y + "px";
    });

    return el;
  }

  /* ───────────────────────────── DRAG ENABLE ───────────────────────────── */
  function enableDrag(el) {
    const handle = el.querySelector("#lc-drag");
    let down = false,
      ox = 0,
      oy = 0,
      sx = 0,
      sy = 0;

    handle.onmousedown = (e) => {
      down = true;
      document.body.style.userSelect = "none";
      sx = e.clientX;
      sy = e.clientY;
      ox = el.offsetLeft;
      oy = el.offsetTop;
    };

    document.onmousemove = (e) => {
      if (!down) return;
      el.style.left = ox + (e.clientX - sx) + "px";
      el.style.top = oy + (e.clientY - sy) + "px";
    };

    document.onmouseup = () => {
      if (!down) return;
      down = false;
      document.body.style.userSelect = "";
      chrome.storage.local.set({
        tpos: { x: parseInt(el.style.left), y: parseInt(el.style.top) },
      });
    };
  }

  /* ───────────────────────────── REMINDER BLINK ───────────────────────────── */
  function reminderLogic(timerEl, ms) {
    if (!controller.difficulty) return;
    controller.getReminder((r) => {
      const target = r[controller.difficulty] * 60000;
      const cycle = ms % target;
      const rem = target - cycle;
      cycle > 15000 && rem <= 15000
        ? timerEl.classList.add("lc-pulse")
        : timerEl.classList.remove("lc-pulse");
    });
  }

  /* ───────────────────────────── START TIMER ───────────────────────────── */
  function startLiveTimer() {
    const el = getOrCreateTimerUI();
    const t = el.querySelector("#lc-time");
    const a = el.querySelector("#lc-action");
    //set difficulty
    const diffEl = document.querySelector("div[class*='text-difficulty']");
    controller.difficulty = diffEl
      ? diffEl.textContent.trim().toLowerCase()
      : null;

    if (firstStart) {
      controller.start();
      firstStart = false;
      isRunning = true;
    }

    controller.run((ms) => {
      reminderLogic(t, ms);
      t.textContent = controller.format(ms);
    });

    a.textContent = "❚❚";
    isPaused = false;
  }

  /* ───────────────────────────── PAUSE / RESUME ───────────────────────────── */
  function togglePause() {
    if (!isRunning) return;
    const el = getOrCreateTimerUI();
    const t = el.querySelector("#lc-time");
    const a = el.querySelector("#lc-action");

    if (isPaused) {
      controller.resume((ms) => (t.textContent = controller.format(ms)));
      a.textContent = "❚❚";
      isPaused = false;
    } else {
      controller.pause();
      a.textContent = "▶";
      isPaused = true;
    }
  }

  /* ───────────────────────────── RESET ───────────────────────────── */
  function resetTimer() {
    controller.stop();
    firstStart = true;
    isRunning = false;
    isPaused = false;

    const el = getOrCreateTimerUI();
    el.querySelector("#lc-time").textContent = "00:00:00";
    el.querySelector("#lc-action").textContent = "▶";
  }

  /* ───────────────────────────── EVENT BINDINGS ───────────────────────────── */
  document.addEventListener("keydown", () => {
    if (!isRunning) startLiveTimer();
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("#lc-action")) togglePause();
    if (e.target.closest("#reset-timer-btn")) resetTimer();
  });

  /* ──────────────────── AUTO SAVE WHEN SUBMISSION ACCEPTED ──────────────────── */

  function getSubmissionTimestamp() {
    const el = document.querySelector("span.max-w-full.truncate");
    return el ? el.textContent.trim() : null;
  }
  function observeAccepted() {
    const observer = new MutationObserver(async () => {
      const result = document.querySelector(
        'span[data-e2e-locator="submission-result"]'
      );
      if (result && result.textContent.includes("Accepted")) {
        const submitted_at = getSubmissionTimestamp();
        //Check valid Submission or not
        if (!submitted_at || !controller.isNewSubmission(submitted_at)) return;
        const title = (document.title.split("-")[0] || "").trim();
        const link = location.href;
        const diffEl = document.querySelector("div[class*='text-difficulty']");
        const difficulty = diffEl
          ? diffEl.textContent.trim().toLowerCase()
          : "unknown";

        //Check Submission already in database or old
        const valid = await controller.isSubmissionAvailable(
          title,
          submitted_at
        );
        if (!valid) return;

        controller.storeSubmission({ title, link, difficulty, submitted_at });
        resetTimer();
        const t = document.querySelector("#lc-time");
        t.classList.remove("lc-pulse");
      }
    });

    observer.observe(document.querySelector("#qd-content"), {
      childList: true,
      subtree: true,
    });
  }

  observeAccepted();
})();
