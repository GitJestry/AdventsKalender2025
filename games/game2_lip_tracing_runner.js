// Spiel 2: Lippenpflege-Tracing – Runner im Mario-Party-Stil
// Fix für Accuracy-Bug:
// - Entfernung wird jetzt zur echten gezeichneten Spur im Screen berechnet (Nearest-Point-Suche)
// - Mindest-Accuracy auf 90% gesetzt (statt 95%)
// - etwas großzügigere Toleranz

window.AdventGames = window.AdventGames || {};

window.AdventGames["lip_tracing_runner"] = function initLipTracingRunner(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const REQUIRED_ACCURACY = 0.98;  // mindestens 96%
  const TRACK_LENGTH = 3000;
  const TRACK_DURATION = 22;
  const START_WORLD_X = 80;
  const FINISH_WORLD_X = TRACK_LENGTH - 120;

  const BRUSH_RADIUS = 10;
  const MAX_DEVIATION = 70;        // etwas großzügiger

  let canvas, ctx;
  let width = 600;
  let height = 260;
  let dpr = window.devicePixelRatio || 1;

  let cameraX = 0;
  const scrollSpeed = TRACK_LENGTH / TRACK_DURATION;

  let penX, penY;
  let vx = 0;
  let vy = 0;
  const MAX_SPEED = 480;
  const ACCEL = 1100;
  const FRICTION = 0.9;

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
  };

  let isRunning = false;
  let isFinished = false;
  let isCountingDown = false;
  let countdownStartMs = null;

  let startTimeMs = null;
  let lastFrameMs = null;
  let elapsed = 0;

  let sumAccuracy = 0;
  let accuracySamples = 0;
  const trailPoints = [];

  const snowBG = Array.from({ length: 35 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 1 + Math.random() * 1.5
  }));

  const treesBG = Array.from({ length: 14 }, (_, i) => ({
    x: (i / 14) * TRACK_LENGTH + 80 + Math.random() * 160,
    size: 22 + Math.random() * 28
  }));

  let animationFrameId = null;

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "trace-game";

  const header = document.createElement("div");
  header.className = "trace-header";

  const title = document.createElement("div");
  title.className = "trace-title";
  title.textContent = "Lippenbalsam-Challenge: Zeichne die Spur sauber nach, bevor du dein Geschenk öffnen darfst.";

  const stats = document.createElement("div");
  stats.className = "trace-stats";

  const timeSpan = document.createElement("span");
  const accuracySpan = document.createElement("span");

  timeSpan.innerHTML = `Zeit: <span class="trace-stat-em" id="traceTime">0.0s</span>`;
  accuracySpan.innerHTML = `Genauigkeit: <span class="trace-stat-em" id="traceAccuracy">0%</span> (mind. 99%)`;

  stats.appendChild(timeSpan);
  stats.appendChild(accuracySpan);

  header.appendChild(title);
  header.appendChild(stats);

  const buttonsRow = document.createElement("div");
  buttonsRow.className = "trace-buttons";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "trace-btn";
  resetBtn.textContent = "Neu starten";

  buttonsRow.appendChild(resetBtn);

  const mainRow = document.createElement("div");
  mainRow.className = "trace-main";

  const canvasWrapper = document.createElement("div");
  canvasWrapper.className = "trace-canvas-wrapper";

  canvas = document.createElement("canvas");
  canvas.className = "trace-canvas";
  canvasWrapper.appendChild(canvas);

  const helpBox = document.createElement("aside");
  helpBox.className = "trace-help";
  helpBox.innerHTML = `
    <p class="trace-help-title">Steuerung</p>
    <ul>
      <li><strong>Leertaste</strong>: Startet den Countdown (3, 2, 1, Go!).</li>
      <li><strong>Pfeile ↑ / ↓</strong>: Stift nach oben / unten.</li>
      <li><strong>Pfeile ← / →</strong>: Stärkeres seitliches Nachjustieren.</li>
      <li>Der Screen scrollt nach rechts und schiebt dich an der linken Kante mit – bis du die <strong>Ziellinie</strong> berührst.</li>
    </ul>
  `;

  mainRow.appendChild(canvasWrapper);
  mainRow.appendChild(helpBox);

  const instruction = document.createElement("p");
  instruction.className = "trace-instruction";
  instruction.textContent =
    "Drücke die Leertaste, um den Countdown zu starten. Danach bewegt sich der Bildschirm nach rechts – halte den Lippenbalsam so genau wie möglich auf der krickeligen Spur.";

  const statusLine = document.createElement("p");
  statusLine.className = "trace-status-line";
  statusLine.textContent = "Bereit. Drücke die Leertaste, um zu starten.";

  root.appendChild(header);
  root.appendChild(buttonsRow);
  root.appendChild(mainRow);
  root.appendChild(instruction);
  root.appendChild(statusLine);

  container.appendChild(root);

  ctx = canvas.getContext("2d");

  // --- Pfaddefinition (krickelig, 2D) ---

  function worldTrackOffsetX(worldX) {
    const o1 = 60 * Math.sin(worldX / 180);
    const o2 = 40 * Math.sin(worldX / 90 + 1.7);
    const o3 = 25 * Math.sin(worldX / 40 + 3.4);
    return o1 + o2 + o3;
  }

  function worldTrackY(worldX) {
    const base = height * 0.5;
    const wave1 = 60 * Math.sin(worldX / 220);
    const wave2 = 35 * Math.sin(worldX / 120 + 1.2);
    const wave3 = 20 * Math.sin(worldX / 55 + 2.6);
    return base + wave1 + wave2 + wave3;
  }

  // Nearest-Point-Suche auf der Spur im aktuellen Screen
  function findNearestOnTrack(screenX, screenY) {
    const searchRange = 180;
    const steps = 45;
    const baseWX = cameraX + screenX;
    const startWX = baseWX - searchRange * 0.5;
    const endWX = baseWX + searchRange * 0.5;

    let bestDist2 = Infinity;
    let bestSX = screenX;
    let bestSY = screenY;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wx = startWX + t * (endWX - startWX);
      const ty = worldTrackY(wx);
      const sx = (wx - cameraX) + worldTrackOffsetX(wx);
      const dx = sx - screenX;
      const dy = ty - screenY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        bestSX = sx;
        bestSY = ty;
      }
    }

    return { sx: bestSX, sy: bestSY, dist2: bestDist2 };
  }

  // --- Zeichenfunktionen ---

  function resizeCanvas() {
    const rect = canvasWrapper.getBoundingClientRect();
    const targetWidth = Math.max(420, Math.min(rect.width, 820));
    width = targetWidth;
    height = 0.44 * targetWidth + 64;

    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cameraX = 0;
    const startWX = START_WORLD_X;
    const startY = worldTrackY(startWX);
    const startOffsetX = worldTrackOffsetX(startWX);
    penX = startWX - cameraX + startOffsetX;
    penY = startY;
    vx = 0;
    vy = 0;
    trailPoints.length = 0;

    drawFrame();
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(10, 15, 35, 1)");
    grad.addColorStop(0.4, "rgba(15, 30, 70, 1)");
    grad.addColorStop(0.8, "rgba(8, 24, 46, 1)");
    grad.addColorStop(1, "rgba(5, 12, 24, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    snowBG.forEach((s) => {
      const x = s.x * width;
      const y = s.y * (height * 0.55);
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    const snowHeight = 40;
    ctx.save();
    const snowGrad = ctx.createLinearGradient(0, height - snowHeight, 0, height);
    snowGrad.addColorStop(0, "rgba(255,255,255,0.9)");
    snowGrad.addColorStop(1, "rgba(240,240,255,1)");
    ctx.fillStyle = snowGrad;
    ctx.fillRect(0, height - snowHeight, width, snowHeight);

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(230,240,255,0.9)";
    const groundStartWX = cameraX;
    const groundEndWX = cameraX + width;
    treesBG.forEach((t) => {
      if (t.x < groundStartWX - 60 || t.x > groundEndWX + 60) return;
      const sx = t.x - cameraX;
      const baseY = height - 4;
      const size = t.size;
      ctx.beginPath();
      ctx.moveTo(sx, baseY - size);
      ctx.lineTo(sx - size * 0.6, baseY);
      ctx.lineTo(sx + size * 0.6, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(sx - size * 0.15, baseY, size * 0.3, 6);
    });
    ctx.restore();
  }

  function drawTrack() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const startWX = cameraX;
    const endWX = cameraX + width;
    const steps = 80;

    ctx.lineWidth = BRUSH_RADIUS * 1.8;
    ctx.beginPath();
    let worldX = startWX;
    let y = worldTrackY(worldX);
    let offset = worldTrackOffsetX(worldX);
    let x = (worldX - cameraX) + offset;
    ctx.moveTo(x, y);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      worldX = startWX + t * (endWX - startWX);
      y = worldTrackY(worldX);
      offset = worldTrackOffsetX(worldX);
      x = (worldX - cameraX) + offset;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(120, 0, 0, 0.7)";
    ctx.stroke();

    ctx.lineWidth = BRUSH_RADIUS * 1.2;
    ctx.beginPath();
    worldX = startWX;
    y = worldTrackY(worldX);
    offset = worldTrackOffsetX(worldX);
    x = (worldX - cameraX) + offset;
    ctx.moveTo(x, y);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      worldX = startWX + t * (endWX - startWX);
      y = worldTrackY(worldX);
      offset = worldTrackOffsetX(worldX);
      x = (worldX - cameraX) + offset;
      ctx.lineTo(x, y);
    }
    const candyGrad = ctx.createLinearGradient(0, 0, width, 0);
    candyGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    candyGrad.addColorStop(0.25, "rgba(220, 20, 60, 0.95)");
    candyGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
    candyGrad.addColorStop(0.75, "rgba(0, 180, 80, 0.95)");
    candyGrad.addColorStop(1, "rgba(255, 255, 255, 0.95)");
    ctx.strokeStyle = candyGrad;
    ctx.shadowColor = "rgba(255, 230, 200, 0.9)";
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.restore();
  }

  function drawStartAndFinish() {
    const xStart = START_WORLD_X - cameraX;
    if (xStart > -40 && xStart < width + 40) {
      ctx.save();
      ctx.strokeStyle = "rgba(150, 220, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(xStart, 30);
      ctx.lineTo(xStart, height - 30);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "10px Quicksand, system-ui";
      ctx.fillStyle = "rgba(190, 230, 255, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText("START", xStart, 22);
      ctx.restore();
    }

    const xFinish = FINISH_WORLD_X - cameraX;
    if (xFinish > -40 && xFinish < width + 40) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 230, 200, 0.95)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 6]);
      ctx.beginPath();
      ctx.moveTo(xFinish, 30);
      ctx.lineTo(xFinish, height - 30);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "10px Quicksand, system-ui";
      ctx.fillStyle = "rgba(255, 230, 200, 0.95)";
      ctx.textAlign = "center";
      ctx.fillText("ZIEL", xFinish, 22);
      ctx.restore();
    }
  }

  function drawTrail() {
    if (trailPoints.length < 2) return;
    ctx.save();
    ctx.lineWidth = BRUSH_RADIUS * 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < trailPoints.length; i++) {
      const p = trailPoints[i];
      const sx = p.x - cameraX;
      const sy = p.y;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "rgba(255,230,240,0.9)");
    grad.addColorStop(0.5, "rgba(255,190,220,0.95)");
    grad.addColorStop(1, "rgba(255,230,240,0.9)");
    ctx.strokeStyle = grad;
    ctx.shadowColor = "rgba(255,200,230,0.85)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  function drawPen() {
    ctx.save();

    ctx.beginPath();
    ctx.arc(penX, penY, BRUSH_RADIUS + 4, 0, Math.PI * 2);
    const glowGrad = ctx.createRadialGradient(penX, penY, 0, penX, penY, BRUSH_RADIUS + 4);
    glowGrad.addColorStop(0, "rgba(255,220,240,0.95)");
    glowGrad.addColorStop(1, "rgba(255,220,240,0)");
    ctx.fillStyle = glowGrad;
    ctx.fill();

    ctx.translate(penX, penY);
    ctx.rotate(-Math.PI / 12);

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(-18, -6, 36, 12, 6);
    } else {
      ctx.rect(-18, -6, 36, 12);
    }
    const bodyGrad = ctx.createLinearGradient(-18, -6, 18, 6);
    bodyGrad.addColorStop(0, "#fff0f7");
    bodyGrad.addColorStop(0.5, "#ffb3d9");
    bodyGrad.addColorStop(1, "#ff6fa8");
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(10, -7, 10, 14, 4);
    } else {
      ctx.rect(10, -7, 10, 14);
    }
    ctx.fillStyle = "#fefefe";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-18, 4);
    ctx.closePath();
    ctx.fillStyle = "#ffe0ec";
    ctx.fill();

    ctx.restore();
  }

  function drawCountdownOverlay() {
    if (!isCountingDown || countdownStartMs == null) return;
    const now = performance.now();
    const t = (now - countdownStartMs) / 1000;
    let text = "";
    if (t < 1) text = "3";
    else if (t < 2) text = "2";
    else if (t < 3) text = "1";
    else if (t < 3.4) text = "Go!";
    else text = "";

    if (!text) return;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, width, height);
    ctx.font = "bold 64px Marcellus, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const grd = ctx.createLinearGradient(width / 2 - 80, height / 2 - 40, width / 2 + 80, height / 2 + 40);
    grd.addColorStop(0, "#ffe5ec");
    grd.addColorStop(0.5, "#ffb3c1");
    grd.addColorStop(1, "#ffe5ec");
    ctx.fillStyle = grd;
    ctx.fillText(text, width / 2, height / 2);
    ctx.restore();
  }

  function updateTime(t) {
    const timeEl = root.querySelector("#traceTime");
    if (timeEl) {
      timeEl.textContent = t.toFixed(1) + "s";
    }
  }

  function updateAccuracyDisplay() {
    const accEl = root.querySelector("#traceAccuracy");
    const acc = accuracySamples > 0 ? (sumAccuracy / accuracySamples) * 100 : 0;
    if (accEl) {
      accEl.textContent = Math.round(acc) + "%";
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawTrack();
    drawStartAndFinish();
    drawTrail();
    drawPen();
    drawCountdownOverlay();
  }

  // --- Game Loop ---

  function gameLoop(timestamp) {
    if (!isRunning && !isCountingDown) return;

    if (isCountingDown) {
      if (!countdownStartMs) countdownStartMs = timestamp;
      const dt = (timestamp - countdownStartMs) / 1000;
      drawFrame();

      if (dt >= 3.4) {
        isCountingDown = false;
        countdownStartMs = null;
        startRunInternal(timestamp);
      } else {
        animationFrameId = window.requestAnimationFrame(gameLoop);
      }
      return;
    }

    if (!lastFrameMs) lastFrameMs = timestamp;
    const dt = (timestamp - lastFrameMs) / 1000;
    lastFrameMs = timestamp;

    elapsed = (timestamp - startTimeMs) / 1000;
    updateTime(elapsed);

    cameraX += scrollSpeed * dt;

    let ax = 0;
    let ay = 0;
    if (keys.ArrowUp) ay -= ACCEL;
    if (keys.ArrowDown) ay += ACCEL;
    if (keys.ArrowLeft) ax -= ACCEL * 1.4;
    if (keys.ArrowRight) ax += ACCEL * 1.4;

    vx += ax * dt;
    vy += ay * dt;

    vx *= FRICTION;
    vy *= FRICTION;

    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      vx *= scale;
      vy *= scale;
    }

    penX += vx * dt;
    penY += vy * dt;

    const marginX = 20;
    const marginY = 30;
    if (penX < marginX) penX = marginX;
    if (penX > width - marginX) penX = width - marginX;
    if (penY < marginY) penY = marginY;
    if (penY > height - marginY) penY = height - marginY;

    // NEUER Accuracy-Ansatz: nächster Punkt auf der gezeichneten Spur
    const nearest = findNearestOnTrack(penX, penY);
    const dist = Math.sqrt(nearest.dist2);
    const effectiveDist = Math.max(0, dist - BRUSH_RADIUS);
    const frameAcc = Math.max(0, 1 - effectiveDist / MAX_DEVIATION);

    sumAccuracy += frameAcc;
    accuracySamples++;
    updateAccuracyDisplay();

    const worldPenX = cameraX + penX;
    trailPoints.push({ x: worldPenX, y: penY });
    if (trailPoints.length > 2500) {
      trailPoints.shift();
    }

    drawFrame();

    const finishScreenX = FINISH_WORLD_X - cameraX;
    if (finishScreenX <= penX + BRUSH_RADIUS * 0.3) {
      finishRun();
      return;
    }

    animationFrameId = window.requestAnimationFrame(gameLoop);
  }

  // --- Start / Finish / Reset ---

  function startCountdown() {
    if (isRunning || isFinished || isCountingDown) return;
    isCountingDown = true;
    countdownStartMs = null;
    const statusLineEl = root.querySelector(".trace-status-line");
    if (statusLineEl) {
      statusLineEl.textContent = "Countdown läuft: 3, 2, 1 ...";
      statusLineEl.classList.remove("trace-status-success", "trace-status-fail");
    }
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    animationFrameId = window.requestAnimationFrame(gameLoop);
  }

  function startRunInternal(timestamp) {
    isRunning = true;
    isFinished = false;
    startTimeMs = timestamp;
    lastFrameMs = timestamp;
    sumAccuracy = 0;
    accuracySamples = 0;
    elapsed = 0;
    trailPoints.length = 0;
    const worldPenX = cameraX + penX;
    trailPoints.push({ x: worldPenX, y: penY });
    updateTime(0);
    updateAccuracyDisplay();
    const statusLineEl = root.querySelector(".trace-status-line");
    if (statusLineEl) {
      statusLineEl.textContent = "Go! Der Bildschirm schiebt dich – halte den Lippenbalsam auf der Spur.";
      statusLineEl.classList.remove("trace-status-success", "trace-status-fail");
    }
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    animationFrameId = window.requestAnimationFrame(gameLoop);
  }

  function finishRun() {
    if (isFinished) return;
    isFinished = true;
    isRunning = false;
    isCountingDown = false;

    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (startTimeMs != null) {
      const now = performance.now();
      elapsed = (now - startTimeMs) / 1000;
      updateTime(elapsed);
    }

    const avgAcc = accuracySamples > 0 ? sumAccuracy / accuracySamples : 0;
    const accPercent = Math.round(avgAcc * 100);
    const success = avgAcc >= REQUIRED_ACCURACY;
    const statusLineEl = root.querySelector(".trace-status-line");

    if (success) {
      if (statusLineEl) {
        statusLineEl.textContent =
          `Stark! Du hast mit ${accPercent}% Genauigkeit eingecremt – die Lippenbalsam-Challenge ist bestanden. ✨`;
        statusLineEl.classList.add("trace-status-success");
        statusLineEl.classList.remove("trace-status-fail");
      }
      try {
        onWin();
      } catch (e) {
        console.error("onWin callback error:", e);
      }
    } else {
      if (statusLineEl) {
        statusLineEl.textContent =
          `Deine Genauigkeit lag bei ${accPercent}%. Versuch, noch genauer der krickeligen Spur zu folgen und starte neu mit der Leertaste.`;
        statusLineEl.classList.add("trace-status-fail");
        statusLineEl.classList.remove("trace-status-success");
      }
    }
  }

  function resetGame() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    isRunning = false;
    isFinished = false;
    isCountingDown = false;
    countdownStartMs = null;
    startTimeMs = null;
    lastFrameMs = null;
    elapsed = 0;
    sumAccuracy = 0;
    accuracySamples = 0;
    vx = 0;
    vy = 0;
    cameraX = 0;
    trailPoints.length = 0;
    updateTime(0);
    updateAccuracyDisplay();

    const startWX = START_WORLD_X;
    const startY = worldTrackY(startWX);
    const startOffsetX = worldTrackOffsetX(startWX);
    penX = startWX - cameraX + startOffsetX;
    penY = startY;

    const statusLineEl = root.querySelector(".trace-status-line");
    if (statusLineEl) {
      statusLineEl.textContent = "Neu gestartet. Drücke die Leertaste, um den Countdown zu beginnen.";
      statusLineEl.classList.remove("trace-status-success", "trace-status-fail");
    }
    drawFrame();
  }

  // --- Input & Events ---

  function handleKeyDown(ev) {
    if (ev.key === " " || ev.code === "Space") {
      ev.preventDefault();
      if (!isRunning && !isCountingDown) {
        startCountdown();
      }
      return;
    }

    if (ev.key in keys) {
      ev.preventDefault();
      keys[ev.key] = true;
    }
  }

  function handleKeyUp(ev) {
    if (ev.key in keys) {
      ev.preventDefault();
      keys[ev.key] = false;
    }
  }

  resetBtn.addEventListener("click", () => {
    resetGame();
  });

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("resize", resizeCanvas);

  resizeCanvas();

  return {
    reset: resetGame,
    destroy: () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", resizeCanvas);
    }
  };
};
