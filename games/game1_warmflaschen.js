// Spiel 1: Wärmflaschen befüllen mit Glitzerfarben (schwieriger)

window.AdventGames = window.AdventGames || {};

window.AdventGames["warmflaschen_sort"] = function initWarmflaschenGame(container, options) {
  const CAPACITY = 4;
  const COLORS = ["RED", "GREEN", "BLUE", "GOLD"];
  const BOTTLES_COUNT = 6;

  let state = createInitialState();
  let selectedIndex = null;
  let moveCount = 0;
  let hasWon = false;
  let isAnimating = false;

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "warm-game";

  const header = document.createElement("div");
  header.className = "warm-game-header";

  const title = document.createElement("div");
  title.className = "warm-game-title";
  title.textContent =
    "Sortiere die glitzernden Farben in die Wärmflaschen. Am Ende soll jede Flasche nur eine Farbe enthalten.";

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
  status.textContent =
    "Tippe erst eine Flasche zum Aufnehmen an, dann eine andere zum Eingießen. Schaffst du alle Farben?";

  root.appendChild(header);
  root.appendChild(grid);
  root.appendChild(status);

  container.appendChild(root);

  resetBtn.addEventListener("click", () => {
    resetGame();
  });

  function createInitialState() {
    const units = [];
    COLORS.forEach((color) => {
      for (let i = 0; i < CAPACITY; i++) {
        units.push(color);
      }
    });

    shuffle(units);

    const bottles = Array.from({ length: BOTTLES_COUNT }, () => []);

    let bottleIndex = 0;
    while (units.length) {
      bottles[bottleIndex].push(units.pop());
      bottleIndex = (bottleIndex + 1) % (BOTTLES_COUNT - 2);
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
    updateMoves();
    status.textContent =
      "Tippe erst eine Flasche zum Aufnehmen an, dann eine andere zum Eingießen. Schaffst du alle Farben?";
    status.classList.remove("win");
    render();
  }

  function updateMoves() {
    movesLabel.textContent = `Züge: ${moveCount}`;
  }

  function render() {
    grid.innerHTML = "";
    state.forEach((bottle, index) => {
      const flask = document.createElement("div");
      flask.className = "flask";
      flask.dataset.index = String(index);

      if (selectedIndex === index) {
        flask.classList.add("selected");
      }

      for (let i = 0; i < bottle.length; i++) {
        const color = bottle[i];
        if (!color) continue;

        const segment = document.createElement("div");
        segment.className = "flask-segment segment-" + color;

        const inner = document.createElement("div");
        inner.className = "flask-segment-inner";
        segment.appendChild(inner);

        flask.appendChild(segment);
      }

      flask.addEventListener("click", () => handleFlaskClick(index));

      grid.appendChild(flask);
    });
  }

  function handleFlaskClick(index) {
    if (hasWon || isAnimating) return;

    if (selectedIndex === null) {
      if (state[index].length === 0) {
        return;
      }
      selectedIndex = index;
      render();
      return;
    }

    if (selectedIndex === index) {
      selectedIndex = null;
      render();
      return;
    }

    const from = selectedIndex;
    const to = index;

    if (!canPour(from, to)) {
      selectedIndex = index;
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
        moveCount++;
        updateMoves();
        const won = checkWin();
        if (won && !hasWon) {
          hasWon = true;
          status.textContent =
            "Geschafft! Alle Glitzerfarben sind sortiert. Du darfst dir dein Geschenk holen und deine Nachricht lesen. ✨";
          status.classList.add("win");
          try {
            onWin();
          } catch (e) {
            console.error("onWin callback error:", e);
          }
        } else if (!won) {
          status.textContent =
            "Gut gemacht! Mach weiter, bis jede Wärmflasche nur eine Farbe hat.";
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

  function checkWin() {
    return state.every((bottle) => {
      if (bottle.length === 0) return true;
      const first = bottle[0];
      return bottle.every((c) => c === first);
    });
  }

  render();

  return {
    reset: resetGame,
    getState: () => JSON.parse(JSON.stringify(state)),
    destroy: () => {}
  };
};
