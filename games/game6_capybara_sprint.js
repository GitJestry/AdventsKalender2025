// Spiel 6: Nikolaus-Capybara-Sprint – Drücke abwechselnd F und H, um schneller zu laufen!

// --- Basis-Konstanten ---

const CAPY_BOT_COUNT = 5;

// Fortschritt 0–1 über die Strecke (wir mappen später auf Pixel)
const CAPY_TRACK_LENGTH = 1;

// Spieler-Physik (0–1 pro Sekunde)
const CAPY_PLAYER_BASE_SPEED = 0.012;     // Grundtempo
const CAPY_PLAYER_MAX_SPEED = 0.14;       // Top-Speed
const CAPY_PLAYER_SPEED_GAIN = 0.1;       // Bonus pro korrektem F/H-Treffer
const CAPY_PLAYER_SPEED_PENALTY = 0.01;   // Abzug bei falscher Taste
const CAPY_PLAYER_FRICTION = 1.0;         // Geschwindigkeit fällt pro Sekunde ab

// Bot-Finishzeiten in Sekunden – Basis für konstante Geschwindigkeit
const CAPY_BOT_FINISH_TIMES = [15.0, 15.7, 16.5, 17.3, 16.3];

// Sternstufen nach Zeitdifferenz zur Bestzeit des schnellsten Bots
// diff = bestBotTime - playerTime
const CAPY_STAR_DELTA_THRESHOLDS = {
  brown: 0.001, // knapp schneller als der schnellste Bot
  silver: 0.6,
  gold: 1.2,
  red: 2.0
};

window.AdventGames = window.AdventGames || {};

