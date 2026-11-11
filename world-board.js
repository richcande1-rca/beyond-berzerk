/* BEYOND BERZERK / v0.3.34 — Cloudflare D1 WORLD TOP 10.
 * Scores are online-only; the original personal high score is unchanged.
 * The static client cannot attest runs cryptographically. No test submissions.
 */
(() => {
  "use strict";
  const ENDPOINT = "https://beyond-berzerk-board.rich-gothic.workers.dev/api/board";
  const RULESET = "survival-v1", BUILD = "0.3.34", LIMIT = 10;
  const button = document.getElementById("bb-world-open");
  if (!button) return;
  const board = document.createElement("section");
  board.id = "bb-world-modal";
  board.className = "bb-world";
  board.hidden = true;
  board.setAttribute("role", "dialog");
  board.setAttribute("aria-modal", "true");
  board.setAttribute("aria-label", "Beyond Berzerk worldwide Top 10");
  board.innerHTML = [
    '<div class="bb-world-panel">',
      '<header class="bb-world-header">',
        '<div><span class="bb-world-overline">BEYOND BERZERK // HIGH COMMAND</span>',
        '<h2>WORLD TOP 10</h2></div>',
        '<button id="bb-world-close" class="bb-world-close" type="button" aria-label="Close leaderboard">×</button>',
      '</header>',
      '<p id="bb-world-status" class="bb-world-status" role="status" aria-live="polite">Contacting Cloudflare…</p>',
      '<div id="bb-world-final" class="bb-world-final" hidden>',
        '<span>FINAL SCORE</span><strong id="bb-world-score">0</strong>',
        '<div id="bb-world-progress"></div>',
      '</div>',
      '<form id="bb-world-form" class="bb-world-form" hidden>',
        '<label for="bb-world-name">QUALIFIED // ENTER INITIALS</label>',
        '<div class="bb-world-form-row">',
          '<input id="bb-world-name" maxlength="5" minlength="1" required',
            ' autocomplete="nickname" autocapitalize="characters" spellcheck="false"',
            ' placeholder="AAA" aria-label="Initials, 1 to 5 letters or numbers">',
          '<button id="bb-world-submit" type="submit">TRANSMIT SCORE</button>',
        '</div>',
      '</form>',
      '<div class="bb-world-columns"><span>RANK / PILOT</span><span>SCORE</span><span>WAVE</span><span>KILLS</span><span>LEVIATHAN</span></div>',
      '<ol id="bb-world-entries" class="bb-world-entries" aria-live="polite"></ol>',
      '<footer class="bb-world-footer">',
        '<span>SHARED ONLINE RANKINGS // NORMAL RUNS ONLY</span>',
        '<button id="bb-world-refresh" type="button">REFRESH</button>',
      '</footer>',
    '</div>'
  ].join("");
  document.body.appendChild(board);

  const closeBtn = document.getElementById("bb-world-close");
  const refreshBtn = document.getElementById("bb-world-refresh");
  const form = document.getElementById("bb-world-form");
  const nameInput = document.getElementById("bb-world-name");
  const submitBtn = document.getElementById("bb-world-submit");
  const status = document.getElementById("bb-world-status");
  const final = document.getElementById("bb-world-final");
  const scoreLabel = document.getElementById("bb-world-score");
  const progressLabel = document.getElementById("bb-world-progress");
  const entriesList = document.getElementById("bb-world-entries");
  const nameKey = "bb-world-initials";
  let entries = [], online = false, pendingRun = null;
  let submitted = false, busy = false, pausedByBoard = false;
  let requestNumber = 0, previousFocus = null;

  const initials = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,5);
  const validScore = n => Number.isSafeInteger(n) && n > 0 && n <= 1000000000;
  const number = n => Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
  const compare = (a,b) => Number(b.score)-Number(a.score) ||
    Number(b.wave)-Number(a.wave) || Number(b.robots)-Number(a.robots);

  try { nameInput.value = initials(localStorage.getItem(nameKey)); }
  catch (_) { /* Initials are optional until submitting. */ }
  nameInput.addEventListener("input", () => { nameInput.value = initials(nameInput.value); });

  function setStatus(message, warning=false) {
    status.textContent = message;
    status.classList.toggle("is-warning", warning);
  }
  function render() {
    entriesList.replaceChildren();
    if (!online) {
      const item = document.createElement("li");
      item.className = "bb-world-empty";
      item.textContent = "World board unavailable. No online score has been saved.";
      entriesList.append(item);
      return;
    }
    if (!entries.length) {
      const item = document.createElement("li");
      item.className = "bb-world-empty";
      item.textContent = "The board is empty. Somebody has to go first.";
      entriesList.append(item);
      return;
    }
    for (const [i, entry] of entries.entries()) {
      const item = document.createElement("li");
      item.className = "bb-world-row";
      const pilot = document.createElement("strong");
      pilot.textContent = (i + 1) + ". " + entry.initials;
      const score = document.createElement("span");
      score.className = "bb-world-points";
      score.textContent = number(entry.score).toLocaleString();
      const wave = document.createElement("span");
      wave.textContent = String(number(entry.wave));
      const robots = document.createElement("span");
      robots.textContent = number(entry.robots).toLocaleString();
      const leviathan = document.createElement("span");
      leviathan.className = entry.leviathan ? "bb-world-victory" : "bb-world-no-victory";
      leviathan.textContent = entry.leviathan ? "DESTROYED" : "—";
      item.append(pilot,score,wave,robots,leviathan);
      entriesList.append(item);
    }
  }
  function qualifies(snapshot) {
    if (!online || !snapshot || !validScore(snapshot.score)) return false;
    if (entries.length < LIMIT) return true;
    return compare(snapshot, entries[LIMIT-1]) < 0;
  }
  function renderRun() {
    final.hidden = !pendingRun;
    if (pendingRun) {
      scoreLabel.textContent = number(pendingRun.score).toLocaleString();
      progressLabel.textContent = "WAVE " + pendingRun.wave +
        " // " + pendingRun.robots + " ROBOTS SCRAPPED" +
        (pendingRun.leviathan ? " // LEVIATHAN DESTROYED" : "");
    }
    const canSubmit = !busy && !submitted && qualifies(pendingRun);
    form.hidden = !canSubmit;
    if (canSubmit) {
      setStatus("NEW TOP 10 QUALIFIER // ENTER YOUR INITIALS");
    } else if (submitted) {
      setStatus("TRANSMISSION RECEIVED // SCORE RECORDED IN CLOUDFLARE");
    } else if (online && pendingRun) {
      setStatus("RUN COMPLETE // WORLD TOP 10 NOT REACHED");
    } else if (online) {
      setStatus("SHARED CLOUDFLARE D1 LEADERBOARD");
    }
  }
  async function request(method, data) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);
    try {
      const response = await fetch(ENDPOINT, {
        method, cache:"no-store", signal:controller.signal,
        headers: {Accept:"application/json", ...(data ? {"Content-Type":"application/json"} : {})},
        ...(data ? {body:JSON.stringify(data)} : {})
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || !payload.ok ||
          payload.game !== "beyond-berzerk" ||
          payload.ruleset !== RULESET || !Array.isArray(payload.entries))
        throw new Error(payload?.error || ("Leaderboard request failed (" + response.status + ")"));
      return payload.entries.filter(row =>
        row && typeof row.initials === "string" &&
        validScore(row.score) && Number.isSafeInteger(row.wave) &&
        Number.isSafeInteger(row.robots)
      ).sort(compare).slice(0,LIMIT);
    } finally { clearTimeout(timeout); }
  }
  async function refresh() {
    const ticket = ++requestNumber;
    online = false;
    form.hidden = true;
    setStatus("CONTACTING CLOUDFLARE // VERIFYING RANKINGS");
    try {
      const fresh = await request("GET");
      if (ticket !== requestNumber) return;
      entries = fresh;
      online = true;
      render();
      renderRun();
    } catch (error) {
      if (ticket !== requestNumber) return;
      online = false;
      entries = [];
      render();
      setStatus("WORLD BOARD OFFLINE // " + (error.message || "Connection failed"), true);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || submitted || !qualifies(pendingRun)) return;
    const name = initials(nameInput.value);
    if (!name) {
      setStatus("ENTER 1–5 LETTERS OR NUMBERS", true);
      nameInput.focus();
      return;
    }
    const snapshot = pendingRun;
    busy = true;
    form.hidden = true;
    setStatus("TRANSMITTING FINAL SCORE TO CLOUDFLARE");
    try {
      const fresh = await request("POST", {
        initials:name, score:snapshot.score, wave:snapshot.wave,
        robots:snapshot.robots, leviathan:snapshot.leviathan,
        build:BUILD, ruleset:RULESET, mode:"normal"
      });
      submitted = true;
      entries = fresh; online = true;
      try { localStorage.setItem(nameKey, name); } catch (_) {}
      render();
      renderRun();
    } catch (error) {
      online = false;
      setStatus("SCORE NOT SAVED // " + (error.message || "Try again"), true);
      render();
    } finally {
      busy = false;
      submitBtn.disabled = false;
      if (online) renderRun();
      else if (pendingRun) form.hidden = false; // Keep a manual retry visible.
    }
  }
  function open() {
    if (!board.hidden) return;
    previousFocus = document.activeElement;
    pausedByBoard = false;
    if (window.BeyondBerzerkBoardBridge?.phase() === "playing") {
      window.BeyondBerzerkBoardBridge.togglePause();
      pausedByBoard = true;
    }
    board.hidden = false;
    button.setAttribute("aria-expanded", "true");
    final.hidden = !pendingRun;
    render();
    renderRun();
    refresh();
    closeBtn.focus({preventScroll:true});
  }
  function close(forNewRun=false) {
    if (board.hidden) return;
    board.hidden = true;
    button.setAttribute("aria-expanded", "false");
    requestNumber++; // Discard responses for a previous modal session.
    if (pausedByBoard && !forNewRun &&
        window.BeyondBerzerkBoardBridge?.phase() === "paused")
      window.BeyondBerzerkBoardBridge.togglePause();
    pausedByBoard = false;
    if (!forNewRun) (previousFocus?.isConnected ? previousFocus : button).focus({preventScroll:true});
    previousFocus = null;
  }
  button.addEventListener("click", open);
  closeBtn.addEventListener("click", () => close());
  refreshBtn.addEventListener("click", refresh);
  form.addEventListener("submit", submit);
  board.addEventListener("pointerdown", event => {
    if (event.target === board) close();
  });
  board.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    event.stopPropagation(); // Never fire the game or restart while typing initials.
  });
  window.addEventListener("bb:run-start", () => {
    close(true);
    pendingRun = null; submitted = false; busy = false;
    form.hidden = true; final.hidden = true;
  });
  window.addEventListener("bb:game-over", event => {
    const run = event.detail;
    if (!run || !validScore(run.score)) return;
    pendingRun = {
      score:run.score, wave:Math.max(1,Math.floor(number(run.wave))),
      robots:Math.floor(number(run.robots)), leviathan:!!run.leviathan
    };
    submitted = false; busy = false;
    // Qualifying is confirmed against live D1 rankings; this does NOT post automatically.
    if (!board.hidden) close(true);
    open();
  });
  button.setAttribute("aria-expanded", "false");
})();