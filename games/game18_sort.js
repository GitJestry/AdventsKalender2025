window.AdventGames = window.AdventGames || {};

window.AdventGames["sort_18"] = function (container, options) {
  "use strict";

  const onWin =
    options && typeof options.onWin === "function" ? options.onWin : () => {};

  // Container vorbereiten
  container.innerHTML = "";
  container.style.position = "relative";

  // ---------------------------------------------------
  // Globales Styling (Animationen)
  // ---------------------------------------------------
  (function injectSort18Styles() {
    const style = document.createElement("style");
    style.textContent = `
      .sort18-item-pop {
        animation: sort18-pop 220ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
      }
      @keyframes sort18-pop {
        0%   { transform: scale(1);   opacity: 1; }
        50%  { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(0.4); opacity: 0; }
      }

      .sort18-slot-drop {
        animation: sort18-drop 160ms cubic-bezier(0.17, 0.89, 0.32, 1.28);
      }
      @keyframes sort18-drop {
        0%   { transform: translateY(-10px) scale(0.9); }
        100% { transform: translateY(0) scale(1); }
      }

      .sort18-shelf-match {
        animation: sort18-shelf-glow 260ms ease-out;
      }
      @keyframes sort18-shelf-glow {
        0%   { box-shadow: 0 0 0 0 rgba(251,191,36,0.0); }
        100% { box-shadow: 0 0 0 4px rgba(251,191,36,0.7); }
      }

      .sort18-overlay-pop {
        animation: sort18-overlay-pop 220ms ease-out;
      }
      @keyframes sort18-overlay-pop {
        0%   { transform: scale(0.85); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    if (document.head) {
      document.head.appendChild(style);
    } else {
      container.appendChild(style);
    }
  })();

  // ---------------------------------------------------
  // Simple Soundengine (Web Audio)
  // ---------------------------------------------------
  let audioCtx = null;
  function getAudioCtx() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function playBeep(opts) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const {
      freq = 440,
      duration = 0.12,
      type = "sine",
      volume = 0.25,
      attack = 0.01,
      decay = 0.09,
    } = opts || {};

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + attack);
      gain.gain.linearRampToValueAtTime(0.0001, now + attack + decay);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio kann failen, ist aber nicht kritisch
    }
  }

  const sfx = {
    pick() {
      playBeep({ freq: 520, type: "triangle", volume: 0.18 });
    },
    drop() {
      playBeep({ freq: 420, type: "sine", volume: 0.2 });
    },
    error() {
      playBeep({ freq: 220, type: "square", volume: 0.18 });
    },
    match() {
      // Zwei kurze Pops
      playBeep({ freq: 700, type: "triangle", volume: 0.22 });
      setTimeout(
        () => playBeep({ freq: 900, type: "triangle", volume: 0.22 }),
        70
      );
    },
    win() {
      playBeep({ freq: 600, type: "sine", duration: 0.18, volume: 0.22 });
      setTimeout(
        () =>
          playBeep({
            freq: 800,
            type: "sine",
            duration: 0.24,
            volume: 0.22,
          }),
        140
      );
      setTimeout(
        () =>
          playBeep({
            freq: 1000,
            type: "triangle",
            duration: 0.3,
            volume: 0.22,
          }),
        280
      );
    },
  };

  // ---------------------------------------------------
  // Konfiguration
  // ---------------------------------------------------

  const ITEM_META = {
    bottle: { label: "Flasche", icon: "🥤" },
    can: { label: "Dose", icon: "🥫" },
    book: { label: "Buch", icon: "📘" },
    plant: { label: "Pflanze", icon: "🪴" },
    mug: { label: "Tasse", icon: "☕" },
    jar: { label: "Glas", icon: "🫙" },
    box: { label: "Paket", icon: "📦" },
  };

  // 3 feste Level – alle Items liegen in Regalen, du verschiebst sie
  const LEVELS = [
    {
      id: 1,
      shelves: 3,
      capacity: 5,
      items: [
        "bottle", "bottle", "bottle",
        "can",    "can",    "can",
        "book",   "book",   "book",
        "plant",  "plant",  "plant",
      ],
    },
    {
      id: 2,
      shelves: 4,
      capacity: 6,
      items: [
        "bottle","bottle","bottle",
        "can","can","can",
        "book","book","book",
        "plant","plant","plant",
        "mug","mug","mug",
        "jar","jar","jar",
      ],
    },
    {
      id: 3,
      shelves: 5,
      capacity: 6,
      items: [
        "bottle","bottle","bottle",
        "can","can","can",
        "book","book","book",
        "plant","plant","plant",
        "mug","mug","mug",
        "jar","jar","jar",
        "box","box","box",
      ],
    },
  ];

  const TOTAL_LEVELS = LEVELS.length;

  // Stern nach Gesamtzeit (in Sekunden)
  function starForTotalSeconds(sec) {
    if (sec <= 180) {
      return { level: "red", label: "Roter Stern" };
    }
    if (sec <= 300) {
      return { level: "gold", label: "Goldener Stern" };
    }
    if (sec <= 480) {
      return { level: "silver", label: "Silberner Stern" };
    }
    return { level: "brown", label: "Brauner Stern" };
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return String(m).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // ---------------------------------------------------
  // DOM-Struktur
  // ---------------------------------------------------

  const root = document.createElement("div");
  root.className = "shelf-sort-18-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "6px";
  root.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  root.style.maxWidth = "420px";
  root.style.margin = "0 auto";
  root.style.color = "#020617";

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 18 – Regal-Sortierer";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.05rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Verschiebe die Gegenstände zwischen den Regalen. Drei gleiche nebeneinander auf einem Regal verschwinden.";
  subtitleEl.style.fontSize = "0.8rem";
  subtitleEl.style.opacity = "0.9";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  // Info-Zeile (Level / Zeit / verbleibend)
  const infoRow = document.createElement("div");
  infoRow.style.display = "flex";
  infoRow.style.gap = "6px";
  infoRow.style.alignItems = "center";
  infoRow.style.fontSize = "0.78rem";
  infoRow.style.marginTop = "2px";

  function makeInfoPill() {
    const wrap = document.createElement("div");
    wrap.style.display = "inline-flex";
    wrap.style.alignItems = "center";
    wrap.style.gap = "4px";
    wrap.style.padding = "3px 8px";
    wrap.style.borderRadius = "999px";
    wrap.style.background = "rgba(15,23,42,0.96)";
    wrap.style.border = "1px solid rgba(148,163,184,0.7)";
    wrap.style.color = "rgba(248,250,252,0.98)";
    const strong = document.createElement("span");
    strong.style.fontWeight = "600";
    const labelSpan = document.createElement("span");
    wrap.appendChild(strong);
    wrap.appendChild(labelSpan);
    return { wrap, strong, labelSpan };
  }

  const levelInfo = makeInfoPill();
  const timeInfo = makeInfoPill();
  const remainingInfo = makeInfoPill();

  levelInfo.labelSpan.textContent = "Level";
  timeInfo.labelSpan.textContent = "Zeit";
  remainingInfo.labelSpan.textContent = "Verbleibend";

  remainingInfo.wrap.style.marginLeft = "auto";

  infoRow.appendChild(levelInfo.wrap);
  infoRow.appendChild(timeInfo.wrap);
  infoRow.appendChild(remainingInfo.wrap);
  root.appendChild(infoRow);

  // Statuszeile
  const statusRow = document.createElement("div");
  statusRow.style.fontSize = "0.78rem";
  statusRow.style.opacity = "0.9";
  statusRow.style.marginTop = "2px";
  root.appendChild(statusRow);

  function setStatus(text) {
    statusRow.textContent = text;
  }

  // Wrapper für Spielfeld
  const gameWrapper = document.createElement("div");
  gameWrapper.style.display = "flex";
  gameWrapper.style.flexDirection = "column";
  gameWrapper.style.gap = "10px";
  gameWrapper.style.marginTop = "8px";
  root.appendChild(gameWrapper);

  // Regal-Bereich (Holz-Optik außen, helle Bretter innen)
  const shelfArea = document.createElement("div");
  shelfArea.style.borderRadius = "18px";
  shelfArea.style.padding = "10px 10px 12px";
  shelfArea.style.background =
    "repeating-linear-gradient( 90deg, #b45309, #b45309 14px, #92400e 14px, #92400e 28px)";
  shelfArea.style.border = "2px solid #78350f";
  shelfArea.style.boxShadow = "0 8px 18px rgba(15,23,42,0.45)";
  shelfArea.style.display = "flex";
  shelfArea.style.flexDirection = "column";
  shelfArea.style.gap = "6px";

  const shelfTitleRow = document.createElement("div");
  shelfTitleRow.style.display = "flex";
  shelfTitleRow.style.justifyContent = "space-between";
  shelfTitleRow.style.alignItems = "center";

  const shelfTitle = document.createElement("div");
  shelfTitle.textContent = "Regale";
  shelfTitle.style.fontSize = "0.82rem";
  shelfTitle.style.fontWeight = "600";
  shelfTitle.style.color = "#fefce8";

  shelfTitleRow.appendChild(shelfTitle);
  shelfArea.appendChild(shelfTitleRow);

  const shelvesContainer = document.createElement("div");
  shelvesContainer.style.display = "flex";
  shelvesContainer.style.flexDirection = "column";
  shelvesContainer.style.gap = "6px";
  shelvesContainer.style.marginTop = "4px";
  shelfArea.appendChild(shelvesContainer);

  gameWrapper.appendChild(shelfArea);

  // Unterer Hinweisbereich
  const controlsArea = document.createElement("div");
  controlsArea.style.borderRadius = "16px";
  controlsArea.style.padding = "8px 10px 9px";
  controlsArea.style.background =
    "linear-gradient(180deg, #0f172a, #020617)";
  controlsArea.style.border = "1px solid rgba(15,23,42,0.95)";
  controlsArea.style.boxShadow = "0 6px 14px rgba(15,23,42,0.7)";
  controlsArea.style.display = "flex";
  controlsArea.style.flexDirection = "row";
  controlsArea.style.alignItems = "center";
  controlsArea.style.gap = "8px";
  controlsArea.style.color = "rgba(248,250,252,0.98)";

  const controlsText = document.createElement("div");
  controlsText.textContent =
    "Tipp: Fülle ein Regal so, dass drei gleiche nebeneinander liegen.";
  controlsText.style.fontSize = "0.78rem";
  controlsText.style.flex = "1 1 auto";

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.textContent = "Level neu starten";
  restartBtn.style.fontSize = "0.75rem";
  restartBtn.style.padding = "4px 9px";
  restartBtn.style.borderRadius = "999px";
  restartBtn.style.border = "none";
  restartBtn.style.cursor = "pointer";
  restartBtn.style.background = "rgba(15,23,42,1)";
  restartBtn.style.color = "rgba(248,250,252,0.98)";
  restartBtn.style.border = "1px solid rgba(148,163,184,0.8)";

  controlsArea.appendChild(controlsText);
  controlsArea.appendChild(restartBtn);

  gameWrapper.appendChild(controlsArea);

  container.appendChild(root);

  // Overlay für Level-/Spiel-Ende
  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(15,23,42,0.80)";
  overlay.style.zIndex = "20";
  overlay.style.opacity = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.transition = "opacity 150ms ease-out";

  const overlayBox = document.createElement("div");
  overlayBox.style.minWidth = "260px";
  overlayBox.style.maxWidth = "340px";
  overlayBox.style.borderRadius = "16px";
  overlayBox.style.padding = "14px 16px 12px";
  overlayBox.style.background =
    "radial-gradient(circle at top, rgba(238,242,255,0.22), rgba(15,23,42,0.98))";
  overlayBox.style.border = "1px solid rgba(248,250,252,0.22)";
  overlayBox.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
  overlayBox.style.display = "flex";
  overlayBox.style.flexDirection = "column";
  overlayBox.style.gap = "6px";
  overlayBox.style.textAlign = "center";
  overlayBox.style.color = "rgba(248,250,252,0.98)";

  const overlayTitle = document.createElement("div");
  overlayTitle.style.fontWeight = "600";
  overlayTitle.style.fontSize = "1rem";

  const overlayText = document.createElement("div");
  overlayText.style.fontSize = "0.85rem";
  overlayText.style.opacity = "0.95";

  const overlaySmall = document.createElement("div");
  overlaySmall.style.fontSize = "0.75rem";
  overlaySmall.style.opacity = "0.9";
  overlaySmall.style.marginTop = "2px";

  const overlayBtn = document.createElement("button");
  overlayBtn.type = "button";
  overlayBtn.style.marginTop = "8px";
  overlayBtn.style.alignSelf = "center";
  overlayBtn.style.padding = "5px 14px";
  overlayBtn.style.borderRadius = "999px";
  overlayBtn.style.border = "none";
  overlayBtn.style.cursor = "pointer";
  overlayBtn.style.fontSize = "0.8rem";
  overlayBtn.style.background = "rgba(15,23,42,0.98)";
  overlayBtn.style.color = "rgba(248,250,252,0.96)";
  overlayBtn.style.border = "1px solid rgba(248,250,252,0.25)";

  overlayBox.appendChild(overlayTitle);
  overlayBox.appendChild(overlayText);
  overlayBox.appendChild(overlaySmall);
  overlayBox.appendChild(overlayBtn);

  overlay.appendChild(overlayBox);
  container.appendChild(overlay);

  function showOverlay(title, text, small, btnLabel, btnHandler) {
    overlayTitle.textContent = title || "";
    overlayText.textContent = text || "";
    overlaySmall.textContent = small || "";
    overlayBtn.textContent = btnLabel || "OK";
    overlayBtn.onclick = btnHandler || null;

    // Pop-Animation resetten
    overlayBox.classList.remove("sort18-overlay-pop");
    void overlayBox.offsetWidth; // reflow, damit Animation neu startet
    overlayBox.classList.add("sort18-overlay-pop");

    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
  }

  function hideOverlay() {
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
  }

  // ---------------------------------------------------
  // Spielzustand
  // ---------------------------------------------------

  let currentLevelIndex = 0;
  let shelves = []; // { id, capacity, items: [Item|null], rowEl, slotsEl }
  let itemIdCounter = 1;

  let gameStartTime = null; // performance.now() beim ersten Zug
  let elapsedMs = 0;
  let timerIntervalId = null;
  let finishedAllLevels = false;

  // Drag-Status
  let dragging = false;
  let dragFromShelfIndex = null;
  let dragFromSlotIndex = null;
  let dragItem = null;
  let dragGhostEl = null;
  let dragHighlightShelf = null;
  let dragSourceSlotEl = null; // Slot im Regal, dessen Icon während Drag versteckt wird

  function getRemainingCount() {
    let count = 0;
    for (const sh of shelves) {
      for (const it of sh.items) {
        if (it) count++;
      }
    }
    return count;
  }

  function updateInfo() {
    levelInfo.strong.textContent =
      "Level " + (currentLevelIndex + 1) + " / " + TOTAL_LEVELS;
    remainingInfo.strong.textContent = String(getRemainingCount());

    let sec = 0;
    if (gameStartTime != null) {
      sec = elapsedMs / 1000;
    }
    timeInfo.strong.textContent = formatTime(sec);
  }

  function startTimerIfNeeded() {
    if (gameStartTime != null) return;
    gameStartTime = performance.now();
    timerIntervalId = window.setInterval(() => {
      if (finishedAllLevels) return;
      elapsedMs = performance.now() - gameStartTime;
      updateInfo();
    }, 250);
  }

  function stopTimer() {
    if (timerIntervalId != null) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
    if (gameStartTime != null) {
      elapsedMs = performance.now() - gameStartTime;
    }
  }

  // ---------------------------------------------------
  // Level initialisieren & rendern
  // ---------------------------------------------------

  function buildLevelGrid(levelCfg) {
    const rawTypes = levelCfg.items.slice();
    shuffle(rawTypes);

    const totalSlots = levelCfg.shelves * levelCfg.capacity;
    while (rawTypes.length < totalSlots) {
      rawTypes.push(null); // leere Plätze
    }

    const grid = [];
    let idx = 0;
    for (let s = 0; s < levelCfg.shelves; s++) {
      const row = [];
      for (let c = 0; c < levelCfg.capacity; c++) {
        const type = rawTypes[idx++];
        if (type) {
          row.push({
            id: "item-" + itemIdCounter++,
            type,
          });
        } else {
          row.push(null);
        }
      }
      grid.push(row);
    }
    return grid;
  }

  function clearShelvesDom() {
    shelvesContainer.innerHTML = "";
    shelves = [];
  }

  function createShelfRow(index, capacity) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.flexDirection = "column";
    row.style.gap = "4px";
    row.style.padding = "4px 6px 6px";
    row.style.borderRadius = "12px";
    row.style.background =
      "linear-gradient(180deg, rgba(248,250,252,0.96), rgba(226,232,240,0.98))";
    row.style.border = "1px solid rgba(148,163,184,0.7)";
    row.style.boxShadow = "inset 0 -2px 0 rgba(148,163,184,0.6)";
    row.style.transition =
      "box-shadow 120ms ease-out, border-color 120ms ease-out";

    const label = document.createElement("div");
    label.textContent = "Regal " + (index + 1);
    label.style.fontSize = "0.75rem";
    label.style.opacity = "0.85";

    const bar = document.createElement("div");
    bar.style.display = "flex";
    bar.style.gap = "4px";
    bar.style.padding = "4px 4px 6px";
    bar.style.borderRadius = "8px";
    bar.style.background =
      "linear-gradient(180deg, #e5e7eb, #d4d4d8)";
    bar.style.minHeight = "48px";

    row.appendChild(label);
    row.appendChild(bar);
    shelvesContainer.appendChild(row);

    const shelf = {
      id: index,
      capacity,
      items: [],
      rowEl: row,
      slotsEl: bar,
    };
    shelves.push(shelf);
  }

  function renderShelves() {
    for (const shelf of shelves) {
      const { capacity, items, slotsEl } = shelf;
      slotsEl.innerHTML = "";

      for (let i = 0; i < capacity; i++) {
        const slot = document.createElement("div");
        slot.style.flex = "1 1 0";
        slot.style.minWidth = "44px";
        slot.style.height = "44px";
        slot.style.borderRadius = "10px";
        slot.style.display = "flex";
        slot.style.alignItems = "center";
        slot.style.justifyContent = "center";
        slot.style.boxSizing = "border-box";
        slot.dataset.shelfIndex = String(shelf.id);
        slot.dataset.slotIndex = String(i);

        const item = items[i];
        const hasItem = !!item;

        if (!hasItem) {
          slot.style.border = "1px dashed rgba(148,163,184,0.7)";
          slot.style.background = "rgba(255,255,255,0.8)";
          slot.style.cursor = "default";
        } else {
          slot.style.border = "1px solid rgba(148,163,184,0.9)";
          slot.style.background =
            "radial-gradient(circle at top, #fefce8, #f97316)";
          slot.style.cursor = "grab";
          const meta = ITEM_META[item.type] || { icon: "📦", label: "Item" };
          const el = document.createElement("div");
          el.textContent = meta.icon;
          el.title = meta.label;
          el.style.fontSize = "1.5rem";
          slot.appendChild(el);
        }

        slotsEl.appendChild(slot);
      }
    }
  }

  function setupLevel(index) {
    const cfg = LEVELS[index];
    clearShelvesDom();

    const grid = buildLevelGrid(cfg);

    for (let i = 0; i < cfg.shelves; i++) {
      createShelfRow(i, cfg.capacity);
    }

    for (let i = 0; i < shelves.length; i++) {
      shelves[i].items = grid[i];
    }

    renderShelves();
    updateInfo();
    setStatus(
      "Verschiebe Gegenstände auf Regale mit freien Plätzen – drei gleiche nebeneinander verschwinden."
    );
  }

  // ---------------------------------------------------
  // Match- & Level-Logik (mit Animation)
  // ---------------------------------------------------

  function compressShelf(shelf) {
    const compact = shelf.items.filter((it) => it != null);
    while (compact.length < shelf.capacity) {
      compact.push(null);
    }
    shelf.items = compact;
  }

  function applyMatchesOnShelf(shelf) {
    const items = shelf.items;
    let indicesToRemove = [];

    let i = 0;
    while (i < items.length) {
      const base = items[i];
      if (!base) {
        i++;
        continue;
      }
      let j = i + 1;
      while (
        j < items.length &&
        items[j] &&
        items[j].type === base.type
      ) {
        j++;
      }
      const runLen = j - i;
      if (runLen >= 3) {
        for (let k = i; k < j; k++) {
          indicesToRemove.push(k);
        }
      }
      i = j;
    }

    if (!indicesToRemove.length) return false;

    // Regal kurz "glühen" lassen
    shelf.rowEl.classList.add("sort18-shelf-match");
    setTimeout(() => {
      shelf.rowEl.classList.remove("sort18-shelf-match");
    }, 260);

    // Pop-Animation auf Slots
    const slots = shelf.slotsEl.children;
    indicesToRemove.forEach((idx) => {
      const slot = slots[idx];
      if (slot) {
        slot.classList.add("sort18-item-pop");
      }
    });

    sfx.match();

    // Nach kurzer Zeit Items wirklich entfernen
    window.setTimeout(() => {
      indicesToRemove.forEach((idx) => {
        shelf.items[idx] = null;
      });
      compressShelf(shelf);
      renderShelves();
      updateInfo();
      checkLevelComplete();
    }, 210);

    return true;
  }

  function checkLevelComplete() {
    if (getRemainingCount() > 0) return;

    const levelNumber = currentLevelIndex + 1;
    const lastLevel = levelNumber >= TOTAL_LEVELS;

    if (!lastLevel) {
      sfx.win();
      showOverlay(
        "Level " + levelNumber + " geschafft!",
        "Alle Regale dieses Levels sind aufgeräumt.",
        "Tippe auf „Weiter“, um mit Level " +
          (levelNumber + 1) +
          " weiterzumachen.",
        "Weiter",
        () => {
          hideOverlay();
          currentLevelIndex++;
          setupLevel(currentLevelIndex);
        }
      );
    } else {
      finishedAllLevels = true;
      stopTimer();
      updateInfo();

      const totalSeconds =
        gameStartTime == null ? 0 : Math.floor(elapsedMs / 1000);
      const star = starForTotalSeconds(totalSeconds);

      try {
        if (
          typeof window !== "undefined" &&
          typeof window.playVictorySound === "function"
        ) {
          window.playVictorySound();
        }
      } catch (e) {}

      sfx.win();

      try {
        onWin(star);
      } catch (e) {
        console.error("sort_18 onWin error:", e);
      }

      const timeStr = formatTime(totalSeconds);
      const starText =
        star.level === "red"
          ? "Roter Stern"
          : star.level === "gold"
          ? "Goldener Stern"
          : star.level === "silver"
          ? "Silberner Stern"
          : "Brauner Stern";

      showOverlay(
        "Alle 3 Level geschafft!",
        "Du hast alle Regale perfekt sortiert.",
        "Gesamtzeit: " + timeStr + " → " + starText,
        "Fertig",
        () => {
          hideOverlay();
        }
      );
    }
  }

  // ---------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------

  function getClientPosFromEvent(ev) {
    if (ev.touches && ev.touches.length > 0) {
      return {
        x: ev.touches[0].clientX,
        y: ev.touches[0].clientY,
      };
    } else if (ev.changedTouches && ev.changedTouches.length > 0) {
      return {
        x: ev.changedTouches[0].clientX,
        y: ev.changedTouches[0].clientY,
      };
    } else {
      return {
        x: ev.clientX,
        y: ev.clientY,
      };
    }
  }

  function findShelfAtClientPos(clientX, clientY) {
    for (let i = 0; i < shelves.length; i++) {
      const shelf = shelves[i];
      if (!shelf || !shelf.slotsEl) continue;
      const rect = shelf.slotsEl.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return shelf;
      }
    }
    return null;
  }

  function clearShelfHighlight() {
    if (dragHighlightShelf && dragHighlightShelf.rowEl) {
      dragHighlightShelf.rowEl.style.boxShadow = "";
      dragHighlightShelf.rowEl.style.borderColor = "rgba(148,163,184,0.7)";
    }
    dragHighlightShelf = null;
  }

  function highlightShelf(shelf) {
    if (dragHighlightShelf === shelf) return;
    clearShelfHighlight();
    if (!shelf) return;
    shelf.rowEl.style.boxShadow = "0 0 0 2px rgba(251,191,36,0.9)";
    shelf.rowEl.style.borderColor = "rgba(251,191,36,0.9)";
    dragHighlightShelf = shelf;
  }

  function createDragGhost(item, clientX, clientY) {
    const meta = ITEM_META[item.type] || { icon: "📦" };
    const ghost = document.createElement("div");
    ghost.textContent = meta.icon;
    ghost.style.position = "fixed";
    ghost.style.zIndex = "9999";
    ghost.style.width = "42px";
    ghost.style.height = "42px";
    ghost.style.borderRadius = "12px";
    ghost.style.display = "flex";
    ghost.style.alignItems = "center";
    ghost.style.justifyContent = "center";
    ghost.style.boxSizing = "border-box";
    ghost.style.pointerEvents = "none";
    ghost.style.fontSize = "1.5rem";
    ghost.style.background =
      "linear-gradient(145deg, rgba(251,191,36,0.9), rgba(248,250,252,0.98))";
    ghost.style.color = "#020617";
    ghost.style.boxShadow = "0 8px 18px rgba(0,0,0,0.8)";
    ghost.style.left = clientX + "px";
    ghost.style.top = clientY + "px";
    ghost.style.transform = "translate(-50%, -50%)"; // genau unter Maus/Finger
    document.body.appendChild(ghost);
    dragGhostEl = ghost;
  }

  function moveDragGhost(clientX, clientY) {
    if (!dragGhostEl) return;
    dragGhostEl.style.left = clientX + "px";
    dragGhostEl.style.top = clientY + "px";
  }

  function destroyDragGhost() {
    if (dragGhostEl && dragGhostEl.parentNode) {
      dragGhostEl.parentNode.removeChild(dragGhostEl);
    }
    dragGhostEl = null;
  }

  function restoreDragSourceVisual() {
    if (dragSourceSlotEl && dragSourceSlotEl.isConnected) {
      dragSourceSlotEl.style.opacity = "1";
    }
    dragSourceSlotEl = null;
  }

  function startDragFromSlot(shelfIndex, slotIndex, ev, slotEl) {
    const shelf = shelves[shelfIndex];
    if (!shelf) return;
    const item = shelf.items[slotIndex];
    if (!item) return;

    const pos = getClientPosFromEvent(ev);

    dragging = true;
    dragFromShelfIndex = shelfIndex;
    dragFromSlotIndex = slotIndex;
    dragItem = item;
    dragSourceSlotEl = slotEl || null;
    if (dragSourceSlotEl) {
      dragSourceSlotEl.style.transition = "opacity 80ms ease-out";
      dragSourceSlotEl.style.opacity = "0"; // Original-Icon ausblenden
    }

    startTimerIfNeeded();
    createDragGhost(item, pos.x, pos.y);
    highlightShelf(null);
    sfx.pick();

    setStatus("Ziehe den Gegenstand auf ein Regal mit freiem Platz.");
  }

  function moveItemBetweenShelves(sourceShelfIndex, sourceSlotIndex, targetShelf) {
    const sourceShelf = shelves[sourceShelfIndex];
    if (!sourceShelf) return -1;
    const item = sourceShelf.items[sourceSlotIndex];
    if (!item) return -1;

    let targetIndex = -1;
    for (let i = 0; i < targetShelf.capacity; i++) {
      if (!targetShelf.items[i]) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1) {
      return -1;
    }

    if (targetShelf === sourceShelf && targetIndex === sourceSlotIndex) {
      return -1;
    }

    sourceShelf.items[sourceSlotIndex] = null;
    targetShelf.items[targetIndex] = item;
    return targetIndex;
  }

  function updateDrag(ev) {
    if (!dragging) return;
    const pos = getClientPosFromEvent(ev);
    moveDragGhost(pos.x, pos.y);

    const shelf = findShelfAtClientPos(pos.x, pos.y);
    if (!shelf) {
      highlightShelf(null);
      return;
    }

    const hasSpace = shelf.items.some((it) => it == null);
    if (hasSpace) {
      highlightShelf(shelf);
    } else {
      highlightShelf(null);
    }
  }

  function endDrag(ev) {
    if (!dragging) return;
    const pos = getClientPosFromEvent(ev);

    const sourceShelfIndex = dragFromShelfIndex;
    const sourceSlotIndex = dragFromSlotIndex;
    const sourceShelf = shelves[sourceShelfIndex] || null;
    const item = dragItem;

    dragging = false;
    dragItem = null;
    dragFromShelfIndex = null;
    dragFromSlotIndex = null;
    destroyDragGhost();
    clearShelfHighlight();

    if (!item || !sourceShelf) {
      restoreDragSourceVisual();
      return;
    }

    const targetShelf = findShelfAtClientPos(pos.x, pos.y);
    if (!targetShelf) {
      setStatus("Nur auf ein Regalbrett mit freiem Platz ziehen.");
      sfx.error();
      restoreDragSourceVisual();
      return;
    }

    const hasSpace = targetShelf.items.some((it) => it == null);
    if (!hasSpace) {
      setStatus("Dieses Regal ist voll – wähle ein anderes Regal.");
      sfx.error();
      restoreDragSourceVisual();
      return;
    }

    const targetIndex = moveItemBetweenShelves(
      sourceShelfIndex,
      sourceSlotIndex,
      targetShelf
    );

    if (targetIndex === -1) {
      setStatus("Ziehe auf ein Regal mit freiem Platz (nicht auf denselben Slot).");
      sfx.error();
      restoreDragSourceVisual();
      return;
    }

    // Wir haben das Item tatsächlich bewegt – Original-Icon bleibt weg
    dragSourceSlotEl = null;

    // Nach Move neu rendern, damit Animationen auf neuen Slots laufen können
    renderShelves();

    // Drop-Animation auf Zielsymbol
    const slots = targetShelf.slotsEl.children;
    if (slots[targetIndex]) {
      slots[targetIndex].classList.add("sort18-slot-drop");
      setTimeout(() => {
        if (slots[targetIndex]) {
          slots[targetIndex].classList.remove("sort18-slot-drop");
        }
      }, 220);
    }

    sfx.drop();

    setStatus(
      "Wenn drei gleiche nebeneinander auf einem Regal liegen, verschwinden sie."
    );

    // Matches mit Pop-Animation
    applyMatchesOnShelf(targetShelf);
    if (targetShelf !== sourceShelf) {
      applyMatchesOnShelf(sourceShelf);
    }
  }

  // Event-Handler
  function handleShelfMouseDown(ev) {
    const slot = ev.target.closest("[data-shelf-index][data-slot-index]");
    if (!slot) return;
    ev.preventDefault();
    const shelfIndex = parseInt(slot.dataset.shelfIndex, 10);
    const slotIndex = parseInt(slot.dataset.slotIndex, 10);
    startDragFromSlot(shelfIndex, slotIndex, ev, slot);
  }

  function handleShelfTouchStart(ev) {
    const slot = ev.target.closest("[data-shelf-index][data-slot-index]");
    if (!slot) return;
    ev.preventDefault();
    const shelfIndex = parseInt(slot.dataset.shelfIndex, 10);
    const slotIndex = parseInt(slot.dataset.slotIndex, 10);
    startDragFromSlot(shelfIndex, slotIndex, ev, slot);
  }

  function handleMouseMove(ev) {
    if (!dragging) return;
    ev.preventDefault();
    updateDrag(ev);
  }

  function handleTouchMove(ev) {
    if (!dragging) return;
    ev.preventDefault();
    updateDrag(ev);
  }

  function handleMouseUp(ev) {
    if (!dragging) return;
    ev.preventDefault();
    endDrag(ev);
  }

  function handleTouchEnd(ev) {
    if (!dragging) return;
    ev.preventDefault();
    endDrag(ev);
  }

  shelvesContainer.addEventListener("mousedown", handleShelfMouseDown);
  shelvesContainer.addEventListener("touchstart", handleShelfTouchStart, {
    passive: false,
  });
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("mouseup", handleMouseUp);
  window.addEventListener("touchend", handleTouchEnd);

  // Restart-Button
  restartBtn.addEventListener("click", () => {
    setupLevel(currentLevelIndex);
    setStatus(
      "Level neu gestartet – versuche, neue Dreiergruppen zu bilden."
    );
  });

  // ---------------------------------------------------
  // Start
  // ---------------------------------------------------

  setupLevel(currentLevelIndex);
  updateInfo();

  // ---------------------------------------------------
  // Cleanup
  // ---------------------------------------------------

  return {
    destroy() {
      try {
        shelvesContainer.removeEventListener("mousedown", handleShelfMouseDown);
        shelvesContainer.removeEventListener(
          "touchstart",
          handleShelfTouchStart
        );
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchend", handleTouchEnd);
        restartBtn.onclick = null;
        overlayBtn.onclick = null;
        stopTimer();
      } catch (e) {}
    },
  };
};
