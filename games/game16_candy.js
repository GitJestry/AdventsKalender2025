// Spiel 16: Candy Crush – Bonbon-Level (Drag + Bomben + Line-Specials + ColorBomb + Sound + große Streak-Anims)
// -----------------------------------------------------
// - 8x8 Bonbon-Gitter, Match-3-Mechanik
// - Swaps per Drag (Maus oder Touch) mit Nachbarn
// - Nur Swaps, die mindestens eine 3er-Kombo erzeugen, sind erlaubt
// - Matches lösen sich auf, Bonbons fallen nach, neue spawnen → Cascades
// - Spezial-Bonbons:
//     • Bomben (special: "bomb") → 3x3 Explosion um sich herum
//     • Streifen horizontal (special: "stripH") → löscht ganze Reihe
//     • Streifen vertikal (special: "stripV") → löscht ganze Spalte
//     • Farbbombe (special: "color") → löscht alle Bonbons einer Farbe
// - Erzeugung der Specials:
//     • 5 in einer Linie (row/col) → Farbbombe
//     • 4 in einer Linie (row/col) → Streifen horizontal/vertikal
//     • 4+ in „nicht-linien“-Form → Bombe (3x3)
// - Spezial-Bonbons explodieren, wenn sie Teil eines Matches sind
// - Punkte & Züge (MAX_MOVES)
// - Große Floating Score & Combo / BOOM!-Anzeigen + Explosionsringe
// - Das Level endet, wenn keine Züge mehr übrig sind
// - Sterne nach Score (intern, ohne extra Visualizer):
//     Bronze: >= 1500
//     Silber: >= 3000
//     Gold:   >= 5000
//     Rot:    >= 8000
// - Bei Stern → onWin({ level: 'brown'|'silver'|'gold'|'red', label: '...' })
//   und optional window.playVictorySound()

window.AdventGames = window.AdventGames || {};

