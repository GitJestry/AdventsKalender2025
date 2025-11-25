// Spiel 3: Schnelle Hände – Reaktionsklecks
// Kurz & klar:
// - ENTER: Runde starten, auf Klecks warten
// - SPACE: beim Klecks so schnell wie möglich drücken
// - Streak wird erst beim Ende bewertet (Fehler / zu spät / zu langsam)
//   3  => Braun
//   4  => Silber
//   5–7 => Gold
//   >=8 => Rot
// - Highscore & bester Stern in localStorage, kein Downgrade

window.AdventGames = window.AdventGames || {};

window.AdventGames["fast_hands_reaction"] = function initFastHandsReaction(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  // Streak-Logik
  const REQUIRED_STREAK_TO_UNLOCK = 3;

  // Reaktionszeit
  const MAX_REACTION_SECONDS = 0.35;
  const TOO_LATE_MS = 1200;

  // Random-Wartezeit bis zum Plop
  const MIN_WAIT_MS = 3000;
  const MAX_WAIT_MS = 6000;

  // Highscore / Persistenz
  const STORAGE_KEY_STREAK = "advent_fast_hands_best_streak";
  const STORAGE_KEY_STAR = "advent_fast_hands_best_star";
  const STAR_ORDER = ["brown", "silver", "gold", "red"];

  function starRank(level) {
    const idx = STAR_ORDER.indexOf(level);
    return idx === -1 ? 0 : idx + 1;
  }

  function starLabelForLevel(level) {
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

  function loadBestStreak() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_STREAK);
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  function saveBestStreak(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY_STREAK, String(value));
    } catch {
      // kann ignoriert werden
    }
  }

  function loadBestStar() {
    try {
      return window.localStorage.getItem(STORAGE_KEY_STAR) || null;
    } catch {
      return null;
    }
  }

  function saveBestStar(level) {
    if (!level) return;
    try {
      const prev = loadBestStar();
      if (!prev || starRank(level) > starRank(prev)) {
        window.localStorage.setItem(STORAGE_KEY_STAR, level);
      }
    } catch {
      // kann ignoriert werden
    }
  }

  function determineRewardFromStreak(streak) {
    if (streak >= 8) return { level: "red", label: "Roter Stern" };
    if (streak >= 5) return { level: "gold", label: "Goldener Stern" };
    if (streak >= 4) return { level: "silver", label: "Silberner Stern" };
    if (streak >= 3) return { level: "brown", label: "Brauner Stern" };
    return null;
  }

  // --- State ---

  let state = "idle"; // "idle" | "waiting" | "signal" | "result"

  let streak = 0;
  let bestReaction = null;
  let bestStreakSession = 0;
  let bestStreakEver = loadBestStreak();
  let bestStarLevel = loadBestStar();
  let lastNotifiedStarLevel = bestStarLevel || null;

  let signalStartTime = null;
  let nextSignalTimeoutId = null;
  let tooLateTimeoutId = null;
  let hasPressedThisRound = false;
  let destroyed = false;

  let splatSound = null;
  try {
    splatSound = new Audio("assets/audio/splat_sound.wav");
    splatSound.volume = 0.4;
  } catch {
    // optional
  }

  function playSplatSound() {
    if (!splatSound) return;
    try {
      const s = splatSound.cloneNode(true);
      s.volume = splatSound.volume;
      s.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  // --- DOM-Aufbau ---

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "trace-game";

  const header = document.createElement("div");
  header.className = "trace-header";

  const title = document.createElement("div");
  title.className = "trace-title";
  title.textContent = "Schnelle Hände – Reaktionsklecks";

  const stats = document.createElement("div");
  stats.className = "trace-stats";

  const streakSpan = document.createElement("span");
  const bestStreakSpan = document.createElement("span");
  const bestSpan = document.createElement("span");

  streakSpan.innerHTML =
    'Aktuelle Serie: <span class="trace-stat-em" id="reactionStreak">0</span>';
  bestStreakSpan.innerHTML =
    'Beste Serie: <span class="trace-stat-em" id="reactionBestStreak">0</span>';
  bestSpan.innerHTML =
    'Beste Reaktion: <span class="trace-stat-em" id="reactionBest">–</span>';

  stats.appendChild(streakSpan);
  stats.appendChild(bestStreakSpan);
  stats.appendChild(bestSpan);

  header.appendChild(title);
  header.appendChild(stats);

  const buttonsRow = document.createElement("div");
  buttonsRow.className = "trace-buttons";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "trace-btn";
  resetBtn.textContent = "Serie löschen";

  buttonsRow.appendChild(resetBtn);

  const mainRow = document.createElement("div");
  mainRow.className = "trace-main";

  const leftColumn = document.createElement("div");
  leftColumn.className = "reaction-left";

  const playWrapper = document.createElement("div");
  playWrapper.className = "trace-canvas-wrapper reaction-area";

  const blobWrap = document.createElement("div");
  blobWrap.className = "reaction-blob-wrap";

  const blob = document.createElement("div");
  blob.className = "reaction-blob";
  blob.setAttribute("aria-hidden", "true");

  blobWrap.appendChild(blob);
  playWrapper.appendChild(blobWrap);

  const statusLine = document.createElement("p");
  statusLine.className = "trace-status-line";

  const lastTimeLine = document.createElement("p");
  lastTimeLine.className = "reaction-last-line";
  lastTimeLine.innerHTML =
    'Letzte Reaktion: <span id="reactionLastTime" class="reaction-time-value reaction-time-neutral">–</span>' +
    ' <span id="reactionNote"></span>';

  leftColumn.appendChild(playWrapper);
  leftColumn.appendChild(statusLine);
  leftColumn.appendChild(lastTimeLine);

  const helpBox = document.createElement("div");
  helpBox.className = "trace-help";

  const helpTitle = document.createElement("p");
  helpTitle.className = "trace-help-title";
  helpTitle.textContent = "Kurz erklärt";

  const helpList = document.createElement("ul");
  helpList.className = "trace-help-list";
  helpList.innerHTML = [
    "<li><strong>ENTER</strong>: Runde starten.</li>",
    "<li><strong>Warten</strong>, bis der Klecks in der Mitte erscheint.</li>",
    "<li><strong>SPACE</strong>: Beim Klecks so schnell wie möglich drücken.</li>",
    "<li>Ab <strong>3 Treffern in Folge</strong> gibt es einen Stern.</li>"
  ].join("");

  const helpHint = document.createElement("p");
  helpHint.className = "trace-help-hint";

  helpBox.appendChild(helpTitle);
  helpBox.appendChild(helpList);
  helpBox.appendChild(helpHint);

  mainRow.appendChild(leftColumn);
  mainRow.appendChild(helpBox);

  root.appendChild(header);
  root.appendChild(buttonsRow);
  root.appendChild(mainRow);

  container.appendChild(root);

  const streakValueEl = root.querySelector("#reactionStreak");
  const bestStreakValueEl = root.querySelector("#reactionBestStreak");
  const bestValueEl = root.querySelector("#reactionBest");
  const lastTimeValueEl = root.querySelector("#reactionLastTime");
  const noteEl = root.querySelector("#reactionNote");

  // --- UI-Helfer ---

  function updateStreak() {
    if (streakValueEl) streakValueEl.textContent = String(streak);
  }

  function updateBestStreakDisplay() {
    if (bestStreakValueEl) bestStreakValueEl.textContent = String(bestStreakEver || 0);
  }

  function updateBestReaction(reactionSeconds) {
    if (reactionSeconds == null) return;
    if (bestReaction == null || reactionSeconds < bestReaction) {
      bestReaction = reactionSeconds;
      if (bestValueEl) {
        const ms = Math.round(bestReaction * 1000);
        const secStr = bestReaction.toFixed(3).replace(".", ",");
        bestValueEl.textContent = `${secStr} s (${ms} ms)`;
      }
    }
  }

  function setStatus(text) {
    statusLine.textContent = text;
  }

  function setHint(text) {
    helpHint.textContent = text;
  }

  function hideBlob() {
    blob.classList.remove("visible", "reaction-blob-success", "reaction-blob-fail");
  }

  function showBlob() {
    blob.classList.add("visible");
    blob.classList.remove("reaction-blob-success", "reaction-blob-fail");
    playSplatSound();
  }

  function showBlobSuccessFlash() {
    blob.classList.add("reaction-blob-success");
    blob.classList.remove("reaction-blob-fail");
  }

  function showBlobFailFlash() {
    blob.classList.add("reaction-blob-fail");
    blob.classList.remove("reaction-blob-success");
  }

  function clearTimers() {
    if (nextSignalTimeoutId != null) {
      window.clearTimeout(nextSignalTimeoutId);
      nextSignalTimeoutId = null;
    }
    if (tooLateTimeoutId != null) {
      window.clearTimeout(tooLateTimeoutId);
      tooLateTimeoutId = null;
    }
  }

  function scheduleNextSignal() {
    if (destroyed) return;
    clearTimers();
    state = "waiting";
    hasPressedThisRound = false;
    hideBlob();
    if (noteEl) noteEl.textContent = "";
    if (lastTimeValueEl) {
      lastTimeValueEl.textContent = "–";
      lastTimeValueEl.className = "reaction-time-value reaction-time-neutral";
    }

    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    setStatus("Warte auf den Klecks …");
    setHint("Nach ENTER: nichts drücken, bis der Klecks sichtbar ist.");

    nextSignalTimeoutId = window.setTimeout(() => {
      if (destroyed || state !== "waiting") return;
      state = "signal";
      signalStartTime = performance.now();
      showBlob();
      setStatus("Klecks! SPACE!");
      setHint("Jetzt so schnell wie möglich die Leertaste drücken.");
      tooLateTimeoutId = window.setTimeout(() => {
        if (destroyed || state !== "signal" || hasPressedThisRound) return;
        handleTooLate();
      }, TOO_LATE_MS);
    }, delay);
  }

  // Streak-Auswertung bei Ende
  function evaluateStreakForReward(endedStreak) {
    if (!endedStreak || endedStreak <= 0) return null;

    if (endedStreak > bestStreakSession) bestStreakSession = endedStreak;
    if (endedStreak > (bestStreakEver || 0)) {
      bestStreakEver = endedStreak;
      saveBestStreak(bestStreakEver);
    }
    updateBestStreakDisplay();

    if (endedStreak < REQUIRED_STREAK_TO_UNLOCK) return null;

    const baseReward = determineRewardFromStreak(endedStreak);
    if (!baseReward) return null;

    let finalLevel = baseReward.level;
    const prevStarRank = starRank(bestStarLevel);
    const newRank = starRank(finalLevel);

    if (prevStarRank > newRank) {
      finalLevel = bestStarLevel;
    }

    const prevNotifiedRank = starRank(lastNotifiedStarLevel);
    const finalRank = starRank(finalLevel);

    if (finalRank > prevNotifiedRank) {
      lastNotifiedStarLevel = finalLevel;
      bestStarLevel = finalLevel;
      saveBestStar(bestStarLevel);
      try {
        onWin({ level: finalLevel, label: starLabelForLevel(finalLevel) });
      } catch (e) {
        console.error("Fehler im onWin-Callback:", e);
      }
    }

    return baseReward;
  }

  function handleTooLate() {
    if (destroyed || state !== "signal") return;
    clearTimers();
    state = "result";

    const endedStreak = streak;
    const reward = evaluateStreakForReward(endedStreak);

    streak = 0;
    updateStreak();

    showBlobFailFlash();

    if (lastTimeValueEl) {
      lastTimeValueEl.textContent = "–";
      lastTimeValueEl.className = "reaction-time-value reaction-time-bad";
    }
    if (noteEl) noteEl.textContent = "Zu spät.";

    if (endedStreak >= REQUIRED_STREAK_TO_UNLOCK && reward) {
      setStatus(`Serie ${endedStreak} vorbei – ${reward.label}.`);
    } else if (endedStreak > 0) {
      setStatus(`Serie ${endedStreak} vorbei.`);
    } else {
      setStatus("Zu spät.");
    }
    setHint("ENTER für die nächste Runde.");
  }

  function showReactionResult(reactionSeconds, wasEarly) {
    const good =
      !wasEarly && reactionSeconds != null && reactionSeconds <= MAX_REACTION_SECONDS;

    if (!wasEarly && reactionSeconds != null) {
      updateBestReaction(reactionSeconds);
    }

    // Zeit-Anzeige
    if (reactionSeconds == null) {
      if (lastTimeValueEl) {
        lastTimeValueEl.textContent = "–";
        lastTimeValueEl.className = "reaction-time-value reaction-time-neutral";
      }
    } else if (lastTimeValueEl) {
      const ms = Math.round(reactionSeconds * 1000);
      const secStr = reactionSeconds.toFixed(3).replace(".", ",");
      lastTimeValueEl.textContent = `${secStr} s (${ms} ms)`;
      lastTimeValueEl.className =
        "reaction-time-value " + (good ? "reaction-time-good" : "reaction-time-bad");
    }

    // Zu früh -> Streak endet
    if (wasEarly) {
      const endedStreak = streak;
      const reward = evaluateStreakForReward(endedStreak);

      streak = 0;
      updateStreak();
      showBlobFailFlash();
      if (noteEl) noteEl.textContent = "Zu früh.";

      if (endedStreak >= REQUIRED_STREAK_TO_UNLOCK && reward) {
        setStatus(`Zu früh – Serie ${endedStreak}, ${reward.label}.`);
      } else if (endedStreak > 0) {
        setStatus(`Zu früh – Serie ${endedStreak} vorbei.`);
      } else {
        setStatus("Zu früh.");
      }
      setHint("ENTER, dann warten, Klecks, SPACE.");
      return;
    }

    // Zu langsam -> Streak endet
    if (!good) {
      const endedStreak = streak;
      const reward = evaluateStreakForReward(endedStreak);

      streak = 0;
      updateStreak();
      showBlobFailFlash();
      if (noteEl) noteEl.textContent = "Zu langsam.";

      if (endedStreak >= REQUIRED_STREAK_TO_UNLOCK && reward) {
        setStatus(`Zu langsam – Serie ${endedStreak}, ${reward.label}.`);
      } else if (endedStreak > 0) {
        setStatus(`Zu langsam – Serie ${endedStreak} vorbei.`);
      } else {
        setStatus("Zu langsam.");
      }
      setHint("ENTER für neue Runde.");
      return;
    }

    // Guter Treffer -> Streak läuft weiter
    showBlobSuccessFlash();
    streak += 1;
    updateStreak();
    if (noteEl) noteEl.textContent = "Treffer!";

    if (streak > bestStreakSession) bestStreakSession = streak;
    if (streak > (bestStreakEver || 0)) {
      bestStreakEver = streak;
      saveBestStreak(bestStreakEver);
    }
    updateBestStreakDisplay();

    setStatus(`Serie ${streak}.`);
    if (streak < REQUIRED_STREAK_TO_UNLOCK) {
      setHint("3+ Treffer in Folge bringen einen Stern.");
    } else {
      setHint("Serie halten – ENTER für nächste Runde.");
    }
  }

  function handleSpacePress() {
    if (destroyed) return;

    if (state === "waiting") {
      // zu früh
      clearTimers();
      state = "result";
      hideBlob();
      showReactionResult(null, true);
      return;
    }

    if (state === "signal") {
      if (hasPressedThisRound || signalStartTime == null) return;
      hasPressedThisRound = true;
      clearTimers();
      const now = performance.now();
      const reactionSeconds = (now - signalStartTime) / 1000;
      state = "result";
      hideBlob();
      showReactionResult(reactionSeconds, false);
    }
  }

  function handleEnterPress() {
    if (destroyed) return;
    if (state === "idle" || state === "result") {
      scheduleNextSignal();
    }
  }

  function handleReset() {
    streak = 0;
    bestReaction = null;
    bestStreakSession = 0;
    updateStreak();
    updateBestStreakDisplay();
    clearTimers();
    hideBlob();
    state = "idle";
    hasPressedThisRound = false;
    signalStartTime = null;
    if (lastTimeValueEl) {
      lastTimeValueEl.textContent = "–";
      lastTimeValueEl.className = "reaction-time-value reaction-time-neutral";
    }
    if (noteEl) noteEl.textContent = "";
    if (bestValueEl) bestValueEl.textContent = "–";
    setStatus("Serie gelöscht.");
    setHint("ENTER startet eine neue Runde.");
  }

  function handleKeyDown(event) {
    if (destroyed) return;
    if (event.code === "Space" || event.key === " ") {
      event.preventDefault();
      handleSpacePress();
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleEnterPress();
    }
  }

  resetBtn.addEventListener("click", handleReset);
  window.addEventListener("keydown", handleKeyDown);

  // Initialtext + Bestwerte
  updateBestStreakDisplay();
  setStatus("Bereit. ENTER startet.");
  setHint("ENTER → warten → Klecks → SPACE.");

  return {
    reset: handleReset,
    destroy: () => {
      destroyed = true;
      clearTimers();
      window.removeEventListener("keydown", handleKeyDown);
    }
  };
};
