// Spiel 24: Snow Race – Weihnachts-Circuit (mit Motor-Sound, Restart & Timesheet)
// -----------------------------------------------------------------
// Steuerung:
//   - Beschleunigen:   W / Pfeil ↑
//   - Bremsen/Rückwärts: S / Pfeil ↓
//   - Links/Rechts:    A/D oder Pfeil ←/→
//   - SPACE oder Button: Rennen starten / Restart
//
// Regeln:
//   - Kurvige Rundstrecke (Top-Down), komplette Strecke im Blick.
//   - Harte Bande: verlässt du die Fahrbahn, wirst du stark abgebremst / zurückgeprallt (ohne Sound).
//   - 3 komplette Runden fahren, dann ist das Rennen vorbei.
//   - Sterne nach Gesamtzeit (3 Runden):
//       <= 21 s  → Roter Stern
//       <= 24 s  → Goldener Stern
//       <= 26 s  → Silberner Stern
//       <= 28 s  → Brauner Stern
//
// Optik:
//   - Schnee, kurvige Strecke, viele Weihnachtsbäume rundherum.
//   - Ziellinie quer zur Fahrtrichtung am Startpunkt.

window.AdventGames = window.AdventGames || {};

window.AdventGames["game24"] = function initSnowRace(container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  // ------------------ Hilfsfunktionen / Sterne ------------------

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function starForTime(seconds) {
    if (seconds <= 20) return { level: "red", label: "Roter Stern" };
    if (seconds <= 23) return { level: "gold", label: "Goldener Stern" };
    if (seconds <= 25) return { level: "silver", label: "Silberner Stern" };
    if (seconds <= 28) return { level: "brown", label: "Brauner Stern" };
    return null;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return String(m).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
  }

  function formatLapTime(sec) {
    return sec.toFixed(2).replace(".", ",") + " s";
  }

  // ------------------------ DOM-Setup ---------------------------

  container.innerHTML = "";
  container.style.position = "relative";

  const root = document.createElement("div");
  root.className = "snow-race-24-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "4px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 24 – Snow Race";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Zeitrennen auf einem verschneiten Weihnachts-Circuit: 3 Runden, harte Bande, Bestzeit für den Stern!";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.opacity = "0.9";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  // Controls-Leiste
  const controlsRow = document.createElement("div");
  controlsRow.style.display = "flex";
  controlsRow.style.gap = "10px";
  controlsRow.style.alignItems = "center";
  controlsRow.style.fontSize = "0.82rem";
  controlsRow.style.marginTop = "4px";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.textContent = "Rennen starten";
  startBtn.style.padding = "6px 14px";
  startBtn.style.borderRadius = "999px";
  startBtn.style.border = "none";
  startBtn.style.cursor = "pointer";
  startBtn.style.fontSize = "0.85rem";
  startBtn.style.fontWeight = "600";
  startBtn.style.background =
    "linear-gradient(135deg, #38bdf8, #22c55e, #eab308)";
  startBtn.style.color = "#0f172a";
  startBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.textContent = "Neu starten";
  restartBtn.style.padding = "6px 10px";
  restartBtn.style.borderRadius = "999px";
  restartBtn.style.border = "1px solid rgba(148,163,184,0.7)";
  restartBtn.style.cursor = "pointer";
  restartBtn.style.fontSize = "0.8rem";
  restartBtn.style.fontWeight = "500";
  restartBtn.style.background = "rgba(15,23,42,0.9)";
  restartBtn.style.color = "#e5e7eb";

  const statusLabel = document.createElement("div");
  statusLabel.style.opacity = "0.9";
  statusLabel.textContent =
    "WASD / Pfeiltasten: fahren & lenken. 3 Runden – harte Bande, jede Berührung kostet Zeit!";

  controlsRow.appendChild(startBtn);
  controlsRow.appendChild(restartBtn);
  controlsRow.appendChild(statusLabel);
  root.appendChild(controlsRow);

  // HUD
  const hudRow = document.createElement("div");
  hudRow.style.display = "flex";
  hudRow.style.gap = "12px";
  hudRow.style.fontSize = "0.82rem";
  hudRow.style.marginTop = "2px";

  function makeHudItem(label) {
    const span = document.createElement("span");
    const strong = document.createElement("strong");
    span.textContent = label + ": ";
    span.appendChild(strong);
    return { wrap: span, valueEl: strong };
  }

  const timeHud = makeHudItem("Zeit");
  const lapHud = makeHudItem("Runde");
  const speedHud = makeHudItem("Speed");

  hudRow.appendChild(timeHud.wrap);
  hudRow.appendChild(lapHud.wrap);
  hudRow.appendChild(speedHud.wrap);

  root.appendChild(hudRow);

  // Layout: Canvas links, Info rechts
  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "flex-start";
  layout.style.marginTop = "6px";

  const left = document.createElement("div");
  left.style.flex = "1 1 auto";

  const right = document.createElement("aside");
  right.style.flex = "0 0 220px";
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "10px";
  right.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);
  container.appendChild(root);

  // Canvas + Overlay
  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.borderRadius = "12px";
  canvasWrapper.style.background =
    "radial-gradient(circle at top, #020617, #020617)";
  canvasWrapper.style.boxShadow = "0 4px 16px rgba(0,0,0,0.7)";
  canvasWrapper.style.padding = "8px";

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.borderRadius = "10px";
  canvasWrapper.appendChild(canvas);
  left.appendChild(canvasWrapper);

  const ctx = canvas.getContext("2d");

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontSize = "2.6rem";
  overlay.style.fontWeight = "700";
  overlay.style.color = "rgba(255,255,255,0.96)";
  overlay.style.textShadow = "0 0 14px rgba(0,0,0,0.9)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  canvasWrapper.appendChild(overlay);

  function showOverlay(text) {
    overlay.textContent = text;
    overlay.style.opacity = "1";
  }

  function hideOverlay() {
    overlay.style.opacity = "0";
  }

  // Timesheet-Overlay
  const timesheetOverlay = document.createElement("div");
  timesheetOverlay.style.position = "absolute";
  timesheetOverlay.style.inset = "0";
  timesheetOverlay.style.display = "flex";
  timesheetOverlay.style.alignItems = "center";
  timesheetOverlay.style.justifyContent = "center";
  timesheetOverlay.style.background = "rgba(15,23,42,0.78)";
  timesheetOverlay.style.opacity = "0";
  timesheetOverlay.style.pointerEvents = "none";
  timesheetOverlay.style.transition = "opacity 0.18s ease-out";

  const timesheetBox = document.createElement("div");
  timesheetBox.style.minWidth = "260px";
  timesheetBox.style.maxWidth = "320px";
  timesheetBox.style.borderRadius = "12px";
  timesheetBox.style.background = "#020617";
  timesheetBox.style.border = "1px solid rgba(148,163,184,0.7)";
  timesheetBox.style.boxShadow = "0 12px 30px rgba(0,0,0,0.7)";
  timesheetBox.style.padding = "10px 12px 10px 12px";
  timesheetBox.style.color = "#e5e7eb";
  timesheetBox.style.fontSize = "0.8rem";
  timesheetBox.style.pointerEvents = "auto";

  const timesheetTitle = document.createElement("div");
  timesheetTitle.textContent = "Deine Rundenzeiten";
  timesheetTitle.style.fontWeight = "600";
  timesheetTitle.style.fontSize = "0.9rem";
  timesheetTitle.style.marginBottom = "4px";

  const timesheetBody = document.createElement("div");
  timesheetBody.style.display = "flex";
  timesheetBody.style.flexDirection = "column";
  timesheetBody.style.gap = "3px";
  timesheetBody.style.marginTop = "2px";

  const timesheetClose = document.createElement("button");
  timesheetClose.textContent = "Schließen";
  timesheetClose.type = "button";
  timesheetClose.style.marginTop = "8px";
  timesheetClose.style.alignSelf = "flex-end";
  timesheetClose.style.padding = "4px 10px";
  timesheetClose.style.borderRadius = "999px";
  timesheetClose.style.border = "1px solid rgba(148,163,184,0.7)";
  timesheetClose.style.background = "rgba(15,23,42,0.9)";
  timesheetClose.style.color = "#e5e7eb";
  timesheetClose.style.cursor = "pointer";
  timesheetClose.style.fontSize = "0.78rem";

  timesheetBox.appendChild(timesheetTitle);
  timesheetBox.appendChild(timesheetBody);
  timesheetBox.appendChild(timesheetClose);
  timesheetOverlay.appendChild(timesheetBox);
  container.appendChild(timesheetOverlay);

  function hideTimesheet() {
    timesheetOverlay.style.opacity = "0";
    timesheetOverlay.style.pointerEvents = "none";
  }

  function showTimesheet(lapTimesArr, totalTime, reward) {
    timesheetBody.innerHTML = "";

    lapTimesArr.forEach((t, idx) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.gap = "12px";
      row.innerHTML = `<span>Runde ${idx + 1}</span><span><strong>${formatLapTime(
        t
      )}</strong></span>`;
      timesheetBody.appendChild(row);
    });

    if (lapTimesArr.length) {
      const sep = document.createElement("div");
      sep.style.height = "1px";
      sep.style.background = "rgba(148,163,184,0.5)";
      sep.style.margin = "4px 0 2px 0";
      timesheetBody.appendChild(sep);
    }

    const totalRow = document.createElement("div");
    totalRow.style.display = "flex";
    totalRow.style.justifyContent = "space-between";
    totalRow.style.fontWeight = "600";
    totalRow.innerHTML = `<span>Gesamt</span><span>${formatLapTime(
      totalTime
    )} (${formatTime(totalTime)})</span>`;
    timesheetBody.appendChild(totalRow);

    const resultRow = document.createElement("div");
    resultRow.style.marginTop = "4px";
    const resultText = reward
      ? reward.label
      : "Leider nicht geschafft";
    resultRow.textContent = `Ergebnis: ${resultText}`;
    timesheetBody.appendChild(resultRow);

    timesheetOverlay.style.opacity = "1";
    timesheetOverlay.style.pointerEvents = "auto";
  }

  timesheetClose.addEventListener("click", hideTimesheet);

  // Rechte Seite – kleine Cards
  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "10px";
    card.style.padding = "10px 9px";
    card.style.background = "rgba(5,10,20,0.96)";
    card.style.border = "1px solid rgba(148,163,184,0.5)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "4px";

    const head = document.createElement("div");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.gap = "6px";

    const iconEl = document.createElement("div");
    iconEl.textContent = icon;
    iconEl.style.width = "22px";
    iconEl.style.height = "22px";
    iconEl.style.borderRadius = "999px";
    iconEl.style.display = "flex";
    iconEl.style.alignItems = "center";
    iconEl.style.justifyContent = "center";
    iconEl.style.fontSize = "1rem";
    iconEl.style.background = "rgba(255,255,255,0.06)";

    const titleEl2 = document.createElement("div");
    titleEl2.textContent = title;
    titleEl2.style.fontSize = "0.8rem";
    titleEl2.style.fontWeight = "600";

    head.appendChild(iconEl);
    head.appendChild(titleEl2);

    const body = document.createElement("div");
    body.style.fontSize = "0.75rem";
    body.style.opacity = "0.9";

    lines.forEach((l) => {
      const div = document.createElement("div");
      div.textContent = l;
      body.appendChild(div);
    });

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  right.appendChild(
    makeSideCard("Steuerung", "🏎️", [
      "W / Pfeil ↑  → Gas",
      "S / Pfeil ↓  → Bremsen / zurück",
      "A / D / ← / → → Lenken",
      "SPACE / Button → Rennen starten",
    ])
  );
  right.appendChild(
    makeSideCard("Tipp", "🎄", [
      "Früh einlenken,",
      "nicht zu hart aus der Kurve rausbeschleunigen,",
      "und die Bande meiden.",
    ])
  );

  // ------------------- Canvas, Strecke & Welt -------------------

  let width = 720;
  let height = 420;
  let dpr = window.devicePixelRatio || 1;

  // Kurvige Rundstrecke als Polyline in Normalized-Koordinaten (0..1)
  const PATH_POINTS_NORM = [
    { x: 0.22, y: 0.80 },
    { x: 0.33, y: 0.74 },
    { x: 0.47, y: 0.66 },
    { x: 0.63, y: 0.60 },
    { x: 0.78, y: 0.52 },
    { x: 0.86, y: 0.40 },
    { x: 0.82, y: 0.28 },
    { x: 0.68, y: 0.20 },
    { x: 0.50, y: 0.17 },
    { x: 0.34, y: 0.19 },
    { x: 0.22, y: 0.27 },
    { x: 0.14, y: 0.40 },
    { x: 0.13, y: 0.56 },
    { x: 0.18, y: 0.70 },
    { x: 0.22, y: 0.80 }, // zurück zum Start
  ];

  let trackPath = [];
  let segmentLengths = [];
  let totalTrackLength = 1;
  const TRACK_WIDTH = 70; // Breite der Fahrbahn
  let startDir = { x: 1, y: 0 }; // Richtung an der Ziellinie

  let trees = [];
  const TREE_COUNT = 90;

  function buildTrack() {
    trackPath = PATH_POINTS_NORM.map((p) => ({
      x: p.x * width,
      y: p.y * height,
    }));

    segmentLengths = [];
    totalTrackLength = 0;

    for (let i = 0; i < trackPath.length - 1; i++) {
      const p0 = trackPath[i];
      const p1 = trackPath[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 0.0001;
      segmentLengths.push(len);
      totalTrackLength += len;
    }

    if (trackPath.length >= 2) {
      const p0 = trackPath[0];
      const p1 = trackPath[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.hypot(dx, dy) || 1;
      startDir = { x: dx / len, y: dy / len };
    }

    generateTrees();
  }

  function getTrackMetrics(x, y) {
    if (trackPath.length < 2) {
      return { dist: Infinity, s: 0 };
    }
    let bestDistSq = Infinity;
    let bestS = 0;
    let accLen = 0;

    for (let i = 0; i < trackPath.length - 1; i++) {
      const p0 = trackPath[i];
      const p1 = trackPath[i + 1];
      const segLen = segmentLengths[i] || 0.0001;

      const vx = p1.x - p0.x;
      const vy = p1.y - p0.y;
      const segLenSq = vx * vx + vy * vy || 1;

      let t = ((x - p0.x) * vx + (y - p0.y) * vy) / segLenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;

      const projX = p0.x + vx * t;
      const projY = p0.y + vy * t;

      const dx = x - projX;
      const dy = y - projY;
      const distSq = dx * dx + dy * dy;

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestS = accLen + segLen * t;
      }

      accLen += segLen;
    }

    return { dist: Math.sqrt(bestDistSq), s: bestS };
  }

  function generateTrees() {
    trees = [];
    if (!trackPath.length) return;

    let attempts = 0;
    const marginX = width * 0.04;
    const marginY = height * 0.06;

    while (trees.length < TREE_COUNT && attempts < TREE_COUNT * 40) {
      attempts++;
      const x = marginX + Math.random() * (width - 2 * marginX);
      const y = marginY + Math.random() * (height - 2 * marginY);

      const m = getTrackMetrics(x, y);
      if (m.dist < TRACK_WIDTH * 0.9) continue;

      trees.push({
        x,
        y,
        size: 8 + Math.random() * 8,
      });
    }
  }

  function resizeCanvas() {
    const bounds = canvasWrapper.getBoundingClientRect();
    const targetWidth = clamp(bounds.width || 720, 560, 920);
    const targetHeight = targetWidth * 0.6;

    width = targetWidth;
    height = targetHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    buildTrack();
  }

  // ------------------------- Auto & Rennen ----------------------

  const CAR_LENGTH = 30;
  const CAR_WIDTH = 18;

  const MAX_FWD_SPEED = 260;
  const MAX_REV_SPEED = -80;
  const ACCEL_RATE = 260;
  const BRAKE_RATE = 420;
  const FRICTION = 1.3;
  const TURN_RATE = 2.8;

  // realistischerer km/h-Wert
  const SPEED_TO_KMH = 0.45; // ~117 km/h bei MAX_FWD_SPEED

  const STATE_IDLE = "idle";
  const STATE_COUNTDOWN = "countdown";
  const STATE_RUNNING = "running";
  const STATE_FINISHED = "finished";

  let state = STATE_IDLE;
  let countdownStart = 0;
  const COUNTDOWN_SECONDS = 3;

  let car = null;

  const input = {
    accel: false,
    brake: false,
    left: false,
    right: false,
  };

  let lap = 1;               // vollständig gefahrene Runden
  const MAX_LAPS = 4;
  let elapsed = 0;
  let raceStartTime = null;
  let lastTimestamp = null;
  let animationFrameId = null;
  let destroyed = false;
  let wallHitTimer = 0;

  // Position entlang der Strecke
  let pathPos = 0;
  let lastPathPos = 0;
  let hasLeftStartSector = false; // wurde der Startbereich in dieser Runde verlassen?

  // Lap-Zeiten
  let lapTimes = [];
  let lapStartElapsed = 0;

  function resetCarToStart() {
    if (!trackPath.length) return;
    const p0 = trackPath[0];
    const p1 = trackPath[1] || trackPath[0];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const angle = Math.atan2(dy, dx);

    car = {
      x: p0.x,
      y: p0.y,
      angle,
      speed: 0,
    };

    const m = getTrackMetrics(car.x, car.y);
    pathPos = m.s;
    lastPathPos = m.s;
    hasLeftStartSector = false;
  }

  function fullReset() {
    lap = 1;
    lapTimes = [];
    lapStartElapsed = 0;
    elapsed = 0;
    raceStartTime = null;
    lastTimestamp = null;
    state = STATE_IDLE;
    wallHitTimer = 0;
    resetCarToStart();
    hideOverlay();
    hideTimesheet();
    hasLeftStartSector = false;
    statusLabel.textContent =
      "WASD / Pfeiltasten: fahren & lenken. 3 Runden – jede Bande kostet Zeit.";
    updateHUD();
  }

  // ---------------------------- Input ---------------------------

  function handleKeyDown(e) {
    if (e.repeat) return;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        input.accel = true;
        break;
      case "ArrowDown":
      case "KeyS":
        input.brake = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        input.left = true;
        break;
      case "ArrowRight":
      case "KeyD":
        input.right = true;
        break;
      case "Space":
        if (state === STATE_IDLE || state === STATE_FINISHED) {
          startCountdown();
        } else if (state === STATE_RUNNING || state === STATE_COUNTDOWN) {
          // Schnell-Restart per SPACE während des Rennens
          fullReset();
          startCountdown();
        }
        break;
    }
    maybeStartEngineAudio();
  }

  function handleKeyUp(e) {
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        input.accel = false;
        break;
      case "ArrowDown":
      case "KeyS":
        input.brake = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        input.left = false;
        break;
      case "ArrowRight":
      case "KeyD":
        input.right = false;
        break;
    }
  }

  // ------------------------ Audio (Beep & Motor) ----------------

  let audioCtx = null;

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function playBeep(kind) {
    const ctxAudio = audioCtx;
    if (!ctxAudio) return;
    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();

    let freq = 440;
    let duration = 0.12;
    let type = "square";

    if (kind === "count") {
      freq = 520;
      duration = 0.08;
      type = "square";
    } else if (kind === "go") {
      freq = 780;
      duration = 0.18;
      type = "triangle";
    }

    osc.type = type;
    gain.gain.value = 0.16;

    osc.connect(gain);
    gain.connect(ctxAudio.destination);

    const now = ctxAudio.currentTime;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Motor-Sound über Audio-Element
  let engineAudio = null;
  let engineAudioStarted = false;

  function ensureEngineAudio() {
    if (engineAudio) return engineAudio;
    try {
      engineAudio = new Audio("assets/audio/car.wav");
      engineAudio.loop = true;
      engineAudio.volume = 1.0;
    } catch {
      engineAudio = null;
    }
    return engineAudio;
  }

  function maybeStartEngineAudio() {
    const audio = ensureEngineAudio();
    if (!audio) return;
    if (!engineAudioStarted) {
      engineAudioStarted = true;
      audio.play().catch(() => {
        // Autoplay blockiert – dann bleibt es halt still
      });
    }
  }

  function updateEngineAudio() {
    if (!engineAudio) return;
    const speedAbs = car ? Math.abs(car.speed) : 0;

    if (state === STATE_RUNNING && speedAbs > 5) {
      const t = clamp(speedAbs / MAX_FWD_SPEED, 0, 1);
      const minRate = 0.85;
      const maxRate = 1.4;
      engineAudio.playbackRate = minRate + (maxRate - minRate) * t;

      const minVol = 0.80;
      const maxVol = 0.95;
      engineAudio.volume = minVol + (maxVol - minVol) * t;
    } else {
      engineAudio.volume = 0;
    }
  }

  // ----------------------------- Rennen -------------------------

  function startCountdown() {
    if (state === STATE_COUNTDOWN) return;

    if (!audioCtx) ensureAudioContext();
    maybeStartEngineAudio();
    hideTimesheet();

    if (state === STATE_FINISHED) {
      fullReset();
    }

    state = STATE_COUNTDOWN;
    countdownStart = performance.now();
    showOverlay(String(COUNTDOWN_SECONDS));
    statusLabel.textContent = "Countdown läuft…";
  }

  function startRace() {
    state = STATE_RUNNING;
    raceStartTime = performance.now();
    elapsed = 0;
    lap = 1;
    lapTimes = [];
    lapStartElapsed = 0;
    hasLeftStartSector = false;
    const m = getTrackMetrics(car.x, car.y);
    pathPos = m.s;
    lastPathPos = m.s;
    wallHitTimer = 0;
    hideOverlay();
    statusLabel.textContent =
      "Rennen läuft! 3 Runden – Bande berühren kostet dich Zeit.";
  }

  function finishRace() {
    if (state === STATE_FINISHED) return;
    state = STATE_FINISHED;
    const totalTime = elapsed;
    updateHUD();
    updateEngineAudio();

    const reward = starForTime(totalTime);

    if (reward) {
      try {
        onWin(reward);
      } catch (e) {
        console.error("snow_race_24 onWin error:", e);
      }
    }

    try {
      if (
        typeof window !== "undefined" &&
        typeof window.playVictorySound === "function"
      ) {
        window.playVictorySound();
      }
    } catch (e) {}

    const resultText = reward ? reward.label : "Leider nicht geschafft";
    const text = `${formatTime(totalTime)} – ${resultText}`;
    showOverlay(text);
    showTimesheet(lapTimes, totalTime, reward);

    statusLabel.textContent =
      "Rennen beendet! Mit SPACE oder den Buttons kannst du ein neues Rennen starten.";
  }

  // -------------------------- Physik/Logik ----------------------

  function updateCar(dt) {
    if (!car) return;

    const speedAbs = Math.abs(car.speed);
    const speedFactor = clamp(speedAbs / MAX_FWD_SPEED, 0, 1);
    const turnAmount = TURN_RATE * (0.3 + 0.7 * speedFactor) * dt;

    if (input.left) {
      car.angle -= turnAmount;
    }
    if (input.right) {
      car.angle += turnAmount;
    }

    if (input.accel) {
      car.speed += ACCEL_RATE * dt;
    }
    if (input.brake) {
      car.speed -= BRAKE_RATE * dt;
    }

    const friction = input.accel || input.brake ? FRICTION * 0.5 : FRICTION;
    if (car.speed > 0) {
      car.speed = Math.max(
        0,
        car.speed - friction * dt * MAX_FWD_SPEED * 0.5
      );
    } else if (car.speed < 0) {
      car.speed = Math.min(
        0,
        car.speed + friction * dt * MAX_FWD_SPEED * 0.4
      );
    }

    car.speed = clamp(car.speed, MAX_REV_SPEED, MAX_FWD_SPEED);

    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;

    const newX = car.x + dx;
    const newY = car.y + dy;

    const metrics = getTrackMetrics(newX, newY);

    if (metrics.dist > TRACK_WIDTH * 0.55) {
      // Harte Bande: Bewegung abbrechen + zurückprallen, aber ohne Sound
      car.speed *= -0.3;
      wallHitTimer = 0.2;
    } else {
      car.x = newX;
      car.y = newY;
    }

    if (wallHitTimer > 0) {
      wallHitTimer -= dt;
      if (wallHitTimer < 0) wallHitTimer = 0;
    }
  }

  function updateLapProgress() {
    if (!car || !trackPath.length || state !== STATE_RUNNING) return;

    const m = getTrackMetrics(car.x, car.y);
    const s = m.s;
    const delta = s - lastPathPos;

    // Startsektor: kleiner Bereich um die Startlinie
    const startSectorSize = totalTrackLength * 0.08;

    if (!hasLeftStartSector) {
      // Spieler muss den Startbereich erst verlassen,
      // bevor eine Runde gezählt werden darf
      if (s > startSectorSize) {
        hasLeftStartSector = true;
      }
    } else {
      // Wrap-around: von "nahe Ende" wieder zu "nahe Start"
      if (delta < -0.5 * totalTrackLength) {
        const dir = {
          x: Math.cos(car.angle),
          y: Math.sin(car.angle),
        };
        const dot = dir.x * startDir.x + dir.y * startDir.y;

        if (dot > 0) {
          const lapTime = elapsed - lapStartElapsed;
          lapTimes.push(lapTime);
          lapStartElapsed = elapsed;

          lap += 1;
          hasLeftStartSector = false;

          if (lap > MAX_LAPS) {
            finishRace();
          }
        }
      }
    }

    lastPathPos = s;
  }

  // ------------------------------ HUD ---------------------------

  function updateHUD() {
    timeHud.valueEl.textContent =
      state === STATE_RUNNING || state === STATE_FINISHED
        ? formatTime(elapsed)
        : "00:00";

    // Anzeige: vollendete Runden (0/3, 1/3, 2/3, 3/3)
    const displayLap = Math.min(lap, MAX_LAPS);
    lapHud.valueEl.textContent = `${displayLap}/${MAX_LAPS}`;

    const speedAbs = car ? Math.abs(car.speed) : 0;
    const kmh = speedAbs * SPEED_TO_KMH;
    speedHud.valueEl.textContent = Math.round(kmh) + " km/h";
  }

  // ---------------------------- Rendern -------------------------

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.3, "#0b1727");
    grad.addColorStop(1, "#020617");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(148,163,184,0.35)";
    for (let i = 0; i < 220; i++) {
      const x = (i * 73.7) % width;
      const y = ((i * 91.1) % height) * 1.01;
      const r = 0.6 + (i % 3) * 0.4;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTrack() {
    if (!trackPath.length) return;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Außen-Glow
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = TRACK_WIDTH + 18;
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
      ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.stroke();

    // Fahrbahn dunkel
    ctx.strokeStyle = "#020617";
    ctx.lineWidth = TRACK_WIDTH;
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
      ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.stroke();

    // hellere Mitte
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = TRACK_WIDTH - 16;
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
      ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.stroke();

    // Mittellinie
    ctx.strokeStyle = "rgba(248,250,252,0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(trackPath[0].x, trackPath[0].y);
    for (let i = 1; i < trackPath.length; i++) {
      ctx.lineTo(trackPath[i].x, trackPath[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Ziellinie (Schachbrett) QUER zur Fahrtrichtung am Startpunkt
    if (trackPath.length >= 2) {
      const p0 = trackPath[0];
      const p1 = trackPath[1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;

      // Tangentenwinkel der Strecke:
      const tangentAngle = Math.atan2(dy, dx);
      // Linie quer zur Fahrtrichtung → + 90°
      const finishAngle = tangentAngle + Math.PI / 2;

      ctx.save();
      ctx.translate(p0.x, p0.y);
      ctx.rotate(finishAngle);

      const lineW = TRACK_WIDTH * 0.9; // Breite quer über die Strecke
      const lineH = 12;                // "Dicke" entlang der Fahrtrichtung
      const tile = 6;

      for (let x = -lineW / 2; x < lineW / 2; x += tile) {
        for (let y = -lineH / 2; y < lineH / 2; y += tile) {
          const dark =
            ((Math.floor(x / tile) + Math.floor(y / tile)) & 1) === 0;
          ctx.fillStyle = dark ? "#111827" : "#f9fafb";
          ctx.fillRect(x, y, tile, tile);
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }

  function drawTrees() {
    ctx.save();
    for (const t of trees) {
      const x = t.x;
      const y = t.y;
      const s = t.size;

      ctx.fillStyle = "#78350f";
      ctx.fillRect(x - s * 0.18, y, s * 0.36, s * 0.7);

      const levels = 3;
      for (let i = 0; i < levels; i++) {
        const levelHeight = s * 0.9;
        const topY = y - (levels - i) * (levelHeight * 0.5);
        const baseY = topY + levelHeight;
        const w = s * (1.4 - i * 0.25);
        const gx = ctx.createLinearGradient(x, topY, x, baseY);
        gx.addColorStop(0, "#22c55e");
        gx.addColorStop(1, "#15803d");
        ctx.fillStyle = gx;
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x - w, baseY);
        ctx.lineTo(x + w, baseY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.arc(x, y - s * 1.6, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCar() {
    if (!car) return;
    const { x, y, angle } = car;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const w = CAR_LENGTH;
    const h = CAR_WIDTH;

    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, "#38bdf8");
    grad.addColorStop(0.5, "#0ea5e9");
    grad.addColorStop(1, "#22c55e");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "#020617";
    ctx.lineWidth = 2;

    const r = 6;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.lineTo(w / 2 - r, -h / 2);
    ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    ctx.lineTo(w / 2, h / 2 - r);
    ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    ctx.lineTo(-w / 2 + r, h / 2);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    ctx.lineTo(-w / 2, -h / 2 + r);
    ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.fillRect(w * 0.05, -h * 0.36, w * 0.35, h * 0.72);

    ctx.fillStyle = "#f97316";
    ctx.fillRect(-w / 2 - 1, -h * 0.3, 3, h * 0.26);
    ctx.fillRect(-w / 2 - 1, h * 0.04, 3, h * 0.26);

    if (wallHitTimer > 0) {
      ctx.fillStyle = "rgba(248,250,252,0.9)";
      const s = 3 + wallHitTimer * 20;
      ctx.beginPath();
      ctx.arc(w / 2 + 3, 0, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function render() {
    drawBackground();
    drawTrack();
    drawTrees();
    drawCar();
  }

  // ----------------------------- Loop ---------------------------

  function step(timestamp) {
    if (destroyed) return;

    if (lastTimestamp == null) {
      lastTimestamp = timestamp;
    }
    const dt = Math.min(0.04, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    if (state === STATE_COUNTDOWN) {
      const t = (performance.now() - countdownStart) / 1000;
      const remaining = COUNTDOWN_SECONDS - t;
      if (remaining <= 0) {
        showOverlay("GO!");
        if (!audioCtx) ensureAudioContext();
        playBeep("go");
        startRace();
        setTimeout(() => {
          if (!destroyed && state === STATE_RUNNING) {
            hideOverlay();
          }
        }, 220);
      } else {
        const r = Math.ceil(remaining);
        showOverlay(String(r));
        if (!audioCtx) ensureAudioContext();
        if (Math.abs(remaining - r) < dt * 1.2) {
          playBeep("count");
        }
      }
    }

    if (state === STATE_RUNNING) {
      elapsed = (performance.now() - raceStartTime) / 1000;
      updateCar(dt);
      updateLapProgress();
      updateHUD();
    } else {
      updateHUD();
    }

    updateEngineAudio();
    render();
    animationFrameId = window.requestAnimationFrame(step);
  }

  // ------------------------ Events & Init -----------------------

  function handleResize() {
    resizeCanvas();
    resetCarToStart();
  }

  startBtn.addEventListener("click", () => {
    // immer: komplett neu + Countdown
    fullReset();
    startCountdown();
    maybeStartEngineAudio();
  });

  restartBtn.addEventListener("click", () => {
    // Schnell-Restart, egal in welchem Zustand
    fullReset();
    startCountdown();
    maybeStartEngineAudio();
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", handleResize);

  // Initial
  resizeCanvas();
  resetCarToStart();
  updateHUD();
  animationFrameId = window.requestAnimationFrame(step);

  // ---------------------------- Cleanup -------------------------

  return {
    destroy() {
      destroyed = true;
      try {
        window.cancelAnimationFrame(animationFrameId);
      } catch (e) {}
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      if (engineAudio) {
        try {
          engineAudio.pause();
        } catch (e) {}
        engineAudio = null;
        engineAudioStarted = false;
      }
    },
  };
};
