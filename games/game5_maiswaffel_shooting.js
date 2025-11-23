// Spiel 5: Maiswaffel schießen – winterliches "Shoot the Duck"
// Einstellbare Parameter direkt hier oben anpassen
const MAI_GAME_DURATION = 30; // Sekunden für eine Runde
const MAI_TARGET_SCORE = 20; // Zielpunktzahl zum Gewinnen
const MAI_GOLDEN_BONUS = 3; // Punkte für goldene Maiswaffeln
const MAI_MISS_TIME_PENALTY = 0.7; // Sekunden, die bei einem Fehlschuss verloren gehen
const MAI_BASE_SPEED = 110; // Basisspeed in px/s
const MAI_CROSSHAIR_SIZE = 70; // px – präsenteres Fadenkreuz

window.AdventGames = window.AdventGames || {};

window.AdventGames["maiswaffel_shooting"] = function initMaiswaffelShooting(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};
  const highscoreKey = "maiswaffel_shooting_highscore_v1";

  let animationFrame = null;
  let countdownInterval = null;
  let isRunning = false;
  let lastTimestamp = null;
  let timeLeft = MAI_GAME_DURATION;
  let score = 0;
  let highscore = Number(window.localStorage.getItem(highscoreKey)) || 0;
  let speedMultiplier = 1;
  let spawnCooldown = 0.4;
  let snowDots = [];

  const wafels = [];
  const crumbs = [];

  container.innerHTML = "";
  container.classList.add("maiwaffel-container-active");

  const root = document.createElement("div");
  root.className = "maiwaffel-game";

  const header = document.createElement("div");
  header.className = "maiwaffel-header";
  header.innerHTML = `
    <div class="maiwaffel-title">🎯 Maiswaffel schießen – Tür 5</div>
    <div class="maiwaffel-stats">
      <span class="maiwaffel-timer">⏳ ${timeLeft.toFixed(1)}s</span>
      <span class="maiwaffel-score">Punkte: 0 / ${MAI_TARGET_SCORE}</span>
      <span class="maiwaffel-highscore">Highscore: ${highscore}</span>
    </div>
    <div class="maiwaffel-hint">Triff die fliegenden Maiswaffeln, Fehlschüsse kosten Zeit! Goldene bringen Extra-Punkte.</div>
  `;

  const canvasWrap = document.createElement("div");
  canvasWrap.className = "maiwaffel-canvas-wrap";

  const canvas = document.createElement("canvas");
  canvas.className = "maiwaffel-canvas";
  canvasWrap.appendChild(canvas);

  const crosshair = document.createElement("div");
  const crosshairRadius = MAI_CROSSHAIR_SIZE / 2;
  crosshair.className = "maiwaffel-crosshair";
  crosshair.innerHTML = '<span class="maiwaffel-crosshair-dot"></span>';
  canvasWrap.appendChild(crosshair);

  const introOverlay = document.createElement("div");
  introOverlay.className = "maiwaffel-overlay maiwaffel-start-overlay";
  introOverlay.innerHTML = `
    <div class="maiwaffel-overlay-box">
      <div class="maiwaffel-overlay-title">Bist du bereit für Mais-Duck-Hunt?</div>
      <div class="maiwaffel-overlay-sub">Schieße die fliegenden Maiswaffeln ab – Fehlschüsse kosten Zeit.</div>
    </div>
  `;
  const startButton = document.createElement("button");
  startButton.className = "maiwaffel-button maiwaffel-start";
  startButton.textContent = "Spiel starten";
  introOverlay.appendChild(startButton);
  canvasWrap.appendChild(introOverlay);

  const result = document.createElement("div");
  result.className = "maiwaffel-result hidden";
  result.innerHTML = `
    <div class="maiwaffel-result-box">
      <div class="maiwaffel-result-title">Runde vorbei!</div>
      <div class="maiwaffel-result-body"></div>
      <button class="maiwaffel-button maiwaffel-restart">Nochmal schießen</button>
    </div>`;
  canvasWrap.appendChild(result);

  root.appendChild(header);
  root.appendChild(canvasWrap);
  container.appendChild(root);

  const ctx = canvas.getContext("2d");

  function ensureStyles() {
    if (document.getElementById("maiwaffel-styles")) return;
    const style = document.createElement("style");
    style.id = "maiwaffel-styles";
    style.textContent = `
      .maiwaffel-container-active.running { cursor: none; }
      .maiwaffel-game { position: relative; background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1), transparent 40%), linear-gradient(180deg, #17355c 0%, #0c1c33 45%, #0a162b 100%); border-radius: 18px; padding: 14px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); color: #f5f7ff; font-family: "Nunito", "Inter", system-ui, -apple-system, sans-serif; }
      .maiwaffel-header { margin-bottom: 10px; }
      .maiwaffel-title { font-size: 1.2rem; font-weight: 800; letter-spacing: 0.3px; margin-bottom: 6px; }
      .maiwaffel-stats { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.95rem; align-items: center; }
      .maiwaffel-stats span { background: rgba(255,255,255,0.08); padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); }
      .maiwaffel-hint { margin-top: 8px; font-size: 0.9rem; color: #d8e6ff; }
      .maiwaffel-controls { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: center; }
      .maiwaffel-canvas-wrap { position: relative; overflow: hidden; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: linear-gradient(180deg, #0c2138 0%, #0a1a2e 60%, #081322 100%); box-shadow: inset 0 0 30px rgba(0,0,0,0.45); min-height: 420px; }
      .maiwaffel-canvas { display: block; width: 100%; height: 420px; }
      .maiwaffel-miss { animation: maiwaffel-miss 0.15s ease-in-out; }
      .maiwaffel-crosshair { position: absolute; width: ${MAI_CROSSHAIR_SIZE}px; height: ${MAI_CROSSHAIR_SIZE}px; border: 2px solid rgba(255,255,255,0.9); border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); box-shadow: 0 0 18px rgba(0,255,255,0.25); mix-blend-mode: screen; }
      .maiwaffel-crosshair::before, .maiwaffel-crosshair::after { content: ""; position: absolute; background: rgba(255,255,255,0.9); }
      .maiwaffel-crosshair::before { width: 2px; height: ${MAI_CROSSHAIR_SIZE}px; left: 50%; top: 0; transform: translateX(-50%); }
      .maiwaffel-crosshair::after { height: 2px; width: ${MAI_CROSSHAIR_SIZE}px; top: 50%; left: 0; transform: translateY(-50%); }
      .maiwaffel-crosshair-dot { position: absolute; width: 7px; height: 7px; background: #ffefd0; border-radius: 50%; left: 50%; top: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 10px rgba(255, 230, 180, 0.8); }
      .maiwaffel-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(9,19,37,0.85), rgba(5,12,24,0.9)); display: flex; flex-direction: column; gap: 14px; align-items: center; justify-content: center; backdrop-filter: blur(4px); text-align: center; padding: 20px; }
      .maiwaffel-overlay.hidden { display: none; }
      .maiwaffel-overlay-box { background: linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12)); padding: 18px 20px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 12px 36px rgba(0,0,0,0.35); max-width: 440px; }
      .maiwaffel-overlay-title { font-size: 1.2rem; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.3px; }
      .maiwaffel-overlay-sub { color: #d6e7ff; font-size: 0.95rem; }
      .maiwaffel-result { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0, 7, 20, 0.76), rgba(0,10,24,0.85)); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
      .maiwaffel-result.hidden { display: none; }
      .maiwaffel-result-box { background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.16)); padding: 22px 26px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.16); text-align: center; color: #f2f6ff; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 420px; }
      .maiwaffel-result-title { font-size: 1.3rem; font-weight: 800; margin-bottom: 10px; letter-spacing: 0.3px; }
      .maiwaffel-result-body { margin-bottom: 16px; line-height: 1.5; }
      .maiwaffel-button { background: linear-gradient(120deg, #ffb347, #ff8c42); border: none; color: #1a0e05; padding: 12px 22px; font-weight: 800; border-radius: 12px; box-shadow: 0 5px 14px rgba(255,140,66,0.4); cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease; font-size: 1rem; }
      .maiwaffel-button:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(255,140,66,0.45); }
      .maiwaffel-button:active { transform: translateY(1px); }
      @keyframes maiwaffel-miss { 0% { transform: translateX(0); box-shadow: inset 0 0 30px rgba(255,0,76,0.35); } 50% { transform: translateX(6px); box-shadow: inset 0 0 40px rgba(255,0,76,0.5); } 100% { transform: translateX(0); box-shadow: inset 0 0 30px rgba(255,0,76,0.35); } }
    `;
    document.head.appendChild(style);
  }

  ensureStyles();

  function resizeCanvas() {
    const { width } = canvasWrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = 420 * dpr;
    canvas.style.height = "420px";
    canvas.style.width = "100%";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    generateSnow();
    drawBackground();
  }

  function generateSnow() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    snowDots = Array.from({ length: 140 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.6
    }));
  }

  function drawBackground() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#102c4f");
    gradient.addColorStop(0.5, "#0c213a");
    gradient.addColorStop(1, "#081426");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    snowDots.forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#e4f3ff";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.bezierCurveTo(w * 0.2, h * 0.65, w * 0.25, h * 0.75, w * 0.45, h * 0.72);
    ctx.bezierCurveTo(w * 0.65, h * 0.68, w * 0.75, h * 0.8, w, h * 0.74);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#d4ebff";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.82);
    ctx.bezierCurveTo(w * 0.2, h * 0.78, w * 0.3, h * 0.86, w * 0.55, h * 0.83);
    ctx.bezierCurveTo(w * 0.72, h * 0.8, w * 0.82, h * 0.9, w, h * 0.88);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function spawnWafel(forceGolden = false) {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const isGolden = forceGolden || Math.random() < 0.18;
    const radius = isGolden ? 28 + Math.random() * 10 : 18 + Math.random() * 18;
    const fromLeft = Math.random() > 0.5;
    const y = h * (0.18 + Math.random() * 0.4);
    const speed = (MAI_BASE_SPEED + Math.random() * 120) * speedMultiplier * (isGolden ? 1.3 : 1);
    const drift = (Math.random() * 40 - 20) * speedMultiplier;

    wafels.push({
      x: fromLeft ? -radius - 10 : w + radius + 10,
      y,
      vx: fromLeft ? speed : -speed,
      vy: drift,
      radius,
      isGolden,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 1.5
    });
  }

  function spawnInitial() {
    for (let i = 0; i < 2; i++) {
      spawnWafel(false);
    }
  }

  function update(dt) {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    speedMultiplier += dt * 0.025;

    spawnCooldown -= dt;

    wafels.forEach((wafel) => {
      wafel.x += wafel.vx * dt;
      wafel.y += wafel.vy * dt;
      wafel.wobble += wafel.wobbleSpeed * dt;
      wafel.vy += Math.sin(wafel.wobble) * 2;
    });

    for (let i = wafels.length - 1; i >= 0; i--) {
      const wafel = wafels[i];
      if (wafel.y < h * 0.05 || wafel.y > h * 0.65) {
        wafel.vy *= -0.9;
      }
      if (wafel.x < -wafel.radius - 40 || wafel.x > w + wafel.radius + 40) {
        wafels.splice(i, 1);
      }
    }

    if (spawnCooldown <= 0 && wafels.length < 3) {
      spawnWafel();
      spawnCooldown = 0.55 + Math.random() * 0.35;
    }

    for (let i = crumbs.length - 1; i >= 0; i--) {
      const c = crumbs[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 160 * dt;
      c.life -= dt;
      if (c.life <= 0) {
        crumbs.splice(i, 1);
      }
    }
  }

  function draw() {
    drawBackground();

    wafels.forEach((wafel) => {
      const grd = ctx.createRadialGradient(
        wafel.x - wafel.radius * 0.2,
        wafel.y - wafel.radius * 0.3,
        wafel.radius * 0.3,
        wafel.x,
        wafel.y,
        wafel.radius
      );
      if (wafel.isGolden) {
        grd.addColorStop(0, "#fff1b8");
        grd.addColorStop(0.5, "#ffd56d");
        grd.addColorStop(1, "#e1a400");
      } else {
        grd.addColorStop(0, "#ffe7c7");
        grd.addColorStop(0.5, "#f5cfa3");
        grd.addColorStop(1, "#d6a56f");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(wafel.x, wafel.y, wafel.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = wafel.isGolden ? "rgba(255,230,120,0.8)" : "rgba(240, 180, 120, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + wafel.wobble * 0.1;
        const inner = wafel.radius * 0.55;
        const outer = wafel.radius * 0.95;
        ctx.moveTo(wafel.x + Math.cos(angle) * inner, wafel.y + Math.sin(angle) * inner);
        ctx.lineTo(wafel.x + Math.cos(angle) * outer, wafel.y + Math.sin(angle) * outer);
      }
      ctx.stroke();
    });

    crumbs.forEach((c) => {
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function loop(timestamp) {
    if (!isRunning) return;
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    update(dt);
    draw();

    animationFrame = window.requestAnimationFrame(loop);
  }

  function updateUi() {
    const timerEl = header.querySelector(".maiwaffel-timer");
    const scoreEl = header.querySelector(".maiwaffel-score");
    const hsEl = header.querySelector(".maiwaffel-highscore");
    if (timerEl) timerEl.textContent = `⏳ ${timeLeft.toFixed(1)}s`;
    if (scoreEl) scoreEl.textContent = `Punkte: ${score} / ${MAI_TARGET_SCORE}`;
    if (hsEl) hsEl.textContent = `Highscore: ${highscore}`;
  }

  function setStartButtonState(label, disabled = false) {
    startButton.textContent = label;
    startButton.disabled = disabled;
  }

  function playCrunch(isGolden) {
    try {
      const ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      const noise = ctxAudio.createBufferSource();
      const buffer = ctxAudio.createBuffer(1, ctxAudio.sampleRate * 0.08, ctxAudio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6 * (1 - i / data.length);
      }
      noise.buffer = buffer;
      noise.loop = false;
      osc.frequency.setValueAtTime(isGolden ? 680 : 520, ctxAudio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctxAudio.currentTime + 0.18);
      gain.gain.setValueAtTime(0.35, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.22);
      osc.connect(gain);
      noise.connect(gain);
      gain.connect(ctxAudio.destination);
      osc.start();
      noise.start();
      osc.stop(ctxAudio.currentTime + 0.24);
      noise.stop(ctxAudio.currentTime + 0.24);
    } catch (e) {
      // Audio optional
    }
  }

  function addCrumbs(x, y, isGolden) {
    const pieces = isGolden ? 18 : 12;
    for (let i = 0; i < pieces; i++) {
      crumbs.push({
        x,
        y,
        vx: (Math.random() * 260 - 130) * 0.9,
        vy: -Math.random() * 240,
        size: Math.random() * 3 + 1,
        color: isGolden ? "rgba(255,220,120,0.9)" : "rgba(244,201,139,0.9)",
        life: 0.8 + Math.random() * 0.4
      });
    }
  }

  function handleShot(evt) {
    if (!isRunning) return;
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    let hitIndex = -1;
    for (let i = 0; i < wafels.length; i++) {
      const wafel = wafels[i];
      const dx = wafel.x - x;
      const dy = wafel.y - y;
      if (Math.hypot(dx, dy) <= crosshairRadius + wafel.radius * 0.65) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex >= 0) {
      const [hit] = wafels.splice(hitIndex, 1);
      score += hit.isGolden ? MAI_GOLDEN_BONUS : 1;
      addCrumbs(hit.x, hit.y, hit.isGolden);
      playCrunch(hit.isGolden);
      updateUi();
      if (score >= MAI_TARGET_SCORE) {
        finish(true);
      }
    } else {
      timeLeft = Math.max(0, timeLeft - MAI_MISS_TIME_PENALTY);
      score = Math.max(0, score - 1);
      updateUi();
      canvasWrap.classList.add("maiwaffel-miss");
      setTimeout(() => canvasWrap.classList.remove("maiwaffel-miss"), 140);
      if (timeLeft <= 0) finish(false);
    }
  }

  function startGame() {
    if (isRunning) return;
    window.cancelAnimationFrame(animationFrame);
    window.clearInterval(countdownInterval);
    resetState();
    isRunning = true;
    lastTimestamp = null;
    container.classList.add("running");
    introOverlay.classList.add("hidden");
    crosshair.classList.remove("hidden");
    setStartButtonState("Runde läuft...", true);
    animationFrame = window.requestAnimationFrame(loop);
    countdownInterval = window.setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 0.1);
      updateUi();
      if (timeLeft <= 0) {
        finish(score >= MAI_TARGET_SCORE);
      }
    }, 100);
  }

  function resetState(spawnTargets = true) {
    wafels.length = 0;
    crumbs.length = 0;
    timeLeft = MAI_GAME_DURATION;
    score = 0;
    speedMultiplier = 1;
    spawnCooldown = 0.4;
    container.classList.remove("running");
    drawBackground();
    if (spawnTargets) {
      spawnInitial();
    }
    updateUi();
    result.classList.add("hidden");
  }

  function finish(won) {
    if (!isRunning) return;
    isRunning = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    if (countdownInterval) window.clearInterval(countdownInterval);
    animationFrame = null;
    countdownInterval = null;
    crosshair.classList.add("hidden");
    container.classList.remove("running");
    setStartButtonState("Erneut spielen", false);

    if (score > highscore) {
      highscore = score;
      window.localStorage.setItem(highscoreKey, String(highscore));
    }

    updateUi();

    const body = result.querySelector(".maiwaffel-result-body");
    if (body) {
      const status = won
        ? "Du hast gewonnen und darfst das Geschenk hinter Tür 5 öffnen!"
        : "Die Zeit ist abgelaufen – vielleicht hilft ein neuer Versuch?";
      body.innerHTML = `Punkte: <strong>${score}</strong> | Ziel: ${MAI_TARGET_SCORE}<br/>Highscore: ${highscore}<br/>${status}`;
    }

    result.classList.remove("hidden");
    introOverlay.classList.remove("hidden");
    if (won) onWin();
  }

  function moveCrosshair(evt) {
    const rect = canvas.getBoundingClientRect();
    crosshair.style.left = `${evt.clientX - rect.left}px`;
    crosshair.style.top = `${evt.clientY - rect.top}px`;
  }

  canvas.addEventListener("pointermove", moveCrosshair);
  canvas.addEventListener("click", handleShot);
  root.addEventListener("mouseleave", () => crosshair.classList.add("hidden"));
  root.addEventListener("mouseenter", () => {
    if (isRunning) crosshair.classList.remove("hidden");
  });
  startButton.addEventListener("click", startGame);
  result.querySelector(".maiwaffel-restart")?.addEventListener("click", startGame);

  resizeCanvas();
  resetState(false);
  setStartButtonState("Spiel starten");
  crosshair.classList.add("hidden");

  window.addEventListener("resize", resizeCanvas);

  return {
    destroy: () => {
      isRunning = false;
      window.cancelAnimationFrame(animationFrame);
      window.clearInterval(countdownInterval);
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("pointermove", moveCrosshair);
      canvas.removeEventListener("click", handleShot);
      container.classList.remove("maiwaffel-container-active", "running");
    }
  };
};