window.AdventGames["candy_16"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // Container mittig ausrichten, damit das Spiel nicht am linken Rand klebt
  container.style.display = "flex";
  container.style.justifyContent = "center";
  container.style.alignItems = "flex-start";

  // ---------------------------------------------------
  // Konfiguration
  // ---------------------------------------------------

  const GRID_COLS = 8;
  const GRID_ROWS = 8;
  const CANDY_TYPES = 6;
  const TILE_SIZE = 48;

  const BOARD_PIXEL_WIDTH = GRID_COLS * TILE_SIZE;
  const BOARD_PIXEL_HEIGHT = GRID_ROWS * TILE_SIZE;

  const CANVAS_WIDTH = 420;
  const CANVAS_HEIGHT = BOARD_PIXEL_HEIGHT + 110; // genug Platz unten

  const MAX_MOVES = 25;

  const SCORE_PER_CANDY = 60;
  const CASCADE_BONUS_FACTOR = 0.3; // jede Cascade gibt etwas mehr Punkte

  const STAR_THRESHOLDS = {
    brown: 10000,
    silver: 20000,
    gold: 25000,
    red: 30000,
  };

  // Mehr Specials → mehr Clears → "satisfying"
  // (gerne anpassen, wenn es dir zu wild / zu zahm ist)
  const RANDOM_STRIP_CHANCE = 0.16;       // 16% Chance, dass ein neues Candy ein Streifen wird
  const RANDOM_BOMB_CHANCE = 0.07;        // 7% Chance, dass ein neues Candy eine Bombe wird
  const SPECIAL_FROM_THREE_CHANCE = 0.5;  // 50% Chance, dass ein 3er-Match ein Streifen-Special erzeugt

  function starForScore(score) {
    if (score >= STAR_THRESHOLDS.red) {
      return { level: "red", label: "Roter Stern" };
    }
    if (score >= STAR_THRESHOLDS.gold) {
      return { level: "gold", label: "Goldener Stern" };
    }
    if (score >= STAR_THRESHOLDS.silver) {
      return { level: "silver", label: "Silberner Stern" };
    }
    if (score >= STAR_THRESHOLDS.brown) {
      return { level: "brown", label: "Brauner Stern" };
    }
    return null;
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  // Zufälliger Special-Typ für neu spawnende Candies
  function randomSpecialType() {
    const r = Math.random();
    if (r < RANDOM_BOMB_CHANCE) {
      return "bomb";
    }
    if (r < RANDOM_BOMB_CHANCE + RANDOM_STRIP_CHANCE) {
      // horizontal/vertikal zufällig
      return Math.random() < 0.5 ? "stripH" : "stripV";
    }
    return null;
  }

  // ---------------------------------------------------
  // Audio
  // ---------------------------------------------------

  let audioCtx = null;

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  function playSound(kind) {
    const ctx = audioCtx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 440;
    let type = "sine";
    let duration = 0.12;

    switch (kind) {
      case "swapValid":
        freq = 520;
        type = "triangle";
        duration = 0.09;
        break;
      case "swapInvalid":
        freq = 220;
        type = "square";
        duration = 0.08;
        break;
      case "clear":
        freq = 660;
        type = "sine";
        duration = 0.12;
        break;
      case "bomb":
        freq = 260;
        type = "sawtooth";
        duration = 0.22;
        break;
      case "endGood":
        freq = 880;
        type = "triangle";
        duration = 0.25;
        break;
      case "endFail":
        freq = 200;
        type = "sine";
        duration = 0.25;
        break;
      default:
        freq = 440;
    }

    osc.type = type;
    gain.gain.value = 0.12;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(freq, now);
    if (kind === "bomb") {
      osc.frequency.linearRampToValueAtTime(freq * 0.5, now + duration);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.linearRampToValueAtTime(0.0, now + duration);
    } else {
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.0, now + duration);
    }

    osc.start(now);
    osc.stop(now + duration);
  }

  // ---------------------------------------------------
  // Layout / DOM
  // ---------------------------------------------------

  const root = document.createElement("div");
  root.className = "candy-crush-16-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "10px";
  root.style.alignItems = "center";
  root.style.padding = "14px 18px 18px";
  root.style.borderRadius = "20px";
  root.style.background =
    "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,0.96))";
  root.style.boxShadow = "0 18px 45px rgba(15,23,42,0.9)";
  root.style.maxWidth = "880px";
  root.style.margin = "0 auto";
  root.style.color = "rgba(248,250,252,0.98)";
  root.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "4px";
  header.style.alignItems = "center";
  header.style.textAlign = "center";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 16 – Bonbon Crush";
  titleEl.style.fontWeight = "700";
  titleEl.style.letterSpacing = "0.03em";
  titleEl.style.fontSize = "1.15rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Ziehe ein Bonbon zu einem Nachbarn, um Matches zu bilden. Sammle so viele Punkte wie möglich, bis deine Züge aufgebraucht sind.";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.color = "rgba(226,232,240,0.9)";
  subtitleEl.style.maxWidth = "540px";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  const statsRow = document.createElement("div");
  statsRow.style.display = "flex";
  statsRow.style.gap = "12px";
  statsRow.style.alignItems = "center";
  statsRow.style.fontSize = "0.85rem";
  statsRow.style.justifyContent = "center";
  statsRow.style.flexWrap = "wrap";

  function makePill(label, icon) {
    const wrap = document.createElement("div");
    wrap.style.display = "inline-flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "6px";
    wrap.style.padding = "6px 10px";
    wrap.style.borderRadius = "999px";
    wrap.style.background =
      "radial-gradient(circle at top left, rgba(56,189,248,0.18), rgba(15,23,42,0.96))";
    wrap.style.border = "1px solid rgba(148,163,184,0.7)";
    wrap.style.boxShadow = "0 10px 25px rgba(15,23,42,0.9)";
    wrap.style.backdropFilter = "blur(10px)";

    const iconEl = document.createElement("span");
    iconEl.textContent = icon || "";
    iconEl.style.fontSize = "0.9rem";

    const strong = document.createElement("span");
    strong.style.fontWeight = "700";
    strong.style.fontVariantNumeric = "tabular-nums";
    strong.style.minWidth = "3ch";
    strong.style.textAlign = "right";
    strong.style.fontSize = "0.95rem";

    const span = document.createElement("span");
    span.textContent = label;
    span.style.opacity = "0.82";
    span.style.fontSize = "0.78rem";

    wrap.appendChild(iconEl);
    wrap.appendChild(strong);
    wrap.appendChild(span);

    return { wrap, strong, labelSpan: span };
  }

  const scorePill = makePill("Score", "⭐");
  const movesPill = makePill("Züge übrig", "🎄");

  statsRow.appendChild(scorePill.wrap);
  statsRow.appendChild(movesPill.wrap);
  root.appendChild(statsRow);

  const controlRow = document.createElement("div");
  controlRow.style.display = "flex";
  controlRow.style.gap = "10px";
  controlRow.style.alignItems = "center";
  controlRow.style.justifyContent = "center";
  controlRow.style.marginTop = "2px";
  controlRow.style.flexWrap = "wrap";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Neu starten";
  resetBtn.style.padding = "6px 14px";
  resetBtn.style.borderRadius = "999px";
  resetBtn.style.border = "none";
  resetBtn.style.cursor = "pointer";
  resetBtn.style.fontSize = "0.85rem";
  resetBtn.style.fontWeight = "600";
  resetBtn.style.background =
    "linear-gradient(135deg, #22c55e, #16a34a)";
  resetBtn.style.color = "#020617";
  resetBtn.style.boxShadow =
    "0 0 0 1px rgba(34,197,94,0.35), 0 12px 24px rgba(22,163,74,0.6)";
  resetBtn.style.transition =
    "transform 0.12s ease-out, box-shadow 0.12s ease-out, filter 0.12s ease-out";

  resetBtn.addEventListener("mouseenter", () => {
    resetBtn.style.transform = "translateY(-1px)";
    resetBtn.style.boxShadow =
      "0 0 0 1px rgba(34,197,94,0.4), 0 16px 30px rgba(22,163,74,0.7)";
    resetBtn.style.filter = "brightness(1.03)";
  });
  resetBtn.addEventListener("mouseleave", () => {
    resetBtn.style.transform = "translateY(0)";
    resetBtn.style.boxShadow =
      "0 0 0 1px rgba(34,197,94,0.35), 0 12px 24px rgba(22,163,74,0.6)";
    resetBtn.style.filter = "none";
  });

  const statusBar = document.createElement("div");
  statusBar.style.fontSize = "0.8rem";
  statusBar.style.opacity = "0.9";
  statusBar.style.minHeight = "1.2em";
  statusBar.style.textAlign = "center";

  function setStatus(text) {
    statusBar.textContent = text;
  }

  controlRow.appendChild(resetBtn);
  controlRow.appendChild(statusBar);
  root.appendChild(controlRow);

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "16px";
  layout.style.alignItems = "flex-start";
  layout.style.marginTop = "6px";
  layout.style.justifyContent = "center";
  layout.style.width = "100%";

  const left = document.createElement("div");
  left.style.flex = "0 0 auto";

  const right = document.createElement("aside");
  right.style.flex = "0 0 220px";
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "10px";

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);
  container.appendChild(root);

  // Canvas-Bereich
  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.borderRadius = "14px";
  canvasWrapper.style.background =
    "radial-gradient(circle at top, #0b1725, #020617)";
  canvasWrapper.style.boxShadow =
    "0 18px 40px rgba(15,23,42,0.95)";
  canvasWrapper.style.padding = "10px";
  canvasWrapper.style.border = "1px solid rgba(148,163,184,0.8)";

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.borderRadius = "10px";
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvasWrapper.appendChild(canvas);
  left.appendChild(canvasWrapper);

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.fontSize = "1.1rem";
  overlay.style.fontWeight = "700";
  overlay.style.color = "rgba(248,250,252,0.98)";
  overlay.style.textShadow = "0 0 10px rgba(15,23,42,0.9)";
  overlay.style.pointerEvents = "none";
  overlay.style.opacity = "0";
  overlay.style.transition =
    "opacity 0.35s ease-out, transform 0.35s ease-out";
  overlay.style.transform = "translateY(10px) scale(0.98)";
  overlay.style.background = "rgba(15,23,42,0.88)";
  overlay.style.backdropFilter = "blur(4px)";
  overlay.style.borderRadius = "14px";
  overlay.style.margin = "12px";
  overlay.style.padding = "14px 18px";
  overlay.style.textAlign = "center";
  overlay.style.whiteSpace = "pre-line";
  canvasWrapper.appendChild(overlay);

  const ctx = canvas.getContext("2d");

  const boardOffsetX = (CANVAS_WIDTH - BOARD_PIXEL_WIDTH) / 2;
  const boardOffsetY = 60;

  function showOverlay(text) {
    overlay.textContent = text;
    overlay.style.opacity = "1";
    overlay.style.transform = "translateY(0) scale(1)";
  }

  function hideOverlay() {
    overlay.style.opacity = "0";
    overlay.style.transform = "translateY(10px) scale(0.98)";
  }

  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "12px";
    card.style.padding = "10px 9px";
    card.style.background = "rgba(15,23,42,0.96)";
    card.style.border = "1px solid rgba(148,163,184,0.7)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "4px";
    card.style.boxShadow = "0 12px 28px rgba(15,23,42,0.9)";

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
    iconEl.style.background = "rgba(15,23,42,0.95)";
    iconEl.style.boxShadow = "0 0 0 1px rgba(148,163,184,0.6)";

    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    titleEl.style.fontSize = "0.8rem";
    titleEl.style.fontWeight = "600";

    head.appendChild(iconEl);
    head.appendChild(titleEl);

    const body = document.createElement("div");
    body.style.fontSize = "0.75rem";
    body.style.opacity = "0.9";

    for (const line of lines) {
      const div = document.createElement("div");
      div.textContent = line;
      body.appendChild(div);
    }

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  const rulesCard = makeSideCard("Wie spielen?", "🍬", [
    "• Ziehe ein Bonbon zu einem benachbarten.",
    "• Nur Swaps mit Match sind erlaubt.",
    "• 3+ in einer Reihe/Spalte → Punkte & Explosion.",
    "• Streifen löschen Reihe/Spalte, Bomben 3x3.",
    "• Farbbombe löscht alle Bonbons einer Farbe.",
    "• Bonbons fallen nach, neue erscheinen → Cascades.",
  ]);

  const starsCard = makeSideCard("Sterne & Ziele", "⭐", [
    "Braun: 10.000 Punkte",
    "Silber: 20.000 Punkte",
    "Gold: 25.000 Punkte",
    "Rot: 40.000 Punkte",
    "",
    "Je mehr Cascades, desto fetter der Multiplikator!",
  ]);

  right.appendChild(rulesCard);
  right.appendChild(starsCard);

  // ---------------------------------------------------
  // Spielzustand
  // ---------------------------------------------------

  // Candy: { type, special?: 'bomb'|'stripH'|'stripV'|'color', fallFromRow?, fallToRow? }

  let board = [];
  let score = 0;
  let movesLeft = MAX_MOVES;
  let gameOver = false;
  let hasReportedWin = false;

  let selectedCell = null;
  let animation = null;
  let lastTimestamp = null;
  let resolvingChain = false;
  let chainLevel = 0;
  let destroyed = false;

  // Drag-Status
  let isDragging = false;
  let dragStartCell = null;
  let dragStartPos = null;
  let lastDragPos = null;

  // Floating-Score / Combo-Text
  let floatingTexts = []; // { x, y, text, size, startTime, duration }

  function updateHUD() {
    scorePill.strong.textContent = String(score);
    movesPill.strong.textContent = String(movesLeft);
  }

  function addFloatingText(x, y, text, size, duration) {
    floatingTexts.push({
      x,
      y,
      text,
      size: size || 16,
      startTime: performance.now(),
      duration: duration || 900,
    });
  }

  // ---------------------------------------------------
  // Board-Logik
  // ---------------------------------------------------

  function getCandy(row, col) {
    if (
      row < 0 ||
      row >= GRID_ROWS ||
      col < 0 ||
      col >= GRID_COLS ||
      !board[row]
    ) {
      return null;
    }
    return board[row][col];
  }

  function getType(row, col) {
    const candy = getCandy(row, col);
    return candy ? candy.type : null;
  }

  function randomCandyTypeAvoidImmediateMatch(row, col) {
    const forbidden = new Set();

    const left1 = getType(row, col - 1);
    const left2 = getType(row, col - 2);
    if (left1 !== null && left1 === left2) forbidden.add(left1);

    const up1 = getType(row - 1, col);
    const up2 = getType(row - 2, col);
    if (up1 !== null && up1 === up2) forbidden.add(up1);

    let t;
    do {
      t = randInt(CANDY_TYPES);
    } while (forbidden.has(t));
    return t;
  }

  function generateInitialBoard() {
    board = new Array(GRID_ROWS);
    for (let r = 0; r < GRID_ROWS; r++) {
      board[r] = new Array(GRID_COLS);
      for (let c = 0; c < GRID_COLS; c++) {
        const type = randomCandyTypeAvoidImmediateMatch(r, c);
        const special = randomSpecialType(); // Specials können sofort existieren
        board[r][c] = { type, special };
      }
    }
  }

  function findAllMatches() {
    const matchMask = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      matchMask[r] = new Array(GRID_COLS).fill(false);
    }

    // Horizontal
    for (let r = 0; r < GRID_ROWS; r++) {
      let c = 0;
      while (c < GRID_COLS) {
        const type = getType(r, c);
        if (type === null) {
          c++;
          continue;
        }
        let c2 = c + 1;
        while (c2 < GRID_COLS && getType(r, c2) === type) c2++;
        const length = c2 - c;
        if (length >= 3) {
          for (let i = c; i < c2; i++) matchMask[r][i] = true;
        }
        c = c2;
      }
    }

    // Vertikal
    for (let c = 0; c < GRID_COLS; c++) {
      let r = 0;
      while (r < GRID_ROWS) {
        const type = getType(r, c);
        if (type === null) {
          r++;
          continue;
        }
        let r2 = r + 1;
        while (r2 < GRID_ROWS && getType(r2, c) === type) r2++;
        const length = r2 - r;
        if (length >= 3) {
          for (let i = r; i < r2; i++) matchMask[i][c] = true;
        }
        r = r2;
      }
    }

    // Gruppen extrahieren (zusammenhängende Bereiche)
    const visited = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      visited[r] = new Array(GRID_COLS).fill(false);
    }

    const matches = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (!matchMask[r][c] || visited[r][c]) continue;
        const group = [];
        const stack = [{ r, c }];
        visited[r][c] = true;

        while (stack.length) {
          const { r: rr, c: cc } = stack.pop();
          group.push({ r: rr, c: cc });

          const neighbors = [
            { r: rr - 1, c: cc },
            { r: rr + 1, c: cc },
            { r: rr, c: cc - 1 },
            { r: rr, c: cc + 1 },
          ];
          for (const n of neighbors) {
            if (
              n.r >= 0 &&
              n.r < GRID_ROWS &&
              n.c >= 0 &&
              n.c < GRID_COLS &&
              matchMask[n.r][n.c] &&
              !visited[n.r][n.c]
            ) {
              visited[n.r][n.c] = true;
              stack.push(n);
            }
          }
        }

        if (group.length > 0) matches.push(group);
      }
    }

    return { matches, matchMask };
  }

  function hasAnyMatches() {
    const { matches } = findAllMatches();
    return matches.length > 0;
  }

  function swapTypes(r1, c1, r2, c2) {
    const tmp = board[r1][c1];
    board[r1][c1] = board[r2][c2];
    board[r2][c2] = tmp;
  }

  function hasAnyPossibleMove() {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dirs = [
          { dr: 0, dc: 1 },
          { dr: 1, dc: 0 },
        ];
        for (const d of dirs) {
          const r2 = r + d.dr;
          const c2 = c + d.dc;
          if (r2 >= GRID_ROWS || c2 >= GRID_COLS) continue;

          swapTypes(r, c, r2, c2);
          const { matches } = findAllMatches();
          swapTypes(r, c, r2, c2);

          if (matches.length > 0) return true;
        }
      }
    }
    return false;
  }

  function resetGame() {
    score = 0;
    movesLeft = MAX_MOVES;
    gameOver = false;
    hasReportedWin = false;
    selectedCell = null;
    animation = null;
    lastTimestamp = null;
    resolvingChain = false;
    chainLevel = 0;
    floatingTexts = [];
    hideOverlay();

    let attempts = 0;
    do {
      generateInitialBoard();
      attempts++;
      if (attempts > 40) break;
    } while (hasAnyMatches() || !hasAnyPossibleMove());

    updateHUD();
    setStatus("Ziehe ein Bonbon zu einem benachbarten, um Swaps zu machen.");
    drawScene(0);
  }

  // ---------------------------------------------------
  // Zeichnen
  // ---------------------------------------------------

  const candyColors = [
    "#fb7185", // rosa
    "#38bdf8", // blau
    "#facc15", // gelb
    "#a855f7", // lila
    "#22c55e", // grün
    "#f97316", // orange
  ];

  function shadeColor(col, percent) {
    const num = parseInt(col.slice(1), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00ff) + percent;
    let b = (num & 0x0000ff) + percent;
    r = clamp(r, 0, 255);
    g = clamp(g, 0, 255);
    b = clamp(b, 0, 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.4, "#0b1628");
    grad.addColorStop(1, "#050816");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Schneehügel unten
    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - 40);
    ctx.quadraticCurveTo(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT - 70,
      CANVAS_WIDTH,
      CANVAS_HEIGHT - 40
    );
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Lichterkette oben
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const nLights = 18;
    for (let i = 0; i < nLights; i++) {
      const x = (i / (nLights - 1)) * CANVAS_WIDTH;
      const y = 22 + Math.sin(i * 0.7) * 4;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBoardGrid(timestamp) {
    ctx.save();
    ctx.translate(boardOffsetX, boardOffsetY);

    const chainGlow =
      resolvingChain || (animation && animation.kind === "clear")
        ? clamp(0.2 + 0.1 * chainLevel, 0.2, 0.6)
        : 0.2;

    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.strokeStyle = `rgba(${148 + chainGlow * 100},${163},${184},0.9)`;
    ctx.lineWidth = 2 + chainGlow * 4;

    ctx.beginPath();
    ctx.roundRect(
      -6,
      -6,
      BOARD_PIXEL_WIDTH + 12,
      BOARD_PIXEL_HEIGHT + 12,
      12
    );
    ctx.fill();
    ctx.stroke();

    // Zellen
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        ctx.fillStyle =
          (r + c) % 2 === 0
            ? "rgba(15,23,42,0.9)"
            : "rgba(15,23,42,0.8)";
        ctx.strokeStyle = "rgba(30,64,175,0.7)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.roundRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6, 10);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawCandy(candy, cxp, cyp, size, selected, clearing, alpha, scale) {
    const baseColor = candyColors[candy.type] || "#ffffff";
    const radius = (size / 2) * (scale || 1);
    const special = candy.special;

    ctx.save();
    ctx.translate(cxp, cyp);
    ctx.globalAlpha = alpha;

    if (clearing) {
      ctx.shadowColor = "rgba(248,250,252,0.9)";
      ctx.shadowBlur = 18;
    } else if (selected) {
      ctx.shadowColor = "rgba(252,211,77,0.9)";
      ctx.shadowBlur = 16;
    } else {
      ctx.shadowColor = "rgba(15,23,42,0.8)";
      ctx.shadowBlur = 8;
    }

    const grad = ctx.createRadialGradient(
      -radius / 3,
      -radius / 3,
      radius / 4,
      0,
      0,
      radius
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.25, baseColor);
    grad.addColorStop(1, shadeColor(baseColor, -25));

    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(15,23,42,0.8)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-radius, -radius, radius * 2, radius * 2, radius * 0.6);
    ctx.fill();
    ctx.stroke();

    // Glasur-Streifen (nur wenn keine Farbbombe)
    if (special !== "color") {
      ctx.globalAlpha *= 0.6;
      ctx.strokeStyle = "rgba(248,250,252,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.7, -radius * 0.3);
      ctx.lineTo(radius * 0.7, -radius * 0.1);
      ctx.moveTo(-radius * 0.7, radius * 0.1);
      ctx.lineTo(radius * 0.7, radius * 0.3);
      ctx.stroke();
    }

    // Spezielle Overlays
    if (special === "bomb") {
      ctx.globalAlpha = alpha;
      const r2 = radius * 0.45;
      ctx.fillStyle = "rgba(15,23,42,0.95)";
      ctx.strokeStyle = "rgba(248,250,252,0.9)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-r2 * 0.6, 0);
      ctx.lineTo(r2 * 0.6, 0);
      ctx.moveTo(0, -r2 * 0.6);
      ctx.lineTo(0, r2 * 0.6);
      ctx.stroke();
    } else if (special === "stripH") {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(248,250,252,0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.9, -radius * 0.4);
      ctx.lineTo(radius * 0.9, -radius * 0.2);
      ctx.moveTo(-radius * 0.9, 0);
      ctx.lineTo(radius * 0.9, 0.2 * radius);
      ctx.moveTo(-radius * 0.9, radius * 0.4);
      ctx.lineTo(radius * 0.9, radius * 0.6);
      ctx.stroke();
    } else if (special === "stripV") {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(248,250,252,0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.4, -radius * 0.9);
      ctx.lineTo(-radius * 0.2, radius * 0.9);
      ctx.moveTo(0, -radius * 0.9);
      ctx.lineTo(0.2 * radius, radius * 0.9);
      ctx.moveTo(radius * 0.4, -radius * 0.9);
      ctx.lineTo(radius * 0.6, radius * 0.9);
      ctx.stroke();
    } else if (special === "color") {
      // Farbbombe – bunter Rand / Core
      const r2 = radius * 0.6;
      ctx.globalAlpha = alpha;
      const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r2);
      grad2.addColorStop(0, "#ffffff");
      grad2.addColorStop(0.3, "#fde68a");
      grad2.addColorStop(0.6, "#a855f7");
      grad2.addColorStop(1, "#22c55e");
      ctx.fillStyle = grad2;
      ctx.strokeStyle = "rgba(15,23,42,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawFloatingTexts(timestamp) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const now = timestamp || performance.now();

    floatingTexts = floatingTexts.filter((t) => {
      const dt = (now - t.startTime) / t.duration;
      if (dt >= 1) return false;
      const alpha = 1 - dt;
      const offsetY = -dt * 30;

      ctx.globalAlpha = alpha;
      ctx.font = `bold ${t.size || 18}px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'`;
      ctx.fillStyle = "rgba(248,250,252,0.97)";
      ctx.strokeStyle = "rgba(15,23,42,0.7)";
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y + offsetY);
      ctx.fillText(t.text, t.x, t.y + offsetY);
      return true;
    });

    ctx.restore();
  }

  function drawScene(timestamp) {
    drawBackground();
    drawBoardGrid(timestamp);

    ctx.save();
    ctx.translate(boardOffsetX, boardOffsetY);

    let matchMask = null;
    let clearProgress = 0;
    let fallProgress = 0;
    let fallingCandies = null;
    let swapProgress = 0;
    let swapData = null;

    if (animation) {
      const t = clamp(
        (timestamp - animation.startTime) / animation.duration,
        0,
        1
      );
      if (animation.kind === "swap") {
        swapProgress = t;
        swapData = animation;
      } else if (animation.kind === "clear") {
        clearProgress = t;
        matchMask = animation.matchMask;
      } else if (animation.kind === "fall") {
        fallProgress = t;
        fallingCandies = animation.falling;
      }
    }

    const fallingSet = new Set();
    if (fallingCandies) {
      for (const f of fallingCandies) fallingSet.add(f.candy);
    }

    // Drag-Info für Visual-Drag
    let dragInfo = null;
    if (
      isDragging &&
      dragStartCell &&
      dragStartPos &&
      lastDragPos &&
      !animation &&
      !resolvingChain &&
      !gameOver
    ) {
      const dx = lastDragPos.x - dragStartPos.x;
      const dy = lastDragPos.y - dragStartPos.y;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        let neighbor = null;
        let dragDx = 0;
        let dragDy = 0;

        if (Math.abs(dx) > Math.abs(dy)) {
          const dir = dx > 0 ? 1 : -1;
          neighbor = {
            row: dragStartCell.row,
            col: dragStartCell.col + dir,
          };
          dragDx = clamp(dx, -TILE_SIZE, TILE_SIZE);
          dragDy = 0;
        } else {
          const dir = dy > 0 ? 1 : -1;
          neighbor = {
            row: dragStartCell.row + dir,
            col: dragStartCell.col,
          };
          dragDx = 0;
          dragDy = clamp(dy, -TILE_SIZE, TILE_SIZE);
        }

        if (
          neighbor &&
          neighbor.row >= 0 &&
          neighbor.row < GRID_ROWS &&
          neighbor.col >= 0 &&
          neighbor.col < GRID_COLS
        ) {
          dragInfo = {
            start: dragStartCell,
            neighbor,
            dx: dragDx,
            dy: dragDy,
          };
        }
      }
    }

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const candy = board[r][c];
        if (!candy) continue;

        const baseX = c * TILE_SIZE + TILE_SIZE / 2;
        const baseY = r * TILE_SIZE + TILE_SIZE / 2;

        let x = baseX;
        let y = baseY;
        let alpha = 1;
        let scale = 1;

        let highlight = false;
        let isClearing = false;

        // Drag-Visual
        if (dragInfo) {
          const s = dragInfo.start;
          const n = dragInfo.neighbor;

          if (r === s.row && c === s.col) {
            x += dragInfo.dx;
            y += dragInfo.dy;
            highlight = true;
          } else if (r === n.row && c === n.col) {
            x -= dragInfo.dx * 0.6;
            y -= dragInfo.dy * 0.6;
            highlight = true;
          }
        }

        // Selection-Highlight
        if (
          selectedCell &&
          selectedCell.row === r &&
          selectedCell.col === c
        ) {
          highlight = true;
        }

        // Swap-Animation
        if (swapData) {
          const { r1, c1, r2, c2, valid } = swapData;
          const t = swapProgress;
          const travel = valid ? t : t < 0.5 ? t * 2 : 2 - t * 2;
          const dx = (c2 - c1) * TILE_SIZE;
          const dy = (r2 - r1) * TILE_SIZE;

          if (r === r1 && c === c1) {
            x = baseX + dx * travel;
            y = baseY + dy * travel;
          } else if (r === r2 && c === c2) {
            x = baseX - dx * travel;
            y = baseY - dy * travel;
          }
        }

        // Clear-Animation
        if (matchMask && matchMask[r][c]) {
          isClearing = true;
          const s = Math.sin(clearProgress * Math.PI);
          scale = 1 + 0.35 * s;
          alpha = 1 - clearProgress;
        }

        // Fall-Animation
        if (fallingSet.has(candy) && fallingCandies) {
          const entry = fallingCandies.find((f) => f.candy === candy);
          if (entry) {
            const fromY =
              entry.fromRow * TILE_SIZE + TILE_SIZE / 2;
            const toY =
              entry.toRow * TILE_SIZE + TILE_SIZE / 2;
            const t = easeOutQuad(fallProgress);
            y = fromY + (toY - fromY) * t;
          }
        }

        drawCandy(
          candy,
          x,
          y,
          TILE_SIZE - 10,
          highlight,
          isClearing,
          alpha,
          scale
        );
      }
    }

    ctx.restore();

    drawFloatingTexts(timestamp);

    // Explosionsringe bei Clear-Animation
    if (animation && animation.kind === "clear" && animation.explosions) {
      const t = clamp(
        (timestamp - animation.startTime) / animation.duration,
        0,
        1
      );
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = 0.6 * alpha;

      for (const e of animation.explosions) {
        const cx =
          boardOffsetX + e.col * TILE_SIZE + TILE_SIZE / 2;
        const cy =
          boardOffsetY + e.row * TILE_SIZE + TILE_SIZE / 2;

        let baseR;
        let color;
        if (e.type === "color") {
          baseR = TILE_SIZE * 2.2;
          color = "rgba(244,244,245,0.98)";
        } else if (e.type === "bomb") {
          baseR = TILE_SIZE * 1.8;
          color = "rgba(248,250,252,0.95)";
        } else {
          baseR = TILE_SIZE * 1.6;
          color = "rgba(251,191,36,0.95)";
        }

        const r = baseR * (0.4 + 1.6 * t);

        ctx.lineWidth = 2 + 5 * t;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ---------------------------------------------------
  // Animation & Loop
  // ---------------------------------------------------

  function startAnimation(kind, data, duration) {
    animation = Object.assign(
      {
        kind,
        startTime: performance.now(),
        duration,
      },
      data
    );
  }

  function finishAnimation(kind) {
    const anim = animation;
    animation = null;

    if (kind === "swap") {
      if (anim.valid) {
        swapTypes(anim.r1, anim.c1, anim.r2, anim.c2);
        movesLeft = Math.max(0, movesLeft - 1);
        updateHUD();
        resolvingChain = true;
        chainLevel = 0;
        resolveMatchesChain();
      } else {
        setStatus("Tausch ohne Match – versuche eine andere Kombination.");
        playSound("swapInvalid");
      }
    } else if (kind === "clear") {
      const { matchMask, scoreGain } = anim;

      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (matchMask[r][c]) board[r][c] = null;
        }
      }

      score += scoreGain;
      updateHUD();

      const falling = computeFall();
      if (falling.length > 0) {
        startAnimation("fall", { falling }, 220);
      } else {
        resolveMatchesChain();
      }
    } else if (kind === "fall") {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const candy = board[r][c];
          if (!candy) continue;
          delete candy.fallFromRow;
          delete candy.fallToRow;
        }
      }
      resolveMatchesChain();
    }
  }

  function step(timestamp) {
    if (destroyed) return;

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
    }

    if (animation) {
      const t = (timestamp - animation.startTime) / animation.duration;
      if (t >= 1) {
        finishAnimation(animation.kind);
      }
    }

    drawScene(timestamp);
    window.requestAnimationFrame(step);
  }

  // ---------------------------------------------------
  // Cascade-Logik & Specials / Streak-Anims
  // ---------------------------------------------------

  function resolveMatchesChain() {
    const result = findAllMatches();
    const matches = result.matches;
    const baseMask = result.matchMask;

    if (matches.length === 0) {
      resolvingChain = false;
      chainLevel = 0;

      if (movesLeft <= 0 && !gameOver) {
        endGame();
      }
      return;
    }

    chainLevel += 1;

    // Start mit Basis-Matches
    const clearMask = baseMask.map((row) => row.slice());

    const explosions = [];
    let anyBombExploded = false;
    let anyStripTriggered = false;
    let anyColorTriggered = false;

    // 1) Existierende Spezial-Bonbons im Match lösen extra Clear aus
    for (const group of matches) {
      for (const cell of group) {
        const r = cell.r;
        const c = cell.c;
        const candy = board[r][c];
        if (!candy || !baseMask[r][c]) continue;

        const special = candy.special;
        if (!special) continue;

        if (special === "bomb") {
          anyBombExploded = true;
          explosions.push({ row: r, col: c, type: "bomb" });
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const rr = r + dr;
              const cc = c + dc;
              if (
                rr >= 0 &&
                rr < GRID_ROWS &&
                cc >= 0 &&
                cc < GRID_COLS
              ) {
                clearMask[rr][cc] = true;
              }
            }
          }
        } else if (special === "stripH") {
          anyStripTriggered = true;
          explosions.push({ row: r, col: c, type: "strip" });
          for (let cc = 0; cc < GRID_COLS; cc++) {
            clearMask[r][cc] = true;
          }
        } else if (special === "stripV") {
          anyStripTriggered = true;
          explosions.push({ row: r, col: c, type: "strip" });
          for (let rr = 0; rr < GRID_ROWS; rr++) {
            clearMask[rr][c] = true;
          }
        } else if (special === "color") {
          anyColorTriggered = true;
          // Ziel-Farbe: irgendein Bonbon aus der Gruppe ohne Special, sonst der eigene Typ
          let targetType = null;
          for (const cell2 of group) {
            const c2 = board[cell2.r][cell2.c];
            if (c2 && !c2.special) {
              targetType = c2.type;
              break;
            }
          }
          if (targetType == null) {
            targetType = candy.type;
          }
          explosions.push({ row: r, col: c, type: "color" });
          for (let rr = 0; rr < GRID_ROWS; rr++) {
            for (let cc = 0; cc < GRID_COLS; cc++) {
              const target = board[rr][cc];
              if (target && !target.special && target.type === targetType) {
                clearMask[rr][cc] = true;
              }
            }
          }
          clearMask[r][c] = true;
        }
      }
    }

    // 2) Neue Specials aus den Match-Gruppen erzeugen (inkl. 3er-Matches → Streifen mit Chance)
    const specialsToCreate = [];

    for (const group of matches) {
      const len = group.length;

      let minR = Infinity,
        maxR = -Infinity,
        minC = Infinity,
        maxC = -Infinity;
      for (const cell of group) {
        minR = Math.min(minR, cell.r);
        maxR = Math.max(maxR, cell.r);
        minC = Math.min(minC, cell.c);
        maxC = Math.max(maxC, cell.c);
      }
      const rowsSpan = maxR - minR + 1;
      const colsSpan = maxC - minC + 1;

      let specialType = null;

      if (len >= 5 && (rowsSpan === 1 || colsSpan === 1)) {
        // 5+ in Linie → Farbbombe
        specialType = "color";
      } else if (len === 4 && (rowsSpan === 1 || colsSpan === 1)) {
        // 4 in Linie → Streifen entsprechend der Richtung
        specialType = rowsSpan === 1 ? "stripH" : "stripV";
      } else if (len >= 4) {
        // 4+ in L/T-Form → Bombe
        specialType = "bomb";
      } else if (len === 3 && Math.random() < SPECIAL_FROM_THREE_CHANCE) {
        // 3er-Match → mit Chance Streifen in Match-Richtung
        if (rowsSpan === 1) {
          specialType = "stripH";
        } else if (colsSpan === 1) {
          specialType = "stripV";
        }
      }

      if (specialType) {
        let pivot = group.find((cell) => {
          const candy = board[cell.r][cell.c];
          return candy && !candy.special;
        });
        if (!pivot) {
          pivot = group[0];
        }
        specialsToCreate.push({
          r: pivot.r,
          c: pivot.c,
          special: specialType,
        });
      }
    }

    // 3) Neue Specials bleiben stehen → nicht clearen
    for (const spec of specialsToCreate) {
      clearMask[spec.r][spec.c] = false;
      const candy = board[spec.r][spec.c];
      if (candy) {
        candy.special = spec.special;
      }
    }

    // 4) Anzahl der tatsächlichen Clear-Kacheln berechnen
    let totalToClear = 0;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (clearMask[r][c] && board[r][c]) totalToClear++;
      }
    }

    if (totalToClear === 0) {
      resolvingChain = false;
      chainLevel = 0;
      if (movesLeft <= 0 && !gameOver) {
        endGame();
      }
      return;
    }

    const base = totalToClear * SCORE_PER_CANDY;
    const bonusFactor = 1 + (chainLevel - 1) * CASCADE_BONUS_FACTOR;
    const scoreGain = Math.round(base * bonusFactor);

    const centerX = CANVAS_WIDTH / 2;
    const centerY = boardOffsetY + BOARD_PIXEL_HEIGHT / 2;
    addFloatingText(centerX, centerY, `+${scoreGain}`, 26, 1050);
    if (chainLevel > 1) {
      addFloatingText(
        centerX,
        centerY - 36,
        `Combo x${chainLevel}`,
        22,
        1100
      );
    }
    if (anyBombExploded || anyStripTriggered || anyColorTriggered) {
      addFloatingText(centerX, centerY + 30, "BOOM!", 22, 900);
      playSound("bomb");
    } else {
      playSound("clear");
    }

    startAnimation(
      "clear",
      {
        matchMask: clearMask,
        totalMatched: totalToClear,
        scoreGain,
        explosions,
      },
      220
    );
  }

  function computeFall() {
    const falling = [];

    for (let c = 0; c < GRID_COLS; c++) {
      let writeRow = GRID_ROWS - 1;

      for (let r = GRID_ROWS - 1; r >= 0; r--) {
        const candy = board[r][c];
        if (candy) {
          if (writeRow !== r) {
            board[writeRow][c] = candy;
            board[r][c] = null;

            candy.fallFromRow =
              typeof candy.fallFromRow === "number"
                ? candy.fallFromRow
                : r;
            candy.fallToRow = writeRow;

            falling.push({
              candy,
              fromRow: candy.fallFromRow,
              toRow: candy.fallToRow,
            });
          }
          writeRow--;
        }
      }

      // neue Candies
      for (let r = writeRow; r >= 0; r--) {
        const type = randInt(CANDY_TYPES);
        const special = randomSpecialType(); // Chance auf Bomben / Streifen
        const candy = {
          type,
          special,
          fallFromRow: r - (writeRow + 1) - 1,
          fallToRow: r,
        };
        board[r][c] = candy;
        falling.push({
          candy,
          fromRow: candy.fallFromRow,
          toRow: candy.fallToRow,
        });
      }
    }

    return falling;
  }

  // ---------------------------------------------------
  // Input: Drag-Swaps
  // ---------------------------------------------------

  function areAdjacent(a, b) {
    if (!a || !b) return false;
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  function getCanvasCoords(ev) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (ev.touches && ev.touches.length > 0) {
      clientX = ev.touches[0].clientX;
      clientY = ev.touches[0].clientY;
    } else if (ev.changedTouches && ev.changedTouches.length > 0) {
      clientX = ev.changedTouches[0].clientX;
      clientY = ev.changedTouches[0].clientY;
    } else {
      clientX = ev.clientX;
      clientY = ev.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }

  function cellFromCoords(x, y) {
    const bx = x - boardOffsetX;
    const by = y - boardOffsetY;
    if (bx < 0 || by < 0) return null;
    const col = Math.floor(bx / TILE_SIZE);
    const row = Math.floor(by / TILE_SIZE);
    if (
      row < 0 ||
      row >= GRID_ROWS ||
      col < 0 ||
      col >= GRID_COLS
    )
      return null;
    return { row, col };
  }

  function trySwap(cellA, cellB) {
    if (gameOver) return;
    if (animation) return;
    if (resolvingChain) return;
    if (movesLeft <= 0) return;
    if (!cellA || !cellB) return;
    if (!areAdjacent(cellA, cellB)) return;
    if (!getCandy(cellA.row, cellA.col) || !getCandy(cellB.row, cellB.col))
      return;

    const r1 = cellA.row;
    const c1 = cellA.col;
    const r2 = cellB.row;
    const c2 = cellB.col;

    swapTypes(r1, c1, r2, c2);
    const { matches } = findAllMatches();
    swapTypes(r1, c1, r2, c2);

    if (matches.length === 0) {
      startAnimation("swap", { r1, c1, r2, c2, valid: false }, 180);
      setStatus("Tausch ohne Match – versuche eine andere Kombination.");
      playSound("swapInvalid");
      return;
    }

    setStatus("Match erzielt – Bonbons explodieren!");
    playSound("swapValid");
    startAnimation("swap", { r1, c1, r2, c2, valid: true }, 160);
  }

  function pointerDown(ev) {
    if (gameOver || animation || resolvingChain || movesLeft <= 0) return;

    if (!audioCtx) {
      ensureAudioContext();
    }

    ev.preventDefault();
    const pos = getCanvasCoords(ev);
    const cell = cellFromCoords(pos.x, pos.y);
    if (!cell) return;
    if (!getCandy(cell.row, cell.col)) return;

    isDragging = true;
    dragStartCell = cell;
    dragStartPos = pos;
    lastDragPos = pos;
    selectedCell = cell;
    setStatus("Ziehe auf ein benachbartes Bonbon, um zu tauschen.");
  }

  function pointerMove(ev) {
    if (!isDragging) return;
    ev.preventDefault();
    const pos = getCanvasCoords(ev);
    lastDragPos = pos;
  }

  function pointerUp(ev) {
    if (!isDragging) return;
    ev.preventDefault();

    const pos = lastDragPos || dragStartPos;
    const dx = pos.x - dragStartPos.x;
    const dy = pos.y - dragStartPos.y;
    const dragDist = Math.max(Math.abs(dx), Math.abs(dy));
    const DRAG_THRESHOLD = 8;

    const start = dragStartCell;

    isDragging = false;
    dragStartCell = null;
    dragStartPos = null;
    lastDragPos = null;
    selectedCell = null;

    if (!start) return;

    if (dragDist < DRAG_THRESHOLD) {
      return;
    }

    let target = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      const dir = dx > 0 ? 1 : -1;
      target = { row: start.row, col: start.col + dir };
    } else {
      const dir = dy > 0 ? 1 : -1;
      target = { row: start.row + dir, col: start.col };
    }

    if (
      !target ||
      target.row < 0 ||
      target.row >= GRID_ROWS ||
      target.col < 0 ||
      target.col >= GRID_COLS
    ) {
      return;
    }

    trySwap(start, target);
  }

  canvas.addEventListener("mousedown", pointerDown);
  canvas.addEventListener("touchstart", pointerDown, { passive: false });
  window.addEventListener("mousemove", pointerMove);
  window.addEventListener("touchmove", pointerMove, { passive: false });
  window.addEventListener("mouseup", pointerUp);
  window.addEventListener("touchend", pointerUp);

  resetBtn.addEventListener("click", () => {
    resetGame();
  });

  // ---------------------------------------------------
  // Spielende
  // ---------------------------------------------------

  function endGame() {
    gameOver = true;
    let text = `${score} Punkte – keine Züge mehr.\n`;
    const star = starForScore(score);

    if (star) {
      text += `→ ${star.label}!`;
      playSound("endGood");
      if (!hasReportedWin) {
        hasReportedWin = true;

        try {
          if (
            typeof window !== "undefined" &&
            typeof window.playVictorySound === "function"
          ) {
            window.playVictorySound();
          }
        } catch (e) {}

        try {
          onWin(star);
        } catch (e) {
          console.error("candy_crush_16 onWin error:", e);
        }
      }
    } else {
      text += "Noch kein Stern – versuch es nochmal!";
      playSound("endFail");
    }

    showOverlay(text);
    setStatus("Klicke auf „Neu starten“, um es nochmal zu versuchen.");
  }

  // ---------------------------------------------------
  // Start
  // ---------------------------------------------------

  resetGame();
  window.requestAnimationFrame(step);

  // ---------------------------------------------------
  // Cleanup
  // ---------------------------------------------------

  return {
    destroy() {
      destroyed = true;
      try {
        canvas.removeEventListener("mousedown", pointerDown);
        canvas.removeEventListener("touchstart", pointerDown);
        window.removeEventListener("mousemove", pointerMove);
        window.removeEventListener("touchmove", pointerMove);
        window.removeEventListener("mouseup", pointerUp);
        window.removeEventListener("touchend", pointerUp);
      } catch (e) {}
    },
  };
};
