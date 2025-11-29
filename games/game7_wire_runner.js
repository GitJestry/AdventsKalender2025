// Spiel 7: Golden Wire Runner – Dino-Runner-ähnlicher Endless Runner
// Steuerung:
//   - SPACE / Pfeil ↑: Sprung (Höhe hängt von Haltezeit ab)
//   - Pfeil ↓: Ducken
// Sterne nach Distanz:
//   - Bronze (braun): 7000 m
//   - Silber: 8000 m
//   - Gold: 10000 m
//   - Rot: 12000 m
// Ab ca. 14000 m sehr präzise & fast unmöglich.

window.AdventGames = window.AdventGames || {};

window.AdventGames["wire_runner_7"] = function (container, options) {
  "use strict";

  const onWin =
    options && typeof options.onWin === "function" ? options.onWin : () => {};

  // ---------------------------------------------------------------------------
  // KONFIGURATION
  // ---------------------------------------------------------------------------

  const DISTANCES = {
    brown: 7000,
    silver: 8000,
    gold: 10000,
    red: 12000,
  };

  const HARD_DISTANCE = 14000; // ab hier „fast unmöglich“

  const TARGET_TIME_FOR_BRONZE = 60; // ~60 s bis 7000m
  const BASE_SPEED = DISTANCES.brown / TARGET_TIME_FOR_BRONZE; // ca. 116.6

  const MAX_SPEED_MULTIPLIER = 3.0;

  // Physik
  const GRAVITY = 2600;
  const JUMP_FORCE = 500;
  const JUMP_CUT_SPEED = 330; // wie stark nach Loslassen gedeckelt wird

  const PLAYER_WIDTH = 46;
  const PLAYER_HEIGHT = 60;
  const PLAYER_DUCK_HEIGHT = 36;

  // Zustände
  const STATE_IDLE = "idle";
  const STATE_COUNTDOWN = "countdown";
  const STATE_RUNNING = "running";
  const STATE_DEAD = "dead";
  const STATE_WON = "won";
  let state = STATE_IDLE;

  const COUNTDOWN_SECONDS = 3;

  const HIGHSCORE_KEY = "wire_runner_7_highscore_v1";

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function starForDistance(dist) {
    if (dist >= DISTANCES.red) return { level: "red", label: "Roter Stern" };
    if (dist >= DISTANCES.gold) return { level: "gold", label: "Goldener Stern" };
    if (dist >= DISTANCES.silver) return { level: "silver", label: "Silberner Stern" };
    if (dist >= DISTANCES.brown) return { level: "brown", label: "Brauner Stern" };
    return null;
  }

  // Geschwindigkeit steigt relativ früh an
  function speedFactorForDistance(dist) {
    const t = clamp(dist / HARD_DISTANCE, 0, 1);
    const eased = t * 1.15 - 0.15 * t * t;
    return 1 + clamp(eased, 0, 1) * (MAX_SPEED_MULTIPLIER - 1);
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return (
      ax < bx + bw &&
      ax + aw > bx &&
      ay < by + bh &&
      ay + ah > by
    );
  }

  function loadHighScore() {
    try {
      const raw = window.localStorage.getItem(HIGHSCORE_KEY);
      const n = raw != null ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(value) {
    try {
      window.localStorage.setItem(HIGHSCORE_KEY, String(value));
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // DOM / CANVAS SETUP
  // ---------------------------------------------------------------------------

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "wire-runner-root";

  const header = document.createElement("div");
  header.className = "wire-runner-header";
  header.textContent = "Tür 7 – Golden Wire Runner";

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "flex-start";

  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.flex = "1 1 auto";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.display = "block";
  canvas.style.borderRadius = "12px";
  canvas.style.background = "#0b1622";

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontSize = "2.4rem";
  overlay.style.fontWeight = "700";
  overlay.style.color = "rgba(255,255,255,0.92)";
  overlay.style.textShadow = "0 0 8px rgba(0,0,0,0.8)";
  overlay.style.pointerEvents = "none";
  overlay.textContent = ""; // kein Text im Idle Zustand

  canvasWrapper.appendChild(canvas);
  canvasWrapper.appendChild(overlay);

  // rechte Seite: Key-Symbole mit Funktion
  const keyPanel = document.createElement("aside");
  keyPanel.style.flex = "0 0 110px";
  keyPanel.style.display = "flex";
  keyPanel.style.flexDirection = "column";
  keyPanel.style.alignItems = "center";
  keyPanel.style.gap = "16px";

  const keyBaseStyle = `
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:8px;
    border:1px solid rgba(255,255,255,0.35);
    background:rgba(15,25,40,0.85);
    box-shadow:0 2px 4px rgba(0,0,0,0.4);
    font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
    color:rgba(255,255,255,0.9);
  `;

  // SPACE – Sprung
  const spaceWrap = document.createElement("div");
  spaceWrap.style.display = "flex";
  spaceWrap.style.flexDirection = "column";
  spaceWrap.style.alignItems = "center";
  spaceWrap.style.gap = "4px";

  const spaceKey = document.createElement("div");
  spaceKey.style.cssText =
    keyBaseStyle +
    "width:80px;height:30px;border-radius:999px;font-size:14px;";
  spaceKey.textContent = "SPACE";

  const spaceLabel = document.createElement("div");
  spaceLabel.style.fontSize = "11px";
  spaceLabel.style.opacity = "0.85";
  spaceLabel.textContent = "Sprung";

  spaceWrap.appendChild(spaceKey);
  spaceWrap.appendChild(spaceLabel);

  // Pfeiltasten-Cluster – nur ↓ hervorgehoben (Ducken)
  const arrowsWrap = document.createElement("div");
  arrowsWrap.style.display = "flex";
  arrowsWrap.style.flexDirection = "column";
  arrowsWrap.style.alignItems = "center";
  arrowsWrap.style.gap = "4px";

  const arrowCluster = document.createElement("div");
  arrowCluster.style.display = "grid";
  arrowCluster.style.gridTemplateColumns = "repeat(3, 1fr)";
  arrowCluster.style.gridTemplateRows = "repeat(2, 1fr)";
  arrowCluster.style.gap = "2px";

  function makeArrowKey(symbol, highlight) {
    const key = document.createElement("div");
    key.style.cssText =
      keyBaseStyle +
      "width:26px;height:26px;font-size:13px;border-radius:6px;padding:0;";
    if (highlight) {
      key.style.borderColor = "rgba(255,240,180,0.95)";
      key.style.boxShadow = "0 0 8px rgba(255,220,120,0.7)";
      key.style.background = "rgba(255,220,120,0.2)";
    } else {
      key.style.opacity = "0.55";
    }
    key.textContent = symbol;
    return key;
  }

  const empty = document.createElement("div");
  empty.style.width = "26px";
  empty.style.height = "26px";

  const upKey = makeArrowKey("↑", false);
  const leftKey = makeArrowKey("←", false);
  const rightKey = makeArrowKey("→", false);
  const downKey = makeArrowKey("↓", true);

  // Anordnung wie Pfeilblock (T-Form)
  arrowCluster.appendChild(empty);
  arrowCluster.appendChild(upKey);
  arrowCluster.appendChild(empty.cloneNode());
  arrowCluster.appendChild(leftKey);
  arrowCluster.appendChild(downKey);
  arrowCluster.appendChild(rightKey);

  const arrowsLabel = document.createElement("div");
  arrowsLabel.style.fontSize = "11px";
  arrowsLabel.style.opacity = "0.85";
  arrowsLabel.textContent = "Ducken";

  arrowsWrap.appendChild(arrowCluster);
  arrowsWrap.appendChild(arrowsLabel);

  keyPanel.appendChild(spaceWrap);
  keyPanel.appendChild(arrowsWrap);

  layout.appendChild(canvasWrapper);
  layout.appendChild(keyPanel);

  root.appendChild(header);
  root.appendChild(layout);
  container.appendChild(root);

  const ctx = canvas.getContext("2d");

  // ---------------------------------------------------------------------------
  // SPIELZUSTAND
  // ---------------------------------------------------------------------------

  let width = 760;
  let height = 320;
  let dpr = window.devicePixelRatio || 1;

  let groundY = height - 70;

  const player = {
    x: 140,
    y: 0,
    vy: 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    ducking: false,
    onGround: true,
  };

  /**
   * Hindernisse:
   *  type: "ground" | "duck" | "high"
   *  x, y, width, height
   */
  const obstacles = [];

  let distance = 0;
  let elapsed = 0;
  let speed = BASE_SPEED;

  let spawnTimer = 0;
  let lastObstacleType = null;

  let lastTimestamp = null;
  let countdownStart = 0;

  // Input-Status
  let spaceHeld = false;
  let duckHeld = false;

  let animationFrameId = null;
  let destroyed = false;

  let highScore = loadHighScore();

  // ---------------------------------------------------------------------------
  // RESIZE & RESET
  // ---------------------------------------------------------------------------

  function resizeCanvas() {
    const bounds = canvasWrapper.getBoundingClientRect();
    const targetWidth = clamp(bounds.width || 760, 620, 900);
    width = targetWidth;
    height = 320;
    dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = height + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    groundY = height - 70;

    const feet = groundY;
    player.y = feet - player.height;
  }

  function resetPlayer() {
    player.ducking = false;
    player.height = PLAYER_HEIGHT;
    player.vy = 0;
    player.onGround = true;
    player.y = groundY - player.height;
  }

  function resetGameState() {
    distance = 0;
    elapsed = 0;
    speed = BASE_SPEED;
    spawnTimer = 0;
    lastObstacleType = null;
    obstacles.length = 0;
    lastTimestamp = null;
    state = STATE_IDLE;
    spaceHeld = false;
    duckHeld = false;

    overlay.textContent = "";
    overlay.style.opacity = "0";
    overlay.style.background = "transparent";
    resetPlayer();
  }

  // ---------------------------------------------------------------------------
  // SPIELSTART / ENDE
  // ---------------------------------------------------------------------------

  function startCountdown() {
    if (state === STATE_RUNNING || state === STATE_COUNTDOWN) return;

    if (state === STATE_DEAD || state === STATE_WON) {
      resetGameState();
    }

    state = STATE_COUNTDOWN;
    countdownStart = performance.now();
    overlay.style.opacity = "1";
    overlay.style.background = "transparent";
    overlay.textContent = String(COUNTDOWN_SECONDS);
  }

  function startRun() {
    state = STATE_RUNNING;
    overlay.style.opacity = "0";
    overlay.textContent = "";
  }

  function updateHighScore() {
    const d = Math.floor(distance);
    if (d > highScore) {
      highScore = d;
      saveHighScore(highScore);
    }
  }

  function finishRunWithStar(reward) {
    if (!reward) return;
    updateHighScore();
    state = STATE_WON;

    overlay.textContent = "";
    overlay.style.background = "rgba(90, 200, 130, 0.16)";
    overlay.style.opacity = "1";
    setTimeout(() => {
      if (!destroyed && state === STATE_WON) {
        overlay.style.opacity = "0";
        overlay.style.background = "transparent";
      }
    }, 260);

    try {
      onWin({ level: reward.level, label: reward.label });
    } catch (e) {
      console.error("wire_runner_7 onWin error:", e);
    }
  }

  function crash() {
    if (state !== STATE_RUNNING && state !== STATE_COUNTDOWN) return;
    if (state === STATE_WON || state === STATE_DEAD) return;

    const reward = starForDistance(distance);
    if (reward) {
      finishRunWithStar(reward);
      return;
    }

    updateHighScore();
    state = STATE_DEAD;

    overlay.textContent = "";
    overlay.style.background = "rgba(220,60,60,0.25)";
    overlay.style.opacity = "1";
    setTimeout(() => {
      if (!destroyed && state === STATE_DEAD) {
        overlay.style.opacity = "0";
        overlay.style.background = "transparent";
      }
    }, 260);
  }

  // ---------------------------------------------------------------------------
  // HINDERNISSE
  // ---------------------------------------------------------------------------

  function chooseObstacleType() {
    const d = distance;
    const r = Math.random();

    if (d < 1500) {
      return "ground";
    }
    if (d < 3500) {
      return r < 0.75 ? "ground" : "duck";
    }
    if (d < 6000) {
      if (r < 0.5) return "ground";
      if (r < 0.8) return "duck";
      return "high";
    }
    if (r < 0.4) return "ground";
    if (r < 0.7) return "duck";
    return "high";
  }

  function spawnObstacle() {
    const type = chooseObstacleType();
    lastObstacleType = type;

    let widthO, heightO, xO, yO;
    const spawnX = width + 60 + Math.random() * 80;

    if (type === "ground") {
      heightO = 28 + Math.random() * 16;
      widthO = 24 + Math.random() * 30;
      yO = groundY - heightO;
      xO = spawnX;
    } else if (type === "duck") {
      heightO = 22;
      widthO = 80 + Math.random() * 40;
      const bottomY = groundY - PLAYER_DUCK_HEIGHT - 4;
      yO = bottomY - heightO;
      xO = spawnX;
    } else {
      heightO = 45 + Math.random() * 18;
      widthO = 60 + Math.random() * 40;
      yO = groundY - heightO;
      xO = spawnX;
    }

    obstacles.push({
      x: xO,
      y: yO,
      width: widthO,
      height: heightO,
      type,
    });
  }

  function updateObstacles(delta) {
    const difficulty = clamp(distance / 9000, 0, 1);
    spawnTimer -= delta;

    if (spawnTimer <= 0) {
      spawnObstacle();

      let minGap = 0.55;
      let maxGap = 1.25;
      const gapBase = maxGap - (maxGap - minGap) * difficulty;

      if (lastObstacleType === "high") {
        spawnTimer = gapBase + 0.10 + Math.random() * 0.18;
      } else if (lastObstacleType === "duck") {
        spawnTimer = gapBase + 0.04 + Math.random() * 0.18;
      } else {
        spawnTimer = gapBase - 0.05 + Math.random() * 0.18;
      }
    }

    const moveAmount = speed * 3.1 * delta;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= moveAmount;
      if (o.x + o.width < -80) {
        obstacles.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SPIELER / PHYSIK – präziser, variabler Jump
  // ---------------------------------------------------------------------------

  function updatePlayer(delta) {
    const onGround = player.y + player.height >= groundY - 0.5;
    player.onGround = onGround;

    // Ducken
    if (duckHeld && onGround) {
      if (!player.ducking) {
        player.ducking = true;
        const feet = player.y + player.height;
        player.height = PLAYER_DUCK_HEIGHT;
        player.y = feet - player.height;
      }
    } else if (player.ducking) {
      const feet = player.y + player.height;
      player.ducking = false;
      player.height = PLAYER_HEIGHT;
      player.y = feet - player.height;
    }

    // Jump-Start – auch aus Ducken erlaubt
    if (spaceHeld && onGround) {
      if (player.ducking) {
        const feet = player.y + player.height;
        player.ducking = false;
        player.height = PLAYER_HEIGHT;
        player.y = feet - player.height;
      }
      player.vy = -JUMP_FORCE;
      player.onGround = false;
    }

    // Variable Jump-Höhe
    let gravityScale;
    if (player.vy < 0) {
      gravityScale = spaceHeld ? 0.55 : 1.4;
    } else {
      gravityScale = spaceHeld ? 1.3 : 1.9;
    }

    const g = GRAVITY * gravityScale;
    player.vy += g * delta;
    player.y += player.vy * delta;

    if (player.y + player.height >= groundY) {
      player.y = groundY - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }

  // ---------------------------------------------------------------------------
  // KOLLISION
  // ---------------------------------------------------------------------------

  function checkCollisions() {
    if (state !== STATE_RUNNING) return;

    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (rectsOverlap(px, py, pw, ph, o.x, o.y, o.width, o.height)) {
        crash();
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ZEICHNEN
  // ---------------------------------------------------------------------------

  function drawBackground(delta) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#07111f");
    grad.addColorStop(0.5, "#0b1b2a");
    grad.addColorStop(1, "#0e2030");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(230, 215, 200, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 2);
    ctx.lineTo(width, groundY + 2);
    ctx.stroke();

    const snowCount = 32;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < snowCount; i++) {
      const x = ((i * 97.3 + elapsed * 40) % width) - 4;
      const y = 40 + Math.sin(i * 8 + elapsed * 1.4) * 16;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  function drawPlayer() {
    ctx.save();

    const wobble =
      state === STATE_RUNNING && player.onGround ? Math.sin(elapsed * 18) * 2 : 0;

    const drawX = player.x;
    const drawY = player.y + wobble;

    ctx.translate(drawX, drawY);

    ctx.fillStyle = "#f7f7f7";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;

    drawRoundedRect(ctx, 0, 0, player.width, player.height, 8);

    if (player.onGround) {
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const legOffset = Math.sin(elapsed * 18) * 3;
      ctx.moveTo(10 + legOffset, player.height);
      ctx.lineTo(10 + legOffset, player.height + 6);
      ctx.moveTo(player.width - 10 - legOffset, player.height);
      ctx.lineTo(player.width - 10 - legOffset, player.height + 6);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawObstacles() {
    obstacles.forEach((o) => {
      ctx.save();
      ctx.translate(o.x, o.y);

      if (o.type === "duck") {
        ctx.fillStyle = "#f2cf77";
        ctx.strokeStyle = "#ad8530";
        ctx.lineWidth = 2.2;
        drawRoundedRect(ctx, 0, 0, o.width, o.height, 6);
      } else if (o.type === "high") {
        ctx.fillStyle = "#ffe9b3";
        ctx.strokeStyle = "#c6972b";
        ctx.lineWidth = 2.4;
        drawRoundedRect(ctx, 0, 0, o.width, o.height, 6);
      } else {
        ctx.fillStyle = "#fbe3a5";
        ctx.strokeStyle = "#b98229";
        ctx.lineWidth = 2.2;
        drawRoundedRect(ctx, 0, 0, o.width, o.height, 5);
      }

      ctx.restore();
    });
  }

  function drawHUD() {
    ctx.save();
    ctx.font =
      "13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";

    const d = Math.floor(distance);
    const hs = Math.floor(highScore);

    const hsText = `★ Highscore ${hs} m`;
    const distText = `↦ Distanz ${d} m`;

    const paddingX = 8;
    const paddingY = 4;
    const gapY = 6;

    const hsWidth = ctx.measureText(hsText).width + paddingX * 2;
    const distWidth = ctx.measureText(distText).width + paddingX * 2;
    const pillWidth = Math.max(hsWidth, distWidth);

    const x = width - pillWidth - 12;
    let y = 16;

    ctx.fillStyle = "rgba(6, 16, 28, 0.85)";
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;

    function drawPill(text) {
      const textWidth = ctx.measureText(text).width;
      const w = textWidth + paddingX * 2;
      const h = 22;
      const radius = 11;

      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(text, x + paddingX, y + h / 2);
      ctx.fillStyle = "rgba(6, 16, 28, 0.85)";

      y += h + gapY;
    }

    drawPill(hsText);
    drawPill(distText);

    ctx.restore();
  }

  function render(delta) {
    drawBackground(delta);
    drawObstacles();
    drawPlayer();
    drawHUD();
  }

  // ---------------------------------------------------------------------------
  // HAUPT-LOOP
  // ---------------------------------------------------------------------------

  function step(timestamp) {
    if (destroyed) return;

    if (lastTimestamp == null) {
      lastTimestamp = timestamp;
    }
    const delta = Math.min(0.04, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    if (state === STATE_COUNTDOWN) {
      const t = (timestamp - countdownStart) / 1000;
      const remaining = COUNTDOWN_SECONDS - t;
      if (remaining <= 0) {
        overlay.textContent = "GO";
        overlay.style.opacity = "1";
        overlay.style.background = "transparent";
        startRun();
        setTimeout(() => {
          if (!destroyed && state === STATE_RUNNING) {
            overlay.style.opacity = "0";
            overlay.textContent = "";
          }
        }, 220);
      } else {
        overlay.textContent = String(Math.ceil(remaining));
      }
    }

    if (state === STATE_RUNNING) {
      elapsed += delta;

      const factor = speedFactorForDistance(distance);
      speed = BASE_SPEED * factor;
      distance += speed * delta;

      updatePlayer(delta);
      updateObstacles(delta);
      checkCollisions();
    }

    render(delta);

    animationFrameId = window.requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------------------------

  function handleKeyDown(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      if (!spaceHeld) {
        spaceHeld = true;
        if (
          state === STATE_IDLE ||
          state === STATE_DEAD ||
          state === STATE_WON
        ) {
          startCountdown();
        }
      }
      e.preventDefault();
    } else if (e.code === "ArrowDown") {
      duckHeld = true;
      e.preventDefault();
    }
  }

  function handleKeyUp(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      if (spaceHeld && player.vy < -JUMP_CUT_SPEED) {
        player.vy = -JUMP_CUT_SPEED;
      }
      spaceHeld = false;
    } else if (e.code === "ArrowDown") {
      duckHeld = false;
    }
  }

  function handleResize() {
    resizeCanvas();
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", handleResize);

  // ---------------------------------------------------------------------------
  // START
  // ---------------------------------------------------------------------------

  resizeCanvas();
  resetGameState();
  animationFrameId = window.requestAnimationFrame(step);

  // ---------------------------------------------------------------------------
  // CLEANUP FÜR ADVENT-FRAMEWORK
  // ---------------------------------------------------------------------------

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
