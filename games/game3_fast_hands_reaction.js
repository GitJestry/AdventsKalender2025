// Spiel 3: Schnelle Hände – Reaktionsklecks
// Reaktionsspiel: Triff den Lippen-Klecks drei Mal in Folge mit <= 0,20 Sekunden Reaktionszeit.

window.AdventGames = window.AdventGames || {};

window.AdventGames["fast_hands_reaction"] = function initFastHandsReaction(container, options) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  const REQUIRED_STREAK = 3;
  const MAX_REACTION_SECONDS = 0.3; // 200 ms
  const MIN_WAIT_MS = 4000;
  const MAX_WAIT_MS = 7000;
  const TOO_LATE_MS = 1200;

  let state = "idle"; // "idle" | "waiting" | "signal" | "too-late" | "won";

  let splatSound = null;
  try {
    splatSound = new Audio("assets/audio/splat_sound.wav");
    splatSound.volume = 0.4;
  } catch (e) {
    console.warn("Konnte Klecks-Sound nicht laden", e);
  }

  function playSplatSound() {
    if (!splatSound) return;
    try {
      const s = splatSound.cloneNode(true);
      s.volume = splatSound.volume;
      s.play().catch(() => {});
    } catch (e) {
      console.warn("Konnte Klecks-Sound nicht abspielen", e);
    }
  }

