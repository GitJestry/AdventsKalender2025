// Spiel 5: Maiswaffel schießen – winterliches "Shoot the Duck"
// Einstellbare Parameter direkt hier oben anpassen
const MAI_GAME_DURATION = 30;       // Sekunden für eine Runde
const MAI_TARGET_SCORE = 30;        // Zielpunktzahl zum Gewinnen
const MAI_GOLDEN_BONUS = 5;         // Punkte für goldene Maiswaffeln
const MAI_MISS_TIME_PENALTY = 0.5;  // Sekunden, die bei einem Fehlschuss verloren gehen
const MAI_BASE_SPEED = 150;         // Basisspeed in px/s (etwas schneller)
const MAI_CROSSHAIR_SIZE = 70;      // px – präsenteres Fadenkreuz

// Sterne nach Score
const MAI_STAR_THRESHOLDS = {
  brown: MAI_TARGET_SCORE,
  silver: MAI_TARGET_SCORE + 15,
  gold: MAI_TARGET_SCORE + 25,
  red: MAI_TARGET_SCORE + 35,
};

window.AdventGames = window.AdventGames || {};

window.AdventGames["maiswaffel_shooting"] = function initMaiswaffelShooting(
  container,
  options
) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const HIGHSCORE_KEY = "maiwaffel_shooting_highscore_v1";

  function starLabel(level) {
    switch (level) {
      case "red":
        return "Roter Stern";
      case "gold":
        return "Goldener Stern";
      case "silver":
        return "Silberner Stern";
      case "brown":
      default:
        return "Brauner Stern";
    }
  }

  // Liefert Reward-Objekt wie in den anderen Spielen
  function determineRewardFromScore(points) {
    if (points >= MAI_STAR_THRESHOLDS.red)
      return { level: "red", label: "Roter Stern" };
    if (points >= MAI_STAR_THRESHOLDS.gold)
      return { level: "gold", label: "Goldener Stern" };
    if (points >= MAI_STAR_THRESHOLDS.silver)
      return { level: "silver", label: "Silberner Stern" };
    if (points >= MAI_STAR_THRESHOLDS.brown)
      return { level: "brown", label: "Brauner Stern" };
    return null;
  }

  function loadHighscore() {
    try {
      return Number(window.localStorage.getItem(HIGHSCORE_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveHighscore(v) {
    try {
      window.localStorage.setItem(HIGHSCORE_KEY, String(v));
    } catch {
      // ignore
    }
  }

  let animationFrame = null;
  let countdownInterval = null;
  let isRunning = false;
  let lastTimestamp = null;
  let timeLeft = MAI_GAME_DURATION;
  let score = 0;
  let highscore = loadHighscore();

  let speedMultiplier = 1;
  let spawnCooldown = 0.4;
  let snowDots = [];

  const wafels = [];
  const crumbs = [];

  // --- Waffel-Image-Sprite laden ---
  const waffleImg = new Image();
  waffleImg.src = "assets/img/waffel.png";
  let waffleImageLoaded = false;
  waffleImg.onload = () => {
    waffleImageLoaded = true;
  };

  container.innerHTML = "";
  container.classList.add("maiwaffel-container-active");

  const root = document.createElement("div");
  root.className = "maiwaffel-game";

  // Header
  const header = document.createElement("div");
  header.className = "maiwaffel-header";
  header.innerHTML = `
    <div class="maiwaffel-title">🎯 Maiswaffel schießen</div>
    <div class="maiwaffel-stats">
      <span class="maiwaffel-timer">⏳ ${timeLeft.toFixed(1)}s</span>
      <span class="maiwaffel-score">🎯 0 / ${MAI_TARGET_SCORE}</span>
      <span class="maiwaffel-highscore">★ ${highscore}</span>
    </div>
  `;

  // Spielfeld
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

  // Start-Overlay
  const introOverlay = document.createElement("div");
  introOverlay.className = "maiwaffel-overlay maiwaffel-start-overlay";
  introOverlay.innerHTML = `
    <div class="maiwaffel-overlay-box">
      <div class="maiwaffel-overlay-title">Winterliches Maiswaffel-Shooting</div>
      <div class="maiwaffel-overlay-sub">
        Ziele mit der Maus auf die fliegenden Maiswaffeln und klicke zum Schießen.
        Fehlschüsse kosten etwas Zeit – goldene Maiswaffeln geben extra viele Punkte ✨
      </div>
    </div>
  `;
  const startButton = document.createElement("button");
  startButton.className = "maiwaffel-button maiwaffel-start";
  startButton.textContent = "Spiel starten";
  introOverlay.appendChild(startButton);
  canvasWrap.appendChild(introOverlay);

  // Ergebnis-Overlay
  const result = document.createElement("div");
  result.className = "maiwaffel-result hidden";
  result.innerHTML = `
    <div class="maiwaffel-result-box">
      <div class="maiwaffel-result-title">Runde vorbei</div>
      <div class="maiwaffel-result-body"></div>
      <button class="maiwaffel-button maiwaffel-restart">Nochmal schießen</button>
    </div>`;
  canvasWrap.appendChild(result);

  root.appendChild(header);
  root.appendChild(canvasWrap);
  container.appendChild(root);

  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    const width = rect.width;
    const height = 420;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    generateSnow();
    drawBackground();
  }

  function generateSnow() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    snowDots = Array.from({ length: 140 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.6,
    }));
  }

  function drawBackground() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#102c4f");
    gradient.addColorStop(0.5, "#0c213a");
    gradient.addColorStop(1, "#081426");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    snowDots.forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#e4f3ff";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.bezierCurveTo(
      w * 0.2,
      h * 0.65,
      w * 0.25,
      h * 0.75,
      w * 0.45,
      h * 0.72
    );
    ctx.bezierCurveTo(
      w * 0.65,
      h * 0.68,
      w * 0.75,
      h * 0.8,
      w,
      h * 0.74
    );
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#d4ebff";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.82);
    ctx.bezierCurveTo(
      w * 0.2,
      h * 0.78,
      w * 0.3,
      h * 0.86,
      w * 0.55,
      h * 0.83
    );
    ctx.bezierCurveTo(
      w * 0.72,
      h * 0.8,
      w * 0.82,
      h * 0.9,
      w,
      h * 0.88
    );
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  }

  function spawnWafel(forceGolden = false) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const isGolden = forceGolden || Math.random() < 0.2;
    // etwas größere Waffeln
    const radius = isGolden
      ? 32 + Math.random() * 12
      : 26 + Math.random() * 14;
    const fromLeft = Math.random() > 0.5;
    const y = h * (0.16 + Math.random() * 0.38);
    // schneller & randomer
    const speed =
      (MAI_BASE_SPEED + Math.random() * 180) *
      speedMultiplier *
      (isGolden ? 1.18 : 1);
    const drift = (Math.random() * 120 - 60) * speedMultiplier;

    wafels.push({
      x: fromLeft ? -radius - 10 : w + radius + 10,
      y,
      vx: fromLeft ? speed : -speed,
      vy: drift,
      radius,
      isGolden,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 1.5,
    });
  }

  function spawnInitial() {
    for (let i = 0; i < 3; i++) {
      spawnWafel(false);
    }
  }

  function update(dt) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    speedMultiplier += dt * 0.03;
    spawnCooldown -= dt;

    wafels.forEach((wafel) => {
      wafel.x += wafel.vx * dt;
      wafel.y += wafel.vy * dt;
      wafel.wobble += wafel.wobbleSpeed * dt;
      wafel.vy += Math.sin(wafel.wobble) * 3;
    });

    for (let i = wafels.length - 1; i >= 0; i--) {
      const wafel = wafels[i];
      if (wafel.y < h * 0.08 || wafel.y > h * 0.65) {
        wafel.vy *= -0.9;
      }
      if (
        wafel.x < -wafel.radius - 60 ||
        wafel.x > w + wafel.radius + 60
      ) {
        wafels.splice(i, 1);
      }
    }

    if (spawnCooldown <= 0 && wafels.length < 4) {
      spawnWafel();
      spawnCooldown = 0.45 + Math.random() * 0.30;
    }

    for (let i = crumbs.length - 1; i >= 0; i--) {
      const c = crumbs[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 160 * dt;
      c.life -= dt;
      if (c.life <= 0) crumbs.splice(i, 1);
    }
  }

  // Floating-Score-Popup
  function showHitPopup(x, y, points, isGolden) {
    const popup = document.createElement("div");
    popup.textContent = isGolden ? `+${points} ✨` : `+${points}`;
    popup.style.position = "absolute";
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.fontSize = "0.9rem";
    popup.style.fontWeight = "700";
    popup.style.color = isGolden ? "#fde047" : "#f9fafb";
    popup.style.textShadow = "0 0 6px rgba(0,0,0,0.7)";
    popup.style.pointerEvents = "none";
    popup.style.opacity = "1";
    popup.style.transition =
      "transform 0.25s ease-out, opacity 0.25s ease-out";

    canvasWrap.appendChild(popup);

    requestAnimationFrame(() => {
      popup.style.transform = "translate(-50%, -120%)";
      popup.style.opacity = "0";
    });

    setTimeout(() => {
      popup.remove();
    }, 270);
  }

  function flashScore() {
    const scoreEl = header.querySelector(".maiwaffel-score");
    if (!scoreEl) return;
    scoreEl.style.transition =
      "background-color 0.18s ease-out, transform 0.18s ease-out";
    scoreEl.style.backgroundColor = "rgba(34,197,94,0.25)";
    scoreEl.style.transform = "scale(1.05)";
    setTimeout(() => {
      scoreEl.style.backgroundColor = "";
      scoreEl.style.transform = "";
    }, 180);
  }

  function draw() {
    drawBackground();

    wafels.forEach((wafel) => {
      const size = wafel.radius * 2;

      if (waffleImageLoaded) {
        ctx.save();
        ctx.translate(wafel.x, wafel.y);

        // Goldene Waffel: weicher, runder Halo hinter der Waffel
        if (wafel.isGolden) {
          const haloGrad = ctx.createRadialGradient(
            0,
            0,
            size * 0.1,
            0,
            0,
            size * 0.7
          );
          haloGrad.addColorStop(0, "rgba(253,224,71,0.7)");
          haloGrad.addColorStop(1, "rgba(253,224,71,0)");
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Basis-Waffelbild
        ctx.drawImage(waffleImg, -size / 2, -size / 2, size, size);

        // Goldene Waffel: sanfte Radial-Tönung, in Kreis geclippt – kein Block mehr
        if (wafel.isGolden) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
          ctx.clip();

          const tintGrad = ctx.createRadialGradient(
            0,
            0,
            size * 0.1,
            0,
            0,
            size / 2
          );
          tintGrad.addColorStop(0, "rgba(255,255,255,0.35)");
          tintGrad.addColorStop(1, "rgba(253,224,71,0.15)");
          ctx.fillStyle = tintGrad;
          ctx.fillRect(-size / 2, -size / 2, size, size);

          ctx.restore();
        }

        ctx.restore();
      } else {
        // Fallback: einfache Vektor-Grafik
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
      }
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
    if (scoreEl)
      scoreEl.textContent = `Punkte: ${score} / ${MAI_TARGET_SCORE}`;
    if (hsEl) hsEl.textContent = `Highscore: ${highscore}`;
  }

  function setStartButtonState(label, disabled = false) {
    startButton.textContent = label;
    startButton.disabled = disabled;
  }

  function playCrunch(isGolden) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ac = new AC();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const noise = ac.createBufferSource();
      const buffer = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6 * (1 - i / data.length);
      }
      noise.buffer = buffer;
      noise.loop = false;
      osc.frequency.setValueAtTime(isGolden ? 680 : 520, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        120,
        ac.currentTime + 0.18
      );
      gain.gain.setValueAtTime(0.35, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ac.currentTime + 0.22
      );
      osc.connect(gain);
      noise.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      noise.start();
      osc.stop(ac.currentTime + 0.24);
      noise.stop(ac.currentTime + 0.24);
    } catch {
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
        color: isGolden
          ? "rgba(255,220,120,0.9)"
          : "rgba(244,201,139,0.9)",
        life: 0.8 + Math.random() * 0.4,
      });
    }
  }

  function handleShot(evt) {
    if (!isRunning) return;
    const rect = canvasWrap.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    let hitIndex = -1;
    for (let i = 0; i < wafels.length; i++) {
      const wafel = wafels[i];
      const dx = wafel.x - x;
      const dy = wafel.y - y;
      if (
        Math.hypot(dx, dy) <=
        crosshairRadius + wafel.radius * 0.6
      ) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex >= 0) {
      const [hit] = wafels.splice(hitIndex, 1);
      const gained = hit.isGolden ? MAI_GOLDEN_BONUS : 1;
      score += gained;
      addCrumbs(hit.x, hit.y, hit.isGolden);
      playCrunch(hit.isGolden);
      updateUi();
      flashScore();
      showHitPopup(hit.x, hit.y, gained, hit.isGolden);
    } else {
      // MISS: Zeit verliert wieder
      timeLeft = Math.max(0, timeLeft - MAI_MISS_TIME_PENALTY);
      updateUi();
      canvasWrap.classList.add("maiwaffel-miss");
      setTimeout(
        () => canvasWrap.classList.remove("maiwaffel-miss"),
        120
      );
      if (timeLeft <= 0) finish(score >= MAI_TARGET_SCORE);
    }
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
    if (spawnTargets) spawnInitial();
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
      saveHighscore(highscore);
    }
    updateUi();

    let resultHtml = `Punkte: <strong>${score}</strong> | Ziel: ${MAI_TARGET_SCORE}<br/>Highscore: ${highscore}`;

    let starText = "";
    if (won) {
      const reward = determineRewardFromScore(score);
      if (reward) {
        starText = `<br/>Belohnung: <strong>${reward.label}</strong>`;
        // Sternen-System wie in den anderen Games:
        // Advent-Framework kümmert sich um Popups / Speicherung
        try {
          onWin(reward);
        } catch (e) {
          console.error("maiswaffel_shooting onWin error:", e);
        }
      }
      resultHtml += `<br/><br/>Du hast gewonnen und darfst das Geschenk hinter Tür 5 öffnen!${starText}`;
    } else {
      resultHtml += `<br/><br/>Die Zeit ist abgelaufen – versuch es direkt nochmal.`;
    }

    const body = result.querySelector(".maiwaffel-result-body");
    if (body) body.innerHTML = resultHtml;

    result.classList.remove("hidden");
    introOverlay.classList.remove("hidden");
  }

  function startGame() {
    if (isRunning) return;
    window.cancelAnimationFrame(animationFrame);
    window.clearInterval(countdownInterval);
    resetState(true);
    isRunning = true;
    lastTimestamp = null;
    container.classList.add("running");
    introOverlay.classList.add("hidden");
    crosshair.classList.remove("hidden");

    // Fadenkreuz in die Mitte setzen
    const rect = canvasWrap.getBoundingClientRect();
    crosshair.style.left = rect.width / 2 + "px";
    crosshair.style.top = rect.height / 2 + "px";

    setStartButtonState("Runde läuft...", true);
    animationFrame = window.requestAnimationFrame(loop);
    countdownInterval = window.setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 0.1);
      updateUi();
      if (timeLeft <= 0) finish(score >= MAI_TARGET_SCORE);
    }, 100);
  }

  function moveCrosshair(evt) {
    const rect = canvasWrap.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    crosshair.style.left = x + "px";
    crosshair.style.top = y + "px";
  }

  canvasWrap.addEventListener("pointermove", moveCrosshair);
  canvasWrap.addEventListener("click", handleShot);

  root.addEventListener("mouseleave", () =>
    crosshair.classList.add("hidden")
  );
  root.addEventListener("mouseenter", () => {
    if (isRunning) crosshair.classList.remove("hidden");
  });

  // WICHTIG: Klicks auf Start/Restart dürfen keinen Schuss auslösen
  startButton.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    startGame();
  });

  const restartBtn = result.querySelector(".maiwaffel-restart");
  if (restartBtn) {
    restartBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      startGame();
    });
  }

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
      canvasWrap.removeEventListener("pointermove", moveCrosshair);
      canvasWrap.removeEventListener("click", handleShot);
      container.classList.remove(
        "maiwaffel-container-active",
        "running"
      );
    },
  };
};
