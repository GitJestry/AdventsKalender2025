// Spiel 19: Bumper Cookies – Keks-Bumper-Arena
// -----------------------------------------------------
// Deathmatch-Version:
// - 3 Runden Deathmatch
// - 1 Spieler + 5 Bots (6 Kekse total)
// - Größeres Feld (relativ kleinere Kekse)
// - Schnelleres Movement
// - Dash-Kraft mit Knockback gekoppelt
// - Milchrand optisch "milchiger"
// - Sternwertung nach Summe der Platzierungen über 3 Runden

window.AdventGames = window.AdventGames || {};

window.AdventGames["keks_19"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin =
    typeof opts.onWin === "function" ? opts.onWin : () => {};

  // ---------------------------------------------------
  // Stern-Logik (Deathmatch, 3 Runden)
  // ---------------------------------------------------
  //
  // Platzierungs-Summe über alle 3 Runden:
  //   <= 3 → Roter Stern
  //   <= 4 → Goldener Stern
  //   <= 6 → Silberner Stern
  //   <= 8 → Brauner Stern
  function starForPlacementSum(sum) {
    if (sum <= 3) {
      return { level: "red", label: "Roter Stern" };
    }
    if (sum <= 4) {
      return { level: "gold", label: "Goldener Stern" };
    }
    if (sum <= 6) {
      return { level: "silver", label: "Silberner Stern" };
    }
    if (sum <= 8) {
      return { level: "brown", label: "Brauner Stern" };
    }
    return null;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return String(m).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // ---------------------------------------------------
  // Audio (simple Beep-Sounds)
  // ---------------------------------------------------

  let audioCtx = null;

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function playSound(kind) {
    const ctx = audioCtx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 440;
    let type = "sine";
    let duration = 0.15;

    switch (kind) {
      case "dash":
        freq = 720;
        type = "square";
        duration = 0.09;
        break;
      case "hit":
        freq = 380;
        type = "triangle";
        duration = 0.1;
        break;
      case "fall":
        freq = 220;
        type = "sawtooth";
        duration = 0.25;
        break;
      case "win":
        freq = 880;
        type = "triangle";
        duration = 0.25;
        break;
      case "lose":
        freq = 180;
        type = "sine";
        duration = 0.25;
        break;
      default:
        freq = 440;
    }

    osc.type = type;
    // alle Sounds jetzt extrem leise
    gain.gain.value = 0.003;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(freq, now);
    if (kind === "fall") {
      osc.frequency.linearRampToValueAtTime(freq * 0.6, now + duration);
      gain.gain.setValueAtTime(0.004, now);
      gain.gain.linearRampToValueAtTime(0.0, now + duration);
    } else {
      gain.gain.setValueAtTime(0.003, now);
      gain.gain.linearRampToValueAtTime(0.0, now + duration);
    }

    osc.start(now);
    osc.stop(now + duration);
  }

  // ---------------------------------------------------
  // DOM-Layout
  // ---------------------------------------------------

  container.innerHTML = "";
  container.style.position = "relative";

  const root = document.createElement("div");
  root.className = "bumper-cookies-19-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";
  root.style.color = "#e5e7eb";
  root.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 19 – Bumper Cookies";
  titleEl.style.fontWeight = "700";
  titleEl.style.fontSize = "1.1rem";
  titleEl.style.letterSpacing = "0.03em";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "3 Runden Deathmatch auf dem Holzbrett: Stoße die anderen Kekse in die Milch und hol dir mit guten Platzierungen deinen Stern.";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.opacity = "0.9";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  const infoRow = document.createElement("div");
  infoRow.style.display = "flex";
  infoRow.style.gap = "8px";
  infoRow.style.alignItems = "center";
  infoRow.style.fontSize = "0.82rem";
  infoRow.style.marginTop = "4px";

  function makeInfoPill() {
    const wrap = document.createElement("div");
    wrap.style.display = "inline-flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "4px";
    wrap.style.padding = "3px 8px";
    wrap.style.borderRadius = "999px";
    wrap.style.background = "rgba(15,23,42,0.95)";
    wrap.style.border = "1px solid rgba(248,250,252,0.16)";
    const strong = document.createElement("span");
    strong.style.fontWeight = "600";
    strong.style.minWidth = "3ch";
    strong.style.textAlign = "right";
    const labelSpan = document.createElement("span");
    labelSpan.style.opacity = "0.86";
    wrap.appendChild(strong);
    wrap.appendChild(labelSpan);
    return { wrap, strong, labelSpan };
  }

  const roundInfo = makeInfoPill();
  const aliveInfo = makeInfoPill();
  const scoreInfo = makeInfoPill();

  roundInfo.labelSpan.textContent = "Runde";
  aliveInfo.labelSpan.textContent = "Noch im Spiel";
  scoreInfo.labelSpan.textContent = "Platz-Summe";

  scoreInfo.wrap.style.marginLeft = "auto";

  infoRow.appendChild(roundInfo.wrap);
  infoRow.appendChild(aliveInfo.wrap);
  infoRow.appendChild(scoreInfo.wrap);
  root.appendChild(infoRow);

  const statusRow = document.createElement("div");
  statusRow.style.fontSize = "0.82rem";
  statusRow.style.opacity = "0.9";
  statusRow.style.marginTop = "2px";
  root.appendChild(statusRow);

  function setStatus(text) {
    statusRow.textContent = text;
  }

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

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);
  container.appendChild(root);

  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.borderRadius = "14px";
  canvasWrapper.style.background =
    "radial-gradient(circle at top, #020617, #020617 60%, #000000 100%)";
  canvasWrapper.style.boxShadow = "0 16px 40px rgba(0,0,0,0.7)";
  canvasWrapper.style.padding = "8px";
  canvasWrapper.style.overflow = "hidden";

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
  overlay.style.fontSize = "2.4rem";
  overlay.style.fontWeight = "700";
  overlay.style.color = "rgba(255,255,255,0.96)";
  overlay.style.textShadow = "0 0 18px rgba(0,0,0,0.9)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.style.transform = "scale(0.9)";
  overlay.style.transition = "opacity 0.25s ease-out, transform 0.25s ease-out";
  overlay.style.backdropFilter = "blur(2px)";
  canvasWrapper.appendChild(overlay);

  function showOverlayText(text) {
    overlay.textContent = text;
    overlay.style.opacity = "1";
    overlay.style.transform = "scale(1)";
  }

  function hideOverlayText() {
    overlay.style.opacity = "0";
    overlay.style.transform = "scale(0.9)";
  }

  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "10px";
    card.style.padding = "10px 9px";
    card.style.background = "rgba(15,23,42,0.96)";
    card.style.border = "1px solid rgba(148,163,184,0.4)";
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
    iconEl.style.background = "rgba(15,23,42,0.9)";

    const titleEl2 = document.createElement("div");
    titleEl2.textContent = title;
    titleEl2.style.fontSize = "0.8rem";
    titleEl2.style.fontWeight = "600";

    head.appendChild(iconEl);
    head.appendChild(titleEl2);

    const body = document.createElement("div");
    body.style.fontSize = "0.75rem";
    body.style.opacity = "0.9";

    for (const line of lines) {
      const div = document.createElement("div");
      div.textContent = line;
      body.appendChild(div);
    }

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  const controlsCard = makeSideCard("Steuerung", "⌨️", [
    "WASD oder Pfeiltasten → bewegen",
    "Shift / Leertaste halten → Dash aufladen",
    "Taste loslassen → starker Stoß",
  ]);
  right.appendChild(controlsCard);

  const tipsCard = makeSideCard("Deathmatch", "🍪", [
    "In 3 Runden möglichst gute",
    "Platzierungen holen.",
    "Je kleiner die Summe, desto",
    "besser dein Stern am Ende.",
  ]);
  right.appendChild(tipsCard);

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.textContent = "Neu starten";
  restartBtn.style.marginTop = "4px";
  restartBtn.style.alignSelf = "flex-start";
  restartBtn.style.padding = "6px 12px";
  restartBtn.style.borderRadius = "999px";
  restartBtn.style.border = "none";
  restartBtn.style.cursor = "pointer";
  restartBtn.style.fontSize = "0.82rem";
  restartBtn.style.background = "rgba(15,23,42,0.98)";
  restartBtn.style.color = "rgba(248,250,252,0.96)";
  restartBtn.style.border = "1px solid rgba(248,250,252,0.22)";
  restartBtn.style.transition = "background 0.15s ease-out, transform 0.1s";
  restartBtn.addEventListener("mouseenter", () => {
    restartBtn.style.background = "rgba(30,64,175,0.96)";
    restartBtn.style.transform = "translateY(-1px)";
  });
  restartBtn.addEventListener("mouseleave", () => {
    restartBtn.style.background = "rgba(15,23,42,0.98)";
    restartBtn.style.transform = "translateY(0)";
  });
  right.appendChild(restartBtn);

  // ---------------------------------------------------
  // Canvas / Arena
  // ---------------------------------------------------

  let width = 480;
  let height = 480;
  let dpr = window.devicePixelRatio || 1;

  // Größere Welt → relativ kleinere Kekse
  const WORLD_ARENA_RADIUS = 240;
  // Kekse 20 % größer
  const COOKIE_RADIUS = 18 * 1.2;

  let arenaCx = 0;
  let arenaCy = 0;
  let arenaPixelRadius = 0;
  let worldToScreenScale = 1;

  function resizeCanvas() {
    const bounds = canvasWrapper.getBoundingClientRect();
    const targetSize = clamp(bounds.width || 520, 360, 560);
    width = targetSize;
    height = targetSize;
    dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    arenaCx = width / 2;
    arenaCy = height / 2;
    arenaPixelRadius = Math.min(width, height) / 2 - 18;
    worldToScreenScale = arenaPixelRadius / WORLD_ARENA_RADIUS;
  }

  // ---------------------------------------------------
  // Cookie-Bild
  // ---------------------------------------------------

  const cookieImg = new Image();
  let cookieImgLoaded = false;
  cookieImg.onload = function () {
    cookieImgLoaded = true;
  };
  cookieImg.onerror = function () {
    cookieImgLoaded = false;
  };
  cookieImg.src =
    opts.cookieImageUrl ||
    "assets/img/keks.png";

  // ---------------------------------------------------
  // Spielzustand & Physik
  // ---------------------------------------------------

  const STATE_COUNTDOWN = "countdown";
  const STATE_PLAYING = "playing";
  const STATE_ENDED = "ended";

  const TOTAL_ROUNDS = 3;

  let state = STATE_COUNTDOWN;
  let countdownStart = performance.now();
  const COUNTDOWN_SECONDS = 3;

  const NUM_BOTS = 5; // 5 Bots + 1 Spieler = 6 Kekse

  const cookies = [];

  let elapsed = 0;
  let roundStartTime = null;

  let lastTimestamp = null;
  let animationFrameId = null;
  let destroyed = false;
  let hasReportedWin = false;

  let currentRound = 1;
  let playerPlacements = [];         // Platzierungen über alle Runden
  let playerPlacementThisRound = null;

  // Physik / Tuning (schneller & größeres Feld)
  const ACCEL = 260;
  const MAX_SPEED = 340;

  const DASH_SPEED = 380;
  const DASH_DURATION = 0.18;
  const DASH_COOLDOWN = 1.3;

  const DASH_CHARGE_TIME = 0.9; // Sekunden bis volle Ladung
  const MAX_DASH_POWER = 1.8;   // Maximaler Power-Multiplikator

  function dashPowerFromCharge(charge) {
    const c = clamp(charge, 0, 1);
    // 0 → 0.5, 1 → MAX_DASH_POWER (1.8)
    return 0.5 + c * (MAX_DASH_POWER - 0.5);
  }

  // Knockback-Konstanten
  const BASE_IMPULSE_DASH = 220;
  const BASE_IMPULSE_NORMAL = 80;
  const DASH_KNOCKBACK_MULT = 1.3; // Dash-Knockback insgesamt 30 % stärker

  const input = {
    up: false,
    down: false,
    right: false,
    left: false,
    dashHeld: false,
    dashJustReleased: false,
  };

  // Krümel-Partikel & Screen-Shake
  const crumbs = [];
  let screenShake = 0;

  function addScreenShake(power) {
    // Kamera-Wackeln moderat halten
    screenShake = Math.min(1, screenShake + power);
  }

  function spawnCrumbs(worldX, worldY, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      crumbs.push({
        x: worldX,
        y: worldY,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      });
    }
    if (crumbs.length > 160) {
      crumbs.splice(0, crumbs.length - 160);
    }
  }

  function updateCrumbs(dt) {
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const p = crumbs[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        crumbs.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9;
      p.vy *= 0.9;
    }
  }

  function createCookie(isPlayer, angle) {
    const r = COOKIE_RADIUS;
    const dist = isPlayer
      ? WORLD_ARENA_RADIUS * 0.35
      : WORLD_ARENA_RADIUS * 0.7;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;

    return {
      isPlayer,
      x,
      y,
      vx: 0,
      vy: 0,
      r,
      alive: true,
      angle: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashCharge: 0,
      dashPower: 1,
      lastMoveDirX: 1,
      lastMoveDirY: 0,
      knockbackTimer: 0, // kurze Phase ohne Speed-Limit nach Treffer
      colorHue: isPlayer ? 42 : Math.floor(200 + Math.random() * 80),
      name: isPlayer ? "Du" : "Bot",
    };
  }

  function resetRound(fullReset) {
    if (fullReset) {
      currentRound = 1;
      playerPlacements = [];
    }

    cookies.length = 0;
    crumbs.length = 0;
    hasReportedWin = false;
    screenShake = 0;
    playerPlacementThisRound = null;

    // Spieler etwas näher zur Mitte, Bots außen im Kreis verteilt
    cookies.push(createCookie(true, -Math.PI / 2));
    for (let i = 0; i < NUM_BOTS; i++) {
      const ang = (i / NUM_BOTS) * Math.PI * 2;
      cookies.push(createCookie(false, ang));
    }

    state = STATE_COUNTDOWN;
    countdownStart = performance.now();
    roundStartTime = null;
    elapsed = 0;
    lastTimestamp = null;

    showOverlayText(COUNTDOWN_SECONDS.toString());
    setStatus(
      "Runde " +
        currentRound +
        " von " +
        TOTAL_ROUNDS +
        ": Stoße die anderen Kekse in die Milch!"
    );
    updateHUD();
  }

  // ---------------------------------------------------
  // Eingabe
  // ---------------------------------------------------

  function handleKeyDown(e) {
    if (!audioCtx) {
      ensureAudioContext();
    }

    if (e.code === "KeyW" || e.code === "ArrowUp") {
      input.up = true;
    } else if (e.code === "KeyS" || e.code === "ArrowDown") {
      input.down = true;
    } else if (e.code === "KeyA" || e.code === "ArrowLeft") {
      input.left = true;
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
      input.right = true;
    } else if (
      e.code === "ShiftLeft" ||
      e.code === "ShiftRight" ||
      e.code === "Space"
    ) {
      input.dashHeld = true;
    }
  }

  function handleKeyUp(e) {
    if (e.code === "KeyW" || e.code === "ArrowUp") {
      input.up = false;
    } else if (e.code === "KeyS" || e.code === "ArrowDown") {
      input.down = false;
    } else if (e.code === "KeyA" || e.code === "ArrowLeft") {
      input.left = false;
    } else if (e.code === "KeyD" || e.code === "ArrowRight") {
      input.right = false;
    } else if (
      e.code === "ShiftLeft" ||
      e.code === "ShiftRight" ||
      e.code === "Space"
    ) {
      if (input.dashHeld) {
        input.dashJustReleased = true;
      }
      input.dashHeld = false;
    }
  }

  // ---------------------------------------------------
  // HUD
  // ---------------------------------------------------

  function updateHUD() {
    const aliveCountVal = cookies.filter((c) => c.alive).length;
    aliveInfo.strong.textContent = String(aliveCountVal);
    roundInfo.strong.textContent =
      currentRound + " / " + TOTAL_ROUNDS;
    const sum = playerPlacements.reduce((a, b) => a + b, 0);
    scoreInfo.strong.textContent = sum > 0 ? String(sum) : "-";
  }

  // ---------------------------------------------------
  // Bot-AI
  // ---------------------------------------------------

  function updateBotAI(bot, dt) {
    if (!bot.alive) return;

    // Zielwahl: bevorzugt Spieler und Gegner nahe am Rand
    let target = null;
    let bestScore = -Infinity;
    for (const c of cookies) {
      if (!c.alive || c === bot) continue;
      const dx = c.x - bot.x;
      const dy = c.y - bot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 === 0) continue;
      const dist = Math.sqrt(d2);
      const centerDistTarget = Math.hypot(c.x, c.y);
      const edgeFactor = centerDistTarget / WORLD_ARENA_RADIUS; // nahe 1 am Rand

      let score = -dist; // näher ist besser
      score += edgeFactor * 120; // Ziele am Rand sind attraktiver
      if (c.isPlayer) score += 40; // Spieler etwas priorisieren

      if (score > bestScore) {
        bestScore = score;
        target = c;
      }
    }

    let moveX = 0;
    let moveY = 0;
    let distToTarget = Infinity;
    let dirToTargetX = 0;
    let dirToTargetY = 0;

    if (target) {
      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      distToTarget = Math.hypot(dx, dy) || 1;
      dirToTargetX = dx / distToTarget;
      dirToTargetY = dy / distToTarget;

      moveX = dirToTargetX;
      moveY = dirToTargetY;

      // leichtes Strafen / Wobble
      const wobble = Math.sin(performance.now() / 300 + bot.colorHue) * 0.25;
      const wx = -moveY * wobble;
      const wy = moveX * wobble;
      moveX = clamp(moveX + wx, -1, 1);
      moveY = clamp(moveY + wy, -1, 1);
    }

    // Rand vermeiden: wenn zu weit außen, stärker zur Mitte ziehen
    const distCenter = Math.hypot(bot.x, bot.y);
    const safeRadius = WORLD_ARENA_RADIUS * 0.82;
    if (distCenter > safeRadius) {
      const nx = -bot.x / (distCenter || 1);
      const ny = -bot.y / (distCenter || 1);
      moveX = moveX * 0.25 + nx * 0.75;
      moveY = moveY * 0.25 + ny * 0.75;
    }

    let mag = Math.hypot(moveX, moveY);
    if (mag > 0.001) {
      moveX /= mag;
      moveY /= mag;
    } else {
      moveX = 0;
      moveY = 0;
    }

    // Dash-Aufladung für Bots – unabhängig von Kontakt etc.
    if (bot.dashCooldown <= 0 && bot.dashTimer <= 0) {
      bot.dashCharge = clamp(
        bot.dashCharge + dt / DASH_CHARGE_TIME,
        0,
        1
      );
    } else {
      bot.dashCharge = Math.max(
        0,
        bot.dashCharge - dt * 1.2
      );
    }

    const readyToDash =
      bot.dashCooldown <= 0 &&
      bot.dashTimer <= 0 &&
      target &&
      bot.dashCharge > 0.35;

    if (readyToDash && Math.random() < 0.85) {
      const power = dashPowerFromCharge(bot.dashCharge);
      triggerDash(bot, moveX, moveY, power);
      bot.dashCharge = 0;
    }

    applyMovement(bot, moveX, moveY, dt);
  }

  // ---------------------------------------------------
  // Bewegung & Physik
  // ---------------------------------------------------

  function applyMovement(cookie, moveX, moveY, dt) {
    if (!cookie.alive) return;

    if (cookie.dashTimer <= 0) {
      const mag = Math.hypot(moveX, moveY);
      if (mag > 0.01) {
        moveX /= mag;
        moveY /= mag;
        cookie.lastMoveDirX = moveX;
        cookie.lastMoveDirY = moveY;
        // Spieler-WASD Bewegung jetzt insgesamt +70 %
        const accel = cookie.isPlayer ? ACCEL * 1.7 : ACCEL;
        cookie.vx += moveX * accel * dt;
        cookie.vy += moveY * accel * dt;
      }
    }

    // Reibung abhängig von Dash / Knockback
    let friction = 2.8;

    if (cookie.dashTimer > 0) {
      // beim Dash etwas mehr Gleiten
      friction *= 0.7;
    }

    if (cookie.knockbackTimer > 0) {
      cookie.knockbackTimer -= dt;
      if (cookie.knockbackTimer < 0) cookie.knockbackTimer = 0;
      // getroffene Kekse rutschen länger
      friction *= 0.5;
    }

    cookie.vx *= Math.exp(-friction * dt);
    cookie.vy *= Math.exp(-friction * dt);

    const speed = Math.hypot(cookie.vx, cookie.vy);
    const maxSpeed = cookie.isPlayer ? MAX_SPEED * 1.7 : MAX_SPEED;
    if (
      speed > maxSpeed &&
      cookie.dashTimer <= 0 &&
      cookie.knockbackTimer <= 0
    ) {
      // normales Laufen wird gecappt, aber starker Knockback darf kurz drüber gehen
      const f = maxSpeed / speed;
      cookie.vx *= f;
      cookie.vy *= f;
    }

    if (cookie.dashTimer > 0) {
      cookie.dashTimer -= dt;
      if (cookie.dashTimer <= 0) {
        cookie.dashTimer = 0;
        cookie.dashPower = 1; // Dash-Power zurücksetzen
      }
    }

    if (cookie.dashCooldown > 0) {
      cookie.dashCooldown -= dt;
      if (cookie.dashCooldown < 0) cookie.dashCooldown = 0;
    }

    cookie.x += cookie.vx * dt;
    cookie.y += cookie.vy * dt;

    cookie.angle = Math.atan2(cookie.vy, cookie.vx);
  }

  function triggerDash(cookie, dirX, dirY, power = 1) {
    let len = Math.hypot(dirX, dirY);
    if (len < 0.01) {
      dirX = cookie.lastMoveDirX;
      dirY = cookie.lastMoveDirY;
      len = Math.hypot(dirX, dirY) || 1;
    }
    dirX /= len;
    dirY /= len;
    cookie.lastMoveDirX = dirX;
    cookie.lastMoveDirY = dirY;

    // Effektive Power: Spieler & Bots gleich stark
    const rawP = Math.max(0.5, power);
    const p = Math.min(MAX_DASH_POWER, rawP * 1.3);

    cookie.dashPower = p;

    // gleicher Dash für Spieler und Bots
    const speedMul = 0.9 + 0.5 * (p / MAX_DASH_POWER);
    const durationMul = 0.8 + 0.25 * (p / MAX_DASH_POWER);

    cookie.vx = dirX * DASH_SPEED * speedMul;
    cookie.vy = dirY * DASH_SPEED * speedMul;
    cookie.dashTimer = DASH_DURATION * durationMul;
    cookie.dashCooldown = DASH_COOLDOWN;

    const crumbCount = Math.round(6 + 6 * p);
    const shakePower = 0.05 + 0.05 * (p / MAX_DASH_POWER);
    addScreenShake(shakePower);
    spawnCrumbs(cookie.x, cookie.y, crumbCount);

    playSound("dash");
  }

  function handleCollisions() {
    // Cookie vs Cookie
    for (let i = 0; i < cookies.length; i++) {
      const a = cookies[i];
      if (!a.alive) continue;

      for (let j = i + 1; j < cookies.length; j++) {
        const b = cookies[j];
        if (!b.alive) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r;

        if (dist > 0 && dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // leicht auseinander schieben
          const pushA = overlap * 0.5;
          const pushB = overlap * 0.5;
          a.x -= nx * pushA;
          a.y -= ny * pushA;
          b.x += nx * pushB;
          b.y += ny * pushB;

          const dashA = a.dashTimer > 0;
          const dashB = b.dashTimer > 0;

          let impulseA = 0;
          let impulseB = 0;
          let hitPower = 0;

          if (dashA || dashB) {
            const pA = dashA ? (a.dashPower || 1) : 0;
            const pB = dashB ? (b.dashPower || 1) : 0;

            if (dashA && !dashB) {
              hitPower = pA;
              const base = BASE_IMPULSE_DASH * pA * DASH_KNOCKBACK_MULT;
              impulseA = base * 0.22;
              impulseB = base * 0.78;
            } else if (!dashA && dashB) {
              hitPower = pB;
              const base = BASE_IMPULSE_DASH * pB * DASH_KNOCKBACK_MULT;
              impulseA = base * 0.78;
              impulseB = base * 0.22;
            } else {
              const avgP = (pA + pB) * 0.5;
              hitPower = avgP;
              const base =
                BASE_IMPULSE_DASH * 0.9 * avgP * DASH_KNOCKBACK_MULT;
              impulseA = base * 0.5;
              impulseB = base * 0.5;
            }
          } else {
            hitPower = 0.5;
            const base = BASE_IMPULSE_NORMAL;
            impulseA = base * 0.5;
            impulseB = base * 0.5;
          }

          // Geschwindigkeitsimpulse entlang der Kollisionsnormalen
          a.vx -= nx * impulseA;
          a.vy -= ny * impulseA;
          b.vx += nx * impulseB;
          b.vy += ny * impulseB;

          // Angreifer nach Treffer abbremsen,
          // damit er nicht selber direkt von der Map fliegt
          if (dashA && !dashB) {
            a.vx *= 0.7;
            a.vy *= 0.7;
            a.dashTimer *= 0.5;
          } else if (dashB && !dashA) {
            b.vx *= 0.7;
            b.vy *= 0.7;
            b.dashTimer *= 0.5;
          }

          // Knockback-Phase: kein Speed-Limit und etwas weniger Reibung
          const knockTimeBase = 0.16 + 0.22 * hitPower;
          if (impulseA > 0) {
            a.knockbackTimer = Math.max(
              a.knockbackTimer || 0,
              knockTimeBase * 0.5
            );
          }
          if (impulseB > 0) {
            b.knockbackTimer = Math.max(
              b.knockbackTimer || 0,
              knockTimeBase
            );
          }

          const cx = (a.x + b.x) * 0.5;
          const cy = (a.y + b.y) * 0.5;

          if (dashA || dashB) {
            const crumbsCount = 5 + Math.round(4 * hitPower);
            spawnCrumbs(cx, cy, crumbsCount);
            addScreenShake(0.05 + 0.03 * hitPower);
          } else {
            addScreenShake(0.02);
          }

          playSound("hit");
        }
      }
    }

    // Arena-Rand + Fallen
    for (const c of cookies) {
      if (!c.alive) continue;
      const dist = Math.hypot(c.x, c.y);

      // etwas nach innen verlegt → leichter runterzustoßen
      const fallRadius = WORLD_ARENA_RADIUS - c.r * 0.2;
      if (dist > fallRadius) {
        const wasPlayer = c.isPlayer;
        const aliveBefore = aliveCount(); // beinhaltet diesen Cookie noch
        spawnCrumbs(c.x, c.y, 14);
        c.alive = false;
        c.vx = 0;
        c.vy = 0;
        addScreenShake(0.12);
        playSound("fall");

        if (wasPlayer && playerPlacementThisRound == null) {
          // Wenn z.B. noch 4 am Leben waren, als du gefallen bist → Platz 4
          playerPlacementThisRound = aliveBefore;
        }
      }
    }
  }

  // ---------------------------------------------------
  // Spiel-Ende / Runden-Ende
  // ---------------------------------------------------

  function aliveCount() {
    return cookies.filter((c) => c.alive).length;
  }

  function playerAlive() {
    const p = cookies.find((c) => c.isPlayer);
    return p && p.alive;
  }

  function endRound() {
    if (state === STATE_ENDED) return;
    state = STATE_ENDED;

    const seconds = elapsed;
    const totalPlayers = NUM_BOTS + 1;

    const stillAlive = playerAlive();
    theAlive: {
      // nothing - label for clarity
    }
    const aliveNow = aliveCount();

    let placement;
    if (stillAlive && aliveNow === 1) {
      placement = 1;
    } else if (playerPlacementThisRound != null) {
      placement = playerPlacementThisRound;
    } else {
      placement = aliveNow > 0 ? aliveNow : totalPlayers;
    }

    playerPlacements.push(placement);
    updateHUD();

    const sum = playerPlacements.reduce((a, b) => a + b, 0);
    const roundText =
      "Runde " +
      currentRound +
      ": Platz " +
      placement +
      " von " +
      totalPlayers +
      " (Zeit: " +
      formatTime(seconds) +
      ")";

    if (currentRound < TOTAL_ROUNDS) {
      // Noch weitere Runden
      const overlayText = placement === 1 ? "Runde gewonnen!" : "Runde vorbei";
      showOverlayText(overlayText);
      playSound(stillAlive ? "win" : "lose");
      setStatus(
        roundText +
          " – bisherige Platz-Summe: " +
          sum +
          ". Die nächste Runde startet gleich."
      );

      currentRound += 1;
      playerPlacementThisRound = null;

      // kurze Pause, dann nächste Runde
      setTimeout(() => {
        if (!destroyed) {
          resetRound();
        }
      }, 1400);
    } else {
      // Letzte Runde → Stern bestimmen
      const star = starForPlacementSum(sum);
      const finalText =
        "Deathmatch fertig! Summe deiner Platzierungen: " +
        sum +
        " (Runden: " +
        playerPlacements.join(", ") +
        ").";

      if (star) {
        hasReportedWin = true;

        try {
          if (
            typeof window !== "undefined" &&
            typeof window.playVictorySound === "function"
          ) {
            window.playVictorySound();
          }
        } catch (e) {}

        try {
          onWin(star);
        } catch (e) {
          console.error("bumper_cookies_19 onWin error:", e);
        }

        playSound("win");
        showOverlayText(star.label);
        setStatus(finalText + " → " + star.label);
      } else {
        playSound("lose");
        showOverlayText("Kein Stern");
        setStatus(
          finalText +
            " Du hast leider keinen Stern erreicht. Versuche es nochmal!"
        );
      }
    }
  }

  // ---------------------------------------------------
  // Zeichnen
  // ---------------------------------------------------

  function worldToScreen(x, y) {
    const s = worldToScreenScale;
    return {
      x: arenaCx + x * s,
      y: arenaCy + y * s,
    };
  }

  function drawBackground() {
    // dunkler Tisch / Hintergrund
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.5, "#020617");
    grad.addColorStop(1, "#111827");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Milch-Abgrund rund um das Brett (deutlich "milchiger")
    const milkRadiusInner = arenaPixelRadius * 1.05;
    const milkRadiusOuter = arenaPixelRadius * 1.35;

    const milkGrad = ctx.createRadialGradient(
      arenaCx,
      arenaCy,
      milkRadiusInner * 0.4,
      arenaCx,
      arenaCy,
      milkRadiusOuter
    );
    milkGrad.addColorStop(0, "rgba(255,255,255,0.95)");
    milkGrad.addColorStop(0.35, "rgba(248,250,252,0.85)");
    milkGrad.addColorStop(0.7, "rgba(241,245,249,0.55)");
    milkGrad.addColorStop(1, "rgba(226,232,240,0.0)");
    ctx.fillStyle = milkGrad;
    ctx.beginPath();
    ctx.arc(arenaCx, arenaCy, milkRadiusOuter, 0, Math.PI * 2);
    ctx.fill();

    // Milch-Schaum-Ring direkt um das Brett
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(arenaCx, arenaCy, milkRadiusInner, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // kleine Bläschen / Schaumpunkte
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const bubbles = 28;
    for (let i = 0; i < bubbles; i++) {
      const ang = (i / bubbles) * Math.PI * 2;
      const r =
        milkRadiusInner + (i % 2 === 0 ? 4 : -4);
      const x = arenaCx + Math.cos(ang) * r;
      const y = arenaCy + Math.sin(ang) * r;
      const size = 2 + (i % 3);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // leichte milchige Schlieren
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const r = milkRadiusInner + 10 + i * 12;
      ctx.beginPath();
      ctx.arc(
        arenaCx + milkRadiusInner * 0.1,
        arenaCy - milkRadiusInner * 0.1,
        r,
        0.1 * Math.PI,
        0.9 * Math.PI
      );
      ctx.stroke();
    }
    ctx.restore();

    // Holzbrett (Arena) – warmes Holz
    const boardGrad = ctx.createRadialGradient(
      arenaCx,
      arenaCy - arenaPixelRadius * 0.25,
      arenaPixelRadius * 0.1,
      arenaCx,
      arenaCy,
      arenaPixelRadius
    );
    boardGrad.addColorStop(0, "#f5e1c5");
    boardGrad.addColorStop(0.35, "#e0b989");
    boardGrad.addColorStop(0.7, "#c4884c");
    boardGrad.addColorStop(1, "#8b5a2b");
    ctx.fillStyle = boardGrad;
    ctx.beginPath();
    ctx.arc(arenaCx, arenaCy, arenaPixelRadius, 0, Math.PI * 2);
    ctx.fill();

    // Holzmaserung / Ringe
    ctx.save();
    ctx.strokeStyle = "rgba(120,72,32,0.45)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const r = arenaPixelRadius * (0.25 + i * 0.18);
      ctx.beginPath();
      ctx.arc(
        arenaCx + arenaPixelRadius * 0.06,
        arenaCy,
        r,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.restore();

    // Rand des Bretts
    ctx.strokeStyle = "rgba(55,30,15,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(arenaCx, arenaCy, arenaPixelRadius, 0, Math.PI * 2);
    ctx.stroke();

    // kleines Highlight oben links auf dem Holz
    const highlightGrad = ctx.createRadialGradient(
      arenaCx - arenaPixelRadius * 0.3,
      arenaCy - arenaPixelRadius * 0.4,
      0,
      arenaCx - arenaPixelRadius * 0.3,
      arenaCy - arenaPixelRadius * 0.4,
      arenaPixelRadius * 0.5
    );
    highlightGrad.addColorStop(0, "rgba(255,255,255,0.35)");
    highlightGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.arc(
      arenaCx - arenaPixelRadius * 0.3,
      arenaCy - arenaPixelRadius * 0.4,
      arenaPixelRadius * 0.6,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // kleine Lichtpunkte auf dem Brett
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const nLights = 12;
    for (let i = 0; i < nLights; i++) {
      const ang = (i / nLights) * Math.PI * 2;
      const r = arenaPixelRadius * 0.7;
      const x = arenaCx + Math.cos(ang) * r;
      const y = arenaCy + Math.sin(ang) * r;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCrumbs() {
    if (!crumbs.length) return;
    for (const p of crumbs) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      const alpha = (1 - t) * 0.9;
      const pos = worldToScreen(p.x, p.y);
      const rPix = 1.5 + (1 - t) * 1.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rPix, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148, 92, 40," + alpha.toFixed(3) + ")";
      ctx.fill();
    }
  }

  function drawPlayerMarker(x, y, rPix) {
    ctx.save();

    // Goldener Glow um den Spieler
    const haloR = rPix * 1.6;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    grad.addColorStop(0, "rgba(252,211,77,0.7)");
    grad.addColorStop(1, "rgba(252,211,77,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // Krone + "DU"
    ctx.translate(x, y - rPix * 1.4);

    ctx.beginPath();
    ctx.moveTo(-rPix * 0.45, rPix * 0.3);
    ctx.lineTo(-rPix * 0.3, -rPix * 0.1);
    ctx.lineTo(0, -rPix * 0.45);
    ctx.lineTo(rPix * 0.3, -rPix * 0.1);
    ctx.lineTo(rPix * 0.45, rPix * 0.3);
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.font =
      "bold 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(15,23,42,0.96)";
    ctx.fillText("DU", 0, rPix * 0.35);

    ctx.restore();
  }

  function drawChargeBar(x, y, width, charge, ready) {
    const height = 6;
    const r = 3;

    ctx.save();
    ctx.translate(x - width / 2, y - height / 2);

    // Hintergrund
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(width - r, 0);
    ctx.quadraticCurveTo(width, 0, width, r);
    ctx.lineTo(width, height - r);
    ctx.quadraticCurveTo(width, height, width - r, height);
    ctx.lineTo(r, height);
    ctx.quadraticCurveTo(0, height, 0, height - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.fill();
    ctx.strokeStyle = ready
      ? "rgba(248,250,252,0.9)"
      : "rgba(148,163,184,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const innerPadding = 1;
    const innerWidth =
      (width - 2 * innerPadding) * clamp(charge, 0, 1);
    if (innerWidth > 0.5) {
      const grad = ctx.createLinearGradient(
        0,
        0,
        innerWidth,
        0
      );
      grad.addColorStop(0, "#38bdf8");
      grad.addColorStop(0.5, "#a855f7");
      grad.addColorStop(1, "#f97316");
      ctx.beginPath();
      ctx.rect(
        innerPadding,
        innerPadding,
        innerWidth,
        height - 2 * innerPadding
      );
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCookie(cookie) {
    if (!cookie.alive) return;

    const pos = worldToScreen(cookie.x, cookie.y);
    const rPix = cookie.r * worldToScreenScale;

    // Spieler-Markierung im Hintergrund
    if (cookie.isPlayer) {
      drawPlayerMarker(pos.x, pos.y, rPix);
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const baseWobble =
      state === STATE_PLAYING
        ? Math.sin(performance.now() / 200 + cookie.colorHue) * 0.05
        : 0;
    const rot = cookie.angle * 0.4 + baseWobble;
    ctx.rotate(rot);

    // squash & stretch je nach Geschwindigkeit / Dash
    const speed = Math.hypot(cookie.vx, cookie.vy);
    let stretch = 1 + Math.min(speed / 260, 0.18);
    if (cookie.dashTimer > 0) {
      const dashT = cookie.dashTimer / (DASH_DURATION * 2);
      stretch += 0.3 * dashT;
    }
    const scaleX = 1 + (stretch - 1) * 0.6;
    const scaleY = 1 - (stretch - 1) * 0.3;
    ctx.scale(scaleX, scaleY);

    const isDashing = cookie.dashTimer > 0;

    if (cookieImgLoaded) {
      const size = rPix * 2.1;
      ctx.drawImage(cookieImg, -size / 2, -size / 2, size, size);

      ctx.lineWidth = 3;
      let hue = cookie.colorHue;
      let sat = 85;
      let light = 55;
      if (isDashing) {
        hue = 48;
        sat = 96;
        light = 62;
      }
      ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, 0.95)`;
      ctx.beginPath();
      ctx.arc(0, 0, rPix * 1.05, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const hue = cookie.colorHue;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rPix);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, `hsl(${hue}, 80%, 60%)`);
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(15,23,42,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, rPix, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // kleines Gesicht
    ctx.translate(0, rPix * 0.2);
    ctx.fillStyle = "rgba(15,23,42,0.92)";
    ctx.beginPath();
    ctx.arc(-rPix * 0.3, -rPix * 0.1, rPix * 0.1, 0, Math.PI * 2);
    ctx.arc(rPix * 0.3, -rPix * 0.1, rPix * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, rPix * 0.2, rPix * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Auflade-Balken direkt über dem Spieler
    if (cookie.isPlayer) {
      const ready =
        cookie.dashCooldown <= 0 && cookie.dashTimer <= 0;
      drawChargeBar(
        pos.x,
        pos.y - rPix * 1.9,
        rPix * 2.4,
        cookie.dashCharge,
        ready
      );
    }
  }

  function drawScene(timestamp) {
    ctx.clearRect(0, 0, width, height);

    const shakeAmount = 4 * screenShake;
    const shakeX =
      screenShake > 0 ? (Math.random() * 2 - 1) * shakeAmount : 0;
    const shakeY =
      screenShake > 0 ? (Math.random() * 2 - 1) * shakeAmount : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    drawBackground();
    drawCrumbs();
    for (const c of cookies) {
      drawCookie(c);
    }

    ctx.restore();
  }

  // ---------------------------------------------------
  // Main Loop
  // ---------------------------------------------------

  function step(timestamp) {
    if (destroyed) return;

    if (lastTimestamp == null) {
      lastTimestamp = timestamp;
    }
    const dt = Math.min(0.04, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    updateCrumbs(dt);
    if (screenShake > 0) {
      // schnelleres Abklingen → weniger wackelig
      screenShake = Math.max(0, screenShake - dt * 4.5);
    }

    if (state === STATE_COUNTDOWN) {
      const t = (timestamp - countdownStart) / 1000;
      const remaining = COUNTDOWN_SECONDS - t;
      if (remaining <= 0) {
        state = STATE_PLAYING;
        hideOverlayText();
        roundStartTime = performance.now();
        setStatus(
          "Los! Runde " +
            currentRound +
            " von " +
            TOTAL_ROUNDS +
            ". Stoße die anderen Kekse in die Milch."
        );
      } else {
        const value = Math.ceil(remaining);
        showOverlayText(value.toString());
        const frac = remaining - Math.floor(remaining);
        const scale = 1 + (1 - frac) * 0.35;
        overlay.style.transform = "scale(" + scale.toFixed(3) + ")";
      }
    } else if (state === STATE_PLAYING) {
      if (roundStartTime != null) {
        elapsed = (performance.now() - roundStartTime) / 1000;
      }

      updatePlayer(dt);
      for (const bot of cookies) {
        if (!bot.isPlayer) {
          updateBotAI(bot, dt);
        }
      }

      handleCollisions();

      if (aliveCount() <= 1 || !playerAlive()) {
        endRound();
      }

      updateHUD();
    }

    drawScene(timestamp);
    animationFrameId = window.requestAnimationFrame(step);
  }

  function updatePlayer(dt) {
    const player = cookies.find((c) => c.isPlayer);
    if (!player || !player.alive) return;

    let moveX = 0;
    let moveY = 0;
    if (input.up) moveY -= 10;
    if (input.down) moveY += 10;
    if (input.left) moveX -= 10;
    if (input.right) moveX += 10;

    // Dash-Ladung
    if (player.dashCooldown <= 0 && player.dashTimer <= 0) {
      if (input.dashHeld) {
        player.dashCharge = clamp(
          player.dashCharge + dt / DASH_CHARGE_TIME,
          0,
          1
        );
      } else {
        // leichte Entladung, wenn nicht gehalten
        player.dashCharge = Math.max(
          0,
          player.dashCharge - dt * 0.8
        );
      }
    } else {
      // während Dash / Cooldown entlädt der Balken
      player.dashCharge = Math.max(
        0,
        player.dashCharge - dt * 1.2
      );
    }

    // Dash auslösen beim Loslassen
    if (
      input.dashJustReleased &&
      player.dashCooldown <= 0 &&
      player.dashTimer <= 0
    ) {
      if (player.dashCharge > 0.05) {
        const power = dashPowerFromCharge(player.dashCharge);
        triggerDash(player, moveX, moveY, power);
        player.dashCharge = 0;
      }
    }
    input.dashJustReleased = false;

    applyMovement(player, moveX, moveY, dt);
  }

  // ---------------------------------------------------
  // Events & Start
  // ---------------------------------------------------

  function handleResize() {
    resizeCanvas();
  }

  restartBtn.addEventListener("click", () => {
    resetRound(true);
    hideOverlayText();
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", handleResize);

  resizeCanvas();
  resetRound(true);
  animationFrameId = window.requestAnimationFrame(step);

  // ---------------------------------------------------
  // Cleanup
  // ---------------------------------------------------

  return {
    destroy() {
      destroyed = true;
      try {
        window.cancelAnimationFrame(animationFrameId);
      } catch (e) {}
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
    },
  };
};
