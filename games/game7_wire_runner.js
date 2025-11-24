// Spiel 7: Golden Wire Runner – ein endloser Weihnachts-Dino-Runner
// Steuerung: SPACE/↑ springen, ↓ ducken. Start-Button löst Countdown 3-2-1-Go aus.

window.AdventGames = window.AdventGames || {};

window.AdventGames["wire_runner_7"] = function initWireRunner(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const GAME_DISTANCE = 7000; // Meter bis zum Ziel
  const TARGET_TIME = 65; // Sekunden, etwas entspannter
  const BASE_SPEED = GAME_DISTANCE / TARGET_TIME; // m/s
  const GRAVITY = 2600;
  const JUMP_FORCE = 1050;
  const COYOTE_TIME = 0.12;
  const JUMP_BUFFER = 0.14;
  const DUCK_HEIGHT = 38;
  const STAND_HEIGHT = 68;
  const PLAYER_WIDTH = 54;

  let canvas, ctx;
  let width = 840;
  let height = 520;
  let dpr = window.devicePixelRatio || 1;
  let groundY = height - 90;

  let lastTime = null;
  let distance = 0;
  let elapsed = 0;
  let speed = BASE_SPEED;

  let isPlaying = false;
  let isOver = false;
  let isWin = false;
  let isCountingDown = false;
  let countdownStart = 0;
  const COUNTDOWN_DURATION = 3; // seconds

  const keys = { ArrowUp: false, Space: false, ArrowDown: false };

  const player = {
    x: 120,
    y: 0,
    vy: 0,
    width: PLAYER_WIDTH,
    height: STAND_HEIGHT,
    isDucking: false,
  };

  const obstacles = [];
  let spawnTimer = 1.2;
  let spawnInterval = 1.25;

  let runPhase = 0;
  let coyoteTimer = 0;
  let jumpBufferTimer = 0;
  let goOverlayTimeout = null;

  const snow = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 2,
    s: 8 + Math.random() * 28,
  }));

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "wire-runner";

  const header = document.createElement("div");
  header.className = "wire-runner__header";
  header.innerHTML = `
    <div class="wire-runner__title">Tür 7 – Golden Wire Runner</div>
    <div class="wire-runner__subtitle">Kurzer Text, klare Aufgabe: 7000 m schaffen, Hindernissen ausweichen.</div>
  `;

  const controls = document.createElement("div");
  controls.className = "wire-runner__controls";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "wire-runner__btn wire-runner__btn--primary";
  startBtn.textContent = "Starten";

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.className = "wire-runner__btn";
  restartBtn.textContent = "Neu versuchen";

  const statusLabel = document.createElement("div");
  statusLabel.className = "wire-runner__status";
  statusLabel.textContent = "Start drücken oder Space/↑ tippen. Hindernissen ausweichen.";

  controls.appendChild(startBtn);
  controls.appendChild(restartBtn);
  controls.appendChild(statusLabel);

  const stats = document.createElement("div");
  stats.className = "wire-runner__stats";
  stats.innerHTML = `
    <span>Distanz: <strong id="wireDistance">0 m</strong></span>
    <span>Zeit: <strong id="wireTime">0.0 s</strong></span>
    <span>Geschwindigkeit: <strong id="wireSpeed">0 km/h</strong></span>
  `;

  const layout = document.createElement("div");
  layout.className = "wire-runner__layout";

  const canvasWrapper = document.createElement("div");
  canvasWrapper.className = "wire-runner__canvas-wrapper";

  canvas = document.createElement("canvas");
  canvas.className = "wire-runner__canvas";
  canvasWrapper.appendChild(canvas);

  const overlay = document.createElement("div");
  overlay.className = "wire-runner__overlay";
  overlay.textContent = "Bereit?";
  canvasWrapper.appendChild(overlay);

  layout.appendChild(canvasWrapper);

  root.appendChild(header);
  root.appendChild(controls);
  root.appendChild(stats);
  root.appendChild(layout);

  container.appendChild(root);

  ctx = canvas.getContext("2d");

  function resize() {
    const bounds = canvasWrapper.getBoundingClientRect();
    width = Math.min(980, Math.max(700, bounds.width));
    height = 520;
    dpr = window.devicePixelRatio || 1;
    groundY = height - 90;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function resetPlayer() {
    player.y = groundY - player.height;
    player.vy = 0;
    player.isDucking = false;
    player.height = STAND_HEIGHT;
  }

  function onGround() {
    return player.y + player.height >= groundY - 0.5;
  }

  function resetGame() {
    if (goOverlayTimeout) {
      clearTimeout(goOverlayTimeout);
      goOverlayTimeout = null;
    }

    distance = 0;
    elapsed = 0;
    speed = BASE_SPEED;
    spawnTimer = 1.2;
    spawnInterval = 1.25;
    obstacles.length = 0;
    isPlaying = false;
    isWin = false;
    isOver = false;
    isCountingDown = false;
    lastTime = null;
    runPhase = 0;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    overlay.textContent = "Bereit?";
    overlay.classList.add("wire-runner__overlay--show");
    statusLabel.textContent = "Start drücken oder Space/↑ tippen. Hindernissen ausweichen.";
    resetPlayer();
  }

  function startCountdown() {
    if (isPlaying || isCountingDown) return;
    isCountingDown = true;
    countdownStart = performance.now();
    overlay.classList.add("wire-runner__overlay--show");
    overlay.textContent = "3";
    statusLabel.textContent = "Countdown läuft…";
  }

  function startRun() {
    isCountingDown = false;
    isPlaying = true;
    isOver = false;
    isWin = false;
    overlay.classList.remove("wire-runner__overlay--show");
    statusLabel.textContent = "Lauf! Strecke freihalten.";
  }

  function spawnObstacle() {
    const size = 24 + Math.random() * 34; // variable Größen
    const isFlying = Math.random() < 0.3; // ein Teil schwebt
    const yPos = isFlying
      ? groundY - size - (34 + Math.random() * 60)
      : groundY - size + 8;

    obstacles.push({
      x: width + size + 120 + Math.random() * 120,
      y: yPos,
      size,
      rotation: Math.random() * Math.PI * 2,
      angularVel: (Math.random() * 2 + 1.2) * (Math.random() < 0.5 ? -1 : 1),
    });
  }

  function updateObstacles(delta) {
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      spawnObstacle();
      const difficultyBoost = Math.min(0.26, (distance / GAME_DISTANCE) * 0.22);
      spawnInterval = 1.05 - difficultyBoost + Math.random() * 0.22;
      spawnTimer = spawnInterval;
    }

    for (let i = obstacles.length - 1; i >= 0; i -= 1) {
      const obs = obstacles[i];
      obs.x -= (speed * 2.35) * delta; // Bildgeschwindigkeit
      obs.rotation += obs.angularVel * delta;
      if (obs.x + obs.size < -40) {
        obstacles.splice(i, 1);
      }
    }
  }

  function collideRectCircle(px, py, pw, ph, cx, cy, r) {
    const closestX = Math.max(px, Math.min(cx, px + pw));
    const closestY = Math.max(py, Math.min(cy, py + ph));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }

  function handleCollision() {
    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    for (const obs of obstacles) {
      const cx = obs.x;
      const cy = obs.y;
      const r = obs.size * 0.55;
      if (collideRectCircle(px, py, pw, ph, cx, cy, r)) {
        isOver = true;
        isPlaying = false;
        overlay.textContent = "Autsch! Noch mal?";
        overlay.classList.add("wire-runner__overlay--show");
        statusLabel.textContent = "Getroffen – klicke Neu versuchen oder Start.";
        return;
      }
    }
  }

  function updatePlayer(delta) {
    const grounded = onGround();

    if (grounded) {
      coyoteTimer = COYOTE_TIME;
      player.vy = Math.max(player.vy, 0);
    } else {
      coyoteTimer = Math.max(0, coyoteTimer - delta);
    }

    if (keys.ArrowDown && grounded) {
      if (!player.isDucking) {
        player.isDucking = true;
        const feet = player.y + player.height;
        player.height = DUCK_HEIGHT;
        player.y = feet - player.height;
      }
    } else if (player.isDucking) {
      const feet = player.y + player.height;
      player.isDucking = false;
      player.height = STAND_HEIGHT;
      player.y = feet - player.height;
    }

    const wantsJump = keys.Space || keys.ArrowUp;
    if (wantsJump) {
      jumpBufferTimer = JUMP_BUFFER;
    } else {
      jumpBufferTimer = Math.max(0, jumpBufferTimer - delta);
    }

    if (jumpBufferTimer > 0 && (grounded || coyoteTimer > 0)) {
      if (player.isDucking) {
        const feet = player.y + player.height;
        player.isDucking = false;
        player.height = STAND_HEIGHT;
        player.y = feet - player.height;
      }
      player.vy = -JUMP_FORCE;
      jumpBufferTimer = 0;
      coyoteTimer = 0;
      statusLabel.textContent = "Sprung!";
    }

    player.vy += GRAVITY * delta;
    player.y += player.vy * delta;

    if (player.y + player.height >= groundY) {
      player.y = groundY - player.height;
      player.vy = 0;
    }
  }

  function drawBackground(delta) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#0c1422");
    sky.addColorStop(0.6, "#0d1a24");
    sky.addColorStop(1, "#12202a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#0b1a1f";
    ctx.fillRect(0, groundY + 10, width, height - groundY - 10);

    // Schneeflocken
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    snow.forEach((flocke) => {
      ctx.beginPath();
      ctx.arc(flocke.x * width, flocke.y * height, flocke.r, 0, Math.PI * 2);
      ctx.fill();
      flocke.y += (flocke.s * delta) / height;
      flocke.x += 0.03 * delta;
      if (flocke.y > 1) flocke.y = -0.02;
      if (flocke.x > 1) flocke.x = 0;
    });

    // Sterne / Dekolichter
    ctx.fillStyle = "rgba(255, 226, 165, 0.6)";
    for (let i = 0; i < 22; i += 1) {
      const x = ((i * 83.7) % width) + (elapsed * 8 % width);
      const y = 40 + (Math.sin(i * 12.3 + elapsed * 1.4) * 18);
      ctx.fillRect((x % width) - 1, y, 3, 3);
    }

    // Bodenlinie
    ctx.strokeStyle = "rgba(255, 215, 182, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 2);
    ctx.lineTo(width, groundY + 2);
    ctx.stroke();
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    const bodyHeight = player.height;
    const gradient = ctx.createLinearGradient(0, 0, 0, bodyHeight);
    gradient.addColorStop(0, "#d5f0ff");
    gradient.addColorStop(1, "#81b3ff");

    ctx.fillStyle = gradient;
    const radius = 10;
    const w = player.width;
    const h = bodyHeight;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.quadraticCurveTo(w, 0, w, radius);
    ctx.lineTo(w, h - radius);
    ctx.quadraticCurveTo(w, h, w - radius, h);
    ctx.lineTo(radius, h);
    ctx.quadraticCurveTo(0, h, 0, h - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();

    // Gesicht / Deko
    ctx.fillStyle = "#0b1a1f";
    ctx.fillRect(w - 18, 12, 6, 10);
    ctx.fillRect(w - 32, 12, 6, 10);
    ctx.fillStyle = "#ffdd78";
    ctx.fillRect(w - 28, h - 14, 16, 8);

    // Beine / Bewegung
    ctx.strokeStyle = "#1a2f4a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    const stride = Math.sin(runPhase) * 10;
    const lift = Math.max(0, Math.sin(runPhase + Math.PI / 2) * 8);
    ctx.beginPath();
    ctx.moveTo(10 + stride, h - 6);
    ctx.lineTo(10 + stride, h + 14 + lift);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - 14 - stride, h - 6);
    ctx.lineTo(w - 14 - stride, h + 12 + Math.max(0, -lift));
    ctx.stroke();

    ctx.restore();
  }

  function drawObstacles() {
    obstacles.forEach((obs) => {
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.rotation);

      const g = ctx.createRadialGradient(0, 0, obs.size * 0.2, 0, 0, obs.size);
      g.addColorStop(0, "#ffe9b3");
      g.addColorStop(0.6, "#f9c84a");
      g.addColorStop(1, "#c4971a");
      ctx.fillStyle = g;
      ctx.strokeStyle = "rgba(255, 250, 230, 0.6)";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(0, 0, obs.size * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Drahtlinien
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, obs.size * 0.55 - i * 3, (i * Math.PI) / 6, (i * Math.PI) / 6 + Math.PI * 1.2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  function drawHUD() {
    const kmh = (speed * 3.6).toFixed(1);
    document.getElementById("wireDistance").textContent = `${Math.floor(distance)} m`;
    document.getElementById("wireTime").textContent = `${elapsed.toFixed(1)} s`;
    document.getElementById("wireSpeed").textContent = `${kmh} km/h`;
  }

  function maybeWin() {
    if (distance >= GAME_DISTANCE && !isWin) {
      isWin = true;
      isPlaying = false;
      overlay.textContent = "GESCHAFFT!";
      overlay.classList.add("wire-runner__overlay--show");
      statusLabel.textContent = "Du hast 7000 m erreicht – Geschenk frei!";
      onWin();
    }
  }

  function update(delta) {
    if (isCountingDown) {
      const elapsedCountdown = (performance.now() - countdownStart) / 1000;
      const remaining = COUNTDOWN_DURATION - elapsedCountdown;
      if (remaining <= 0) {
        overlay.textContent = "GO!";
        goOverlayTimeout = setTimeout(() => {
          overlay.classList.remove("wire-runner__overlay--show");
          goOverlayTimeout = null;
        }, 320);
        startRun();
      } else {
        overlay.textContent = Math.ceil(remaining).toString();
      }
      return;
    }

    if (!isPlaying) return;

    elapsed += delta;
    speed = BASE_SPEED * (1 + Math.min(0.22, distance / GAME_DISTANCE * 0.25));
    distance += speed * delta;
    runPhase += delta * (onGround() ? 10 + speed * 0.03 : 6);
    if (runPhase > Math.PI * 2) runPhase -= Math.PI * 2;

    updatePlayer(delta);
    updateObstacles(delta);
    handleCollision();
    maybeWin();
  }

  function draw(delta) {
    drawBackground(delta);
    drawObstacles();
    drawPlayer();
    drawHUD();

    if (!isPlaying && !isCountingDown && !isWin && !isOver) {
      overlay.classList.add("wire-runner__overlay--show");
      overlay.textContent = "Bereit?";
    }
  }

  function frame(ts) {
    if (lastTime === null) {
      lastTime = ts;
    }
    const delta = Math.min(0.04, (ts - lastTime) / 1000);
    lastTime = ts;

    update(delta);
    draw(delta);

    requestAnimationFrame(frame);
  }

  function onKeyDown(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      keys.Space = true;
      keys.ArrowUp = true;
      if (!isPlaying && !isCountingDown) startCountdown();
      e.preventDefault();
    }
    if (e.code === "ArrowDown") {
      keys.ArrowDown = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      keys.Space = false;
      keys.ArrowUp = false;
    }
    if (e.code === "ArrowDown") {
      keys.ArrowDown = false;
    }
  }

  startBtn.addEventListener("click", startCountdown);
  restartBtn.addEventListener("click", () => {
    resetGame();
  });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", resize);

  resize();
  resetGame();
  requestAnimationFrame(frame);

  return {
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", resize);
    },
  };
};
