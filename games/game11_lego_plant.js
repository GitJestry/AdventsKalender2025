window.AdventGames = window.AdventGames || {};

window.AdventGames["lego_plant_11"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // ---------------------------------------------------------------------------
  // ROOT / HEADER
  // ---------------------------------------------------------------------------

  const root = document.createElement("div");
  root.className = "lego-plant-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";
  root.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 11 – Lego-Pflanze";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Baut die Lego-Pflanze auf – wenn ihr fertig seid, erwachen hier zwei leuchtende Pflanzen 🌱✨";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.color = "rgba(255,255,255,0.9)";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "stretch";
  layout.style.marginTop = "4px";

  const left = document.createElement("div");
  left.style.flex = "1 1 auto";
  left.style.display = "flex";
  left.style.flexDirection = "column";

  const right = document.createElement("aside");
  right.style.flex = "0 0 210px";
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "10px";

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);
  container.appendChild(root);

  // ---------------------------------------------------------------------------
  // CANVAS
  // ---------------------------------------------------------------------------

  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.borderRadius = "12px";
  canvasWrapper.style.background =
    "radial-gradient(circle at 20% 0%, #1f2937 0, #020617 55%, #000 100%)";
  canvasWrapper.style.boxShadow = "0 8px 30px rgba(0,0,0,0.85)";
  canvasWrapper.style.overflow = "hidden";
  canvasWrapper.style.flex = "1 1 auto";
  canvasWrapper.style.minHeight = "260px";
  canvasWrapper.style.border = "1px solid rgba(148,163,184,0.4)";

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";

  const canvasOverlay = document.createElement("div");
  canvasOverlay.style.position = "absolute";
  canvasOverlay.style.inset = "0";
  canvasOverlay.style.display = "flex";
  canvasOverlay.style.flexDirection = "column";
  canvasOverlay.style.alignItems = "center";
  canvasOverlay.style.justifyContent = "center";
  canvasOverlay.style.textAlign = "center";
  canvasOverlay.style.pointerEvents = "none";
  canvasOverlay.style.color = "rgba(255,255,255,0.96)";
  canvasOverlay.style.textShadow = "0 0 10px rgba(0,0,0,0.8)";
  canvasOverlay.style.fontSize = "0.9rem";

  const overlayMain = document.createElement("div");
  overlayMain.textContent = "Baut eure Lego-Pflanze auf 🌱";
  overlayMain.style.fontWeight = "600";
  overlayMain.style.marginBottom = "4px";

  const overlaySub = document.createElement("div");
  overlaySub.textContent =
    "Wenn ihr hier auf „Fertig aufgebaut“ klickt, wachsen zwei leuchtende Pflanzen für euch.";

  canvasOverlay.appendChild(overlayMain);
  canvasOverlay.appendChild(overlaySub);

  canvasWrapper.appendChild(canvas);
  canvasWrapper.appendChild(canvasOverlay);
  left.appendChild(canvasWrapper);

  const ctx = canvas.getContext("2d");

  let width = 460;
  let height = 260;
  let dpr = window.devicePixelRatio || 1;

  // Abstand des Bodens vom unteren Rand – steuert auch, wie tief die Töpfe sitzen
  const GROUND_MARGIN_BOTTOM = -20;

  function resizeCanvas() {
    const bounds = canvasWrapper.getBoundingClientRect();
    const targetWidth = Math.min(Math.max(bounds.width || 460, 360), 640);
    width = targetWidth;
    height = 260;

    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = height + "px";

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  resizeCanvas();

  // ---------------------------------------------------------------------------
  // ANIMATION-STATE
  // ---------------------------------------------------------------------------

  let destroyed = false;
  let animationActive = false;
  let animationStartTime = null;
  let animationFrameId = null;
  let hasWon = false;
  let hasClickedDone = false;

  const TOTAL_DURATION = 16; // Sekunden

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function easeOutCubic(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutQuad(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // ---------------------------------------------------------------------------
  // ZEICHEN-HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------

  function drawBackground(timeSec, envProgress) {
    // Nachthimmel
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, "#020617");
    skyGrad.addColorStop(0.45, "#0b1120");
    skyGrad.addColorStop(1, "#020617");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Glow in der Mitte
    const glowGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.15,
      0,
      width * 0.5,
      height * 0.15,
      height * 0.7
    );
    glowGrad.addColorStop(0, "rgba(96,165,250,0.3)");
    glowGrad.addColorStop(1, "rgba(15,23,42,0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // kleine Sterne
    const starCount = 60;
    ctx.fillStyle = "rgba(248,250,252,0.85)";
    for (let i = 0; i < starCount; i++) {
      const x =
        ((i * 79.123 + timeSec * 10) % (width + 20)) - 10; // leichtes Schweben
      const y = (i * 37.91) % (height * 0.45);
      const size = (i % 3 === 0 ? 1.3 : 0.7) + envProgress * 0.4;
      ctx.globalAlpha = 0.4 + (i % 5) * 0.08;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGround(timeSec) {
    const groundY = height - GROUND_MARGIN_BOTTOM;

    // hintere Hügel
    ctx.save();
    const hillGrad = ctx.createLinearGradient(0, groundY - 40, 0, height);
    hillGrad.addColorStop(0, "#020617");
    hillGrad.addColorStop(1, "#020617");
    ctx.fillStyle = hillGrad;

    ctx.beginPath();
    ctx.moveTo(-40, groundY + 18);
    ctx.quadraticCurveTo(
      width * 0.25,
      groundY - 25,
      width * 0.55,
      groundY + 18
    );
    ctx.quadraticCurveTo(
      width * 0.85,
      groundY - 10,
      width + 40,
      groundY + 18
    );
    ctx.lineTo(width + 40, height);
    ctx.lineTo(-40, height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // vorderer Boden
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0, "#020617");
    groundGrad.addColorStop(0.6, "#020617");
    groundGrad.addColorStop(1, "#020617");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, height - groundY);

    // weicher Lichtfleck unter den Töpfen
    const baseGlow = ctx.createRadialGradient(
      width * 0.5,
      groundY + 26,
      0,
      width * 0.5,
      groundY + 26,
      width * 0.48
    );
    baseGlow.addColorStop(0, "rgba(15,23,42,0.9)");
    baseGlow.addColorStop(1, "rgba(15,23,42,0)");
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, groundY, width, height - groundY);
  }

  function drawPot(x, y, w, h, colorTop, colorBottom) {
    const r = 12;
    const rimHeight = 14;

    // Schatten
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.beginPath();
    ctx.ellipse(
      x + w / 2,
      y + h + 12,
      w * 0.6,
      12,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // leicht konische Form
    const topWidth = w;
    const bottomWidth = w * 0.78;
    const topY = y + rimHeight;
    const bottomY = y + h;
    const bottomLeftX = x + (topWidth - bottomWidth) / 2;
    const bottomRightX = bottomLeftX + bottomWidth;
    const topLeftX = x;
    const topRightX = x + topWidth;

    const bodyGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
    bodyGrad.addColorStop(0, colorTop);
    bodyGrad.addColorStop(0.45, colorBottom);
    bodyGrad.addColorStop(1, "#020617");

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = "rgba(15,23,42,0.95)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(topLeftX + r, topY);
    ctx.lineTo(topRightX - r, topY);
    ctx.quadraticCurveTo(topRightX, topY, topRightX, topY + r);
    ctx.lineTo(bottomRightX, bottomY - r);
    ctx.quadraticCurveTo(bottomRightX, bottomY, bottomRightX - r, bottomY);
    ctx.lineTo(bottomLeftX + r, bottomY);
    ctx.quadraticCurveTo(bottomLeftX, bottomY, bottomLeftX, bottomY - r);
    ctx.lineTo(topLeftX, topY + r);
    ctx.quadraticCurveTo(topLeftX, topY, topLeftX + r, topY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // seitliche Lichtreflexion
    ctx.save();
    ctx.globalAlpha = 0.38;
    const highlightWidth = topWidth * 0.22;
    const highlightX = x + topWidth * 0.24;
    const highlightGrad = ctx.createLinearGradient(
      highlightX,
      topY,
      highlightX + highlightWidth,
      bottomY
    );
    highlightGrad.addColorStop(0, "rgba(248,250,252,0.16)");
    highlightGrad.addColorStop(0.4, "rgba(248,250,252,0.05)");
    highlightGrad.addColorStop(1, "rgba(15,23,42,0)");
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.roundRect(
      highlightX,
      topY + 4,
      highlightWidth,
      bottomY - topY - 8,
      999
    );
    ctx.fill();
    ctx.restore();

    // dekorativer Mittelstreifen
    ctx.save();
    const bandY = topY + (bottomY - topY) * 0.45;
    const bandGrad = ctx.createLinearGradient(
      topLeftX,
      bandY,
      topRightX,
      bandY + 6
    );
    bandGrad.addColorStop(0, "rgba(15,23,42,0.4)");
    bandGrad.addColorStop(0.5, "rgba(248,250,252,0.25)");
    bandGrad.addColorStop(1, "rgba(15,23,42,0.5)");
    ctx.strokeStyle = bandGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bottomLeftX + 8, bandY);
    ctx.lineTo(bottomRightX - 8, bandY);
    ctx.stroke();
    ctx.restore();

    // Rand oben
    const rimOuterWidth = topWidth * 1.04;
    const rimOuterX = x - (rimOuterWidth - topWidth) / 2;
    const rimGrad = ctx.createLinearGradient(
      rimOuterX,
      y,
      rimOuterX,
      y + rimHeight + 2
    );
    rimGrad.addColorStop(0, "rgba(248,250,252,0.45)");
    rimGrad.addColorStop(0.4, "rgba(248,250,252,0.12)");
    rimGrad.addColorStop(1, "rgba(15,23,42,0.85)");
    ctx.fillStyle = rimGrad;

    ctx.beginPath();
    ctx.roundRect(
      rimOuterX,
      y,
      rimOuterWidth,
      rimHeight + 4,
      10
    );
    ctx.fill();

    // Oberkante Ellipse (Innenöffnung)
    ctx.fillStyle = "#020617";
    const ellipseCX = x + topWidth / 2;
    const ellipseCY = y + rimHeight;
    ctx.beginPath();
    ctx.ellipse(ellipseCX, ellipseCY, topWidth * 0.46, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSoil(potX, soilY, potWidth) {
    // dunkle Erde
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(
      potX + potWidth / 2,
      soilY,
      potWidth * 0.45,
      7,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // leichtere Mitte
    ctx.fillStyle = "rgba(63,63,70,0.9)";
    ctx.beginPath();
    ctx.ellipse(
      potX + potWidth / 2,
      soilY - 1,
      potWidth * 0.3,
      4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // kleine "Steinchen"
    ctx.save();
    ctx.globalAlpha = 0.8;
    const pebbles = 6;
    for (let i = 0; i < pebbles; i++) {
      const t = i / (pebbles - 1 || 1);
      const px = potX + potWidth * (0.25 + t * 0.5);
      const py = soilY - 1 + Math.sin(i * 1.7) * 0.8;
      ctx.beginPath();
      ctx.arc(px, py, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? "#4b5563" : "#6b7280";
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSeedGlow(centerX, soilY, progress, color) {
    const p = clamp(progress, 0, 1);
    if (p <= 0) return;
    const baseY = soilY - 4;

    const rOuter = 16 + 12 * p;
    const rInner = 4 + 4 * p;

    const glowGrad = ctx.createRadialGradient(
      centerX,
      baseY,
      0,
      centerX,
      baseY,
      rOuter
    );
    glowGrad.addColorStop(0, color);
    glowGrad.addColorStop(0.6, "rgba(190,242,100,0.15)");
    glowGrad.addColorStop(1, "rgba(15,23,42,0)");

    ctx.save();
    ctx.globalAlpha = 0.55 + 0.3 * p;
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, baseY, rOuter, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#f9fafb";
    ctx.beginPath();
    ctx.ellipse(centerX, baseY, rInner * 1.2, rInner * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // PFLANZEN-ZEICHNUNG
  // ---------------------------------------------------------------------------

  function drawPlant(centerX, soilY, progress, timeSec, style) {
    const p = clamp(progress, 0, 1);
    const {
      maxHeight,
      leanDir,
      stemColorA,
      stemColorB,
      leafColorA,
      leafColorB,
      glowColor = "rgba(190,242,100,0.9)",
      flowerColorInner = "#f97316",
      flowerColorOuter = "#facc15"
    } = style;

    const sproutPhase = clamp(p / 0.18, 0, 1);
    const stemPhase = clamp((p - 0.05) / 0.45, 0, 1);
    const leafPhase = clamp((p - 0.18) / 0.65, 0, 1);
    const bloomPhase = clamp((p - 0.65) / 0.35, 0, 1);

    const baseX = centerX;
    const baseY = soilY - 5;

    // Keimling & Basis-Glow
    drawSeedGlow(baseX, soilY, sproutPhase, glowColor);

    if (stemPhase <= 0) return;

    const breathing = 1 + 0.04 * Math.sin(timeSec * 2.3 + baseX * 0.17);
    const stemHeight = (24 + maxHeight * stemPhase) * breathing;
    const sway = Math.sin(timeSec * 1.4 + baseX * 0.01) * (3 + 5 * stemPhase);

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(((sway + 5 * leanDir) * Math.PI) / 180);

    // weicher Glow um den Stängel
    const stemGrad = ctx.createLinearGradient(0, 0, 0, -stemHeight);
    stemGrad.addColorStop(0, stemColorA);
    stemGrad.addColorStop(1, stemColorB);

    const ctrl1x = 18 * leanDir * stemPhase;
    const ctrl1y = -stemHeight * 0.35;
    const ctrl2x = 6 * leanDir * stemPhase;
    const ctrl2y = -stemHeight * 0.8;
    const tipY = -stemHeight;

    ctx.globalAlpha = 0.7 * stemPhase;
    ctx.strokeStyle = "rgba(34,197,94,0.45)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, 0, tipY);
    ctx.stroke();

    // eigentlicher Stängel
    ctx.globalAlpha = 1;
    ctx.strokeStyle = stemGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, 0, tipY);
    ctx.stroke();

    // Blätter
    const leafCount = 8;
    for (let i = 0; i < leafCount; i++) {
      const tLeaf = (i + 1) / (leafCount + 1);
      const appearStart = 0.15 + tLeaf * 0.1;
      const appear = clamp((leafPhase - appearStart) / 0.5, 0, 1);
      if (appear <= 0) continue;

      const y = tipY * (tLeaf * (0.85 + 0.1 * Math.sin(tLeaf * Math.PI)));
      const side = i % 2 === 0 ? 1 : -1;
      const len = (26 + i * 9) * appear;
      const widthLeaf = (10 + i * 2.1) * appear;

      ctx.save();
      ctx.translate(0, y);

      const leafSway =
        Math.sin(timeSec * 1.8 + i * 0.9) * (0.08 + 0.1 * (1 - tLeaf));
      ctx.rotate(side * (0.5 - 0.18 * tLeaf + leafSway));

      // weicher Glow hinter dem Blatt
      ctx.beginPath();
      ctx.ellipse(
        (len * side) * 0.55,
        0,
        len * 0.55,
        widthLeaf * 0.8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fillStyle =
        "rgba(74,222,128," + (0.06 + 0.12 * appear) + ")";
      ctx.fill();

      // Blattkörper
      const leafGrad = ctx.createLinearGradient(
        0,
        -widthLeaf,
        len * side,
        widthLeaf
      );
      leafGrad.addColorStop(0, leafColorA);
      leafGrad.addColorStop(0.4, leafColorB);
      leafGrad.addColorStop(1, "#14532d");

      ctx.fillStyle = leafGrad;
      ctx.strokeStyle = "rgba(15,23,42,0.9)";
      ctx.lineWidth = 0.8;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        len * 0.4 * side,
        -widthLeaf * 1.2,
        len * side,
        0
      );
      ctx.quadraticCurveTo(
        len * 0.4 * side,
        widthLeaf * 1.1,
        0,
        0
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mittelader
      ctx.strokeStyle = "rgba(249,250,251,0.4)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * side * 0.88, 0);
      ctx.stroke();

      ctx.restore();
    }

    // leuchtende Blüte / Spitze
    if (bloomPhase > 0) {
      const bloomTipY = tipY - 4 * bloomPhase;

      const haloRadius = 16 + 10 * bloomPhase;
      const haloGrad = ctx.createRadialGradient(
        0,
        bloomTipY,
        0,
        0,
        bloomTipY,
        haloRadius * 2.4
      );
      haloGrad.addColorStop(
        0,
        "rgba(250,250,255," + (0.25 + 0.4 * bloomPhase) + ")"
      );
      haloGrad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, bloomTipY, haloRadius * 2.4, 0, Math.PI * 2);
      ctx.fill();

      // Kern der Blüte
      const coreGrad = ctx.createRadialGradient(
        0,
        bloomTipY,
        0,
        0,
        bloomTipY,
        haloRadius
      );
      coreGrad.addColorStop(0, flowerColorInner);
      coreGrad.addColorStop(1, flowerColorOuter);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, bloomTipY, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Strahlen
      ctx.strokeStyle =
        "rgba(253,224,71," + (0.6 + 0.4 * bloomPhase) + ")";
      ctx.lineWidth = 1.4;
      const rayCount = 10;
      const baseRadius = haloRadius + 3;
      const rayLength = haloRadius * (0.8 + 0.4 * bloomPhase);

      for (let i = 0; i < rayCount; i++) {
        const ang = (i / rayCount) * Math.PI * 2 + timeSec * 0.8;
        const x1 = Math.cos(ang) * baseRadius;
        const y1 = bloomTipY + Math.sin(ang) * baseRadius;
        const x2 = Math.cos(ang) * (baseRadius + rayLength);
        const y2 = bloomTipY + Math.sin(ang) * (baseRadius + rayLength);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // kleine Funken, die um die Blüte kreisen
      const sparkCount = 8;
      ctx.fillStyle = "#fefce8";
      for (let i = 0; i < sparkCount; i++) {
        const orbitAngle =
          timeSec * 1.5 + (i * Math.PI * 2) / sparkCount;
        const orbitR =
          haloRadius * (1.6 + 0.4 * Math.sin(timeSec * 1.2 + i));
        const sx = Math.cos(orbitAngle) * orbitR;
        const sy = bloomTipY + Math.sin(orbitAngle) * orbitR;
        const sSize = 1.3 + 0.7 * Math.sin(timeSec * 2.1 + i);
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(timeSec * 2 + i);
        ctx.beginPath();
        ctx.arc(sx, sy, sSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawScene(growthProgress, timeSec) {
    ctx.clearRect(0, 0, width, height);

    const envProgress = easeInOutQuad(growthProgress);

    drawBackground(timeSec, envProgress);
    drawGround(timeSec);

    const groundY = height - GROUND_MARGIN_BOTTOM;

    // neue Topfgrößen
    const leftPot = { w: 130, h: 70 };
    const rightPot = { w: 100, h: 80 };

    const leftPotX = width * 0.27 - leftPot.w / 2;
    const rightPotX = width * 0.73 - rightPot.w / 2;

    // Basis der Töpfe etwas näher an den unteren Rand
    const potBaseY = groundY + 12;

    // Töpfe zeichnen
    drawPot(
      leftPotX,
      potBaseY - leftPot.h,
      leftPot.w,
      leftPot.h,
      "#38bdf8",
      "#1d4ed8"
    );
    drawPot(
      rightPotX,
      potBaseY - rightPot.h,
      rightPot.w,
      rightPot.h,
      "#facc15",
      "#eab308"
    );

    const leftSoilY = potBaseY - leftPot.h + 12;
    const rightSoilY = potBaseY - rightPot.h + 12;

    drawSoil(leftPotX, leftSoilY, leftPot.w);
    drawSoil(rightPotX, rightSoilY, rightPot.w);

    // Pflanzen
    drawPlant(
      leftPotX + leftPot.w / 2,
      leftSoilY,
      growthProgress,
      timeSec,
      {
        maxHeight: 120,
        leanDir: -1,
        stemColorA: "#16a34a",
        stemColorB: "#4ade80",
        leafColorA: "#bbf7d0",
        leafColorB: "#16a34a"
      }
    );
    drawPlant(
      rightPotX + rightPot.w / 2,
      rightSoilY,
      growthProgress,
      timeSec,
      {
        maxHeight: 140,
        leanDir: 1,
        stemColorA: "#22c55e",
        stemColorB: "#86efac",
        leafColorA: "#bbf7d0",
        leafColorB: "#22c55e"
      }
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER-LOOP
  // ---------------------------------------------------------------------------

  function renderFrame(timestamp) {
    if (destroyed) return;

    if (!animationStartTime) {
      animationStartTime = timestamp;
    }

    const elapsed = (timestamp - animationStartTime) / 1000;
    const t = Math.min(elapsed / TOTAL_DURATION, 1);
    const growthProgress = easeOutCubic(t);

    drawScene(growthProgress, elapsed);

    if (t < 1) {
      animationFrameId = window.requestAnimationFrame(renderFrame);
    } else {
      animationActive = false;
      if (!hasWon) {
        completeWin();
      }
    }
  }

  function drawInitialStatic() {
    const initialProgress = 0;
    drawScene(initialProgress, 0);
  }

  function startAnimation() {
    animationActive = true;
    animationStartTime = null;
    canvasOverlay.style.opacity = "0";
    canvasOverlay.style.transition = "opacity 0.3s ease-out";
    animationFrameId = window.requestAnimationFrame(renderFrame);
  }

  drawInitialStatic();

  // ---------------------------------------------------------------------------
  // RECHTE SPALTE – Karten & Button
  // ---------------------------------------------------------------------------

  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "10px";
    card.style.padding = "10px 8px";
    card.style.background = "rgba(15,23,42,0.98)";
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
    iconEl.style.width = "24px";
    iconEl.style.height = "24px";
    iconEl.style.borderRadius = "999px";
    iconEl.style.display = "flex";
    iconEl.style.alignItems = "center";
    iconEl.style.justifyContent = "center";
    iconEl.style.fontSize = "1rem";
    iconEl.style.background = "rgba(15,23,42,1)";

    const titleEl2 = document.createElement("div");
    titleEl2.textContent = title;
    titleEl2.style.fontSize = "0.8rem";
    titleEl2.style.fontWeight = "600";

    head.appendChild(iconEl);
    head.appendChild(titleEl2);

    const body = document.createElement("div");
    body.style.fontSize = "0.75rem";
    body.style.opacity = "0.9";
    lines.forEach((txt) => {
      const line = document.createElement("div");
      line.textContent = txt;
      body.appendChild(line);
    });

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  const taskCard = makeSideCard("Aufgabe", "🧱", [
    "Baut die Lego-Pflanze zusammen mit Juli",
    "oder alleine in Ruhe auf.",
  ]);

  const giftCard = makeSideCard("Adventgeschenk", "🎁", [
    "Heute gibt es als Geschenk",
    "eine echte Lego-Pflanze,",
    "die ihr jetzt aufbauen dürft.",
  ]);

  const starCard = makeSideCard("Belohnung", "⭐", [
    "Wenn ihr fertig seid und",
    "hier bestätigt habt,",
    "wachsen zwei leuchtende Pflanzen",
    "und ihr bekommt einen roten Stern.",
  ]);

  const buttonCard = document.createElement("div");
  buttonCard.style.borderRadius = "10px";
  buttonCard.style.padding = "10px 8px";
  buttonCard.style.background = "rgba(15,23,42,0.98)";
  buttonCard.style.border = "1px solid rgba(148,163,184,0.5)";
  buttonCard.style.display = "flex";
  buttonCard.style.flexDirection = "column";
  buttonCard.style.gap = "6px";
  buttonCard.style.alignItems = "stretch";

  const buttonLabel = document.createElement("div");
  buttonLabel.textContent = "Nur klicken, wenn die Pflanze wirklich fertig gebaut ist:";
  buttonLabel.style.fontSize = "0.78rem";
  buttonLabel.style.opacity = "0.9";

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.textContent = "Fertig aufgebaut";
  doneBtn.style.padding = "7px 10px";
  doneBtn.style.borderRadius = "999px";
  doneBtn.style.border = "none";
  doneBtn.style.cursor = "pointer";
  doneBtn.style.fontSize = "0.86rem";
  doneBtn.style.fontWeight = "600";
  doneBtn.style.background =
    "linear-gradient(135deg, rgba(190,242,100,1), rgba(52,211,153,1))";
  doneBtn.style.boxShadow = "0 0 18px rgba(52,211,153,0.9)";
  doneBtn.style.color = "#052e16";
  doneBtn.style.textAlign = "center";

  doneBtn.onmouseenter = () => {
    if (doneBtn.disabled) return;
    doneBtn.style.transform = "translateY(-1px)";
    doneBtn.style.boxShadow = "0 0 20px rgba(74,222,128,1)";
  };
  doneBtn.onmouseleave = () => {
    doneBtn.style.transform = "none";
    doneBtn.style.boxShadow = "0 0 18px rgba(52,211,153,0.9)";
  };

  buttonCard.appendChild(buttonLabel);
  buttonCard.appendChild(doneBtn);

  right.appendChild(taskCard);
  right.appendChild(giftCard);
  right.appendChild(starCard);
  right.appendChild(buttonCard);

  // ---------------------------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------------------------

  const modalOverlay = document.createElement("div");
  modalOverlay.style.position = "fixed";
  modalOverlay.style.inset = "0";
  modalOverlay.style.display = "flex";
  modalOverlay.style.alignItems = "center";
  modalOverlay.style.justifyContent = "center";
  modalOverlay.style.background = "rgba(0,0,0,0.65)";
  modalOverlay.style.zIndex = "9999";
  modalOverlay.style.opacity = "0";
  modalOverlay.style.pointerEvents = "none";
  modalOverlay.style.transition = "opacity 0.18s ease-out";

  const modalCard = document.createElement("div");
  modalCard.style.minWidth = "260px";
  modalCard.style.maxWidth = "360px";
  modalCard.style.borderRadius = "12px";
  modalCard.style.padding = "14px 16px 12px";
  modalCard.style.background = "rgba(15,23,42,0.98)";
  modalCard.style.border = "1px solid rgba(248,250,252,0.16)";
  modalCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.9)";
  modalCard.style.display = "flex";
  modalCard.style.flexDirection = "column";
  modalCard.style.gap = "6px";
  modalCard.style.color = "rgba(248,250,252,0.96)";
  modalCard.style.fontSize = "0.9rem";

  const modalTitle = document.createElement("div");
  modalTitle.textContent = "Geschafft! 🌟";
  modalTitle.style.fontWeight = "700";

  const modalBody = document.createElement("div");
  modalBody.textContent =
    "Du darfst nun dein 11. Adventgeschenk öffnen: die Lego-Pflanze.";

  const modalSmall = document.createElement("div");
  modalSmall.style.fontSize = "0.7rem";
  modalSmall.style.opacity = "0.8";
  modalSmall.textContent =
    "Auf dem Bildschirm wachsen zwei leuchtende Pflanzen – genau wie eure echte Lego-Pflanze.";

  const modalClose = document.createElement("button");
  modalClose.textContent = "Yay! 🎄";
  modalClose.type = "button";
  modalClose.style.alignSelf = "flex-end";
  modalClose.style.marginTop = "8px";
  modalClose.style.padding = "4px 10px";
  modalClose.style.borderRadius = "999px";
  modalClose.style.border = "1px solid rgba(148,163,184,0.8)";
  modalClose.style.background = "rgba(15,23,42,0.95)";
  modalClose.style.color = "rgba(248,250,252,0.9)";
  modalClose.style.cursor = "pointer";
  modalClose.style.fontSize = "0.78rem";

  modalCard.appendChild(modalTitle);
  modalCard.appendChild(modalBody);
  modalCard.appendChild(modalSmall);
  modalCard.appendChild(modalClose);
  modalOverlay.appendChild(modalCard);
  document.body.appendChild(modalOverlay);

  function showModal() {
    modalOverlay.style.opacity = "1";
    modalOverlay.style.pointerEvents = "auto";
  }

  function hideModal() {
    modalOverlay.style.opacity = "0";
    modalOverlay.style.pointerEvents = "none";
  }

  modalClose.addEventListener("click", hideModal);

  function completeWin() {
    hasWon = true;

    showModal();

    try {
      if (
        typeof window !== "undefined" &&
        typeof window.playVictorySound === "function"
      ) {
        window.playVictorySound();
      }
    } catch (e) {}

    try {
      onWin({ level: "red", label: "Roter Stern" });
    } catch (e) {
      console.error("lego_plant_11 onWin error:", e);
    }
  }

  // ---------------------------------------------------------------------------
  // BUTTON-LOGIK
  // ---------------------------------------------------------------------------

  doneBtn.addEventListener("click", () => {
    if (hasClickedDone || hasWon) return;
    hasClickedDone = true;

    doneBtn.disabled = true;
    doneBtn.textContent = "Pflanzen wachsen ...";

    if (!animationActive) {
      startAnimation();
    }
  });

  // ---------------------------------------------------------------------------
  // RESIZE-HANDLING
  // ---------------------------------------------------------------------------

  function handleResize() {
    resizeCanvas();
    if (!animationActive && !hasWon) {
      drawInitialStatic();
    }
  }

  window.addEventListener("resize", handleResize);

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  return {
    destroy() {
      destroyed = true;
      try {
        window.removeEventListener("resize", handleResize);
      } catch (e) {}
      try {
        if (animationFrameId) {
          window.cancelAnimationFrame(animationFrameId);
        }
      } catch (e) {}
      try {
        modalClose.removeEventListener("click", hideModal);
      } catch (e) {}
      try {
        if (modalOverlay && modalOverlay.parentNode) {
          modalOverlay.parentNode.removeChild(modalOverlay);
        }
      } catch (e) {}
    },
  };
};
