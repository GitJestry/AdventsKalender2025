// Spiel 5: Maiswaffel-Schießen – schnelles Shoot-the-Duck-inspiriertes Wintergame

window.AdventGames = window.AdventGames || {};

window.AdventGames["maiswaffel_shooter"] = function initMaiswaffelShooter(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  // Grundparameter
  const TARGET_SCORE = 30;
  const GAME_DURATION = 60; // Sekunden
  const BASE_SPAWN_MS = 550;
  const MAX_SPAWN_MS = 1400;
  const PROJECTILE_LIFE = 0.2; // Sekunden
  const WAFER_BASE_SPEED = 180;
  const SNOW_COUNT = 120;

  let score = 0;
  let timeLeft = GAME_DURATION;
  let lastTimestamp = null;
  let spawnTimer = 0;
  let isRunning = true;
  let rafId = null;
  let destroyed = false;
  let crosshair = { x: 300, y: 200 };

  const wafers = [];
  const projectiles = [];
  const fragments = [];
  const snowflakes = [];
  let lastFrameDt = 0;

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "shooter-game";

  const hud = document.createElement("div");
  hud.className = "shooter-hud";
  hud.innerHTML = `
    <div class="shooter-stat"><span class="label">Punkte</span><span id="shooterScore" class="value">0</span></div>
    <div class="shooter-stat"><span class="label">Zeit</span><span id="shooterTime" class="value">${GAME_DURATION}s</span></div>
    <div class="shooter-target">Ziel: ${TARGET_SCORE} Maiswaffeln in ${GAME_DURATION} Sekunden</div>
  `;

  const hint = document.createElement("p");
  hint.className = "shooter-hint";
  hint.textContent = "Steuere das Fadenkreuz mit der Maus und klicke, um Schoko-Kugeln zu schießen. Schnelligkeit zählt!";

  const canvasWrap = document.createElement("div");
  canvasWrap.className = "shooter-canvas-wrap";

  const canvas = document.createElement("canvas");
  canvas.className = "shooter-canvas";
  const ctx = canvas.getContext("2d");

  canvasWrap.appendChild(canvas);
  root.appendChild(hud);
  root.appendChild(hint);
  root.appendChild(canvasWrap);

  container.appendChild(root);

  const scoreEl = hud.querySelector("#shooterScore");
  const timeEl = hud.querySelector("#shooterTime");

  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    canvas.width = Math.floor(rect.width);
    canvas.height = Math.floor(rect.height);
    crosshair.x = Math.min(Math.max(crosshair.x, 0), canvas.width);
    crosshair.y = Math.min(Math.max(crosshair.y, 0), canvas.height);
  }

  resizeCanvas();
  crosshair.x = canvas.width / 2;
  crosshair.y = canvas.height / 2;
  window.addEventListener("resize", resizeCanvas);

  function spawnSnow() {
    snowflakes.length = 0;
    for (let i = 0; i < SNOW_COUNT; i += 1) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.5,
        speedY: Math.random() * 18 + 12,
        drift: Math.random() * 18 - 9,
      });
    }
  }

  function spawnWafer() {
    const fromLeft = Math.random() > 0.5;
    const radius = 18 + Math.random() * 18;
    const y = 60 + Math.random() * (canvas.height - 120);
    const speedBoost = timeLeft < GAME_DURATION / 2 ? 1.25 : 1;
    const chaos = 0.75 + Math.random() * 0.6;
    const vx = (fromLeft ? 1 : -1) * (WAFER_BASE_SPEED * chaos * speedBoost + Math.random() * 80);
    const vy = Math.random() * 60 - 30;
    const x = fromLeft ? -radius : canvas.width + radius;
    const hatTilt = Math.random() * Math.PI * 2;

    wafers.push({ x, y, vx, vy, radius, hatTilt, alive: true });
  }

  function createFragments(w) {
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 80;
      fragments.push({
        x: w.x,
        y: w.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.65,
        size: Math.random() * 6 + 3,
      });
    }
  }

  function fireChocolate(event) {
    if (!isRunning) return;
    const rect = canvas.getBoundingClientRect();
    crosshair.x = event.clientX - rect.left;
    crosshair.y = event.clientY - rect.top;
    const dx = crosshair.x - canvas.width / 2;
    const dy = crosshair.y - canvas.height / 2;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = 1200;

    projectiles.push({
      x: crosshair.x,
      y: crosshair.y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      life: PROJECTILE_LIFE,
    });
  }

  function updateCrosshair(event) {
    const rect = canvas.getBoundingClientRect();
    crosshair.x = event.clientX - rect.left;
    crosshair.y = event.clientY - rect.top;
  }

  canvas.addEventListener("mousemove", updateCrosshair);
  canvas.addEventListener("mouseenter", updateCrosshair);
  canvas.addEventListener("mousedown", fireChocolate);

  function updateHUD() {
    if (scoreEl) scoreEl.textContent = score;
    if (timeEl) timeEl.textContent = `${Math.max(0, Math.ceil(timeLeft))}s`;
  }

  function markWin() {
    isRunning = false;
    showEndBanner(true);
    onWin();
  }

  function showEndBanner(won) {
    const banner = document.createElement("div");
    banner.className = "shooter-end";
    banner.innerHTML = `
      <div class="shooter-end-title">${won ? "Geschafft!" : "Zeit abgelaufen"}</div>
      <div class="shooter-end-text">${won ? "Du hast genug Maiswaffeln erwischt – Geschenk-Hinweis freigeschaltet!" : "Die Maiswaffeln waren zu flink. Versuch es direkt nochmal."}</div>
    `;
    root.appendChild(banner);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0b1b38");
    gradient.addColorStop(0.5, "#12345d");
    gradient.addColorStop(1, "#0a1a30");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sterne
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 40; i += 1) {
      const x = (i * 73) % canvas.width;
      const y = (i * 37) % Math.max(200, canvas.height / 2);
      ctx.beginPath();
      ctx.arc((x + i * 11) % canvas.width, y + (i % 3), 1.5 + (i % 3) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bodenlinie
    ctx.fillStyle = "#d6e6ff";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#bed6f5";
    ctx.fillRect(0, canvas.height - 32, canvas.width, 8);
  }

  function drawSnow(dt) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    snowflakes.forEach((flake) => {
      flake.y += flake.speedY * dt;
      flake.x += flake.drift * dt;
      if (flake.y > canvas.height) flake.y = -10;
      if (flake.x < -10) flake.x = canvas.width + 10;
      if (flake.x > canvas.width + 10) flake.x = -10;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawWafer(w) {
    const { x, y, radius } = w;
    const grd = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.2, x, y, radius);
    grd.addColorStop(0, "#ffe9a3");
    grd.addColorStop(1, "#e3c170");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Weihnachtsmütze
    ctx.save();
    ctx.translate(x, y - radius * 0.7);
    ctx.rotate(w.hatTilt);
    ctx.fillStyle = "#d72638";
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, 0);
    ctx.lineTo(radius * 0.4, 0);
    ctx.lineTo(0, -radius * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillRect(-radius * 0.42, -2, radius * 0.84, 6);
    ctx.beginPath();
    ctx.arc(radius * 0.1, -radius * 0.95, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawProjectile(p) {
    ctx.fillStyle = "#6b3b15";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function updateFragments(dt) {
    for (let i = fragments.length - 1; i >= 0; i -= 1) {
      const f = fragments[i];
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt + 35 * dt;
      if (f.life <= 0) {
        fragments.splice(i, 1);
      }
    }
  }

  function renderFragments() {
    for (let i = 0; i < fragments.length; i += 1) {
      const f = fragments[i];
      const alpha = Math.max(0, f.life / 0.65);
      ctx.fillStyle = `rgba(226, 193, 112, ${alpha})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCrosshair() {
    ctx.save();
    ctx.strokeStyle = "#f8f5ff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(crosshair.x, crosshair.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(crosshair.x - 34, crosshair.y);
    ctx.lineTo(crosshair.x + 34, crosshair.y);
    ctx.moveTo(crosshair.x, crosshair.y - 34);
    ctx.lineTo(crosshair.x, crosshair.y + 34);
    ctx.stroke();
    ctx.restore();
  }

  function update(dt) {
    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0 && isRunning) {
      const speedFactor = 1 + (GAME_DURATION - timeLeft) / GAME_DURATION * 0.4;
      spawnTimer = (BASE_SPAWN_MS + Math.random() * (MAX_SPAWN_MS - BASE_SPAWN_MS)) / speedFactor;
      spawnWafer();
    }

    wafers.forEach((w) => {
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      if (w.y < 50) w.y = 50;
      if (w.y > canvas.height - 80) w.y = canvas.height - 80;
    });

    // Projektil-Update
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const p = projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        projectiles.splice(i, 1);
        continue;
      }

      for (let j = wafers.length - 1; j >= 0; j -= 1) {
        const w = wafers[j];
        const dist = Math.hypot(p.x - w.x, p.y - w.y);
        if (dist <= w.radius + 6 && w.alive) {
          wafers.splice(j, 1);
          projectiles.splice(i, 1);
          createFragments(w);
          score += 1;
          updateHUD();
          if (score >= TARGET_SCORE && isRunning) {
            markWin();
          }
          break;
        }
      }
    }

    // Entferne Waffeln außerhalb
    for (let i = wafers.length - 1; i >= 0; i -= 1) {
      const w = wafers[i];
      if (w.x < -80 || w.x > canvas.width + 80) {
        wafers.splice(i, 1);
      }
    }

    updateFragments(dt);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    wafers.forEach(drawWafer);
    projectiles.forEach(drawProjectile);
    renderFragments();
    drawSnow(lastFrameDt || 1 / 60);
    drawCrosshair();
  }

  function tick(timestamp) {
    if (destroyed) return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
    lastFrameDt = dt;
    lastTimestamp = timestamp;

    if (isRunning) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        isRunning = false;
        showEndBanner(false);
      }
      update(dt);
      updateHUD();
    }

    render();
    rafId = window.requestAnimationFrame(tick);
  }

  spawnSnow();
  updateHUD();
  rafId = window.requestAnimationFrame(tick);

  return {
    destroy: () => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", updateCrosshair);
      canvas.removeEventListener("mouseenter", updateCrosshair);
      canvas.removeEventListener("mousedown", fireChocolate);
    },
  };
};
