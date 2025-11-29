// Spiel 1: Wärmflaschen befüllen mit Glitzerfarben (schwieriger)

window.AdventGames = window.AdventGames || {};

window.AdventGames["warmflaschen_sort"] = function initWarmflaschenGame(container, options) {
  const CAPACITY = 6;
  const COLORS = ["RED", "GREEN", "BLUE", "GOLD", "PURPLE", "ORANGE"];

    // Neue Farbzuordnung für Verläufe
 const COLOR_MAP = {
  RED: "#ff7082",
  GREEN: "#6fe0a3",
  BLUE: "#6ec5ff",
  GOLD: "#ffd873",
  PURPLE: "#c89aff",
  ORANGE: "#ffb36b"
};

  // Fix: Immer 8 Flaschen (4 Farbflaschen + 4 leer als Puffer)
  const BOTTLES_COUNT = 8;

  // Highscore / Stern-Progress (nie verschlechtern)
  const STORAGE_KEY = "advent_warmflaschen_best_star";
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
        return "Bronzener Stern";
    }
  }

  function loadBestStar() {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      return v || null;
    } catch (e) {
      return null;
    }
  }

  function saveBestStar(level) {
    if (!level) return;
    try {
      const prev = loadBestStar();
      if (!prev || starRank(level) > starRank(prev)) {
        window.localStorage.setItem(STORAGE_KEY, level);
      }
    } catch (e) {
      // localStorage kann geblockt sein – dann ignorieren wir es einfach
    }
  }

  let bestStarLevel = loadBestStar();

  let state = null;
  let selectedIndex = null;
  let moveCount = 0;
  let hasWon = false;
  let isAnimating = false;
  let minimumMoves = null;
  let isComputingMin = false;

  let waterFillSound = null;
  let selectSound = null;
  try {
    waterFillSound = new Audio("assets/audio/water_fill_sound.wav");
    waterFillSound.volume = 0.1;
  } catch (e) {
    console.warn("Konnte Wasserfüll-Sound nicht laden", e);
  }

  try {
    selectSound = new Audio("assets/audio/select_sound.wav");
    selectSound.volume = 0.35;
  } catch (e) {
    console.warn("Konnte Auswahl-Sound nicht laden", e);
  }

  function playWaterFillSound() {
    if (!waterFillSound) return;
    try {
      waterFillSound.currentTime = 0;
      waterFillSound.play().catch(() => {});
    } catch (e) {
      console.warn("Konnte Wasserfüll-Sound nicht abspielen", e);
    }
  }

  function playSelectSound() {
    if (!selectSound) return;
    try {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    } catch (e) {
      console.warn("Konnte Auswahl-Sound nicht abspielen", e);
    }
  }

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "warm-game";

  const header = document.createElement("div");
  header.className = "warm-game-header";

  const title = document.createElement("div");
  title.className = "warm-game-title";
  title.textContent = "🧴 Wärmflaschen sortieren";

  const controls = document.createElement("div");
  controls.className = "warm-game-controls";

  const movesLabel = document.createElement("span");
  movesLabel.className = "warm-game-stats";
  movesLabel.textContent = "Züge: 0";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "warm-game-button";
  resetBtn.textContent = "Neu mischen";

  controls.appendChild(movesLabel);
  controls.appendChild(resetBtn);

  header.appendChild(title);
  header.appendChild(controls);

  const grid = document.createElement("div");
  grid.className = "warm-game-grid";

  const status = document.createElement("div");
  status.className = "warm-game-status";
  status.textContent = "🧴 Flasche anklicken → aufnehmen • zweite Flasche → umfüllen ✨ Eine Farbe pro Flasche.";

  root.appendChild(header);
  root.appendChild(grid);
  root.appendChild(status);

  container.appendChild(root);

  resetBtn.addEventListener("click", () => {
    resetGame();
  });

  // --- Initialzustand -------------------------------------------------------

  function createInitialState() {
    const units = [];
    COLORS.forEach((color) => {
      for (let i = 0; i < CAPACITY; i++) {
        units.push(color);
      }
    });

    shuffle(units);

    const bottles = Array.from({ length: BOTTLES_COUNT }, () => []);
    // 4 Flaschen werden befüllt (eine pro Farbe), 4 bleiben leer als Puffer
    const filledBottleCount = Math.min(BOTTLES_COUNT - 2, COLORS.length); // = 4

    let bottleIndex = 0;
    while (units.length) {
      bottles[bottleIndex].push(units.pop());
      bottleIndex = (bottleIndex + 1) % filledBottleCount;
    }

    return bottles;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function resetGame() {
    state = createInitialState();
    selectedIndex = null;
    moveCount = 0;
    hasWon = false;
    isAnimating = false;
    minimumMoves = null;
    isComputingMin = true;
    updateMoves();
    status.textContent =
      "Tippe erst eine Flasche zum Aufnehmen an, dann eine andere zum Eingießen. Jede volle Flasche soll am Ende nur eine Farbe enthalten.";
    status.classList.remove("win");
    render();

    const snapshot = cloneState(state);
    window.setTimeout(() => {
      minimumMoves = calculateMinimumMoves(snapshot);
      isComputingMin = false;
      updateMoves();
    }, 30);
  }

  function updateMoves() {
    const minLabel =
      minimumMoves === null
        ? isComputingMin
          ? "Min wird berechnet..."
          : "–"
        : `Min: ${minimumMoves}`;

    movesLabel.textContent = `Züge: ${moveCount} (${minLabel})`;
  }

  function buildLiquidGradient(bottle) {
  if (!bottle.length) {
    return "none";
  }

  const step = 100 / bottle.length;
  const colorParts = [];

  // bottle[0] = unten, bottle[bottle.length - 1] = oben
  for (let i = 0; i < bottle.length; i++) {
    const colorName = bottle[i];
    const base = COLOR_MAP[colorName] || "#ffffff";
    const start = i * step;
    const end = (i + 1) * step;

    // leichte Überlappung, damit keine harten Kanten entstehen
    const s = Math.max(0, start - 1);
    const e = Math.min(100, end + 1);

    colorParts.push(`${base} ${s}% ${e}%`);
  }

  // Untere Abdunklung + eigentlicher Farbverlauf
  return [
    "linear-gradient(to top, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0) 22%)",
    `linear-gradient(to top, ${colorParts.join(",")})`
  ].join(",");
}


  // --- Rendering ------------------------------------------------------------

function render() {
  grid.innerHTML = "";

  state.forEach((bottle, index) => {
    const flask = document.createElement("div");
    flask.className = "flask";
    flask.dataset.index = String(index);

    if (selectedIndex === index) {
      flask.classList.add("selected");
    }

    // Äußere Flasche
    const shell = document.createElement("div");
    shell.className = "flask-shell";

    // Flüssigkeit
    const liquid = document.createElement("div");
    liquid.className = "flask-liquid";

    // Füllstand 0–1
    const fillRatio = bottle.length / CAPACITY;
    const clamped = Math.max(0, Math.min(1, fillRatio));

    // Maximaler sichtbarer Füllstand, damit es nicht in den Hals läuft
    const MAX_VISUAL_FILL = 0.86; // ggf. 0.82/0.80, wenn du noch mehr Rand willst
    const fillPercent = clamped * MAX_VISUAL_FILL * 100;

    // Höhe der Flüssigkeit
    liquid.style.height = `${fillPercent}%`;
    // Farbverlauf (Schichten)
    liquid.style.backgroundImage = buildLiquidGradient(bottle);

    shell.appendChild(liquid);
    flask.appendChild(shell);

    // Klick-Handler
    flask.addEventListener("click", () => handleFlaskClick(index));

    grid.appendChild(flask);
  });
}



  // --- Interaktion ----------------------------------------------------------

  function handleFlaskClick(index) {
    if (hasWon || isAnimating) return;
    if (selectedIndex === null) {
      if (state[index].length === 0) {
        return;
      }
      selectedIndex = index;
      playSelectSound();
      render();
      return;
    }

    if (selectedIndex === index) {
      selectedIndex = null;
      playSelectSound();
      render();
      return;
    }

    const from = selectedIndex;
    const to = index;

    if (!canPour(from, to)) {
      selectedIndex = index;
      playSelectSound();
      render();
      return;
    }

    animatePour(from, to);
  }

  function canPour(fromIndex, toIndex) {
    const fromBottle = state[fromIndex];
    const toBottle = state[toIndex];
    if (!fromBottle.length) return false;
    if (toBottle.length >= CAPACITY) return false;

    const topColor = fromBottle[fromBottle.length - 1];
    const destTopColor = toBottle[toBottle.length - 1];

    if (destTopColor && destTopColor !== topColor) {
      return false;
    }

    return true;
  }

  function animatePour(fromIndex, toIndex) {
    isAnimating = true;

    const flasks = grid.querySelectorAll(".flask");
    const fromEl = flasks[fromIndex];
    const toEl = flasks[toIndex];

    if (fromEl) fromEl.classList.add("pour-from");
    if (toEl) toEl.classList.add("pour-to");

    setTimeout(() => {
      const moved = doPour(fromIndex, toIndex);
      if (moved > 0) {
        playWaterFillSound();
        moveCount++;
        updateMoves();
        const won = checkWin();
        if (won && !hasWon) {
          hasWon = true;

          // Basis-Stufe in Abhängigkeit von diff
          const baseReward = determineReward(moveCount);

          // Highscore-Logik: niemals schlechteren Stern anzeigen als bisher
          let finalLevel = baseReward.level;
          if (bestStarLevel && starRank(bestStarLevel) > starRank(baseReward.level)) {
            finalLevel = bestStarLevel;
          } else {
            bestStarLevel = baseReward.level;
          }
          saveBestStar(bestStarLevel);

          const finalReward = {
            level: finalLevel,
            label: starLabelForLevel(finalLevel)
          };

          status.textContent =
            `Geschafft! Alle Glitzerfarben sind sortiert – jede volle Wärmflasche ist einfarbig. ✨ (${finalReward.label})`;
          status.classList.add("win");
          try {
            onWin(finalReward);
          } catch (e) {
            console.error("onWin callback error:", e);
          }
        } else if (!won) {
          status.textContent =
            "Gut gemacht! Mach weiter, bis jede volle Wärmflasche nur eine Farbe enthält – dann ist das Geschenk wirklich verdient.";
        }
      }
      selectedIndex = null;
      isAnimating = false;
      render();
    }, 240);
  }

  function doPour(fromIndex, toIndex) {
    const fromBottle = state[fromIndex];
    const toBottle = state[toIndex];
    if (!fromBottle.length) return 0;
    if (toBottle.length >= CAPACITY) return 0;

    const topColor = fromBottle[fromBottle.length - 1];
    const destTopColor = toBottle[toBottle.length - 1];

    if (destTopColor && destTopColor !== topColor) {
      return 0;
    }

    let moved = 0;
    while (
      fromBottle.length &&
      fromBottle[fromBottle.length - 1] === topColor &&
      toBottle.length < CAPACITY
    ) {
      toBottle.push(fromBottle.pop());
      moved++;
    }

    return moved;
  }

  // Win-Variante B: Nur "voll & einfarbig" zählt (oder leer)
  function checkWin() {
    return state.every((bottle) => {
      if (bottle.length === 0) return true;
      if (bottle.length !== CAPACITY) return false;
      const first = bottle[0];
      return bottle.every((c) => c === first);
    });
  }

  function determineReward(moves) {
    // Fallback, falls aus irgendeinem Grund keine Min-Züge berechnet werden konnten
    const fallbacks = { level: "brown", label: "Bronzener Stern" };
    if (typeof minimumMoves !== "number") return fallbacks;

    const diff = moves - minimumMoves;

    if (diff === 0) {
      return { level: "red", label: "Roter Stern" };
    }
    if (diff >= 1 && diff <= 2) {
      return { level: "gold", label: "Goldener Stern" };
    }
    if (diff >= 3 && diff <= 4) {
      return { level: "silver", label: "Silberner Stern" };
    }

    return fallbacks; // diff >= 5 -> Bronze
  }

  function cloneState(current) {
    return current.map((bottle) => bottle.slice());
  }

  // --- Min-Züge-Berechnung (mit Symmetrie-Reduktion) -----------------------

  // Kanonische Darstellung: Flaschen-Inhalte sortieren, damit permutierte Zustände
  // als identisch erkannt werden (brutale State-Space-Reduktion).
  function canonicalKey(curState) {
    const bottleStrings = curState.map((bottle) => bottle.join(","));
    bottleStrings.sort();
    return bottleStrings.join("|");
  }

  // Berechnung der minimalen Züge mit denselben Spielregeln
  function calculateMinimumMoves(startState) {
    const startKey = canonicalKey(startState);
    const seen = new Set([startKey]);
    const queue = [{ state: startState, moves: 0 }];
    let idx = 0;

    while (idx < queue.length) {
      const { state: cur, moves } = queue[idx++];

      if (checkStateWin(cur)) {
        return moves;
      }

      for (let from = 0; from < cur.length; from++) {
        for (let to = 0; to < cur.length; to++) {
          if (from === to) continue;
          if (!canPourState(cur, from, to)) continue;

          const next = pourState(cur, from, to);
          if (!next) continue;

          const key = canonicalKey(next);
          if (seen.has(key)) continue;
          seen.add(key);
          queue.push({ state: next, moves: moves + 1 });
        }
      }
    }

    return null;
  }

  function canPourState(curState, fromIndex, toIndex) {
    const fromBottle = curState[fromIndex];
    const toBottle = curState[toIndex];
    if (!fromBottle.length) return false;
    if (toBottle.length >= CAPACITY) return false;

    const topColor = fromBottle[fromBottle.length - 1];
    const destTopColor = toBottle[toBottle.length - 1];

    if (destTopColor && destTopColor !== topColor) {
      return false;
    }

    // Wichtige Optimierung:
    // Einen bereits VOLLEN, EINFARBIGEN Behälter nicht in eine komplett
    // leere Flasche kippen – das erzeugt nur symmetrische, nutzlose Zustände.
    if (
      toBottle.length === 0 &&
      fromBottle.length === CAPACITY &&
      fromBottle.every((c) => c === topColor)
    ) {
      return false;
    }

    return true;
  }

  function pourState(curState, fromIndex, toIndex) {
    const next = curState.map((bottle) => bottle.slice());
    const fromBottle = next[fromIndex];
    const toBottle = next[toIndex];
    if (!fromBottle.length || toBottle.length >= CAPACITY) return null;

    const topColor = fromBottle[fromBottle.length - 1];
    const destTopColor = toBottle[toBottle.length - 1];
    if (destTopColor && destTopColor !== topColor) return null;

    let moved = 0;
    while (
      fromBottle.length &&
      fromBottle[fromBottle.length - 1] === topColor &&
      toBottle.length < CAPACITY
    ) {
      toBottle.push(fromBottle.pop());
      moved++;
    }

    if (moved === 0) return null;
    return next;
  }

  function serializeState(curState) {
    return curState.map((bottle) => bottle.join(",")).join("|");
  }

  function checkStateWin(curState) {
    return curState.every((bottle) => {
      if (bottle.length === 0) return true;
      if (bottle.length !== CAPACITY) return false;
      const first = bottle[0];
      return bottle.every((c) => c === first);
    });
  }

  // direkt mit einem frischen Level starten
  resetGame();

  return {
    reset: resetGame,
    getState: () => JSON.parse(JSON.stringify(state)),
    destroy: () => {}
  };
};
