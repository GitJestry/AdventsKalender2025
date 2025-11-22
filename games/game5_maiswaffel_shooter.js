// Spiel 5: Maiswaffel-Schießen mit Elfen und Schokogeschossen
// Ein winterlicher "Shoot the Duck"-Remix: fliegende Maiswaffeln, geworfen von eifrigen Elfen.

window.AdventGames = window.AdventGames || {};

window.AdventGames["maiswaffel_shooter"] = function initMaiswaffelShooter(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const TARGET_SCORE = 15;
  const TIME_LIMIT = 35; // Sekunden

  const canvas = document.createElement("canvas");
  const hud = document.createElement("div");
  const message = document.createElement("div");
  const crosshair = document.createElement("div");
  const root = document.createElement("div");

  root.className = "maiswaffel-root";
  hud.className = "maiswaffel-hud";
  message.className = "maiswaffel-message";
  crosshair.className = "maiswaffel-crosshair";

  const scoreEl = document.createElement("div");
  scoreEl.className = "maiswaffel-stat";
  const timerEl = document.createElement("div");
  timerEl.className = "maiswaffel-stat";
  const infoEl = document.createElement("div");
  infoEl.className = "maiswaffel-info";

  scoreEl.textContent = "Treffer: 0 / " + TARGET_SCORE;
  timerEl.textContent = "Zeit: " + TIME_LIMIT + "s";
  infoEl.textContent = "Elfen schleudern Maiswaffeln – triff sie mit superschneller Schokolade!";

  const cta = document.createElement("button");
  cta.type = "button";
  cta.className = "maiswaffel-btn";
  cta.textContent = "Elfen starten & schießen";

  hud.appendChild(scoreEl);
  hud.appendChild(timerEl);
  hud.appendChild(infoEl);
  hud.appendChild(cta);

  message.textContent = "Hol mindestens " + TARGET_SCORE + " Punkte, bevor der Nordwind die Elfen einfriert.";

  root.appendChild(hud);
  root.appendChild(canvas);
  root.appendChild(message);
  root.appendChild(crosshair);

  container.innerHTML = "";
  container.appendChild(root);

  const ctx = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let lastTime = 0;
  let raf = null;
  let running = false;
  let timeLeft = TIME_LIMIT;
  let score = 0;
  let gameEnded = false;

  const waffles = [];
  const chocolates = [];
  const shards = [];
  const elfSlots = [];

  const pointer = { x: 0, y: 0 };

  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.floor(rect.width);
    height = Math.floor(rect.height * 0.78);
    if (width < 320) width = 320;
    if (height < 260) height = 260;
    canvas.width = width;
    canvas.height = height;
  }

  resize();
  window.addEventListener("resize", resize);

  function resetGame() {
    waffles.length = 0;
    chocolates.length = 0;
    shards.length = 0;
    score = 0;
    timeLeft = TIME_LIMIT;
    gameEnded = false;
    scoreEl.textContent = `Treffer: ${score} / ${TARGET_SCORE}`;
    timerEl.textContent = `Zeit: ${Math.ceil(timeLeft)}s`;
    message.textContent =
      "Elfen schnippen jetzt Maiswaffeln in den Winterhimmel – schieß sie mit Schokolade in Splitter!";
    createElfSlots();
    spawnInitialWave();
    lastTime = performance.now();
  }

  function createElfSlots() {
    elfSlots.length = 0;
    const count = 4;
    for (let i = 0; i < count; i += 1) {
      const x = ((i + 0.5) / count) * width;
      elfSlots.push({
        x,
        y: height - 20 - Math.random() * 30
      });
    }
  }

  function spawnInitialWave() {
    for (let i = 0; i < 5; i += 1) {
      spawnWaffle();
    }
  }

  function spawnWaffle() {
    const radius = 26 + Math.random() * 10;
    const fromLeft = Math.random() > 0.5;
    const x = fromLeft ? -radius - 12 : width + radius + 12;
    const y = 40 + Math.random() * (height - 180);
    const speed = 240 + Math.random() * 140; // schnell!
    const vx = fromLeft ? speed : -speed;
    const vy = (Math.random() - 0.5) * 60;
    const spin = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.2);
    waffles.push({ x, y, vx, vy, radius, spin, angle: 0, alive: true });
  }

  function shootChocolate(targetX, targetY) {
    if (!running || gameEnded) return;
    const origin = pickNearestElf(targetX);
    const angle = Math.atan2(targetY - origin.y, targetX - origin.x);
    const speed = 1400; // superschnell
    chocolates.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ttl: 0.25
    });
    createMuzzleFlash(origin.x, origin.y);
  }

  function pickNearestElf(x) {
    let best = elfSlots[0];
    let bestDist = Infinity;
    elfSlots.forEach((slot) => {
      const d = Math.abs(slot.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = slot;
      }
    });
    return best;
  }

  function createMuzzleFlash(x, y) {
    shards.push({ x, y, vx: 0, vy: -80, ttl: 0.15, color: "#ffddaa", size: 6 });
  }

  function breakWaffle(waffle) {
    waffle.alive = false;
    score += 1;
    scoreEl.textContent = `Treffer: ${score} / ${TARGET_SCORE}`;
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 120;
      shards.push({
        x: waffle.x + Math.cos(angle) * waffle.radius * 0.4,
        y: waffle.y + Math.sin(angle) * waffle.radius * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        ttl: 0.6,
        color: i % 2 === 0 ? "#f1d27c" : "#f9e6a3",
        size: 4 + Math.random() * 4
      });
    }
    message.textContent = randomHitLine();
    if (score >= TARGET_SCORE) {
      endGame(true);
    }
  }

  function randomHitLine() {
    const lines = [
      "Crunch! Eine Waffel weniger im Schneesturm!",
      "Die Elfen jubeln – Schokotreffer!",
      "Splitterregen! Du bist im Flow.",
      "Maisstaub und Glitzer, weiter so!",
      "Das Rentier applaudiert aus der Ferne." 
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function endGame(won) {
    gameEnded = true;
    running = false;
    cta.textContent = "Nochmal!";
    if (won) {
      message.textContent = "Du hast die Maiswaffel-Armada besiegt! Geschenk freigeschaltet.";
      onWin();
    } else {
      message.textContent = "Zeit vorbei! Der Nordwind hat die Elfen gestoppt – versuch es erneut.";
    }
  }

  function update(dt) {
    if (!running || gameEnded) return;

    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      timerEl.textContent = "Zeit: 0s";
      endGame(false);
      return;
    }
    timerEl.textContent = `Zeit: ${Math.ceil(timeLeft)}s`;

    if (Math.random() < 0.9 * dt) {
      spawnWaffle();
    }

    waffles.forEach((w) => {
      if (!w.alive) return;
      w.x += w.vx * dt;
      w.y += w.vy * dt + Math.sin((performance.now() + w.x) * 0.002) * 18 * dt;
      w.angle += w.spin * dt;
      if (w.x < -120 || w.x > width + 120 || w.y < -120 || w.y > height + 120) {
        w.alive = false;
      }
    });

    chocolates.forEach((c) => {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.ttl -= dt;
    });

    chocolates.forEach((c) => {
      waffles.forEach((w) => {
        if (!w.alive) return;
        const dx = w.x - c.x;
        const dy = w.y - c.y;
        if (dx * dx + dy * dy < (w.radius + 6) * (w.radius + 6)) {
          breakWaffle(w);
          c.ttl = 0;
        }
      });
    });

    for (let i = waffles.length - 1; i >= 0; i -= 1) {
      if (!waffles[i].alive) waffles.splice(i, 1);
    }
    for (let i = chocolates.length - 1; i >= 0; i -= 1) {
      if (chocolates[i].ttl <= 0) chocolates.splice(i, 1);
    }

    shards.forEach((s) => {
      s.x += (s.vx || 0) * dt;
      s.y += (s.vy || 0) * dt;
      s.ttl -= dt;
      if (s.vy !== undefined) s.vy += 50 * dt;
    });
    for (let i = shards.length - 1; i >= 0; i -= 1) {
      if (shards[i].ttl <= 0) shards.splice(i, 1);
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0c1a22");
    gradient.addColorStop(1, "#0d2a2f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Schneeschleier
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i < 24; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawElfHills() {
    ctx.save();
    ctx.fillStyle = "#0a332f";
    ctx.beginPath();
    ctx.moveTo(0, height - 40);
    ctx.bezierCurveTo(width * 0.25, height - 90, width * 0.4, height - 20, width * 0.6, height - 80);
    ctx.bezierCurveTo(width * 0.8, height - 40, width * 0.9, height - 70, width, height - 30);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    elfSlots.forEach((slot, index) => {
      drawElf(slot.x, slot.y, index);
    });
    ctx.restore();
  }

  function drawElf(x, y, index) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.0, 1.0);
    // Körper
    ctx.fillStyle = "#1f7a68";
    ctx.beginPath();
    ctx.ellipse(0, 10, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Kragen
    ctx.fillStyle = "#f7c948";
    ctx.beginPath();
    ctx.arc(0, -4, 10, Math.PI, 0);
    ctx.fill();
    // Kopf
    ctx.fillStyle = "#f1d6b8";
    ctx.beginPath();
    ctx.arc(0, -14, 8, 0, Math.PI * 2);
    ctx.fill();
    // Mütze
    ctx.fillStyle = index % 2 === 0 ? "#ff6b6b" : "#7ad0ff";
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(0, -30);
    ctx.lineTo(10, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, -30, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Hand + Schleuder
    ctx.strokeStyle = "#d6b48c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.quadraticCurveTo(0, -14, 8, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawWaffles() {
    waffles.forEach((w) => {
      if (!w.alive) return;
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(w.angle);
      const r = w.radius;
      // Waffelgrund
      const grd = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
      grd.addColorStop(0, "#ffe5a8");
      grd.addColorStop(1, "#d3a24d");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Muster
      ctx.strokeStyle = "rgba(120, 78, 24, 0.45)";
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-r, (i / 2) * r);
        ctx.lineTo(r, (i / 2) * r);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  function drawChocolates() {
    chocolates.forEach((c) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = "#5a2c14";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawShards() {
    shards.forEach((s) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.ttl * 1.5);
      ctx.fillStyle = s.color || "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size || 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
    if (running || !gameEnded) {
      raf = requestAnimationFrame(loop);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawElfHills();
    drawWaffles();
    drawChocolates();
    drawShards();
  }

  function startGame() {
    resetGame();
    running = true;
    cta.textContent = "Schokolade feuern";
    if (raf) cancelAnimationFrame(raf);
    lastTime = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    shootChocolate(x, y);
  }

  function onMove(event) {
    const rect = container.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    const offset = 11; // halber Crosshair-Durchmesser
    crosshair.style.transform = `translate(${pointer.x - offset}px, ${pointer.y - offset}px)`;
  }

  canvas.addEventListener("click", onClick);
  canvas.addEventListener("mousemove", onMove);
  container.addEventListener("mousemove", onMove);
  cta.addEventListener("click", () => {
    if (!running || gameEnded) {
      startGame();
    }
  });

  resetGame();
  draw();

  return {
    destroy() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("mousemove", onMove);
      container.removeEventListener("mousemove", onMove);
      container.innerHTML = "";
    }
  };
};
