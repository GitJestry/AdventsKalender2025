// Spiel 8: Brick Heart Pong – Breakout mit Herz & C drin
// Steuerung:
//   ← / →  : Schläger bewegen
//   Start-Button (oder SPACE) startet Runde
// Regeln:
//   - Brick-Pattern ist ein Herz mit "C" im Inneren
//   - 3 Leben insgesamt
//   - Wenn alle Bricks weg: Sieg
//   - Sterne nach verbleibenden Leben bei Sieg:
//       1 Leben  → Silber
//       2 Leben  → Gold
//       3 Leben  → Rot
// Ability:
//   - Jeder zerstörte Brick lädt auf
//   - Nach 10 zerstörten Bricks: Ball glüht, Ability bereit
//   - Nächster Brick-Treffer → Explosion im Radius, alle Bricks im Umkreis weg
//   - Ability wird danach auf 0 zurückgesetzt

window.AdventGames = window.AdventGames || {};

window.AdventGames["brick_heart_pong"] = function (container, options) {
  "use strict";

  const onWin =
    options && typeof options.onWin === "function" ? options.onWin : () => {};

  // ---------------------------------------------------------------------------
  // STAR-LOGIK NACH LEBEN
  // ---------------------------------------------------------------------------

  function starForLives(lives) {
    if (lives >= 3) {
      return { level: "red", label: "Roter Stern" };
    }
    if (lives === 2) {
      return { level: "gold", label: "Goldener Stern" };
    }
    if (lives === 1) {
      return { level: "silver", label: "Silberner Stern" };
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // KONFIGURATION
  // ---------------------------------------------------------------------------

  const STATE_IDLE = "idle";
  const STATE_COUNTDOWN = "countdown";
  const STATE_PLAYING = "playing";
  const STATE_WON = "won";
  const STATE_LOST = "lost";

  let state = STATE_IDLE;

  const COUNTDOWN_SECONDS = 3;

  // Spielfeld / Physik
  const PADDLE_WIDTH = 110;
  const PADDLE_HEIGHT = 16;
  const PADDLE_MARGIN_BOTTOM = 60;
  const PADDLE_SPEED = 700;

  const BALL_RADIUS = 8;
  const BALL_SPEED = 550; // schnellerer Ball

  const BRICK_HEIGHT = 18;

  // Symmetrisches Herz mit innenliegendem "C" (H+C-Bricks symmetrisch)
  const HEART_PATTERN = [
    "   HHH HHH   ",
    "  HHHHHHHHH  ",
    " HHHCCCCCHHH ",
    " HHHCHHHHHHH ",
    " HHHCHHHHHHH ",
    "  HHCHHHHHH  ",
    "   HCCCCCH   ",
    "    HHHHH    ",
    "     HHH     ",
    "      H      ",
    "             ",
  ];

  // Ability-Konfiguration
  const ABILITY_BRICKS = 10;      // Anzahl zerstörter Bricks bis Bombe bereit
  const ABILITY_RADIUS = 120;     // Explosionsradius in Pixeln

  // ---------------------------------------------------------------------------
  // SOUND (Bounce-Sounds)
  // ---------------------------------------------------------------------------

  let audioCtx = null;

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function playBounceSound(kind) {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq;
    switch (kind) {
      case "brick":
        freq = 520;
        break;
      case "paddle":
        freq = 360;
        break;
      case "wall":
      default:
        freq = 260;
        break;
    }

    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.04;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const duration = 0.09;

    osc.start(now);
    osc.stop(now + duration);
    gain.gain.linearRampToValueAtTime(0, now + duration);
  }

  // ---------------------------------------------------------------------------
  // DOM / CANVAS
  // ---------------------------------------------------------------------------

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "brick-heart-root";

  const header = document.createElement("div");
  header.className = "brick-heart-header";
  header.textContent = "Tür 8 – Brick Heart Pong";

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "8px";
  controls.style.margin = "6px 0 4px";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.textContent = "Starten";
  startBtn.style.padding = "6px 12px";
  startBtn.style.borderRadius = "999px";
  startBtn.style.border = "none";
  startBtn.style.cursor = "pointer";

  controls.appendChild(startBtn);

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "flex-start";

  // Canvas-Bereich
  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.flex = "1 1 auto";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.display = "block";
  canvas.style.borderRadius = "12px";
  canvas.style.background = "#07101e";

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontSize = "2.4rem";
  overlay.style.fontWeight = "700";
  overlay.style.color = "rgba(255,255,255,0.95)";
  overlay.style.textShadow = "0 0 10px rgba(0,0,0,0.9)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.textContent = "";

  canvasWrapper.appendChild(canvas);
  canvasWrapper.appendChild(overlay);

  // Rechte Seite – Icons für Steuerung
  const side = document.createElement("aside");
  side.style.flex = "0 0 120px";
  side.style.display = "flex";
  side.style.flexDirection = "column";
  side.style.alignItems = "center";
  side.style.gap = "16px";
  side.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const keyBase = `
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:6px;
    border:1px solid rgba(255,255,255,0.4);
    background:rgba(15,25,40,0.9);
    box-shadow:0 2px 4px rgba(0,0,0,0.5);
    color:rgba(255,255,255,0.9);
  `;

  // Start-Icon
  const startIconWrap = document.createElement("div");
  startIconWrap.style.display = "flex";
  startIconWrap.style.flexDirection = "column";
  startIconWrap.style.alignItems = "center";
  startIconWrap.style.gap = "4px";

  const startIconKey = document.createElement("div");
  startIconKey.style.cssText = keyBase + "width:64px;height:28px;border-radius:999px;";
  startIconKey.textContent = "▶";

  const startIconLabel = document.createElement("div");
  startIconLabel.style.fontSize = "11px";
  startIconLabel.style.opacity = "0.9";
  startIconLabel.textContent = "Start";

  startIconWrap.appendChild(startIconKey);
  startIconWrap.appendChild(startIconLabel);

  // Pfeil-Keys für Paddle
  const arrowWrap = document.createElement("div");
  arrowWrap.style.display = "flex";
  arrowWrap.style.flexDirection = "column";
  arrowWrap.style.alignItems = "center";
  arrowWrap.style.gap = "4px";

  const arrowRow = document.createElement("div");
  arrowRow.style.display = "flex";
  arrowRow.style.gap = "4px";

  function makeArrowKey(symbol, highlight) {
    const el = document.createElement("div");
    el.style.cssText =
      keyBase +
      "width:28px;height:28px;font-size:14px;border-radius:6px;padding:0;";
    if (highlight) {
      el.style.borderColor = "rgba(255,230,150,0.95)";
      el.style.boxShadow = "0 0 8px rgba(255,230,140,0.9)";
      el.style.background = "rgba(255,230,140,0.2)";
    } else {
      el.style.opacity = "0.6";
    }
    el.textContent = symbol;
    return el;
  }

  const leftKey = makeArrowKey("←", true);
  const rightKey = makeArrowKey("→", true);

  arrowRow.appendChild(leftKey);
  arrowRow.appendChild(rightKey);

  const arrowLabel = document.createElement("div");
  arrowLabel.style.fontSize = "11px";
  arrowLabel.style.opacity = "0.9";
  arrowLabel.textContent = "Paddle";

  arrowWrap.appendChild(arrowRow);
  arrowWrap.appendChild(arrowLabel);

  side.appendChild(startIconWrap);
  side.appendChild(arrowWrap);

  layout.appendChild(canvasWrapper);
  layout.appendChild(side);

  root.appendChild(header);
  root.appendChild(controls);
  root.appendChild(layout);
  container.appendChild(root);

  const ctx = canvas.getContext("2d");

  // ---------------------------------------------------------------------------
  // SPIELZUSTAND
  // ---------------------------------------------------------------------------

  let width = 760;
  let height = 540; // höheres Spielfeld → mehr Flugzeit
  let dpr = window.devicePixelRatio || 1;

  let paddle = {
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
  };

  let ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: BALL_RADIUS,
  };

  let bricks = [];
  let bricksRemaining = 0;

  let lives = 3;

  // Ability-State
  let abilityCharge = 0;   // 0..ABILITY_BRICKS
  let abilityReady = false;

  let lastTimestamp = null;
  let countdownStart = 0;

  let leftPressed = false;
  let rightPressed = false;

  let animationFrameId = null;
  let destroyed = false;

  // ---------------------------------------------------------------------------
  // BRICK-SETUP
  // ---------------------------------------------------------------------------

  function buildBricks() {
    bricks.length = 0;
    const rows = HEART_PATTERN.length;
    const cols = HEART_PATTERN.reduce(
      (max, row) => Math.max(max, row.length),
      0
    );

    const marginTop = 70;
    const marginSides = 40;

    const availableWidth = width - marginSides * 2;
    const brickWidth = Math.min(40, availableWidth / cols);
    const offsetX =
      (width - brickWidth * cols) / 2;

    for (let r = 0; r < rows; r++) {
      const rowStr = HEART_PATTERN[r];
      for (let c = 0; c < rowStr.length; c++) {
        const ch = rowStr[c];
        if (ch !== "H" && ch !== "C") continue;
        const x = offsetX + c * brickWidth;
        const y = marginTop + r * BRICK_HEIGHT;
        bricks.push({
          x,
          y,
          width: brickWidth,
          height: BRICK_HEIGHT - 2,
          alive: true,
          type: ch === "C" ? "c" : "heart",
        });
      }
    }

    bricksRemaining = bricks.length;
  }

  // ---------------------------------------------------------------------------
  // RESIZE & RESET
  // ---------------------------------------------------------------------------

  function resizeCanvas() {
    const bounds = canvasWrapper.getBoundingClientRect();
    const targetWidth = Math.min(Math.max(bounds.width || 760, 620), 900);
    width = targetWidth;
    height = 540;
    dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = height + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Paddle am Boden zentriert
    paddle.width = PADDLE_WIDTH;
    paddle.height = PADDLE_HEIGHT;
    paddle.x = (width - paddle.width) / 2;
    paddle.y = height - PADDLE_MARGIN_BOTTOM;

    resetBallPosition();
  }

  function resetBallPosition() {
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.r - 2;
    ball.vx = 0;
    ball.vy = 0;
  }

  function setBallInitialVelocity() {
    const dir = Math.random() < 0.5 ? -1 : 1;
    ball.vx = dir * BALL_SPEED * 0.7;
    ball.vy = -BALL_SPEED;
    normalizeBallSpeed();
  }

  function normalizeBallSpeed() {
    const len = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || 1;
    const f = BALL_SPEED / len;
    ball.vx *= f;
    ball.vy *= f;
  }

  function fullReset() {
    lives = 3;
    buildBricks();
    state = STATE_IDLE;
    lastTimestamp = null;
    overlay.style.opacity = "0";
    overlay.style.background = "transparent";
    overlay.textContent = "";

    abilityCharge = 0;
    abilityReady = false;

    resetBallPosition();
  }

  // ---------------------------------------------------------------------------
  // SPIELSTEUERUNG (START / ENDE)
  // ---------------------------------------------------------------------------

  function startCountdown() {
    if (state === STATE_PLAYING || state === STATE_COUNTDOWN) return;

    if (state === STATE_WON || state === STATE_LOST) {
      fullReset();
    }

    state = STATE_COUNTDOWN;
    countdownStart = performance.now();
    overlay.style.opacity = "1";
    overlay.style.background = "transparent";
    overlay.textContent = String(COUNTDOWN_SECONDS);
  }

  function startPlaying() {
    state = STATE_PLAYING;
    overlay.style.opacity = "0";
    overlay.textContent = "";
    setBallInitialVelocity();
  }

  function handleWin() {
    state = STATE_WON;

    const reward = starForLives(lives);
    if (reward) {
      try {
        onWin(reward);
      } catch (e) {
        console.error("brick_heart_pong onWin error:", e);
      }
    }

    overlay.textContent = "♥";
    overlay.style.opacity = "1";
    overlay.style.background = "rgba(140, 230, 180, 0.18)";
    setTimeout(() => {
      if (!destroyed && state === STATE_WON) {
        overlay.style.opacity = "0";
        overlay.style.background = "transparent";
        overlay.textContent = "";
      }
    }, 500);
  }

  function handleLifeLost() {
    // Ability verlieren bei Life-Loss
    abilityCharge = 0;
    abilityReady = false;

    lives -= 1;
    if (lives <= 0) {
      state = STATE_LOST;
      overlay.textContent = "✖";
      overlay.style.opacity = "1";
      overlay.style.background = "rgba(220,70,70,0.28)";
    } else {
      state = STATE_IDLE;
      overlay.textContent = "";
      overlay.style.opacity = "0";
      overlay.style.background = "transparent";
      resetBallPosition();
    }
  }

  // ---------------------------------------------------------------------------
  // INPUT
  // ---------------------------------------------------------------------------

  function handleKeyDown(e) {
    if (e.code === "ArrowLeft") {
      leftPressed = true;
      e.preventDefault();
    } else if (e.code === "ArrowRight") {
      rightPressed = true;
      e.preventDefault();
    } else if (e.code === "Space") {
      // SPACE zum Starten wie bei den anderen Games
      if (
        state === STATE_IDLE ||
        state === STATE_WON ||
        state === STATE_LOST
      ) {
        startCountdown();
      }
      e.preventDefault();
    }
  }

  function handleKeyUp(e) {
    if (e.code === "ArrowLeft") {
      leftPressed = false;
    } else if (e.code === "ArrowRight") {
      rightPressed = false;
    }
  }

  // ---------------------------------------------------------------------------
  // PHYSIK & KOLLISIONEN
  // ---------------------------------------------------------------------------

  function updatePaddle(delta) {
    let dir = 0;
    if (leftPressed && !rightPressed) dir = -1;
    else if (rightPressed && !leftPressed) dir = 1;

    if (dir !== 0) {
      paddle.x += dir * PADDLE_SPEED * delta;
      if (paddle.x < 16) paddle.x = 16;
      if (paddle.x + paddle.width > width - 16) {
        paddle.x = width - 16 - paddle.width;
      }
    }

    if (state === STATE_IDLE || state === STATE_COUNTDOWN) {
      // Ball folgt Paddle, solange noch nicht abgeschossen
      resetBallPosition();
    }
  }

  function updateBall(delta) {
    if (state !== STATE_PLAYING) return;

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    // Wände
    if (ball.x - ball.r <= 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
      playBounceSound("wall");
    } else if (ball.x + ball.r >= width) {
      ball.x = width - ball.r;
      ball.vx = -Math.abs(ball.vx);
      playBounceSound("wall");
    }

    if (ball.y - ball.r <= 16) {
      ball.y = 16 + ball.r;
      ball.vy = Math.abs(ball.vy);
      playBounceSound("wall");
    }

    // Unterkante: Leben verlieren
    if (ball.y - ball.r > height) {
      handleLifeLost();
      resetBallPosition();
      return;
    }

    // Paddle-Kollision
    if (
      ball.y + ball.r >= paddle.y &&
      ball.y - ball.r <= paddle.y + paddle.height &&
      ball.x + ball.r >= paddle.x &&
      ball.x - ball.r <= paddle.x + paddle.width &&
      ball.vy > 0
    ) {
      const hitPos =
        (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      const angle = (Math.PI / 3) * hitPos; // -60° bis +60°
      const speed = BALL_SPEED;
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.cos(angle) * speed;
      normalizeBallSpeed();
      ball.y = paddle.y - ball.r - 1;
      playBounceSound("paddle");
    }

    // Brick-Kollision
    brickCollision();
  }

  function brickCollision() {
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;

      const ballLeft = ball.x - ball.r;
      const ballRight = ball.x + ball.r;
      const ballTop = ball.y - ball.r;
      const ballBottom = ball.y + ball.r;

      const brickLeft = b.x;
      const brickRight = b.x + b.width;
      const brickTop = b.y;
      const brickBottom = b.y + b.height;

      if (
        ballRight >= brickLeft &&
        ballLeft <= brickRight &&
        ballBottom >= brickTop &&
        ballTop <= brickBottom
      ) {
        // Es gibt eine Kollision mit diesem Brick
        const useExplosive = abilityReady;

        // Bounce wie gewohnt anhand der Überlappung
        const overlapLeft = ballRight - brickLeft;
        const overlapRight = brickRight - ballLeft;
        const overlapTop = ballBottom - brickTop;
        const overlapBottom = brickBottom - ballTop;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          ball.vx = -ball.vx;
        } else {
          ball.vy = -ball.vy;
        }
        normalizeBallSpeed();
        playBounceSound("brick");

        if (useExplosive) {
          // Fähigkeit ist aktiv – Explosion im Radius
          const impactX = ball.x;
          const impactY = ball.y;
          const radius2 = ABILITY_RADIUS * ABILITY_RADIUS;

          for (let j = 0; j < bricks.length; j++) {
            const bj = bricks[j];
            if (!bj.alive) continue;
            const cx = bj.x + bj.width / 2;
            const cy = bj.y + bj.height / 2;
            const dx = cx - impactX;
            const dy = cy - impactY;
            if (dx * dx + dy * dy <= radius2) {
              bj.alive = false;
              bricksRemaining--;
            }
          }

          if (bricksRemaining <= 0) {
            handleWin();
          }

          // Ability verbraucht
          abilityReady = false;
          abilityCharge = 0;
        } else {
          // Normaler Hit: nur einen Brick zerstören
          if (b.alive) {
            b.alive = false;
            bricksRemaining--;
          }

          if (bricksRemaining <= 0) {
            handleWin();
          } else {
            // Ability aufladen
            if (abilityCharge < ABILITY_BRICKS) {
              abilityCharge++;
              if (abilityCharge >= ABILITY_BRICKS) {
                abilityCharge = ABILITY_BRICKS;
                abilityReady = true;
              }
            }
          }
        }

        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // ZEICHNEN
  // ---------------------------------------------------------------------------

  function drawBackground(delta) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#050b16");
    grad.addColorStop(0.4, "#0b1627");
    grad.addColorStop(1, "#101d30");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Lichterkette
    const lightsCount = 26;
    for (let i = 0; i < lightsCount; i++) {
      const t = (i / lightsCount) * width;
      const y = 28 + Math.sin(i * 0.7) * 6;
      ctx.beginPath();
      ctx.arc(t, y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? "#ffd966" : i % 3 === 1 ? "#ff9eb8" : "#9de6ff";
      ctx.fill();
    }

    // Schnee
    const snowCount = 40;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const tNow = performance.now();
    for (let i = 0; i < snowCount; i++) {
      const x = ((i * 97.3 + tNow * 0.04) % width) - 4;
      const y = 70 + Math.sin(i * 8 + tNow * 0.0008) * 18;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawBricks() {
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      const w = b.width;
      const h = b.height;

      let fillGrad;
      if (b.type === "c") {
        fillGrad = ctx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, "#fff9e6");
        fillGrad.addColorStop(1, "#ffd37a");
      } else {
        fillGrad = ctx.createLinearGradient(0, 0, 0, h);
        fillGrad.addColorStop(0, "#ff6b7a");
        fillGrad.addColorStop(1, "#c62839");
      }

      ctx.fillStyle = fillGrad;
      ctx.strokeStyle =
        b.type === "c" ? "rgba(120,80,20,0.9)" : "rgba(90,15,25,0.9)";
      ctx.lineWidth = 1.2;

      const r = 4;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  function drawPaddle() {
    ctx.save();
    ctx.translate(paddle.x, paddle.y);
    const w = paddle.width;
    const h = paddle.height;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#ffe9b8");
    grad.addColorStop(1, "#d29a4a");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(120,60,10,0.9)";
    ctx.lineWidth = 1.6;

    const r = 8;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function drawBall() {
    ctx.save();
    const x = ball.x;
    const y = ball.y;
    const r = ball.r;

    // Glow, wenn Ability bereit
    if (abilityReady) {
      const t = performance.now() * 0.004;
      const pulse = 1 + 0.18 * Math.sin(t);
      const glowR = r * (2.0 * pulse);

      const glowGrad = ctx.createRadialGradient(
        x,
        y,
        r * 0.2,
        x,
        y,
        glowR
      );
      glowGrad.addColorStop(0, "rgba(255,245,210,0.9)");
      glowGrad.addColorStop(1, "rgba(255,120,80,0.0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (abilityReady) {
      grad.addColorStop(0, "#fff7dd");
      grad.addColorStop(1, "#ffb36a");
      ctx.strokeStyle = "rgba(255,190,120,0.95)";
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#ffdede");
      ctx.strokeStyle = "rgba(150,40,40,0.9)";
    }
    ctx.fillStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    ctx.font =
      "13px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textBaseline = "middle";

    const livesText = `♥ ${lives}`;
    const bricksText = `🧱 ${bricksRemaining}`;
    const abilityText = abilityReady
      ? "✴ Bomb ready"
      : `✴ ${abilityCharge}/${ABILITY_BRICKS}`;

    const padX = 8;
    const y = 12;
    const h = 22;
    const radius = 11;

    // Helfer zum Zeichnen einer Pill
    function drawPill(text, x, fill, stroke) {
      const w = ctx.measureText(text).width + padX * 2;

      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;

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

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(text, x + padX, y + h / 2);

      return w;
    }

    // Leben links
    let x = 12;
    drawPill(
      livesText,
      x,
      "rgba(20, 30, 50, 0.9)",
      "rgba(255,255,255,0.35)"
    );

    // Bricks rechts
    const bricksWidth = ctx.measureText(bricksText).width + padX * 2;
    x = width - bricksWidth - 12;
    drawPill(
      bricksText,
      x,
      "rgba(20, 30, 50, 0.9)",
      "rgba(255,255,255,0.35)"
    );

    // Ability mittig
    const abilityWidth = ctx.measureText(abilityText).width + padX * 2;
    x = (width - abilityWidth) / 2;
    const ratio = abilityCharge / ABILITY_BRICKS;
    const fill = abilityReady
      ? "rgba(255,220,140,0.28)"
      : "rgba(30, 40, 65, 0.95)";
    const stroke = abilityReady
      ? "rgba(255,235,170,0.95)"
      : "rgba(255,255,255,0.35)";
    drawPill(abilityText, x, fill, stroke);

    ctx.restore();
  }

  function render(delta) {
    drawBackground(delta);
    drawBricks();
    drawPaddle();
    drawBall();
    drawHUD();
  }

  // ---------------------------------------------------------------------------
  // MAIN LOOP
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
        startPlaying();
        setTimeout(() => {
          if (!destroyed && state === STATE_PLAYING) {
            overlay.style.opacity = "0";
            overlay.textContent = "";
          }
        }, 220);
      } else {
        overlay.textContent = String(Math.ceil(remaining));
      }
    }

    if (state === STATE_PLAYING) {
      updatePaddle(delta);
      updateBall(delta);
    } else {
      updatePaddle(delta);
    }

    render(delta);

    animationFrameId = window.requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------------------
  // EVENTS & START
  // ---------------------------------------------------------------------------

  function handleResize() {
    resizeCanvas();
  }

  startBtn.addEventListener("click", () => {
    if (
      state === STATE_IDLE ||
      state === STATE_WON ||
      state === STATE_LOST
    ) {
      startCountdown();
    }
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", handleResize);

  resizeCanvas();
  buildBricks();
  fullReset();
  animationFrameId = window.requestAnimationFrame(step);

  // ---------------------------------------------------------------------------
  // CLEANUP
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
