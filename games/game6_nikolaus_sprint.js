// Spiel 6: Nikolaus-Sprint – Capybara-Rennen gegen 5 Bots
// Steuerung: Abwechselnd die Tasten "F" und "H" drücken, um Speed aufzubauen.
// Start: Leertaste -> Countdown (3,2,1, Go)

window.AdventGames = window.AdventGames || {};

window.AdventGames["nikolaus_capy_sprint"] = function initNikolausCapySprint(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const TRACK_LENGTH = 1200; // virtuelle Distanz bis zum Ziel
  const BOT_COUNT = 5;
  const BASE_BOT_SPEED = 145; // px/s
  const BOT_VARIANCE = 22;
  const PLAYER_DECAY = 32; // wie schnell Speed verloren geht
  const TAP_BASE_BOOST = 70;
  const TAP_MAX_BOOST = 140;
  const MAX_SPEED = 330;

  let raceState = "idle"; // idle | countdown | running | finished
  let countdownValue = 3;
  let animationFrame = null;
  let lastFrame = null;
  let lastTapKey = null;
  let lastTapAt = 0;
  let playerVelocity = 0;
  let finishingOrder = [];
  let hasTriggeredWin = false;

  const runners = [];

  container.innerHTML = "";
  container.classList.add("capy-sprint-container");

  function ensureStyles() {
    if (document.getElementById("capy-sprint-styles")) return;
    const style = document.createElement("style");
    style.id = "capy-sprint-styles";
    style.textContent = `
      .capy-sprint-container { font-family: "Nunito", "Inter", system-ui, -apple-system, sans-serif; }
      .capy-sprint { position: relative; background: radial-gradient(circle at 15% 20%, rgba(255,255,255,0.12), transparent 30%),
        radial-gradient(circle at 85% 10%, rgba(255, 104, 104, 0.18), transparent 32%),
        linear-gradient(180deg, #0c1823 0%, #0a1420 48%, #07101a 100%);
        border-radius: 16px; padding: 14px; box-shadow: 0 18px 40px rgba(0,0,0,0.35); color: #f6fbff; overflow: hidden; }
      .capy-sprint::before { content: ""; position: absolute; inset: -40px; background:
        radial-gradient(circle at 18% 70%, rgba(255,255,255,0.08), transparent 38%),
        radial-gradient(circle at 82% 60%, rgba(255,255,255,0.07), transparent 32%),
        linear-gradient(135deg, rgba(255,255,255,0.05) 10%, transparent 28%, rgba(255,255,255,0.05) 46%, transparent 60%);
        filter: blur(12px); opacity: 0.55; pointer-events: none; }
      .capy-sprint h3 { margin: 0; font-size: 1.2rem; letter-spacing: 0.4px; text-shadow: 0 4px 14px rgba(0,0,0,0.35); }
      .capy-sprint .subtitle { margin: 4px 0 10px; color: #dfe8fb; font-size: 0.95rem; }
      .capy-info { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 8px; }
      .capy-chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16); padding: 6px 10px; border-radius: 12px; font-size: 0.9rem; display: inline-flex; gap: 6px; align-items: center; }
      .capy-chip strong { color: #ffe8c6; }
      .capy-track { position: relative; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background:
        repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0 18px, rgba(255,255,255,0.06) 18px 36px),
        linear-gradient(180deg, #123247 0%, #10273c 50%, #0c1f31 100%); padding: 16px 12px 18px; box-shadow: inset 0 0 28px rgba(0,0,0,0.35); min-height: 340px; }
      .capy-track::before { content: ""; position: absolute; left: 0; right: 0; top: 24%; height: 2px; background: repeating-linear-gradient(90deg, transparent 0 18px, rgba(255,255,255,0.18) 18px 30px); opacity: 0.5; pointer-events: none; }
      .capy-track::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 50% 10%, rgba(255,255,255,0.07), transparent 30%); pointer-events: none; }
      .capy-finish-line { position: absolute; top: 12px; bottom: 12px; width: 26px; right: 60px; background:
        repeating-linear-gradient(0deg, rgba(255,255,255,0.9) 0 13px, rgba(26,45,63,0.9) 13px 26px);
        border-radius: 6px; box-shadow: 0 0 0 3px rgba(255,255,255,0.18), 0 0 18px rgba(255,255,255,0.35); z-index: 2; }
      .capy-finish-line::after { content: "🎁"; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 1.2rem; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5)); }
      .capy-lanes { display: flex; flex-direction: column; gap: 12px; position: relative; z-index: 1; }
      .capy-lane { position: relative; background: linear-gradient(180deg, rgba(0,0,0,0.16), rgba(0,0,0,0.26)); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.08); box-shadow: inset 0 0 18px rgba(0,0,0,0.35); overflow: hidden; }
      .capy-lane::before { content: ""; position: absolute; left: 90px; right: 80px; top: 50%; height: 7px; transform: translateY(-50%);
        background: repeating-linear-gradient(90deg, rgba(255,255,255,0.72) 0 22px, rgba(255,0,80,0.72) 22px 44px); filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45)); opacity: 0.9; }
      .capy-lane .lane-label { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; font-size: 0.95rem; background: rgba(255,255,255,0.14); padding: 6px 10px; border-radius: 10px; z-index: 3; box-shadow: inset 0 1px 0 rgba(255,255,255,0.45); }
      .capy-runner { position: absolute; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 56px; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.55)); transition: transform 80ms ease-out; }
      .capy-runner img { width: 70px; height: 52px; object-fit: cover; border-radius: 12px; border: 2px solid rgba(255,255,255,0.65); background: #102030; }
      .capy-runner .capy-hat { position: absolute; width: 42px; height: 26px; top: -8px; left: 18px; transform: rotate(-6deg); }
      .capy-hat::before { content: ""; position: absolute; left: 0; right: 0; bottom: 4px; height: 8px; background: linear-gradient(90deg, #fff, #f1f1f1); border-radius: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .capy-hat::after { content: ""; position: absolute; left: 8px; top: -2px; width: 26px; height: 26px; background: linear-gradient(150deg, #ff4358, #c90233); clip-path: polygon(0 100%, 100% 100%, 40% 0); border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
      .capy-runner.player img { border-color: #ffe08c; box-shadow: 0 0 0 3px rgba(255,224,140,0.35); }
      .capy-runner.bot img { border-color: rgba(255,255,255,0.4); }
      .capy-runner .speed-spark { position: absolute; left: -18px; top: 50%; transform: translate(-50%,-50%); width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle, #ffdf7d 0, #ff7f50 70%, transparent 100%); opacity: 0; transition: opacity 120ms ease; box-shadow: 0 0 12px rgba(255,127,80,0.8); }
      .capy-runner.pumping .speed-spark { opacity: 1; animation: spark-pop 0.32s ease; }
      @keyframes spark-pop { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.8; } 60% { transform: translate(-50%,-50%) scale(1.2); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(0.4); opacity: 0; } }
      .capy-start-overlay { position: absolute; inset: 12px; border-radius: 14px; background: rgba(2,12,20,0.78); border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; text-align: center; padding: 18px; z-index: 4; }
      .capy-start-box { max-width: 520px; line-height: 1.6; font-size: 1rem; color: #e9f5ff; }
      .capy-start-box strong { color: #ffe2a8; }
      .capy-countdown { position: absolute; top: 14px; right: 18px; background: rgba(0,0,0,0.45); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); font-weight: 800; letter-spacing: 0.08em; z-index: 5; box-shadow: 0 8px 16px rgba(0,0,0,0.35); }
      .capy-go { font-size: 1.1rem; color: #8be8c9; }
      .capy-status-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 12px; font-size: 0.95rem; }
      .capy-progress-bar { flex: 1 1 220px; height: 10px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; border: 1px solid rgba(255,255,255,0.12); }
      .capy-progress-inner { height: 100%; width: 0%; background: linear-gradient(90deg, #ffb347, #ff6f61); box-shadow: 0 0 14px rgba(255,111,97,0.6); transition: width 120ms ease-out; }
      .capy-result { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 6; }
      .capy-result.hidden { display: none; }
      .capy-result-card { background: rgba(6,18,28,0.9); border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 18px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); max-width: 520px; text-align: center; }
      .capy-result-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 10px; }
      .capy-result-body { line-height: 1.5; margin-bottom: 14px; color: #e5f1ff; }
      .capy-button { border: none; border-radius: 12px; background: linear-gradient(120deg, #ffb347, #ff6f61); color: #1a0e05; padding: 10px 16px; font-weight: 800; cursor: pointer; box-shadow: 0 10px 18px rgba(255,111,97,0.4); }
      .capy-button:hover { transform: translateY(-1px); }
      .capy-button:active { transform: translateY(1px); }
      .capy-wreath { position: absolute; top: 10px; left: 10px; font-size: 1.3rem; filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35)); z-index: 5; }
      @media (max-width: 720px) {
        .capy-track { min-height: 320px; }
        .capy-runner { width: 64px; height: 50px; }
        .capy-runner img { width: 64px; height: 48px; }
        .capy-lane::before { left: 78px; right: 70px; }
      }
    `;
    document.head.appendChild(style);
  }

  ensureStyles();

  const root = document.createElement("div");
  root.className = "capy-sprint";

  const title = document.createElement("div");
  title.innerHTML = `<h3>🚀 Nikolaus-Sprint – Capybara Edition</h3><div class="subtitle">Sechs kuschelige Capys rennen um die festliche Rennstrecke. Tippel abwechselnd <strong>F</strong> und <strong>H</strong>!`;
  root.appendChild(title);

  const infoRow = document.createElement("div");
  infoRow.className = "capy-info";
  infoRow.innerHTML = `
    <span class="capy-chip">🎅 Nikolaus-Boost</span>
    <span class="capy-chip">🕹️ Steuerung: F + H im Wechsel</span>
    <span class="capy-chip">⏱️ Start mit Leertaste</span>
  `;
  root.appendChild(infoRow);

  const track = document.createElement("div");
  track.className = "capy-track";

  const wreath = document.createElement("div");
  wreath.className = "capy-wreath";
  wreath.textContent = "🎄";
  track.appendChild(wreath);

  const finish = document.createElement("div");
  finish.className = "capy-finish-line";
  track.appendChild(finish);

  const lanesWrapper = document.createElement("div");
  lanesWrapper.className = "capy-lanes";

  function createRunner(index, isPlayer) {
    const lane = document.createElement("div");
    lane.className = "capy-lane";

    const label = document.createElement("div");
    label.className = "lane-label";
    label.textContent = isPlayer ? "Du 🎅" : `Bot ${index}`;
    lane.appendChild(label);

    const runnerEl = document.createElement("div");
    runnerEl.className = `capy-runner ${isPlayer ? "player" : "bot"}`;

    const spark = document.createElement("span");
    spark.className = "speed-spark";

    const sprite = document.createElement("img");
    sprite.src = "assets/img/capybara_skin.gif";
    sprite.alt = isPlayer ? "Spieler-Capybara" : `Bot Capy ${index}`;

    if (isPlayer) {
      const hat = document.createElement("span");
      hat.className = "capy-hat";
      runnerEl.appendChild(hat);
    }

    runnerEl.appendChild(sprite);
    runnerEl.appendChild(spark);
    lane.appendChild(runnerEl);

    lanesWrapper.appendChild(lane);

    const botSpeed = BASE_BOT_SPEED + Math.random() * BOT_VARIANCE;

    runners.push({
      el: runnerEl,
      spark,
      progress: 0,
      velocity: isPlayer ? 0 : botSpeed,
      baseSpeed: isPlayer ? 0 : botSpeed,
      finished: false,
      name: isPlayer ? "Du" : `Bot ${index}`,
    });
  }

  for (let i = 0; i < BOT_COUNT + 1; i += 1) {
    createRunner(i, i === 0); // first lane is player
  }

  track.appendChild(lanesWrapper);

  const countdownBox = document.createElement("div");
  countdownBox.className = "capy-countdown";
  countdownBox.innerHTML = `Countdown: <span class="countdown-number">–</span>`;
  track.appendChild(countdownBox);

  const startOverlay = document.createElement("div");
  startOverlay.className = "capy-start-overlay";
  startOverlay.innerHTML = `
    <div class="capy-start-box">
      <div style="font-size:1.1rem; font-weight:800; margin-bottom:6px;">Frohen Nikolaus! 🎁</div>
      <div>Drücke die <strong>Leertaste</strong>, um das Rennen zu starten. Danach baust du Speed auf, indem du <strong>F</strong> und <strong>H</strong> abwechselnd tippst. Je schneller du tappst, desto schneller sprintet dein Capy mit Weihnachtsmütze!</div>
    </div>`;
  track.appendChild(startOverlay);

  const resultOverlay = document.createElement("div");
  resultOverlay.className = "capy-result hidden";
  resultOverlay.innerHTML = `
    <div class="capy-result-card">
      <div class="capy-result-title"></div>
      <div class="capy-result-body"></div>
      <button class="capy-button">Nochmal rennen</button>
    </div>`;
  track.appendChild(resultOverlay);

  const progressBar = document.createElement("div");
  progressBar.className = "capy-progress-bar";
  progressBar.innerHTML = `<div class="capy-progress-inner"></div>`;

  const statusBar = document.createElement("div");
  statusBar.className = "capy-status-bar";
  statusBar.innerHTML = `
    <span class="capy-chip">Platzierung: <strong class="capy-placement">–</strong></span>
  `;
  statusBar.appendChild(progressBar);

  root.appendChild(track);
  root.appendChild(statusBar);
  container.appendChild(root);

  const countdownNumber = countdownBox.querySelector(".countdown-number");
  const placementEl = statusBar.querySelector(".capy-placement");
  const progressInner = progressBar.querySelector(".capy-progress-inner");
  const resultTitle = resultOverlay.querySelector(".capy-result-title");
  const resultBody = resultOverlay.querySelector(".capy-result-body");
  const restartBtn = resultOverlay.querySelector(".capy-button");

  function resetRace() {
    raceState = "idle";
    countdownValue = 3;
    lastFrame = null;
    finishingOrder = [];
    hasTriggeredWin = false;
    playerVelocity = 0;
    lastTapKey = null;
    lastTapAt = 0;
    resultOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
    runners.forEach((runner, idx) => {
      runner.progress = 0;
      runner.finished = false;
      runner.velocity = idx === 0 ? 0 : runner.baseSpeed;
      updateRunnerPosition(runner);
    });
    placementEl.textContent = "–";
    progressInner.style.width = "0%";
    countdownNumber.textContent = "–";
  }

  function updateRunnerPosition(runner) {
    const laneWidth = lanesWrapper.getBoundingClientRect().width - 140; // reserve label + finish gap
    const offset = Math.min(runner.progress, 1) * laneWidth;
    runner.el.style.left = `${80 + offset}px`;
  }

  function computePlacement() {
    const ordered = runners.slice().sort((a, b) => b.progress - a.progress);
    const placement = ordered.findIndex((r) => r === runners[0]) + 1;
    placementEl.textContent = `${placement}.`;
  }

  function startCountdown() {
    if (raceState === "countdown" || raceState === "running") return;
    countdownValue = 3;
    raceState = "countdown";
    countdownNumber.textContent = countdownValue;
    startOverlay.classList.add("hidden");

    const interval = window.setInterval(() => {
      countdownValue -= 1;
      if (countdownValue > 0) {
        countdownNumber.textContent = countdownValue;
      } else if (countdownValue === 0) {
        countdownNumber.textContent = "GO!";
        countdownNumber.classList.add("capy-go");
      } else {
        window.clearInterval(interval);
        countdownNumber.classList.remove("capy-go");
        startRace();
      }
    }, 900);
  }

  function startRace() {
    raceState = "running";
    lastFrame = null;
    animationFrame = window.requestAnimationFrame(tick);
  }

  function finishRace() {
    raceState = "finished";
    window.cancelAnimationFrame(animationFrame);
    countdownNumber.textContent = "Ziel!";
    showResult();
  }

  function showResult() {
    const playerOrder = finishingOrder.findIndex((name) => name === "Du") + 1;
    const won = playerOrder === 1;
    resultTitle.textContent = won ? "Du bist Nikolaus-Champion!" : "Weiter üben!";
    resultBody.innerHTML = won
      ? "Du hast alle Capys abgehängt und den Nikolaus-Sprint gewonnen."
      : `Platz ${playerOrder} – versuch es gleich noch einmal, schneller zu tippen.`;
    resultOverlay.classList.remove("hidden");

    if (won && !hasTriggeredWin) {
      hasTriggeredWin = true;
      onWin();
    }
  }

  function handleTap(key) {
    if (raceState !== "running") return;
    const now = performance.now();
    if (lastTapKey && lastTapKey === key) {
      playerVelocity = Math.max(playerVelocity - 16, 20);
      return;
    }

    const delta = lastTapAt ? now - lastTapAt : 280;
    lastTapKey = key;
    lastTapAt = now;

    const speedBonus = Math.max(TAP_BASE_BOOST, Math.min(TAP_MAX_BOOST, 260 - delta));
    playerVelocity = Math.min(MAX_SPEED, playerVelocity + speedBonus);

    runners[0].el.classList.add("pumping");
    window.setTimeout(() => runners[0].el.classList.remove("pumping"), 160);
  }

  function tick(timestamp) {
    if (lastFrame == null) {
      lastFrame = timestamp;
      animationFrame = window.requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min(0.05, (timestamp - lastFrame) / 1000);
    lastFrame = timestamp;

    if (raceState !== "running") return;

    // Player physics
    playerVelocity = Math.max(0, playerVelocity - PLAYER_DECAY * dt);
    runners[0].velocity = playerVelocity;

    // Update bots
    runners.forEach((runner, index) => {
      if (runner.finished) return;
      const wiggle = Math.sin(timestamp / 240 + index) * 6;
      const speed = index === 0 ? runner.velocity + 45 : runner.baseSpeed + wiggle;
      runner.progress += (speed * dt) / TRACK_LENGTH;

      if (runner.progress >= 1 && !runner.finished) {
        runner.finished = true;
        runner.progress = 1;
        finishingOrder.push(runner.name);
        if (finishingOrder.length === 1 && runner.name !== "Du") {
          // bots finished first; still continue until player done
        }
        if (runner.name === "Du" || finishingOrder.length === runners.length) {
          finishRace();
        }
      }
      updateRunnerPosition(runner);
    });

    progressInner.style.width = `${Math.min(runners[0].progress * 100, 100).toFixed(1)}%`;
    computePlacement();

    if (raceState === "running") {
      animationFrame = window.requestAnimationFrame(tick);
    }
  }

  function keyHandler(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === " " && (raceState === "idle" || raceState === "finished")) {
      event.preventDefault();
      resetRace();
      startCountdown();
    } else if ((key === "f" || key === "h") && raceState === "running") {
      event.preventDefault();
      handleTap(key);
    }
  }

  window.addEventListener("keydown", keyHandler);
  restartBtn.addEventListener("click", () => {
    resetRace();
    startCountdown();
  });

  resetRace();
  return {
    destroy() {
      window.removeEventListener("keydown", keyHandler);
      window.cancelAnimationFrame(animationFrame);
    },
  };
};
