// Spiel 7: Golden Wire Runner – Endless Runner im Offline-Dino-Stil
// Steuerung: Leertaste oder Pfeil hoch / W zum Springen. Ziel: 7000 m in unter ~1 Minute schaffen.

window.AdventGames = window.AdventGames || {};

window.AdventGames["wire_spring_runner"] = function initWireSpringRunner(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const TARGET_DISTANCE = 7000; // Meter
  const GROUND_Y = 210;
  const GRAVITY = 2200;
  const JUMP_IMPULSE = -760;
  const DIVE_GRAVITY = 3200;
  const PLAYER_X = 120;
  const PLAYER_WIDTH = 46;
  const PLAYER_HEIGHT = 72;

  const START_SPEED = 100; // m/s
  const MAX_SPEED = 140;
  const ACCELERATION = 0.65; // m/s^2

  const MIN_SPAWN = 0.75;
  const MAX_SPAWN = 1.35;

  const root = document.createElement("div");
  root.className = "wire-runner";

  const header = document.createElement("div");
  header.className = "wire-runner__header";
  header.innerHTML = `
    <div class="wire-runner__title">
      <span class="wire-runner__emoji">🎄</span>
      <div>
        <strong>Golden Wire Runner</strong>
        <p>Springe über Geschenke & Schneehaufen wie beim Offline-Dino – aber in festlichem Gold!</p>
      </div>
    </div>
    <div class="wire-runner__stats">
      <span id="wireDistance">0 m</span>
      <span id="wireSpeed">0 m/s</span>
      <span id="wireBest">Best: 0 m</span>
    </div>
  `;

  const controls = document.createElement("div");
  controls.className = "wire-runner__controls";
  controls.innerHTML = `
    <button class="wire-runner__btn" id="wireStart">Start</button>
    <p>Leertaste / W / Pfeil hoch zum Springen. Du verlierst, sobald du eine Deko berührst.</p>
  `;

  const canvas = document.createElement("canvas");
  canvas.width = 860;
  canvas.height = 260;
  canvas.className = "wire-runner__canvas";

  const status = document.createElement("div");
  status.className = "wire-runner__status";
  status.textContent = "Bereit. Drücke Start oder die Leertaste.";

  root.appendChild(header);
  root.appendChild(controls);
  root.appendChild(canvas);
  root.appendChild(status);
  container.innerHTML = "";
  container.appendChild(root);

  const ctx = canvas.getContext("2d");
  let lastFrame = null;
  let rafId = null;

  let gameState = "idle"; // idle | countdown | running | lost | won
  let countdownStart = null;
  const COUNTDOWN_TIME = 3;

  let speed = START_SPEED;
  let distance = 0;
  let best = 0;
  let obstacles = [];
  let spawnTimer = 0;

  let playerY = GROUND_Y;
  let playerVY = 0;
  let onGround = true;

  let snowFlakes = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 1 + Math.random() * 1.4,
    s: 15 + Math.random() * 20
  }));

  const clouds = Array.from({ length: 3 }, (_, i) => ({
    x: canvas.width * 0.3 * i + 80,
    y: 30 + Math.random() * 60,
    w: 160 + Math.random() * 60,
    h: 36 + Math.random() * 20
  }));

  function updateStatus(text) {
    status.textContent = text;
  }

  function resetGame() {
    speed = START_SPEED;
    distance = 0;
    obstacles = [];
    spawnTimer = 0;
    playerY = GROUND_Y;
    playerVY = 0;
    onGround = true;
    gameState = "idle";
    countdownStart = null;
    lastFrame = null;
    updateStatus("Bereit. Drücke Start oder die Leertaste.");
    updateDisplays();
  }

  function startCountdown() {
    if (gameState === "running" || gameState === "countdown") return;
    gameState = "countdown";
    countdownStart = performance.now();
    updateStatus("Countdown läuft … 3, 2, 1, Go!");
  }

  function startRun() {
    gameState = "running";
    lastFrame = performance.now();
    updateStatus("Go! Laufe bis 7000 m.");
  }

  function updateDisplays() {
    const distEl = header.querySelector("#wireDistance");
    const speedEl = header.querySelector("#wireSpeed");
    const bestEl = header.querySelector("#wireBest");
    if (distEl) distEl.textContent = `${Math.floor(distance)} m`;
    if (speedEl) speedEl.textContent = `${Math.round(speed)} m/s`;
    if (bestEl) bestEl.textContent = `Best: ${Math.floor(best)} m`;
  }

  function spawnObstacle() {
    const kind = Math.random() > 0.5 ? "gift" : "snow";
    const size = kind === "gift" ? 34 + Math.random() * 22 : 26 + Math.random() * 30;
    const height = kind === "gift" ? size * 0.9 : size * 0.6;
    obstacles.push({
      x: canvas.width + size,
      y: GROUND_Y - height,
      w: size,
      h: height,
      kind,
      hue: 30 + Math.random() * 40
    });
  }

  function updateObstacles(dt) {
    spawnTimer -= dt;
    const targetSpawn = Math.max(MIN_SPAWN, MAX_SPAWN - distance / 4000);
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = targetSpawn * (0.7 + Math.random() * 0.6);
    }

    const move = (speed + 40) * dt;
    obstacles.forEach((o) => {
      o.x -= move;
    });
    obstacles = obstacles.filter((o) => o.x + o.w > -40);
  }

  function drawBackground(time) {
    ctx.fillStyle = "linear-gradient(180deg, #0f1f35 0%, #0c1626 100%)";
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#0d1b2e");
    grad.addColorStop(1, "#0a1120");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    clouds.forEach((c) => {
      c.x -= 12 * (time / 1000);
      if (c.x + c.w < -30) c.x = canvas.width + 80;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(c.x, c.y, c.w, c.h, 16);
      ctx.fill();
    });

    ctx.fillStyle = "#0e1726";
    ctx.fillRect(0, GROUND_Y + 20, canvas.width, canvas.height - (GROUND_Y + 20));

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 22) {
      const y = GROUND_Y + 8 + Math.sin((x + time * 0.2) / 18) * 4;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function drawSnow(dt) {
    snowFlakes.forEach((s) => {
      s.y += s.s * dt;
      s.x -= 18 * dt;
      if (s.y > canvas.height) s.y = -6;
      if (s.x < -6) s.x = canvas.width + Math.random() * 30;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPlayer(time) {
    const baseY = playerY;
    const bob = Math.sin(time / 120) * (onGround ? 2 : 6);
    const y = baseY + bob;

    ctx.strokeStyle = "#ffd86b";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Feder-Körper
    const springTurns = 4;
    const springHeight = 46;
    ctx.beginPath();
    for (let i = 0; i <= springTurns * Math.PI; i += Math.PI / 6) {
      const t = i / (springTurns * Math.PI);
      const sx = PLAYER_X + Math.sin(i) * 8;
      const sy = y - springHeight * (1 - t);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Kopf-Kreis
    ctx.beginPath();
    ctx.arc(PLAYER_X + 4, y - springHeight - 12, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Arme
    ctx.beginPath();
    ctx.moveTo(PLAYER_X - 6, y - 46);
    ctx.lineTo(PLAYER_X + 16, y - 34);
    ctx.lineTo(PLAYER_X + 32, y - 50 + Math.sin(time / 180) * 4);
    ctx.stroke();

    // Beine
    ctx.beginPath();
    ctx.moveTo(PLAYER_X + 2, y - 8);
    ctx.lineTo(PLAYER_X - 10, y + 12);
    ctx.moveTo(PLAYER_X + 6, y - 6);
    ctx.lineTo(PLAYER_X + 22, y + 10);
    ctx.stroke();
  }

  function drawObstacles() {
    obstacles.forEach((o) => {
      if (o.kind === "gift") {
        ctx.fillStyle = `hsl(${o.hue}, 72%, 58%)`;
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#ffd86b";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.5, o.y);
        ctx.lineTo(o.x + o.w * 0.5, o.y + o.h);
        ctx.moveTo(o.x, o.y + o.h * 0.55);
        ctx.lineTo(o.x + o.w, o.y + o.h * 0.5);
        ctx.stroke();
      } else {
        const top = o.y;
        const base = o.y + o.h;
        ctx.fillStyle = "#eef6ff";
        ctx.beginPath();
        ctx.moveTo(o.x, base);
        ctx.lineTo(o.x + o.w * 0.5, top - 8);
        ctx.lineTo(o.x + o.w, base);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(o.x + o.w * 0.5, base, o.w * 0.55, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function checkCollision() {
    const px = PLAYER_X - PLAYER_WIDTH * 0.25;
    const py = playerY - PLAYER_HEIGHT;
    const pw = PLAYER_WIDTH;
    const ph = PLAYER_HEIGHT;

    return obstacles.some((o) => {
      return (
        px < o.x + o.w - 6 &&
        px + pw > o.x + 6 &&
        py < o.y + o.h &&
        py + ph > o.y + 4
      );
    });
  }

  function handleLoss() {
    gameState = "lost";
    best = Math.max(best, distance);
    updateStatus("Autsch! Du bist gegen eine Deko gelaufen. Drücke Start für einen neuen Versuch.");
  }

  function handleWin() {
    if (gameState === "won") return;
    gameState = "won";
    best = Math.max(best, distance);
    updateStatus("Geschafft! 7000 m erreicht – öffne dein Geschenk! ✨");
    try {
      onWin();
    } catch (e) {
      console.error("Konnte onWin nicht ausführen", e);
    }
  }

  function update(dt, now) {
    if (gameState !== "running") return;

    speed = Math.min(MAX_SPEED, speed + ACCELERATION * dt);
    distance += speed * dt;
    updateDisplays();

    playerVY += (onGround && playerVY >= 0 ? GRAVITY : DIVE_GRAVITY) * dt;
    playerY += playerVY * dt;
    if (playerY >= GROUND_Y) {
      playerY = GROUND_Y;
      playerVY = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    updateObstacles(dt);

    if (checkCollision()) {
      handleLoss();
    }

    if (distance >= TARGET_DISTANCE) {
      handleWin();
    }
  }

  function render(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(time);
    drawObstacles();
    drawPlayer(time);
    drawSnow(1 / 60);

    if (gameState === "countdown") {
      const elapsed = (performance.now() - (countdownStart || 0)) / 1000;
      const remaining = Math.max(0, COUNTDOWN_TIME - elapsed);
      const value = remaining > 0.5 ? Math.ceil(remaining) : "Go!";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffd86b";
      ctx.font = "bold 72px 'Marcellus', 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(value, canvas.width / 2, canvas.height / 2 + 20);
    }

    if (gameState === "lost" || gameState === "won") {
      ctx.fillStyle = "rgba(0,0,0,0.58)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffe9b0";
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(gameState === "won" ? "Du hast es geschafft!" : "Getroffen!", canvas.width / 2, canvas.height / 2 - 6);
      ctx.font = "18px 'Inter', sans-serif";
      ctx.fillText("Drücke Start für einen neuen Lauf.", canvas.width / 2, canvas.height / 2 + 28);
    }
  }

  function loop(timestamp) {
    if (!lastFrame) lastFrame = timestamp;
    const dt = Math.min(0.05, (timestamp - lastFrame) / 1000);
    lastFrame = timestamp;

    if (gameState === "countdown") {
      const elapsed = (timestamp - (countdownStart || 0)) / 1000;
      if (elapsed >= COUNTDOWN_TIME) {
        startRun();
      }
    }

    update(dt, timestamp);
    render(timestamp);

    if (gameState !== "idle" || gameState === "running") {
      rafId = requestAnimationFrame(loop);
    }
  }

  function jump() {
    if (gameState === "idle") {
      startCountdown();
      if (!rafId) rafId = requestAnimationFrame(loop);
      return;
    }
    if (gameState === "countdown") return;
    if (gameState === "lost" || gameState === "won") return;
    if (onGround) {
      playerVY = JUMP_IMPULSE;
      onGround = false;
    }
  }

  function handleKeydown(e) {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
      e.preventDefault();
      jump();
    }
    if (e.code === "KeyR") {
      resetGame();
    }
  }

  function handleStartClick() {
    if (gameState === "running" || gameState === "countdown") return;
    if (gameState === "lost" || gameState === "won") {
      resetGame();
    }
    startCountdown();
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  const startBtn = controls.querySelector("#wireStart");
  startBtn.addEventListener("click", handleStartClick);
  window.addEventListener("keydown", handleKeydown);

  resetGame();
  render(performance.now());

  return {
    destroy: () => {
      window.removeEventListener("keydown", handleKeydown);
      if (startBtn) startBtn.removeEventListener("click", handleStartClick);
      if (rafId) cancelAnimationFrame(rafId);
    }
  };
};