"signal" | "result" | "won"
  let streak = 0;
  let bestReaction = null;
  let signalStartTime = null;
  let nextSignalTimeoutId = null;
  let tooLateTimeoutId = null;
  let hasPressedThisRound = false;
  let destroyed = false;

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "trace-game";

  const header = document.createElement("div");
  header.className = "trace-header";

  const title = document.createElement("div");
  title.className = "trace-title";
  title.textContent = "Schnelle Hände: Triff den Klecks in unter 0,20 Sekunden.";

  const stats = document.createElement("div");
  stats.className = "trace-stats";

  const streakSpan = document.createElement("span");
  const bestSpan = document.createElement("span");

  streakSpan.innerHTML = 'Streak: <span class="trace-stat-em" id="reactionStreak">0 / ' + REQUIRED_STREAK + "</span>";
  bestSpan.innerHTML = 'Beste Zeit: <span class="trace-stat-em" id="reactionBest">–</span>';

  stats.appendChild(streakSpan);
  stats.appendChild(bestSpan);

  header.appendChild(title);
  header.appendChild(stats);

  const buttonsRow = document.createElement("div");
  buttonsRow.className = "trace-buttons";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "trace-btn";
  resetBtn.textContent = "Streak zurücksetzen";

  buttonsRow.appendChild(resetBtn);

  const mainRow = document.createElement("div");
  mainRow.className = "trace-main";

  const leftColumn = document.createElement("div");
  leftColumn.className = "reaction-left";

  const playWrapper = document.createElement("div");
  playWrapper.className = "trace-canvas-wrapper";

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
    'Letzte Reaktion: <span id="reactionLastTime" class="reaction-time-value reaction-time-neutral">–</span> <span id="reactionNote"></span>';

  leftColumn.appendChild(playWrapper);
  leftColumn.appendChild(statusLine);
  leftColumn.appendChild(lastTimeLine);

  const helpBox = document.createElement("div");
  helpBox.className = "trace-help";

  const helpTitle = document.createElement("p");
  helpTitle.className = "trace-help-title";
  helpTitle.textContent = "Steuerung";

  const helpList = document.createElement("ul");
  helpList.className = "trace-help-list";
  helpList.innerHTML = [
    "<li><strong>ENTER</strong>: Startet die nächste Runde.</li>",
    "<li><strong>Leertaste</strong>: Sobald der Klecks aufploppt, so schnell wie möglich drücken.</li>",
    "<li>Du brauchst <strong>3 Treffer in Folge</strong> mit ≤ 0,20 s – sonst wird die Streak zurückgesetzt.</li>"
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
  const bestValueEl = root.querySelector("#reactionBest");
  const lastTimeValueEl = root.querySelector("#reactionLastTime");
  const noteEl = root.querySelector("#reactionNote");

  function updateStreak() {
    if (streakValueEl) {
      streakValueEl.textContent = streak + " / " + REQUIRED_STREAK;
    }
  }

  function updateBest(reactionSeconds) {
    if (reactionSeconds == null) return;
    if (bestReaction == null || reactionSeconds < bestReaction) {
      bestReaction = reactionSeconds;
      if (bestValueEl) {
        const ms = Math.round(bestReaction * 1000);
        const secStr = bestReaction.toFixed(3).replace(".", ",");
        bestValueEl.textContent = secStr + " s (" + ms + " ms)";
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
    blob.classList.remove("visible");
  }

  function showBlob() {
    blob.classList.add("visible");
    playSplatSound();
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
    if (destroyed || state === "won") return;
    clearTimers();
    state = "waiting";
    hasPressedThisRound = false;
    hideBlob();
    if (noteEl) {
      noteEl.textContent = "";
    }
    if (lastTimeValueEl) {
      lastTimeValueEl.textContent = "–";
      lastTimeValueEl.className = "reaction-time-value reaction-time-neutral";
    }
    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    setStatus("Warte auf das Signal ... (erscheint nach 4–7 Sekunden)");
    setHint("Nicht schummeln: Die Leertaste erst drücken, wenn der Klecks auftaucht. 🙂");

    nextSignalTimeoutId = window.setTimeout(() => {
      if (destroyed || state !== "waiting") return;
      state = "signal";
      signalStartTime = performance.now();
      showBlob();
      setStatus("JETZT! ✨ So schnell wie möglich die Leertaste drücken!");
      tooLateTimeoutId = window.setTimeout(() => {
        if (destroyed || state !== "signal" || hasPressedThisRound) return;
        handleTooLate();
      }, TOO_LATE_MS);
    }, delay);
  }

  function handleTooLate() {
    if (destroyed) return;
    if (state !== "signal") return;
    clearTimers();
    state = "result";
    hideBlob();
    streak = 0;
    updateStreak();
    if (lastTimeValueEl) {
      lastTimeValueEl.textContent = "–";
      lastTimeValueEl.className = "reaction-time-value reaction-time-bad";
    }
    if (noteEl) {
      noteEl.textContent = "Zu spät – der Klecks ist schon wieder verschwunden.";
    }
    setStatus("Zu spät. Drücke ENTER für die nächste Runde.");
    setHint("Versuch, schon innerlich gezählt zu haben – aber nicht zu früh drücken!");
  }

  function showReactionResult(reactionSeconds, wasEarly) {
    const good = !wasEarly && reactionSeconds != null && reactionSeconds <= MAX_REACTION_SECONDS;
    if (!wasEarly && reactionSeconds != null) {
      updateBest(reactionSeconds);
    }

    if (reactionSeconds == null) {
      if (lastTimeValueEl) {
        lastTimeValueEl.textContent = "–";
        lastTimeValueEl.className = "reaction-time-value reaction-time-neutral";
      }
    } else if (lastTimeValueEl) {
      const ms = Math.round(reactionSeconds * 1000);
      const secStr = reactionSeconds.toFixed(3).replace(".", ",");
      lastTimeValueEl.textContent = secStr + " s (" + ms + " ms)";
      lastTimeValueEl.className =
        "reaction-time-value " + (good ? "reaction-time-good" : "reaction-time-bad");
    }

    if (wasEarly) {
      if (noteEl) {
        noteEl.textContent = "Zu früh gedrückt – der Klecks war noch gar nicht da.";
      }
      setStatus("Zu früh! Die Streak wurde zurückgesetzt. ENTER für die nächste Runde.");
      streak = 0;
      updateStreak();
      setHint("Bleib entspannt – lieber minimal zu spät als zu früh. 😉");
      return;
    }

    if (!good) {
      if (noteEl) {
        noteEl.textContent = "Über 0,30 Sekunden – das zählt nicht als Treffer.";
      }
      setStatus("Knapp daneben. Die Streak startet wieder bei 0. ENTER für die nächste Runde.");
      streak = 0;
      updateStreak();
      setHint("Konzentrier dich auf den Moment, in dem der Klecks wirklich aufploppt.");
      return;
    }

    // Guter Treffer
    streak += 1;
    updateStreak();
    if (noteEl) {
      noteEl.textContent = "Treffer! Unter 0,20 Sekunden – sehr schnell! ⚡";
    }
    setStatus("Starker Reflex! ENTER für die nächste Runde.");

    if (streak >= REQUIRED_STREAK) {
      state = "won";
      setStatus("Drei schnelle Treffer in Folge – du hast das Reaktionsspiel geschafft! 🎁");
      setHint("Du kannst das Fenster schließen und dein echtes Adventstürchen öffnen. ♥");
      try {
        onWin({
          level: "silver",
          label: "Reflexe on point – Silberstern erspielt!",
        });
      } catch (e) {
        console.error("Fehler im onWin-Callback:", e);
      }
    } else {
      const remaining = REQUIRED_STREAK - streak;
      setHint("Noch " + remaining + (remaining === 1 ? " Treffer" : " Treffer") + " bis zum Sieg.");
    }
  }

  function handleSpacePress() {
    if (destroyed || state === "won") return;

    if (state === "waiting") {
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
      return;
    }
  }

  function handleEnterPress() {
    if (destroyed || state === "won") return;

    if (state === "idle" || state === "result") {
      scheduleNextSignal();
    }
  }

  function handleReset() {
    streak = 0;
    bestReaction = null;
    updateStreak();
    clearTimers();
    hideBlob();
    state = "idle";
    hasPressedThisRound = false;
    signalStartTime = null;
    if (lastTimeValueEl) {
      lastTimeValueEl.textContent = "–";
      lastTimeValueEl.className = "reaction-time-value reaction-time-neutral";
    }
    if (noteEl) {
      noteEl.textContent = "";
    }
    setStatus("Streak zurückgesetzt. Drücke ENTER, um wieder zu starten.");
    setHint("Sammle wieder drei schnelle Treffer in Folge mit ≤ 0,20 s.");
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

  // Initialtext
  setStatus("Bereit für schnelle Hände? Drücke ENTER, um die erste Runde zu starten.");
  setHint("Das Signal erscheint nach 4–7 Sekunden. Erst beim Klecks die Leertaste drücken!");

  return {
    reset: handleReset,
    destroy: () => {
      destroyed = true;
      clearTimers();
      window.removeEventListener("keydown", handleKeyDown);
    }
  };
};