window.AdventGames["capybara_sprint"] = function initCapybaraSprint(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const STAR_STORAGE_KEY = "capybara_sprint_best_star";
  const STAR_ORDER = ["brown", "silver", "gold", "red"];

  function starRank(level) {
    const idx = STAR_ORDER.indexOf(level);
    return idx === -1 ? 0 : idx + 1;
  }

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

  function loadBestStar() {
    try {
      return window.localStorage.getItem(STAR_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }

  function saveBestStar(level) {
    if (!level) return;
    try {
      const prev = loadBestStar();
      if (!prev || starRank(level) > starRank(prev)) {
        window.localStorage.setItem(STAR_STORAGE_KEY, level);
      }
    } catch {
      // ignore
    }
  }

  // diff > 0 = Spieler schneller als bester Bot
  function determineStarFromTimes(playerTime, bestBotTime) {
    const diff = bestBotTime - playerTime; // positiv = Spieler schneller oder gleich schnell

    // Wenn du langsamer bist als der beste Bot → kein Stern
    if (diff < 0) return null;

    // Ab hier: du bist mindestens gleich schnell → mindestens braun
    if (diff >= CAPY_STAR_DELTA_THRESHOLDS.red) return "red";
    if (diff >= CAPY_STAR_DELTA_THRESHOLDS.gold) return "gold";
    if (diff >= CAPY_STAR_DELTA_THRESHOLDS.silver) return "silver";

    // gewonnen, aber weniger als 0.6s Vorsprung → brauner Stern
    return "brown";
  }

  // --- State ---

  let lanes = [];
  let raceStarted = false;
  let raceFinished = false;
  let countdownTimer = null;
  let countdownValue = 3;
  let expectedKey = "f";
  let lastPressTime = 0;
  let raf = null;
  let raceStartTime = null;
  let lastFrameTime = null;

  // Mapping von Fortschritt (0–1) → Pixel
  let geom = {
    startOffsetPx: 0,
    usableDistancePx: 200
  };

  let bestStarLevel = loadBestStar();

  // wird später nach DOM-Bau gesetzt
  let bestStarPill = null;

  function renderBestStar() {
    if (!bestStarPill) return;
    if (!bestStarLevel) {
      bestStarPill.textContent = "";
      bestStarPill.classList.add("hidden");
    } else {
      bestStarPill.textContent = `⭐ ${starLabel(bestStarLevel)}`;
      bestStarPill.classList.remove("hidden");
    }
  }

  // --- DOM-Struktur aufbauen ---

  container.innerHTML = "";
  container.classList.add("capy-sprint-container");

  const root = document.createElement("div");
  root.className = "capy-sprint-game";

  const header = document.createElement("div");
  header.className = "capy-header";
  header.innerHTML = `
    <div class="capy-title">
      🎅🏽 Nikolaus-Capybara-Sprint
      <span class="capy-pill capy-best-star-pill"></span>
    </div>
    <div class="capy-stats">
      <span class="capy-pill capy-key-hint">Nächste Taste: <strong>F</strong></span>
      <span class="capy-pill">Start mit Leertaste</span>
      <button type="button" class="capy-button capy-restart-header">🔁 Neue Runde</button>
    </div>
  `;

  const hint = document.createElement("div");
  hint.className = "capy-hint";
  hint.textContent =
    "Drücke F und H im Wechsel – je sauberer du wechselst, desto schneller rennt dein Nikolaus-Capy.";

  const trackWrap = document.createElement("div");
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

  const finishLine = document.createElement("div");
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
  bestStarPill = header.querySelector(".capy-best-star-pill");
  const restartHeaderBtn = header.querySelector(".capy-restart-header");

  // Start-Overlay
  const startOverlay = document.createElement("div");
  startOverlay.className = "capy-overlay";
  startOverlay.innerHTML = `
    <div class="box">
      <h3>Nikolaus bereit?</h3>
      <p><kbd>Leertaste</kbd> für den Start-Countdown.</p>
      <p>Danach im Rhythmus <kbd>F</kbd> – <kbd>H</kbd> – <kbd>F</kbd> – <kbd>H</kbd> drücken, um Tempo aufzubauen.</p>
      <p>Du bist das Capy mit Mütze – schlag die Neon-Bots an der Ziellinie.</p>
    </div>
  `;
  root.appendChild(startOverlay);

  // Countdown
  const countdownEl = document.createElement("div");
  countdownEl.className = "capy-countdown hidden";
  const countdownText = document.createElement("div");
  countdownEl.appendChild(countdownText);
  root.appendChild(countdownEl);

  // Ergebnis-Overlay
  const resultOverlay = document.createElement("div");
  resultOverlay.className = "capy-result hidden";
  resultOverlay.innerHTML = `
    <div class="box">
      <h3 class="result-title"></h3>
      <p class="result-text"></p>
      <div class="capy-rankings"></div>
      <div class="capy-result-actions">
        <button type="button" class="capy-button capy-close-result">Okay</button>
      </div>
    </div>
  `;
  root.appendChild(resultOverlay);

  const resultTitle = resultOverlay.querySelector(".result-title");
  const resultText = resultOverlay.querySelector(".result-text");
  const rankings = resultOverlay.querySelector(".capy-rankings");
  const closeResultBtn = resultOverlay.querySelector(".capy-close-result");

  // --- Lane-/Runner-Aufbau ---

  function createLane(name, isPlayer, label) {
    const laneEl = document.createElement("div");
    laneEl.className = "capy-lane";

    const runner = document.createElement("div");
    runner.className = "capy-runner" + (isPlayer ? " player" : " bot");
    runner.dataset.name = name;

    const sprite = document.createElement("div");
    sprite.className = "capy-sprite";
    runner.appendChild(sprite);

    const badge = document.createElement("div");
    badge.className = "capy-badge";
    badge.textContent = label;
    runner.appendChild(badge);

    laneEl.appendChild(runner);
    track.appendChild(laneEl);

    return { laneEl, runnerEl: runner };
  }

  function initLanes() {
    lanes = [];

    // Spieler in Lane 1
    const playerLane = createLane("Du", true, "DU");
    lanes.push({
      name: "Du",
      isPlayer: true,
      progress: 0,
      speed: 0,
      finished: false,
      finishTimeSec: null,
      runnerEl: playerLane.runnerEl
    });

    // Bots in den weiteren Lanes
    for (let i = 0; i < CAPY_BOT_COUNT; i++) {
      const label = `BOT-${i + 1}`;
      const lane = createLane(`Capybot ${i + 1}`, false, label);
      const baseTime =
        CAPY_BOT_FINISH_TIMES[i] ||
        CAPY_BOT_FINISH_TIMES[CAPY_BOT_FINISH_TIMES.length - 1];
      const speed = CAPY_TRACK_LENGTH / baseTime; // konstante Geschwindigkeit

      lanes.push({
        name: `Capybot ${i + 1}`,
        isPlayer: false,
        progress: 0,
        speed,
        baseFinishTimeSec: baseTime,
        finished: false,
        finishTimeSec: null,
        runnerEl: lane.runnerEl
      });
    }
  }

  initLanes();

  // --- Geometrie für Strecke ---

  function updateGeometry() {
    const firstLaneRunner = lanes[0]?.runnerEl;
    if (!firstLaneRunner) return;

    const laneRect = firstLaneRunner.parentElement.getBoundingClientRect();
    const startRect = startLine.getBoundingClientRect();
    const finishRect = finishLine.getBoundingClientRect();

    // X-Positionen relativ zur Lane
    const startX = startRect.left - laneRect.left;
    const finishX = finishRect.left - laneRect.left;

    // nutzbare Strecke zwischen Start- und Ziellinie (linke Kante)
    const usable = finishX - startX;

    geom.startOffsetPx = startX;
    geom.usableDistancePx = Math.max(40, usable);
  }

  function applyRunnerPosition(lane) {
    const x = geom.startOffsetPx + lane.progress * geom.usableDistancePx;
    lane.runnerEl.style.transform = `translateX(${x}px)`;
  }

  function applyAllRunnerPositions() {
    lanes.forEach(applyRunnerPosition);
  }

  // --- Race Reset / Start / Finish ---

  function updateKeyHint() {
    keyHint.innerHTML = `Nächste Taste: <strong>${expectedKey.toUpperCase()}</strong>`;
  }

  function resetRace() {
    raceStarted = false;
    raceFinished = false;
    raceStartTime = null;
    lastFrameTime = null;
    countdownValue = 3;
    expectedKey = "f";
    lastPressTime = 0;

    if (countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }

    countdownEl.classList.add("hidden");
    startOverlay.classList.remove("hidden");
    resultOverlay.classList.add("hidden");

    lanes.forEach((lane, idx) => {
      lane.progress = 0;
      lane.finished = false;
      lane.finishTimeSec = null;

      if (!lane.isPlayer) {
        const baseTime =
          CAPY_BOT_FINISH_TIMES[idx - 1] ||
          CAPY_BOT_FINISH_TIMES[CAPY_BOT_FINISH_TIMES.length - 1];
        lane.baseFinishTimeSec = baseTime;
        lane.speed = CAPY_TRACK_LENGTH / baseTime;
      } else {
        lane.speed = 0;
      }
    });

    updateGeometry();
    applyAllRunnerPositions();
    updateKeyHint();
  }

  function finishRace(winnerLane) {
    if (raceFinished) return;
    raceFinished = true;
    raceStarted = false;

    if (raf) cancelAnimationFrame(raf);
    raf = null;

    const playerLane = lanes.find((l) => l.isPlayer);
    const bots = lanes.filter((l) => !l.isPlayer);

    // Ranking nach Finishzeit oder Fortschritt
    const ranking = lanes
      .slice()
      .sort((a, b) => {
        if (a.finishTimeSec != null && b.finishTimeSec != null) {
          return a.finishTimeSec - b.finishTimeSec;
        }
        if (a.finishTimeSec != null) return -1;
        if (b.finishTimeSec != null) return 1;
        return b.progress - a.progress;
      });

    rankings.innerHTML = "";
    ranking.forEach((lane, idx) => {
      const pill = document.createElement("div");
      pill.className = "pill";
      const pos = idx + 1;
      pill.textContent = `${pos}. ${lane.name}`;
      rankings.appendChild(pill);
    });

    if (winnerLane.isPlayer && playerLane && playerLane.finishTimeSec != null) {
      // ⭐ Sterne werden jetzt gegen die tatsächliche Bestzeit der Bots aus DIESEM Lauf berechnet
      const finishedBots = bots.filter((b) => b.finishTimeSec != null);
      const bestBotTime =
        finishedBots.length > 0
          ? Math.min(...finishedBots.map((b) => b.finishTimeSec))
          : Math.min(...CAPY_BOT_FINISH_TIMES);

      const runLevel = determineStarFromTimes(
        playerLane.finishTimeSec,
        bestBotTime
      );
      let unlockedText = "";

      if (runLevel) {
        // Nie einen schlechteren Stern melden als den bereits besten
        let finalLevel = runLevel;

        if (bestStarLevel && starRank(bestStarLevel) > starRank(runLevel)) {
          finalLevel = bestStarLevel;
        } else {
          bestStarLevel = runLevel;
          saveBestStar(runLevel);
          renderBestStar();
        }

        unlockedText = ` – ${starLabel(finalLevel)}`;

        try {
          onWin({ level: finalLevel, label: starLabel(finalLevel) });
        } catch (e) {
          console.error("onWin callback error", e);
        }
      }

      const diff = bestBotTime - playerLane.finishTimeSec;
      const diffText =
        diff > 0
          ? `(${diff.toFixed(2).replace(".", ",")}s schneller als der beste Bot)`
          : "";

      resultTitle.textContent = "Du hast das Rennen gewonnen!";
      resultText.innerHTML =
        `Deine Zeit: <strong>${playerLane.finishTimeSec
          .toFixed(2)
          .replace(".", ",")}s</strong> ${diffText}<br>` +
        `Schnellster Bot (dieses Rennen): <strong>${bestBotTime
          .toFixed(2)
          .replace(".", ",")}s</strong>${unlockedText || ""}`;
    } else {
      // Spieler verliert
      const fastestBot = bots.reduce(
        (best, cur) => {
          if (!best) return cur;
          const bestTime =
            best.finishTimeSec != null
              ? best.finishTimeSec
              : best.baseFinishTimeSec;
          const curTime =
            cur.finishTimeSec != null
              ? cur.finishTimeSec
              : cur.baseFinishTimeSec;
          return curTime < bestTime ? cur : best;
        },
        null
      );

      resultTitle.textContent = `${winnerLane.name} war schneller…`;
      if (fastestBot) {
        const fastestTime =
          fastestBot.finishTimeSec != null
            ? fastestBot.finishTimeSec
            : fastestBot.baseFinishTimeSec;

        resultText.innerHTML =
          `Schnellster Bot: <strong>${fastestTime
            .toFixed(2)
            .replace(".", ",")}s</strong><br>` +
          `Versuch, mit sauberem F/H-Wechsel die Neon-Capys zu überholen.`;
      } else {
        resultText.textContent =
          "Die Capy-Bots haben dich knapp abgehängt – probier direkt noch eine Runde.";
      }
    }

    resultOverlay.classList.remove("hidden");
  }

  function startRace() {
    if (raceStarted || raceFinished) return;
    raceStarted = true;
    raceFinished = false;
    raceStartTime = performance.now();
    lastFrameTime = raceStartTime;
    startOverlay.classList.add("hidden");
    countdownEl.classList.add("hidden");

    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function beginCountdown() {
    if (raceStarted || raceFinished || countdownTimer) return;
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

  // --- Input ---

  function handleKeydown(e) {
    const key = e.key.toLowerCase();

    if (key === " ") {
      e.preventDefault();
      if (!raceStarted && !raceFinished) {
        beginCountdown();
      }
      return;
    }

    if (!raceStarted || raceFinished) return;

    if (key === "f" || key === "h") {
      const playerLane = lanes.find((l) => l.isPlayer);
      if (!playerLane) return;

      if (key === expectedKey) {
        const now = performance.now();
        const timeSinceLast = (now - lastPressTime) / 1000;
        const rhythmFactor = isFinite(timeSinceLast)
          ? Math.max(0.6, Math.min(1.4, 1.4 - (timeSinceLast - 0.2)))
          : 1.0;

        playerLane.speed = Math.min(
          CAPY_PLAYER_MAX_SPEED,
          playerLane.speed + CAPY_PLAYER_SPEED_GAIN * rhythmFactor
        );

        expectedKey = expectedKey === "f" ? "h" : "f";
        lastPressTime = now;
      } else {
        playerLane.speed = Math.max(
          0,
          playerLane.speed - CAPY_PLAYER_SPEED_PENALTY
        );
      }
      updateKeyHint();
    }
  }

  // --- Game Loop ---

  function tick(timestamp) {
    if (!raceStarted || raceFinished) return;
    if (!raceStartTime) raceStartTime = timestamp;
    if (!lastFrameTime) lastFrameTime = timestamp;

    const dt = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;
    const elapsedSec = (timestamp - raceStartTime) / 1000;

    const finishRect = finishLine.getBoundingClientRect();
    const finishX = finishRect.left + finishRect.width / 2;

    // Bewegung & Zielerkennung
    lanes.forEach((lane) => {
      if (lane.finished) {
        // bereits fertige Läufer bleiben an ihrer Position
        applyRunnerPosition(lane);
        return;
      }

      if (lane.isPlayer) {
        // Geschwindigkeit fällt wieder ab
        lane.speed = Math.max(0, lane.speed - CAPY_PLAYER_FRICTION * dt);
        const v = CAPY_PLAYER_BASE_SPEED + lane.speed;
        lane.progress += (v * dt) / CAPY_TRACK_LENGTH;
      } else {
        lane.progress += (lane.speed * dt) / CAPY_TRACK_LENGTH;
      }

      // Progress im sinnvollen Bereich halten
      if (lane.progress < 0) lane.progress = 0;
      if (lane.progress > 1.2) lane.progress = 1.2;

      applyRunnerPosition(lane);

      const runnerRect = lane.runnerEl.getBoundingClientRect();
      const runnerFrontX = runnerRect.right;

      // Ziellinie erreicht, sobald die "Nase" die Mitte der Linie schneidet
      if (runnerFrontX >= finishX) {
        lane.finished = true;
        lane.finishTimeSec = elapsedSec;
        lane.progress = Math.min(1, lane.progress);
      }
    });

    const playerLane = lanes.find((l) => l.isPlayer);
    const bots = lanes.filter((l) => !l.isPlayer);

    if (!playerLane) {
      // sollte nie passieren, aber safety
      raceFinished = true;
      return;
    }

    // 1. Wenn der Spieler NICHT im Ziel ist, aber ein Bot schon:
    //    → Bot gewinnt sofort, Rennen vorbei.
    if (!playerLane.finished) {
      const firstFinishedBot = bots.find((b) => b.finished);
      if (firstFinishedBot) {
        finishRace(firstFinishedBot);
        return;
      }
    } else {
      // 2. Spieler ist im Ziel: erst prüfen, ob ein Bot evtl. früher im Ziel war
      const finishedBots = bots.filter((b) => b.finishTimeSec != null);
      if (finishedBots.length > 0) {
        const fastestBot = finishedBots.reduce((best, cur) =>
          cur.finishTimeSec < best.finishTimeSec ? cur : best
        );
        if (fastestBot.finishTimeSec < playerLane.finishTimeSec) {
          // Safety: falls ein Bot doch früher war → Spieler verliert
          finishRace(fastestBot);
          return;
        }
      }

      // 3. Spieler ist vorne, aber wir warten, bis ALLE Bots im Ziel sind
      const allBotsFinished = bots.every((b) => b.finished);
      if (allBotsFinished) {
        finishRace(playerLane);
        return;
      }
    }

    raf = requestAnimationFrame(tick);
  }

  // --- Event Listener & Init ---

  function handleResize() {
    updateGeometry();
    applyAllRunnerPositions();
  }

  if (restartHeaderBtn) {
    restartHeaderBtn.addEventListener("click", resetRace);
  }
  if (closeResultBtn) {
    closeResultBtn.addEventListener("click", () => {
      resultOverlay.classList.add("hidden");
    });
  }
  startOverlay.addEventListener("click", beginCountdown);

  const keyHandler = (e) => handleKeydown(e);
  window.addEventListener("keydown", keyHandler);
  window.addEventListener("resize", handleResize);

  // Erste Geometrie-Berechnung nach Layout
  requestAnimationFrame(() => {
    updateGeometry();
    applyAllRunnerPositions();
  });

  renderBestStar();
  resetRace();

  return {
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      if (countdownTimer) window.clearInterval(countdownTimer);
      window.removeEventListener("keydown", keyHandler);
      window.removeEventListener("resize", handleResize);
    }
  };
};
