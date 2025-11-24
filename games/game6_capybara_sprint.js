// Spiel 6: Nikolaus-Capybara-Sprint – Drücke abwechselnd F und H, um schneller zu laufen!

const CAPY_TRACK_LENGTH = 140;
const CAPY_BOT_COUNT = 5;
const CAPY_MAX_SPEED = 10.5;
const CAPY_FRICTION = 3.8;
const CAPY_SPEED_GAIN = 2.6;
const CAPY_SPEED_PENALTY = 1.25;
const CAPY_BASE_PLAYER = 3.1;
const CAPY_BASE_BOT = 2.8;
const CAPY_BOT_VARIANCE = 1.2;
const CAPY_BURST_CHANCE = 0.22;

window.AdventGames = window.AdventGames || {};

window.AdventGames["capybara_sprint"] = function initCapybaraSprint(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  let lastTimestamp = null;
  let raf = null;
  let countdownTimer = null;
  let countdownValue = 3;
  let raceStarted = false;
  let raceFinished = false;
  let expectedKey = "f";
  let lastPressTime = 0;

  const lanes = [];
  let finishThresholdPercent = 98;
  let trackWrap = null;
  let finishLine = null;

  function ensureStyles() {
    if (document.getElementById("capy-sprint-styles")) return;
    const style = document.createElement("style");
    style.id = "capy-sprint-styles";
    style.textContent = `
      .capy-sprint-game {
        position: relative;
        color: #fdfdfd;
        font-family: "Inter", "Nunito", system-ui, -apple-system, sans-serif;
        background: linear-gradient(180deg, #0a1429 0%, #0b1c34 60%, #0a1222 100%);
        border-radius: 18px;
        padding: 14px;
        overflow: hidden;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06), 0 16px 32px rgba(0,0,0,0.35);
      }
      .capy-sprint-game::after {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 15% 20%, rgba(255,255,255,0.07), transparent 40%),
          radial-gradient(circle at 85% 25%, rgba(255, 100, 120, 0.08), transparent 40%),
          radial-gradient(circle at 50% 90%, rgba(120, 210, 255, 0.06), transparent 42%);
        pointer-events: none;
      }
      .capy-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        position: relative;
        z-index: 1;
      }
      .capy-title {
        font-weight: 800;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .capy-hint {
        color: #d6e5ff;
        font-size: 0.95rem;
      }
      .capy-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 0.9rem;
      }
      .capy-pill {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        padding: 6px 10px;
        display: inline-flex;
        gap: 6px;
        align-items: center;
      }
      .capy-key-hint strong { color: #ffe9a3; }
      .capy-track-wrap {
        margin-top: 12px;
        background: linear-gradient(120deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        overflow: hidden;
        position: relative;
        box-shadow: inset 0 0 22px rgba(0,0,0,0.45);
        padding: 14px 18px 22px;
        min-height: 420px;
      }
      .capy-track-backdrop {
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 10px, transparent 10px 26px),
          linear-gradient(180deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 100%);
        opacity: 0.18;
        pointer-events: none;
      }
      .capy-track {
        position: relative;
        display: grid;
        grid-template-rows: repeat(${CAPY_BOT_COUNT + 1}, 1fr);
        gap: 0;
        background: linear-gradient(180deg, #17334f 0%, #0f2338 40%, #0b1b2e 100%);
        padding: 18px 26px 26px;
        min-height: 360px;
      }
      .capy-lane {
        position: relative;
        border-bottom: 1px dashed rgba(255,255,255,0.12);
        min-height: 78px;
        display: flex;
        align-items: center;
        padding-left: 10px;
      }
      .capy-lane:last-child { border-bottom: none; }
      .capy-lane::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0));
        opacity: 0.5;
        pointer-events: none;
      }
      .capy-lane:nth-child(even)::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, rgba(255,0,76,0.05) 0 14px, transparent 14px 26px);
        mix-blend-mode: screen;
        opacity: 0.35;
      }
      .capy-runner {
        position: absolute;
        left: 0;
        bottom: 6px;
        width: 82px;
        height: 54px;
        transform: translateX(0%);
        transition: transform 90ms ease-out;
        z-index: 2;
      }
      .capy-sprite {
        position: relative;
        width: 100%;
        height: 100%;
        background: url("assets/img/capybara_skin.gif") center/cover no-repeat;
        filter: drop-shadow(0 8px 12px rgba(0,0,0,0.35));
        border-radius: 10px;
      }
      .capy-runner.player .capy-sprite {
        box-shadow: 0 0 0 3px rgba(255, 222, 121, 0.6), 0 10px 18px rgba(0, 0, 0, 0.35);
      }
      .capy-runner.player .capy-sprite::after {
        content: "";
        position: absolute;
        width: 48px;
        height: 36px;
        background: url("assets/img/capy_hat.png") center/contain no-repeat;
        top: -18px;
        left: 18px;
        transform: rotate(-6deg);
      }
      .capy-runner.bot .capy-sprite {
        filter: drop-shadow(0 8px 12px rgba(0,0,0,0.4)) saturate(0.95);
        opacity: 0.95;
      }
      .capy-badge {
        position: absolute;
        top: -6px;
        left: 2px;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff;
        border-radius: 8px;
        padding: 3px 6px;
        font-weight: 800;
        font-size: 0.6rem;
        letter-spacing: 0.25px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        opacity: 0.8;
        backdrop-filter: blur(2px);
        pointer-events: none;
      }
      .capy-badge::before {
        content: "";
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: currentColor;
        box-shadow: 0 0 10px currentColor;
      }
      .capy-runner.player .capy-badge {
        background: linear-gradient(120deg, #ffe27a, #ff9f43);
        color: #361300;
        border-color: rgba(255,255,255,0.7);
      }
      .capy-runner.bot:nth-child(odd) .capy-badge { color: #7dd3fc; }
      .capy-runner.bot:nth-child(even) .capy-badge { color: #b19bff; }
      .capy-start-line, .capy-finish-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 12px;
        background: repeating-linear-gradient(180deg, #fff 0 10px, #c20000 10px 20px);
        opacity: 0.9;
        box-shadow: 0 0 12px rgba(255,255,255,0.5);
        z-index: 0;
        pointer-events: none;
        mix-blend-mode: screen;
      }
      .capy-start-line { left: 10px; }
      .capy-finish-line { right: 16px; }
      .capy-snow {
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle at 10% 20%, rgba(255,255,255,0.5) 0 1px, transparent 1px),
          radial-gradient(circle at 40% 10%, rgba(255,255,255,0.65) 0 1px, transparent 1px),
          radial-gradient(circle at 70% 30%, rgba(255,255,255,0.5) 0 1.2px, transparent 1.2px),
          radial-gradient(circle at 20% 70%, rgba(255,255,255,0.4) 0 1.2px, transparent 1.2px),
          radial-gradient(circle at 80% 80%, rgba(255,255,255,0.55) 0 1.2px, transparent 1.2px);
        background-size: 240px 240px;
        opacity: 0.5;
        animation: capy-snow 14s linear infinite;
        pointer-events: none;
      }
      @keyframes capy-snow {
        0% { background-position: 0 0, 120px 40px, 60px 120px, 90px 180px, 160px 0; }
        100% { background-position: 0 240px, 120px 280px, 60px 360px, 90px 420px, 160px 240px; }
      }
      .capy-overlay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, rgba(7,12,26,0.9), rgba(6,10,20,0.92));
        color: #fefefe;
        text-align: center;
        z-index: 4;
      }
      .capy-overlay.hidden { display: none; }
      .capy-overlay .box {
        background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.15));
        border: 1px solid rgba(255,255,255,0.18);
        box-shadow: 0 12px 28px rgba(0,0,0,0.35);
        border-radius: 16px;
        padding: 18px 22px;
        max-width: 540px;
      }
      .capy-overlay .box h3 { margin: 0 0 10px; font-size: 1.3rem; letter-spacing: 0.3px; }
      .capy-overlay .box p { margin: 0 0 8px; color: #d8e8ff; line-height: 1.5; }
      .capy-overlay .box kbd {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        padding: 4px 8px;
        font-weight: 700;
      }
      .capy-countdown {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: 3.2rem;
        font-weight: 800;
        text-shadow: 0 0 14px rgba(255,255,255,0.6);
        background: linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.5));
        z-index: 3;
      }
      .capy-countdown.hidden { display: none; }
      .capy-result {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, rgba(6,10,22,0.9), rgba(6,10,22,0.94));
        z-index: 5;
      }
      .capy-result.hidden { display: none; }
      .capy-result .box {
        background: linear-gradient(130deg, rgba(255,255,255,0.08), rgba(255,255,255,0.14));
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 16px;
        padding: 18px 24px;
        max-width: 540px;
        text-align: center;
        box-shadow: 0 12px 28px rgba(0,0,0,0.4);
      }
      .capy-button {
        margin-top: 12px;
        padding: 12px 18px;
        border-radius: 12px;
        border: none;
        font-weight: 800;
        background: linear-gradient(120deg, #6cf0c7, #35b4ff);
        color: #041220;
        cursor: pointer;
        box-shadow: 0 8px 18px rgba(53,180,255,0.35);
      }
      .capy-rankings {
        margin-top: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .capy-rankings .pill {
        background: rgba(255,255,255,0.08);
        border-radius: 999px;
        padding: 6px 10px;
        border: 1px solid rgba(255,255,255,0.12);
      }
    `;
    document.head.appendChild(style);
  }

  function createLane(name, isPlayer, colorLabel) {
    const lane = document.createElement("div");
    lane.className = "capy-lane";

    const runner = document.createElement("div");
    runner.className = `capy-runner${isPlayer ? " player" : " bot"}`;
    runner.dataset.name = name;

    const sprite = document.createElement("div");
    sprite.className = "capy-sprite";
    runner.appendChild(sprite);

    const badge = document.createElement("div");
    badge.className = "capy-badge";
    badge.textContent = isPlayer ? "DU" : colorLabel;
    runner.appendChild(badge);

    lane.appendChild(runner);

    return { lane, runner };
  }

  function buildLanes(track) {
    lanes.length = 0;
    const playerLane = createLane("Du", true, "DU");
    track.appendChild(playerLane.lane);
    lanes.push({
      name: "Du",
      isPlayer: true,
      progress: 0,
      speed: 0,
      finished: false,
      finishTime: null,
      runnerEl: playerLane.runner
    });

    for (let i = 0; i < CAPY_BOT_COUNT; i += 1) {
      const botLabel = `BOT-${i + 1}`;
      const botLane = createLane(botLabel, false, botLabel);
      track.appendChild(botLane.lane);
      lanes.push({
        name: `Capybot ${i + 1}`,
        isPlayer: false,
        progress: 0,
        speed: CAPY_BASE_BOT + Math.random() * CAPY_BOT_VARIANCE,
        finished: false,
        finishTime: null,
        runnerEl: botLane.runner,
        burstCooldown: 0,
        skill: 0.7 + Math.random() * 0.6,
        aggression: 0.15 + Math.random() * 0.25
      });
    }
  }

  function updateKeyHint() {
    keyHint.innerHTML = `Nächste Taste: <strong>${expectedKey.toUpperCase()}</strong>`;
  }

  function recalcFinishLine() {
    if (!trackWrap || !finishLine || !lanes.length) return;
    const trackRect = trackWrap.getBoundingClientRect();
    const finishRect = finishLine.getBoundingClientRect();
    const runnerWidth = lanes[0]?.runnerEl.offsetWidth || 80;
    const usableWidth = Math.max(1, trackRect.width - runnerWidth);
    const distanceToFinish = finishRect.left - trackRect.left - runnerWidth * 0.35;
    const clampedDistance = Math.max(usableWidth * 0.75, Math.min(usableWidth * 0.96, distanceToFinish));
    finishThresholdPercent = (clampedDistance / usableWidth) * 100;
  }

  function resetRace() {
    raceFinished = false;
    raceStarted = false;
    lastTimestamp = null;
    countdownValue = 3;
    expectedKey = "f";
    lastPressTime = 0;
    updateKeyHint();

    lanes.forEach((lane) => {
      lane.progress = 0;
      lane.speed = lane.isPlayer ? 0 : CAPY_BASE_BOT + Math.random() * CAPY_BOT_VARIANCE;
      lane.finished = false;
      lane.finishTime = null;
      lane.burstCooldown = 0;
      lane.runnerEl.style.transform = "translateX(0%)";
    });

    startOverlay.classList.remove("hidden");
    countdownEl.classList.add("hidden");
    resultOverlay.classList.add("hidden");

    recalcFinishLine();
  }

  function finishRace(winner) {
    raceFinished = true;
    raceStarted = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;

    const ranking = lanes
      .slice()
      .sort((a, b) => {
        if (a.finishTime === null) return 1;
        if (b.finishTime === null) return -1;
        return a.finishTime - b.finishTime;
      });

    rankings.innerHTML = "";
    ranking.forEach((lane, idx) => {
      const pill = document.createElement("div");
      pill.className = "pill";
      pill.textContent = `${idx + 1}. ${lane.name}`;
      rankings.appendChild(pill);
    });

    resultTitle.textContent = winner.isPlayer ? "Du hast gewonnen!" : `${winner.name} war knapp schneller...`;
    resultText.textContent = winner.isPlayer
      ? "Juhu! Öffne jetzt das sechste echte Adventstürchen und gönn dir die Belohnung."
      : "Probier es direkt nochmal, mit schnellerem F/H-Wechsel holst du den Sieg.";

    restartBtn.textContent = winner.isPlayer ? "Trotzdem nochmal sprinten" : "Revanche starten";

    resultOverlay.classList.remove("hidden");

    if (winner.isPlayer) {
      try {
        onWin({ level: "brown", label: "Brauner Stern" });
      } catch (e) {
        console.error("onWin callback error", e);
      }
    }
  }

  function startRace() {
    raceStarted = true;
    startOverlay.classList.add("hidden");
    countdownEl.classList.add("hidden");
    lastTimestamp = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function beginCountdown() {
    if (raceStarted || countdownTimer) return;
    startOverlay.classList.add("hidden");
    countdownEl.classList.remove("hidden");
    countdownValue = 3;
    countdownText.textContent = countdownValue;

    countdownTimer = window.setInterval(() => {
      countdownValue -= 1;
      if (countdownValue > 0) {
        countdownText.textContent = countdownValue;
      } else if (countdownValue === 0) {
        countdownText.textContent = "GO!";
      } else {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
        startRace();
      }
    }, 800);
  }

  function handleKeydown(e) {
    const key = e.key.toLowerCase();

    if (key === " ") {
      e.preventDefault();
      if (!raceStarted && !raceFinished) beginCountdown();
      return;
    }

    if (!raceStarted || raceFinished) return;

    if (key === "f" || key === "h") {
      if (key === expectedKey) {
        const now = performance.now();
        const pressBoost = Math.max(0.6, 1.4 - Math.min(1.2, (now - lastPressTime) / 900));
        const lane = lanes.find((l) => l.isPlayer);
        lane.speed = Math.min(CAPY_MAX_SPEED, lane.speed + CAPY_SPEED_GAIN * pressBoost);
        expectedKey = expectedKey === "f" ? "h" : "f";
        lastPressTime = now;
      } else {
        const lane = lanes.find((l) => l.isPlayer);
        lane.speed = Math.max(0, lane.speed - CAPY_SPEED_PENALTY);
      }
      updateKeyHint();
    }
  }

  function tick(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    let winner = null;
    const playerLane = lanes.find((l) => l.isPlayer);

    lanes.forEach((lane) => {
      if (lane.finished) return;

      if (lane.isPlayer) {
        const fatigue = Math.max(0, (performance.now() - lastPressTime - 1400) / 2000);
        lane.speed = Math.max(0, lane.speed - CAPY_FRICTION * delta - fatigue * delta);
        const velocity = CAPY_BASE_PLAYER + lane.speed;
        lane.progress += velocity * delta;
      } else {
        lane.burstCooldown = Math.max(0, lane.burstCooldown - delta);
        const catchup = Math.max(0, (playerLane?.progress || 0) - lane.progress);
        const aggressionBoost = catchup > CAPY_TRACK_LENGTH * 0.08 ? Math.min(3.2, catchup * 0.06) : 0;
        const finishKick = (playerLane?.progress || 0) > CAPY_TRACK_LENGTH * 0.6 ? 1.2 : 0;

        if (lane.burstCooldown <= 0 && Math.random() < CAPY_BURST_CHANCE) {
          lane.speed += 1.6 + lane.skill * 0.25;
          lane.burstCooldown = 1.2 + Math.random();
        }

        lane.speed = Math.max(
          CAPY_BASE_BOT + lane.skill * 0.5,
          lane.speed - 1.2 * delta + aggressionBoost * delta + finishKick * delta
        );
        const botPace = lane.speed * (1 + lane.aggression * 0.35);
        lane.progress += botPace * delta;
      }

      const progressPercent = Math.min(
        finishThresholdPercent,
        (lane.progress / CAPY_TRACK_LENGTH) * finishThresholdPercent
      );
      lane.runnerEl.style.transform = `translateX(${progressPercent}%)`;

      if (progressPercent >= finishThresholdPercent) {
        lane.finished = true;
        lane.finishTime = timestamp;
        if (!winner) winner = lane;
      }
    });

    if (winner && !raceFinished) {
      finishRace(winner);
      return;
    }

    if (!raceFinished) {
      raf = requestAnimationFrame(tick);
    }
  }

  ensureStyles();

  container.innerHTML = "";
  container.classList.add("capy-sprint-container");

  const root = document.createElement("div");
  root.className = "capy-sprint-game";

  const header = document.createElement("div");
  header.className = "capy-header";
  header.innerHTML = `
    <div class="capy-title">🎅🏽 Nikolaus-Capybara-Sprint</div>
    <div class="capy-stats">
      <span class="capy-pill capy-key-hint">Nächste Taste: <strong>F</strong></span>
      <span class="capy-pill">Starte mit Leertaste</span>
    </div>
  `;

  const hint = document.createElement("div");
  hint.className = "capy-hint";
  hint.textContent = "Hämmer F und H im Wechsel, halte die Neon-Bots in Schach und gewinne gegen 5 Capybara-Rivalen!";

  trackWrap = document.createElement("div");
  trackWrap.className = "capy-track-wrap";

  const trackBackdrop = document.createElement("div");
  trackBackdrop.className = "capy-track-backdrop";
  trackWrap.appendChild(trackBackdrop);

  const track = document.createElement("div");
  track.className = "capy-track";
  trackWrap.appendChild(track);

  const startLine = document.createElement("div");
  startLine.className = "capy-start-line";
  trackWrap.appendChild(startLine);

  finishLine = document.createElement("div");
  finishLine.className = "capy-finish-line";
  trackWrap.appendChild(finishLine);

  const snow = document.createElement("div");
  snow.className = "capy-snow";
  trackWrap.appendChild(snow);

  root.appendChild(header);
  root.appendChild(hint);
  root.appendChild(trackWrap);
  container.appendChild(root);

  const keyHint = header.querySelector(".capy-key-hint");

  const startOverlay = document.createElement("div");
  startOverlay.className = "capy-overlay";
  startOverlay.innerHTML = `
    <div class="box">
      <h3>Bereit für den Nikolaus-Sprint?</h3>
      <p>Drücke <kbd>Leertaste</kbd>, dann zählt der Countdown 3, 2, 1 ... GO!</p>
      <p>Um zu beschleunigen, hämmere <kbd>F</kbd> und <kbd>H</kbd> im Wechsel.</p>
      <p>Du bist der Capy mit goldener Mütze. Die Bots tragen Neon-Badges – überhol sie!</p>
    </div>
  `;
  root.appendChild(startOverlay);

  const countdownEl = document.createElement("div");
  countdownEl.className = "capy-countdown hidden";
  const countdownText = document.createElement("div");
  countdownEl.appendChild(countdownText);
  root.appendChild(countdownEl);

  const resultOverlay = document.createElement("div");
  resultOverlay.className = "capy-result hidden";
  resultOverlay.innerHTML = `
    <div class="box">
      <h3 class="result-title"></h3>
      <p class="result-text"></p>
      <div class="capy-rankings"></div>
      <button class="capy-button">Nochmal sprinten</button>
    </div>
  `;
  root.appendChild(resultOverlay);

  const resultTitle = resultOverlay.querySelector(".result-title");
  const resultText = resultOverlay.querySelector(".result-text");
  const rankings = resultOverlay.querySelector(".capy-rankings");
  const restartBtn = resultOverlay.querySelector(".capy-button");

  buildLanes(track);
  updateKeyHint();

  restartBtn.addEventListener("click", resetRace);
  startOverlay.addEventListener("click", () => beginCountdown());

  const keyHandler = (e) => handleKeydown(e);
  window.addEventListener("keydown", keyHandler);
  const resizeHandler = () => recalcFinishLine();
  window.addEventListener("resize", resizeHandler);

  resetRace();

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      if (countdownTimer) window.clearInterval(countdownTimer);
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("resize", resizeHandler);
    }
  };
};
