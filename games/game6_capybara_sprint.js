// Spiel 6: Nikolaus-Kappy Sprint – Wechsel zwischen F und H für Speed!
// Spieler rennt gegen fünf Bots auf einem verschneiten Festtags-Track.

window.AdventGames = window.AdventGames || {};

window.AdventGames["capybara_sprint"] = function initCapybaraSprint(container, options = {}) {
  const onWin = typeof options.onWin === "function" ? options.onWin : () => {};

  const TRACK_LENGTH = 1800; // virtuelle Distanz in px
  const BOT_COUNT = 5;
  const PLAYER_MAX_SPEED = 380; // px pro Sekunde
  const FRICTION = 0.94;
  const KEY_BURST = 120; // Geschwindigkeits-Boost bei korrekt alternierenden Tasten
  const DECAY = 32; // konstanter Abbau pro Sekunde
  const COUNTDOWN_STEPS = [3, 2, 1, "Go!"];

  let state = "intro"; // intro | countdown | racing | finished
  let lastTime = null;
  let countdownIndex = 0;
  let countdownTimer = null;
  let animationFrame = null;
  let keyListenerAttached = false;

  const racers = [];
  let playerVelocity = 0;
  let lastKey = null;
  let lastStrokeAt = 0;

  const hornSound = new Audio("assets/audio/water_fill_sound.wav");
  hornSound.volume = 0.4;
  const cheerSound = new Audio("assets/audio/victory_sound.wav");
  cheerSound.volume = 0.45;

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "capy-sprint";

  const hud = document.createElement("div");
  hud.className = "capy-hud";
  hud.innerHTML = `
    <div class="capy-countdown">Drücke <span>Space</span>, um den Nikolaus-Sprint zu starten</div>
    <div class="capy-position"></div>
    <div class="capy-tip">Abwechselnd <strong>F</strong> und <strong>H</strong> hämmern für Turbo! 🎅</div>
  `;

  const track = document.createElement("div");
  track.className = "capy-track";

  const laneDecor = document.createElement("div");
  laneDecor.className = "capy-track-decor";
  laneDecor.innerHTML = `
    <div class="capy-garlands"></div>
    <div class="capy-snow"></div>
    <div class="capy-trees"></div>
  `;

  const lanes = document.createElement("div");
  lanes.className = "capy-lanes";

  const overlay = document.createElement("div");
  overlay.className = "capy-overlay capy-overlay-start";
  overlay.innerHTML = `
    <div class="capy-overlay-box">
      <h2>🚂 Nikolaus-Kappy Sprint</h2>
      <p>Starte mit <strong>Space</strong>, dann immer <strong>F</strong> und <strong>H</strong> im Wechsel drücken.</p>
      <p>Sei schneller als die Bot-Capys und hol dir den Nikolaus-Gruß!</p>
      <div class="capy-overlay-mini">Countdown erscheint, dann geht's los.</div>
    </div>
  `;

  const finishBanner = document.createElement("div");
  finishBanner.className = "capy-finish-banner";
  finishBanner.textContent = "🎄 Finish 🎄";

  const result = document.createElement("div");
  result.className = "capy-result hidden";
  result.innerHTML = `
    <div class="capy-result-box">
      <div class="capy-result-title">Sprint vorbei!</div>
      <div class="capy-result-body"></div>
      <button class="capy-button capy-restart">Nochmal sprinten</button>
    </div>
  `;

  track.appendChild(laneDecor);
  track.appendChild(lanes);
  track.appendChild(finishBanner);
  root.appendChild(hud);
  root.appendChild(track);
  root.appendChild(overlay);
  root.appendChild(result);
  container.appendChild(root);

  ensureStyles();
  buildRacers();
  updatePositions();
  layoutLanes();

  const restartBtn = result.querySelector(".capy-restart");
  restartBtn.addEventListener("click", restartGame);

  function ensureStyles() {
    if (document.getElementById("capy-sprint-styles")) return;
    const style = document.createElement("style");
    style.id = "capy-sprint-styles";
    style.textContent = `
      .capy-sprint { position: relative; background: linear-gradient(180deg, #0c1c34 0%, #0a162a 40%, #07101f 100%); color: #f4fbff; padding: 16px; border-radius: 18px; box-shadow: 0 14px 32px rgba(0,0,0,0.3); overflow: hidden; font-family: "Nunito", "Inter", system-ui, -apple-system, sans-serif; }
      .capy-hud { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; box-shadow: inset 0 0 12px rgba(255,255,255,0.05); }
      .capy-countdown { font-weight: 800; letter-spacing: 0.4px; text-align: left; }
      .capy-countdown span { display: inline-flex; align-items: center; justify-content: center; min-width: 42px; padding: 6px 10px; margin-left: 6px; background: rgba(255,255,255,0.12); border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); }
      .capy-position { text-align: center; font-weight: 700; color: #f8d17c; text-shadow: 0 0 12px rgba(248,209,124,0.6); }
      .capy-tip { text-align: right; color: #cddaf1; font-weight: 700; }
      .capy-track { position: relative; margin-top: 14px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); min-height: 440px; }
      .capy-track-decor { position: absolute; inset: 0; pointer-events: none; }
      .capy-garlands { position: absolute; top: 10px; left: 0; right: 0; height: 26px; background: repeating-linear-gradient(90deg, transparent 0 26px, rgba(255,255,255,0.2) 26px 32px), radial-gradient(circle at 16px 13px, #ff6b6b 0 6px, transparent 7px), radial-gradient(circle at 48px 13px, #ffd166 0 6px, transparent 7px), radial-gradient(circle at 80px 13px, #8ed1fc 0 6px, transparent 7px); opacity: 0.75; }
      .capy-snow { position: absolute; inset: 0; background-image: radial-gradient(circle at 10% 10%, rgba(255,255,255,0.5) 2px, transparent 2px), radial-gradient(circle at 30% 40%, rgba(255,255,255,0.45) 1.7px, transparent 2px), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.5) 2px, transparent 2px), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.55) 2.2px, transparent 2.2px); background-size: 220px 220px; animation: capySnow 14s linear infinite; opacity: 0.5; }
      .capy-trees { position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 4px, transparent 4px 16px), linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0)); filter: blur(1px); opacity: 0.55; }
      @keyframes capySnow { from { background-position: 0 0; } to { background-position: 220px 220px; } }
      .capy-lanes { position: relative; padding: 28px 20px 24px; display: grid; gap: 18px; }
      .capy-lane { position: relative; height: 72px; background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.07)); border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); box-shadow: inset 0 0 16px rgba(0,0,0,0.35); overflow: hidden; }
      .capy-lane::after { content: ""; position: absolute; top: 0; bottom: 0; width: 6px; left: 50%; transform: translateX(-50%); background: repeating-linear-gradient(0deg, #ffb7c5 0 12px, #fff 12px 24px, #ffb7c5 24px 36px); opacity: 0.8; box-shadow: 0 0 10px rgba(255,255,255,0.25); }
      .capy-racer { position: absolute; top: 10px; left: 16px; display: flex; align-items: center; gap: 10px; transition: transform 120ms ease-out; }
      .capy-racer .capy-flag { width: 44px; height: 44px; background: linear-gradient(135deg, #ffd166, #ff9f1c); border-radius: 12px; display: grid; place-items: center; box-shadow: 0 6px 14px rgba(0,0,0,0.25); color: #1a1105; font-weight: 800; }
      .capy-racer .capy-name { font-weight: 800; letter-spacing: 0.4px; text-shadow: 0 2px 8px rgba(0,0,0,0.35); }
      .capy-racer .capy-avatar { position: relative; width: 76px; height: 52px; background: url('assets/img/capybara_skin.gif') center/contain no-repeat; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.35)); }
      .capy-racer .capy-santa-hat { position: absolute; width: 54px; height: 34px; background: radial-gradient(circle at 16px 18px, #fff 0 6px, transparent 7px), linear-gradient(120deg, #ff425e, #b7102d); border-radius: 16px 16px 10px 10px; transform: rotate(-14deg) translate(-6px, -16px); box-shadow: 0 2px 6px rgba(0,0,0,0.25); }
      .capy-racer .capy-santa-hat::after { content: ""; position: absolute; width: 12px; height: 12px; background: #fff; border-radius: 50%; top: -6px; right: -6px; box-shadow: 0 0 6px rgba(255,255,255,0.9); }
      .capy-finish-banner { position: absolute; top: 8px; right: 20px; padding: 8px 12px; background: linear-gradient(120deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06)); border: 1px dashed rgba(255,255,255,0.5); border-radius: 10px; font-weight: 800; letter-spacing: 0.6px; color: #f8f2ff; text-shadow: 0 0 12px rgba(255,255,255,0.4); }
      .capy-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,8,16,0.75), rgba(6,14,28,0.86)); display: grid; place-items: center; text-align: center; padding: 20px; backdrop-filter: blur(4px); }
      .capy-overlay-box { background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.16)); padding: 20px 22px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.18); color: #f5f8ff; box-shadow: 0 16px 28px rgba(0,0,0,0.38); max-width: 520px; }
      .capy-overlay-mini { margin-top: 10px; color: #d6e6ff; font-weight: 700; }
      .capy-overlay-count { font-size: 3.4rem; font-weight: 900; text-shadow: 0 0 18px rgba(255,255,255,0.75); animation: capyPop 500ms ease; }
      @keyframes capyPop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      .capy-result { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.78)); display: grid; place-items: center; }
      .capy-result.hidden { display: none; }
      .capy-result-box { background: linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.24)); padding: 22px 24px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.22); color: #f8fbff; text-align: center; box-shadow: 0 16px 38px rgba(0,0,0,0.5); max-width: 440px; }
      .capy-result-title { font-size: 1.5rem; font-weight: 900; margin-bottom: 10px; }
      .capy-result-body { margin-bottom: 16px; line-height: 1.5; }
      .capy-button { background: linear-gradient(120deg, #ffd166, #ff8c42); border: none; color: #1a0f05; padding: 12px 20px; border-radius: 12px; font-weight: 900; letter-spacing: 0.4px; box-shadow: 0 8px 16px rgba(255,140,66,0.35); cursor: pointer; }
      .capy-button:active { transform: translateY(1px); }
    `;
    document.head.appendChild(style);
  }

  function buildRacers() {
    lanes.innerHTML = "";
    racers.length = 0;

    const names = ["Celi (Du)", "Bot Pipi", "Bot Bubu", "Bot Kuschelhäufchen", "Bot Floof", "Bot Winter"];

    for (let i = 0; i < BOT_COUNT + 1; i += 1) {
      const lane = document.createElement("div");
      lane.className = "capy-lane";

      const racer = document.createElement("div");
      racer.className = "capy-racer";

      const avatar = document.createElement("div");
      avatar.className = "capy-avatar";
      if (i === 0) {
        const hat = document.createElement("div");
        hat.className = "capy-santa-hat";
        avatar.appendChild(hat);
      }

      const flag = document.createElement("div");
      flag.className = "capy-flag";
      flag.textContent = i === 0 ? "🎅" : "🎁";

      const name = document.createElement("div");
      name.className = "capy-name";
      name.textContent = names[i] || `Bot ${i}`;

      racer.appendChild(avatar);
      racer.appendChild(flag);
      racer.appendChild(name);
      lane.appendChild(racer);
      lanes.appendChild(lane);

      racers.push({
        isPlayer: i === 0,
        el: racer,
        lane,
        progress: 0,
        velocity: 0,
        baseSpeed: i === 0 ? 0 : 130 + Math.random() * 60,
        jitter: Math.random() * 16 + 8,
        name: names[i] || `Bot ${i}`
      });
    }
  }

  function layoutLanes() {
    lanes.style.gridTemplateRows = `repeat(${BOT_COUNT + 1}, 1fr)`;
  }

  function startCountdown() {
    state = "countdown";
    countdownIndex = 0;
    overlay.classList.add("capy-overlay-countdown");
    showCountdownStep();
  }

  function showCountdownStep() {
    const value = COUNTDOWN_STEPS[countdownIndex];
    const countEl = document.createElement("div");
    countEl.className = "capy-overlay-count";
    countEl.textContent = value;
    overlay.innerHTML = "";
    overlay.appendChild(countEl);

    if (typeof value === "number") {
      hornSound.currentTime = 0;
      hornSound.play().catch(() => {});
    }

    countdownTimer = window.setTimeout(() => {
      countdownIndex += 1;
      if (countdownIndex >= COUNTDOWN_STEPS.length) {
        beginRace();
      } else {
        showCountdownStep();
      }
    }, value === "Go!" ? 400 : 900);
  }

  function beginRace() {
    state = "racing";
    overlay.classList.add("hidden");
    lastTime = performance.now();
    attachKeyListeners();
    loop();
  }

  function attachKeyListeners() {
    if (keyListenerAttached) return;
    keyListenerAttached = true;
    window.addEventListener("keydown", onKeyDown);
  }

  function detachKeyListeners() {
    if (!keyListenerAttached) return;
    keyListenerAttached = false;
    window.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(ev) {
    if (state === "intro" && ev.code === "Space") {
      ev.preventDefault();
      overlay.classList.remove("capy-overlay-start");
      startCountdown();
      return;
    }

    if (state !== "racing") return;

    if (ev.key.toLowerCase() === "f" || ev.key.toLowerCase() === "h") {
      ev.preventDefault();
      const now = performance.now();
      if (lastKey && lastKey === ev.key.toLowerCase()) {
        playerVelocity *= 0.9;
      } else {
        const delta = now - lastStrokeAt;
        const withinRhythm = delta < 520;
        playerVelocity += withinRhythm ? KEY_BURST : KEY_BURST * 0.65;
        if (playerVelocity > PLAYER_MAX_SPEED) playerVelocity = PLAYER_MAX_SPEED;
        lastKey = ev.key.toLowerCase();
        lastStrokeAt = now;
      }
    }
  }

  function loop(timestamp) {
    if (state !== "racing") return;

    const dt = Math.min(40, timestamp - lastTime);
    lastTime = timestamp;
    const seconds = dt / 1000;

    playerVelocity = Math.max(0, playerVelocity * FRICTION - DECAY * seconds);

    racers.forEach((racer) => {
      if (racer.isPlayer) {
        racer.velocity = playerVelocity;
      } else {
        const sway = (Math.sin(timestamp / (1200 + racer.jitter * 10)) + 1) * 0.5;
        const randomizer = 1 + (Math.random() - 0.5) * 0.08;
        racer.velocity = (racer.baseSpeed + sway * 30) * randomizer;
      }

      racer.progress += racer.velocity * seconds;
      if (racer.progress > TRACK_LENGTH) racer.progress = TRACK_LENGTH;
      updateRacerVisual(racer);
    });

    updatePositions();
    checkFinish();

    animationFrame = window.requestAnimationFrame(loop);
  }

  function updateRacerVisual(racer) {
    const ratio = racer.progress / TRACK_LENGTH;
    const translate = ratio * (lanes.clientWidth - 180) + 10;
    racer.el.style.transform = `translateX(${translate}px)`;
  }

  function updatePositions() {
    const standings = [...racers].sort((a, b) => b.progress - a.progress);
    const playerRank = standings.findIndex((r) => r.isPlayer) + 1;
    const maxDist = Math.max(...racers.map((r) => r.progress));
    const leadDiff = Math.max(0, maxDist - racers[0].progress);
    const hudCount = hud.querySelector(".capy-countdown");
    const hudPos = hud.querySelector(".capy-position");

    if (hudCount) {
      if (state === "intro") {
        hudCount.innerHTML = `Drücke <span>Space</span>, um den Nikolaus-Sprint zu starten`;
      } else if (state === "countdown") {
        hudCount.textContent = "Bereit machen ...";
      } else {
        hudCount.textContent = `Tempo: ${Math.round(playerVelocity)} px/s`;
      }
    }

    if (hudPos) {
      hudPos.textContent = `Position: ${playerRank}. von ${racers.length}`;
      if (leadDiff > 0) {
        hudPos.title = `Du liegst ${Math.round(leadDiff)}px hinten`;
      } else {
        hudPos.title = "Du führst!";
      }
    }
  }

  function checkFinish() {
    const finished = racers.find((r) => r.progress >= TRACK_LENGTH);
    if (!finished) return;
    state = "finished";
    window.cancelAnimationFrame(animationFrame);
    detachKeyListeners();

    const standings = [...racers].sort((a, b) => b.progress - a.progress);
    const playerRank = standings.findIndex((r) => r.isPlayer) + 1;
    const body = result.querySelector(".capy-result-body");
    const title = result.querySelector(".capy-result-title");

    const placementList = standings
      .map((r, idx) => `${idx + 1}. ${r.name}`)
      .join("<br>");

    if (playerRank === 1) {
      title.textContent = "Du hast den Nikolaus eingesackt!";
      body.innerHTML = `🎉 Sieg! Du warst vor allen anderen im Ziel.<br><br>${placementList}`;
      cheerSound.currentTime = 0;
      cheerSound.play().catch(() => {});
      onWin();
    } else {
      title.textContent = "Knapp verloren";
      body.innerHTML = `Die Bot-Capys waren schneller. Versuch's nochmal!<br><br>${placementList}`;
    }

    result.classList.remove("hidden");
  }

  function resetState() {
    state = "intro";
    playerVelocity = 0;
    lastKey = null;
    lastStrokeAt = 0;
    racers.forEach((r) => {
      r.progress = 0;
      r.velocity = 0;
      updateRacerVisual(r);
    });
    overlay.className = "capy-overlay capy-overlay-start";
    overlay.innerHTML = `
      <div class="capy-overlay-box">
        <h2>🚂 Nikolaus-Kappy Sprint</h2>
        <p>Starte mit <strong>Space</strong>, dann immer <strong>F</strong> und <strong>H</strong> im Wechsel drücken.</p>
        <p>Sei schneller als die Bot-Capys und hol dir den Nikolaus-Gruß!</p>
        <div class="capy-overlay-mini">Countdown erscheint, dann geht's los.</div>
      </div>
    `;
    result.classList.add("hidden");
    updatePositions();
  }

  function restartGame() {
    window.cancelAnimationFrame(animationFrame);
    window.clearTimeout(countdownTimer);
    detachKeyListeners();
    resetState();
  }

  function checkResize() {
    racers.forEach(updateRacerVisual);
  }

  window.addEventListener("resize", checkResize);

  resetState();

  return {
    reset: restartGame,
    destroy: () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(countdownTimer);
      detachKeyListeners();
      window.removeEventListener("resize", checkResize);
    }
  };
};
