// Spiel 13: Skyjo Duell – 4x4 mit Hausregeln
// ---------------------------------------------------------
// Besonderheiten:
//  - 4x4 Kartenfeld pro Spieler (Du vs. Bot)
//  - Start: beide Spieler bekommen 2 zufällige offene Karten,
//    der Spieler mit der HÖHEREN Startsumme beginnt
//  - Standard-Skyjo-Regeln (ein Durchgang) mit folgenden Hausregeln:
//
//    1) 4x4 Matrix, später dynamisch kleiner:
//       Reihen/Spalten können gelöscht werden und die Matrix schrumpft.
//
//    2) HORIZONTALE CLEAR-Regel:
//       Wenn eine komplette Reihe (alle Karten face-up) STRIKT aufsteigend
//       oder strikt absteigend ist, wird die gesamte Reihe gelöscht.
//       Die Karten dieser Reihe sind „weg“.
//       Kommt es durch TAUSCH (Swap) zustande,
//       dann gehören die gelöschte Reihe + die getauschte Karte zum „Set“,
//       aus dem die HÖCHSTE Karte als NEUE oberste Karte auf den Ablagestapel kommt.
//       Wenn keine Reihe gelöscht wird, geht nur die getauschte Karte auf den Ablagestapel.
//
//    3) VERTIKALE CLEAR-Regel:
//       Wenn in einer Spalte (alle Karten face-up) alle Werte GLEICH sind,
//       wird die komplette Spalte gelöscht.
//       Ablageregel identisch zur horizontalen:
//       alle gelöschten Karten bilden zusammen ein Set; höchste davon wird oben auf den Ablagestapel gelegt.
//       (Beim Tausch zusätzlich mit der getauschten Karte zusammen betrachtet.)
//
//    4) Kaskaden-Clears:
//       Durch das Löschen einer Reihe/Spalte ändert sich die Matrix-Dimension.
//       Dadurch können NEUE Reihen/Spalten clear-bar werden.
//       Diese werden automatisch weiter gelöscht, solange möglich.
//       Am Ende des gesamten Clear-Prozesses landet IMMER die höchste aller
//       in diesem Prozess entfernten Karten (plus ggf. getauschte Karte) obendrauf auf dem Ablagestapel.
//
//    5) Deck & Discard wie im Original:
//       - Ziehen vom Ablagestapel → MUSS getauscht werden
//       - Ziehen vom Nachziehstapel → Karte ansehen, dann
//         (a) tauschen ODER (b) ablegen & eine verdeckte Karte aufdecken
//
//    6) Spalten-/Reihenclears nur, wenn ALLE Karten der jeweiligen Reihe/Spalte offen sind.
//       Es ist EGAL, ob in anderen Reihen/Spalten noch verdeckte Karten liegen.
//
//    7) Rundenende (vereinfacht nach Skyjo):
//       Wenn ein Spieler nur noch offene Karten (oder gar keine Karten mehr) hat,
//       startet die letzte Runde: der andere Spieler bekommt noch genau einen Zug,
//       danach wird gewertet.
//       Punkte = Summe aller Kartenwerte im Feld.
//       Der Spieler, der das Rundenende ausgelöst hat, erhält KEINE Verdopplungsstrafe,
//       wir spielen hier nur eine einzelne Runde Duell.
//       Wer weniger Punkte hat, gewinnt.
//
//    8) Sieg: Wenn DU nach der Wertung weniger Punkte hast als der Bot,
//       wird onWin({ level: "red", label: "Roter Stern" }) ausgelöst.
//       Zusätzlich wird window.playVictorySound() aufgerufen, falls vorhanden.
//
//    9) Bot ist „sehr intelligent“:
//       Er simuliert alle sinnvollen Züge (Discard nutzen, Deck nutzen,
//       Deck-Karte ablegen & verdeckte Karte aufdecken) und wählt den Zug,
//       der seine erwartete Endsumme nach diesem Zug minimiert.
//       Er „cheatet“ ein bisschen und kennt alle Zahlen – dafür ist er clever.
//       Neu: Heuristik, die explizit Reihenfolgen (auf/absteigend) und
//       gleiche Spalten aufbaut.
//
//   10) Visuelles Highlight:
//       - Bei Row/Spalten-Clears schrumpfen/faden die Karten erst,
//         bevor sie wirklich verschwinden.
//
// ---------------------------------------------------------

window.AdventGames = window.AdventGames || {};

window.AdventGames["skyjo_13"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // -------------------------------------------------------
  // Hilfsfunktionen
  // -------------------------------------------------------

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  // Volle Feld-Summe (alle Karten, egal ob offen oder nicht)
  function computeScore(grid) {
    let sum = 0;
    for (const row of grid) {
      for (const cell of row) {
        sum += cell.value;
      }
    }
    return sum;
  }

  // Nur sichtbare Karten (für laufende Anzeige)
  function computeVisibleScore(grid) {
    let sum = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell.faceUp) sum += cell.value;
      }
    }
    return sum;
  }

  function allCardsFaceUp(grid) {
    if (!grid || grid.length === 0) return true;
    for (const row of grid) {
      for (const cell of row) {
        if (!cell.faceUp) return false;
      }
    }
    return true;
  }

  function deepCopyGrid(grid) {
    return grid.map((row) => row.map((c) => ({ ...c })));
  }

  // -------------------------------------------------------
  // Clear-Logik (Reihen/Spalten mit Kaskaden)
  // -------------------------------------------------------
  // Clears werden ausgeführt, sobald:
  //  - Reihe: alle Karten offen UND streng auf- oder absteigend
  //  - Spalte: alle Karten offen UND alle Werte gleich
  // Andere Reihen/Spalten dürfen noch verdeckte Karten enthalten.
  //
  // Gibt: { grid, clearedValues }

  function isRowClearable(row) {
  const len = row.length;
  if (len < 2) return false;

  // alle Karten in dieser Reihe müssen offen sein
  for (let i = 0; i < len; i++) {
    if (!row[i].faceUp) return false;
  }

  const vals = row.map((c) => c.value);

  // "Strikt aufsteigend" = immer +1 zum nächsten
  let asc = true;
  // "Strikt absteigend" = immer -1 zum nächsten
  let desc = true;

  for (let i = 0; i < vals.length - 1; i++) {
    if (vals[i + 1] !== vals[i] + 1) asc = false;
    if (vals[i + 1] !== vals[i] - 1) desc = false;

    if (!asc && !desc) {
      // wenn weder +1- noch -1-Kette möglich ist, kann die Reihe nie clearen
      return false;
    }
  }

  return asc || desc;
}


  function isColClearable(grid, colIndex) {
    const rows = grid.length;
    if (rows < 2) return false;

    let firstVal = null;
    for (let r = 0; r < rows; r++) {
      const cell = grid[r][colIndex];
      if (!cell) return false;
      if (!cell.faceUp) return false;
      if (firstVal === null) {
        firstVal = cell.value;
      } else if (cell.value !== firstVal) {
        return false;
      }
    }
    return true;
  }

  function computeClearsOnGrid(grid) {
    let workGrid = deepCopyGrid(grid);
    const clearedValues = [];

    while (true) {
      if (workGrid.length === 0) break;
      const rows = workGrid.length;
      const cols = workGrid[0].length;

      const rowsToClear = new Set();
      const colsToClear = new Set();

      // Reihen prüfen
      for (let r = 0; r < rows; r++) {
        if (isRowClearable(workGrid[r])) {
          rowsToClear.add(r);
        }
      }

      // Spalten prüfen
      if (rows >= 2) {
        for (let c = 0; c < cols; c++) {
          if (isColClearable(workGrid, c)) {
            colsToClear.add(c);
          }
        }
      }

      if (rowsToClear.size === 0 && colsToClear.size === 0) {
        break;
      }

      // Werte der zu entfernenden Zellen sammeln
      for (let r = 0; r < rows; r++) {
        const row = workGrid[r];
        for (let c = 0; c < row.length; c++) {
          if (rowsToClear.has(r) || colsToClear.has(c)) {
            clearedValues.push(row[c].value);
          }
        }
      }

      // Neues Grid bauen
      const newGrid = [];
      for (let r = 0; r < rows; r++) {
        if (rowsToClear.has(r)) continue;
        const oldRow = workGrid[r];
        const newRow = [];
        for (let c = 0; c < oldRow.length; c++) {
          if (colsToClear.has(c)) continue;
          newRow.push(oldRow[c]);
        }
        if (newRow.length > 0) {
          newGrid.push(newRow);
        }
      }

      workGrid = newGrid;
    }

    return { grid: workGrid, clearedValues };
  }

  // -------------------------------------------------------
  // Deck & Spieler
  // -------------------------------------------------------

  const HUMAN = 0;
  const BOT = 1;

  const players = [
    { name: "Du", isBot: false, grid: [] },
    { name: "Bot", isBot: true, grid: [] },
  ];

  let deck = [];
  let discard = [];

  let currentPlayerIndex = 0;
  let roundEndingPlayerIndex = null; // wer hat Endrunde ausgelöst?
  let gameOver = false;

  let phase = "idle";

  // Nur noch Clear-Highlight (kein „letzte Karte“-Highlight mehr)
  let lastClearFlashPlayerIndex = null;

  // Animationszustand für Clears (IDs der verschwindenden Karten)
  let pendingClearAnimation = null; // { playerIndex, clearedIds: Set<string> }

  // Für menschlichen Zug
  let drawnCard = null; // { value, source: "deck"|"discard" }
  let destroyed = false;

  // -------------------------------------------------------
  // DOM-Aufbau
  // -------------------------------------------------------

  const root = document.createElement("div");
  root.className = "skyjo13-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";
  root.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  root.style.color = "rgba(255,255,255,0.96)";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 13 – Skyjo Duell";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Skyjo 4×4 gegen einen cleveren Bot. Reihen & Spalten können gelöscht werden – halte deine Summe niedriger als der Bot.";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.color = "rgba(255,255,255,0.9)";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  // Steuerleiste mit "Neues Spiel"
  const controlsBar = document.createElement("div");
  controlsBar.style.display = "flex";
  controlsBar.style.justifyContent = "flex-end";
  controlsBar.style.marginTop = "4px";

  const newGameBtn = document.createElement("button");
  newGameBtn.type = "button";
  newGameBtn.textContent = "Neues Spiel";
  newGameBtn.style.fontSize = "0.75rem";
  newGameBtn.style.padding = "4px 10px";
  newGameBtn.style.borderRadius = "999px";
  newGameBtn.style.border = "1px solid rgba(255,255,255,0.4)";
  newGameBtn.style.background = "rgba(10,18,30,0.95)";
  newGameBtn.style.color = "rgba(255,255,255,0.9)";
  newGameBtn.style.cursor = "pointer";

  controlsBar.appendChild(newGameBtn);
  root.appendChild(controlsBar);

  const statusBar = document.createElement("div");
  statusBar.style.fontSize = "0.82rem";
  statusBar.style.opacity = "0.9";
  statusBar.style.padding = "4px 8px";
  statusBar.style.borderRadius = "999px";
  statusBar.style.background = "rgba(10,18,30,0.9)";
  statusBar.style.border = "1px solid rgba(255,255,255,0.12)";
  root.appendChild(statusBar);

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "stretch";
  layout.style.marginTop = "4px";

  const mainArea = document.createElement("div");
  mainArea.style.flex = "1 1 auto";
  mainArea.style.display = "flex";
  mainArea.style.flexDirection = "column";
  mainArea.style.gap = "8px";
  mainArea.style.background = "rgba(3,8,18,0.9)";
  mainArea.style.borderRadius = "12px";
  mainArea.style.padding = "8px 10px";
  mainArea.style.boxShadow = "0 4px 16px rgba(0,0,0,0.7)";

  const sideArea = document.createElement("aside");
  sideArea.style.flex = "0 0 220px";
  sideArea.style.display = "flex";
  sideArea.style.flexDirection = "column";
  sideArea.style.gap = "10px";

  layout.appendChild(mainArea);
  layout.appendChild(sideArea);
  root.appendChild(layout);
  container.appendChild(root);

  // Spielfeldbereiche
  const board = document.createElement("div");
  board.style.display = "flex";
  board.style.flexDirection = "column";
  board.style.gap = "8px";

  // Bot-Board
  const botArea = document.createElement("div");
  botArea.style.display = "flex";
  botArea.style.flexDirection = "column";
  botArea.style.gap = "4px";

  const botLabel = document.createElement("div");
  botLabel.textContent = "Bot";
  botLabel.style.fontSize = "0.8rem";
  botLabel.style.opacity = "0.9";

  const botScoreSpan = document.createElement("span");
  botScoreSpan.style.marginLeft = "6px";
  botScoreSpan.style.fontSize = "0.8rem";
  botScoreSpan.style.opacity = "0.8";

  botLabel.appendChild(botScoreSpan);

  const botGridContainer = document.createElement("div");
  botGridContainer.style.display = "grid";
  botGridContainer.style.gridTemplateColumns = "repeat(4, minmax(32px, 1fr))";
  botGridContainer.style.gap = "4px";

  botArea.appendChild(botLabel);
  botArea.appendChild(botGridContainer);

  // Mittlere Area: Deck / Ablage / gezogene Karte
  const middleArea = document.createElement("div");
  middleArea.style.display = "flex";
  middleArea.style.alignItems = "center";
  middleArea.style.justifyContent = "center";
  middleArea.style.gap = "16px";
  middleArea.style.margin = "4px 0";

  const pileBaseStyle =
    "border-radius:8px;border:1px solid rgba(255,255,255,0.25);padding:6px 8px;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:72px;";

  const deckWrapper = document.createElement("div");
  deckWrapper.style.cssText = pileBaseStyle + "cursor:pointer;";
  const deckLabel = document.createElement("div");
  deckLabel.textContent = "Stapel";
  deckLabel.style.fontSize = "0.75rem";
  deckLabel.style.opacity = "0.85";
  const deckEl = document.createElement("div");
  deckEl.style.width = "52px";
  deckEl.style.height = "72px";
  deckEl.style.borderRadius = "6px";
  deckEl.style.background =
    "linear-gradient(145deg, #17263b, #0b1320 55%, #050a13)";
  deckEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.7)";
  deckEl.style.display = "flex";
  deckEl.style.alignItems = "center";
  deckEl.style.justifyContent = "center";
  deckEl.style.fontSize = "0.8rem";
  deckEl.style.color = "rgba(255,255,255,0.7)";
  deckEl.textContent = "🂠";

  deckWrapper.appendChild(deckLabel);
  deckWrapper.appendChild(deckEl);

  const discardWrapper = document.createElement("div");
  discardWrapper.style.cssText = pileBaseStyle + "cursor:pointer;";
  const discardLabel = document.createElement("div");
  discardLabel.textContent = "Ablage";
  discardLabel.style.fontSize = "0.75rem";
  discardLabel.style.opacity = "0.85";
  const discardEl = document.createElement("div");
  discardEl.style.width = "52px";
  discardEl.style.height = "72px";
  discardEl.style.borderRadius = "6px";
  discardEl.style.background = "rgba(15,24,40,0.9)";
  discardEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.7)";
  discardEl.style.display = "flex";
  discardEl.style.alignItems = "center";
  discardEl.style.justifyContent = "center";
  discardEl.style.fontSize = "0.9rem";
  discardEl.style.color = "rgba(255,255,255,0.9)";
  discardEl.textContent = "–";

  discardWrapper.appendChild(discardLabel);
  discardWrapper.appendChild(discardEl);

  const drawnWrapper = document.createElement("div");
  drawnWrapper.style.cssText = pileBaseStyle;
  drawnWrapper.style.minWidth = "110px";
  const drawnLabel = document.createElement("div");
  drawnLabel.textContent = "Gezogene Karte";
  drawnLabel.style.fontSize = "0.75rem";
  drawnLabel.style.opacity = "0.85";
  const drawnCardEl = document.createElement("div");
  drawnCardEl.style.width = "60px";
  drawnCardEl.style.height = "78px";
  drawnCardEl.style.borderRadius = "8px";
  drawnCardEl.style.background = "rgba(10,18,30,0.9)";
  drawnCardEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.7)";
  drawnCardEl.style.display = "flex";
  drawnCardEl.style.alignItems = "center";
  drawnCardEl.style.justifyContent = "center";
  drawnCardEl.style.fontSize = "1rem";
  drawnCardEl.style.color = "rgba(255,255,255,0.95)";
  drawnCardEl.textContent = "–";

  // Aktions-Buttons für gezogene Stapelkarte
  const drawnActions = document.createElement("div");
  drawnActions.style.display = "none";
  drawnActions.style.flexDirection = "column";
  drawnActions.style.alignItems = "center";
  drawnActions.style.gap = "4px";
  drawnActions.style.marginTop = "4px";

  const drawnActionsLabel = document.createElement("div");
  drawnActionsLabel.textContent = "Aktion wählen:";
  drawnActionsLabel.style.fontSize = "0.72rem";
  drawnActionsLabel.style.opacity = "0.9";

  const drawnActionsButtons = document.createElement("div");
  drawnActionsButtons.style.display = "flex";
  drawnActionsButtons.style.gap = "6px";

  const deckSwapBtn = document.createElement("button");
  deckSwapBtn.type = "button";
  deckSwapBtn.textContent = "Tauschen";
  deckSwapBtn.style.fontSize = "0.72rem";
  deckSwapBtn.style.padding = "3px 8px";
  deckSwapBtn.style.borderRadius = "999px";
  deckSwapBtn.style.border = "1px solid rgba(255,255,255,0.4)";
  deckSwapBtn.style.background = "rgba(24,36,56,0.95)";
  deckSwapBtn.style.color = "rgba(255,255,255,0.95)";
  deckSwapBtn.style.cursor = "pointer";

  const deckFlipBtn = document.createElement("button");
  deckFlipBtn.type = "button";
  deckFlipBtn.textContent = "Ablegen & aufdecken";
  deckFlipBtn.style.fontSize = "0.72rem";
  deckFlipBtn.style.padding = "3px 8px";
  deckFlipBtn.style.borderRadius = "999px";
  deckFlipBtn.style.border = "1px solid rgba(255,255,255,0.4)";
  deckFlipBtn.style.background = "rgba(24,36,56,0.95)";
  deckFlipBtn.style.color = "rgba(255,255,255,0.95)";
  deckFlipBtn.style.cursor = "pointer";

  drawnActionsButtons.appendChild(deckSwapBtn);
  drawnActionsButtons.appendChild(deckFlipBtn);
  drawnActions.appendChild(drawnActionsLabel);
  drawnActions.appendChild(drawnActionsButtons);

  drawnWrapper.appendChild(drawnLabel);
  drawnWrapper.appendChild(drawnCardEl);
  drawnWrapper.appendChild(drawnActions);

  middleArea.appendChild(deckWrapper);
  middleArea.appendChild(drawnWrapper);
  middleArea.appendChild(discardWrapper);

  // Human-Board
  const humanArea = document.createElement("div");
  humanArea.style.display = "flex";
  humanArea.style.flexDirection = "column";
  humanArea.style.gap = "4px";

  const humanLabel = document.createElement("div");
  humanLabel.textContent = "Du";
  humanLabel.style.fontSize = "0.8rem";
  humanLabel.style.opacity = "0.9";

  const humanScoreSpan = document.createElement("span");
  humanScoreSpan.style.marginLeft = "6px";
  humanScoreSpan.style.fontSize = "0.8rem";
  humanScoreSpan.style.opacity = "0.8";

  humanLabel.appendChild(humanScoreSpan);

  const humanGridContainer = document.createElement("div");
  humanGridContainer.style.display = "grid";
  humanGridContainer.style.gridTemplateColumns = "repeat(4, minmax(32px, 1fr))";
  humanGridContainer.style.gap = "4px";

  humanArea.appendChild(humanLabel);
  humanArea.appendChild(humanGridContainer);

  board.appendChild(botArea);
  board.appendChild(middleArea);
  board.appendChild(humanArea);

  mainArea.appendChild(board);

  // Rechts: Info-Karten
  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "10px";
    card.style.padding = "10px 8px";
    card.style.background = "rgba(5,10,20,0.9)";
    card.style.border = "1px solid rgba(255,255,255,0.16)";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "4px";

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
    iconEl.style.background = "rgba(255,255,255,0.06)";

    const titleElSide = document.createElement("div");
    titleElSide.textContent = title;
    titleElSide.style.fontSize = "0.8rem";
    titleElSide.style.fontWeight = "600";

    head.appendChild(iconEl);
    head.appendChild(titleElSide);

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

  const rulesCard = makeSideCard("Zug", "♻️", [
    "Zieh vom Stapel oder Ablage.",
    "Stapel: Karte ziehen →",
    "Buttons unter der Karte nutzen",
    "(Space = Tauschen, Enter = Ablegen).",
    "Ablage: Karte muss getauscht werden.",
  ]);

  const clearCard = makeSideCard("Clears", "↔ ↕", [
    "Reihe: alle offen,",
    "streng auf/absteigend → löschen.",
    "Spalte: alle offen,",
    "alle gleich → löschen.",
    "Kaskaden möglich.",
  ]);

  const goalCard = makeSideCard("Ziel", "⬇️", [
    "Am Ende weniger Punkte",
    "als der Bot haben.",
    "Sieg → Roter Stern.",
  ]);

  sideArea.appendChild(rulesCard);
  sideArea.appendChild(clearCard);
  sideArea.appendChild(goalCard);

  // Ergebnis-Modal
  const modalOverlay = document.createElement("div");
  modalOverlay.style.position = "fixed";
  modalOverlay.style.inset = "0";
  modalOverlay.style.display = "flex";
  modalOverlay.style.alignItems = "center";
  modalOverlay.style.justifyContent = "center";
  modalOverlay.style.background = "rgba(0,0,0,0.65)";
  modalOverlay.style.zIndex = "9999";
  modalOverlay.style.opacity = "0";
  modalOverlay.style.pointerEvents = "none";
  modalOverlay.style.transition = "opacity 0.18s ease-out";

  const modalCard = document.createElement("div");
  modalCard.style.minWidth = "260px";
  modalCard.style.maxWidth = "380px";
  modalCard.style.borderRadius = "12px";
  modalCard.style.padding = "14px 16px 12px";
  modalCard.style.background = "rgba(8,14,26,0.97)";
  modalCard.style.border = "1px solid rgba(255,255,255,0.18)";
  modalCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.9)";
  modalCard.style.display = "flex";
  modalCard.style.flexDirection = "column";
  modalCard.style.gap = "6px";
  modalCard.style.color = "rgba(255,255,255,0.96)";
  modalCard.style.fontSize = "0.9rem";

  const modalTitle = document.createElement("div");
  modalTitle.style.fontWeight = "700";

  const modalBody = document.createElement("div");
  modalBody.style.fontSize = "0.8rem";
  modalBody.style.opacity = "0.9";

  const modalSmall = document.createElement("div");
  modalSmall.style.fontSize = "0.7rem";
  modalSmall.style.opacity = "0.8";
  modalSmall.style.marginTop = "4px";

  const modalClose = document.createElement("button");
  modalClose.type = "button";
  modalClose.textContent = "OK";
  modalClose.style.alignSelf = "flex-end";
  modalClose.style.marginTop = "8px";
  modalClose.style.padding = "4px 10px";
  modalClose.style.borderRadius = "999px";
  modalClose.style.border = "1px solid rgba(255,255,255,0.4)";
  modalClose.style.background = "rgba(10,18,30,0.95)";
  modalClose.style.color = "rgba(255,255,255,0.9)";
  modalClose.style.cursor = "pointer";
  modalClose.style.fontSize = "0.78rem";

  modalCard.appendChild(modalTitle);
  modalCard.appendChild(modalBody);
  modalCard.appendChild(modalSmall);
  modalCard.appendChild(modalClose);
  modalOverlay.appendChild(modalCard);
  document.body.appendChild(modalOverlay);

  function showModal(title, body, small) {
    modalTitle.textContent = title || "";
    modalBody.textContent = body || "";
    modalSmall.textContent = small || "";
    modalOverlay.style.opacity = "1";
    modalOverlay.style.pointerEvents = "auto";
  }

  function hideModal() {
    modalOverlay.style.opacity = "0";
    modalOverlay.style.pointerEvents = "none";
  }

  modalClose.addEventListener("click", hideModal);

  function setStatus(text) {
    statusBar.textContent = text;
  }

  // -------------------------------------------------------
  // Deck initialisieren (Skyjo-Distribution)
  // -------------------------------------------------------

  function buildDeck() {
    const d = [];

    // 5 Karten -2
    for (let i = 0; i < 5; i++) d.push(-2);
    // 15 Karten 0
    for (let i = 0; i < 15; i++) d.push(0);
    // 10 Karten für alle anderen Werte -1 und 1..12
    const values = [-1];
    for (let v = 1; v <= 12; v++) values.push(v);
    for (const v of values) {
      for (let i = 0; i < 10; i++) d.push(v);
    }

    shuffle(d);
    return d;
  }

  function createPlayerGrids() {
    const rows = 4;
    const cols = 4;

    for (let p = 0; p < 2; p++) {
      const grid = [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          const value = deck.pop();
          row.push({
            id: `p${p}_r${r}_c${c}_` + Math.random().toString(36).slice(2),
            value,
            faceUp: false,
          });
        }
        grid.push(row);
      }
      players[p].grid = grid;
    }
  }

  function flipTwoRandomForPlayer(playerIndex) {
    const grid = players[playerIndex].grid;
    const positions = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        positions.push({ r, c });
      }
    }
    shuffle(positions);
    const picks = positions.slice(0, 2);
    for (const pos of picks) {
      grid[pos.r][pos.c].faceUp = true;
    }
  }

  function setupGame() {
    hideModal();

    deck = buildDeck();
    discard = [];

    createPlayerGrids();
    flipTwoRandomForPlayer(HUMAN);
    flipTwoRandomForPlayer(BOT);

    // Startkarte für Ablagestapel
    discard.push(deck.pop());

    // Startspieler bestimmen: höhere Summe der zwei offenen Karten
    function openSum(playerIndex) {
      const g = players[playerIndex].grid;
      let sum = 0;
      for (const row of g) {
        for (const cell of row) {
          if (cell.faceUp) sum += cell.value;
        }
      }
      return sum;
    }

    const humanStartSum = openSum(HUMAN);
    const botStartSum = openSum(BOT);

    if (humanStartSum > botStartSum) {
      currentPlayerIndex = HUMAN;
    } else if (botStartSum > humanStartSum) {
      currentPlayerIndex = BOT;
    } else {
      currentPlayerIndex = Math.random() < 0.5 ? HUMAN : BOT;
    }

    roundEndingPlayerIndex = null;
    gameOver = false;
    drawnCard = null;
    lastClearFlashPlayerIndex = null;
    pendingClearAnimation = null;

    phase = currentPlayerIndex === HUMAN ? "human_choose_source" : "bot_turn";
    renderAll();

    if (currentPlayerIndex === BOT) {
      botTakeTurn();
    }
  }

  function createCardElement(playerIndex, rowIndex, colIndex, cell) {
    const div = document.createElement("div");
    div.dataset.playerIndex = String(playerIndex);
    div.dataset.row = String(rowIndex);
    div.dataset.col = String(colIndex);
    div.dataset.cardId = cell.id;

    div.style.position = "relative";
    div.style.borderRadius = "9px";
    div.style.padding = "4px 2px";
    div.style.minHeight = "44px";
    div.style.display = "flex";
    div.style.alignItems = "stretch";
    div.style.justifyContent = "center";
    div.style.fontSize = "0.9rem";
    div.style.fontWeight = "600";
    div.style.cursor =
      !gameOver && playerIndex === HUMAN ? "pointer" : "default";
    div.style.transition =
      "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, opacity 0.18s ease";

    let bg;
    let fg = "rgba(255,255,255,0.95)";

    if (!cell.faceUp) {
      bg =
        "repeating-linear-gradient(135deg,#0b1220 0,#0b1220 6px,#111827 6px,#111827 12px)";
      fg = "rgba(255,255,255,0.7)";
    } else if (cell.value < 0) {
      bg = "linear-gradient(145deg,#205a5a,#102f30)";
    } else if (cell.value <= 4) {
      bg = "linear-gradient(145deg,#19542b,#11321c)";
    } else if (cell.value <= 8) {
      bg = "linear-gradient(145deg,#7a651f,#493711)";
    } else {
      bg = "linear-gradient(145deg,#7e2833,#471117)";
    }

    div.style.background = bg;
    div.style.boxShadow = "0 1px 4px rgba(0,0,0,0.7)";
    div.style.color = fg;
    div.style.border = "1px solid rgba(255,255,255,0.16)";

    const inner = document.createElement("div");
    inner.style.display = "flex";
    inner.style.alignItems = "center";
    inner.style.justifyContent = "center";
    inner.style.width = "100%";
    inner.style.height = "100%";

    if (cell.faceUp) {
      inner.textContent = String(cell.value);
      inner.style.fontSize = "1rem";
    } else {
      inner.textContent = "";
      const pip = document.createElement("div");
      pip.style.width = "14px";
      pip.style.height = "14px";
      pip.style.borderRadius = "4px";
      pip.style.border = "1px solid rgba(255,255,255,0.45)";
      pip.style.opacity = "0.8";
      inner.appendChild(pip);
    }
    div.appendChild(inner);

    // Highlight wenn man gerade eine Karte auswählen muss (Tausch/Aufdecken)
    const isSelectPhase =
      currentPlayerIndex === HUMAN &&
      (phase === "human_choose_swap_target_from_discard" ||
        phase === "human_choose_swap_target_from_deck" ||
        phase === "human_choose_flip_target");

    if (playerIndex === HUMAN && isSelectPhase) {
      div.style.boxShadow = "0 0 8px rgba(255,230,150,0.9)";
    }

    // Prüfen, ob diese Karte gerade in einem Clear verschwindet
    const isPendingClear =
      pendingClearAnimation &&
      pendingClearAnimation.playerIndex === playerIndex &&
      pendingClearAnimation.clearedIds &&
      pendingClearAnimation.clearedIds.has(cell.id);

    if (isPendingClear) {
      div.style.pointerEvents = "none";
      div.style.zIndex = "2";
      requestAnimationFrame(() => {
        div.style.transition =
          "transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease";
        div.style.transform = "scale(0.8)";
        div.style.opacity = "0";
        div.style.boxShadow = "0 0 12px rgba(255,255,200,0.95)";
      });
    }

    div.addEventListener("click", onCardClick);
    return div;
  }

  function renderBoards() {
    // Bot-Grid
    botGridContainer.innerHTML = "";
    const botGrid = players[BOT].grid;
    const botRows = botGrid.length;
    const botCols = botRows > 0 ? botGrid[0].length : 0;
    botGridContainer.style.gridTemplateColumns = `repeat(${botCols || 4}, minmax(32px, 1fr))`;
    for (let r = 0; r < botRows; r++) {
      for (let c = 0; c < botGrid[r].length; c++) {
        const cell = botGrid[r][c];
        const el = createCardElement(BOT, r, c, cell);
        botGridContainer.appendChild(el);
      }
    }

    // Human-Grid
    humanGridContainer.innerHTML = "";
    const humanGrid = players[HUMAN].grid;
    const hRows = humanGrid.length;
    const hCols = hRows > 0 ? humanGrid[0].length : 0;
    humanGridContainer.style.gridTemplateColumns = `repeat(${hCols || 4}, minmax(32px, 1fr))`;

    for (let r = 0; r < hRows; r++) {
      for (let c = 0; c < humanGrid[r].length; c++) {
        const cell = humanGrid[r][c];
        const el = createCardElement(HUMAN, r, c, cell);
        humanGridContainer.appendChild(el);
      }
    }

    // Anzeigen nur sichtbarer Karten
    humanScoreSpan.textContent = `· offene Summe: ${computeVisibleScore(
      humanGrid
    )}`;
    botScoreSpan.textContent = `· offene Summe: ${computeVisibleScore(
      botGrid
    )}`;
  }

  function renderPilesAndState() {
    // Deck
    deckEl.textContent = deck.length > 0 ? "🂠" : "✖";
    deckEl.style.opacity = deck.length > 0 ? "1" : "0.4";

    // Ablage
    if (discard.length === 0) {
      discardEl.textContent = "–";
      discardEl.style.opacity = "0.4";
    } else {
      const top = discard[discard.length - 1];
      discardEl.textContent = String(top);
      discardEl.style.opacity = "1";
    }

    // Gezogene Karte
    if (drawnCard) {
      drawnCardEl.textContent = String(drawnCard.value);
      drawnCardEl.style.opacity = "1";
    } else {
      drawnCardEl.textContent = "–";
      drawnCardEl.style.opacity = "0.6";
    }

    // Aktionen bei gezogener Stapelkarte ein-/ausblenden
    if (
      !gameOver &&
      currentPlayerIndex === HUMAN &&
      phase === "human_choose_deck_action" &&
      drawnCard &&
      drawnCard.source === "deck"
    ) {
      drawnActions.style.display = "flex";
    } else {
      drawnActions.style.display = "none";
    }

    // Interaktives Styling Deck/Ablage
    const humanTurn = !gameOver && currentPlayerIndex === HUMAN;

    if (humanTurn && phase === "human_choose_source") {
      deckWrapper.style.borderColor = "rgba(255,230,150,0.9)";
      deckWrapper.style.boxShadow = "0 0 10px rgba(255,230,150,0.7)";
      discardWrapper.style.borderColor = "rgba(255,230,150,0.9)";
      discardWrapper.style.boxShadow = "0 0 10px rgba(255,230,150,0.7)";
    } else {
      deckWrapper.style.borderColor = "rgba(255,255,255,0.25)";
      deckWrapper.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
      discardWrapper.style.borderColor = "rgba(255,255,255,0.25)";
      discardWrapper.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
    }

    // Status
    if (gameOver) {
      // bleibt wie von finishRound gesetzt
    } else if (currentPlayerIndex === HUMAN) {
      if (phase === "human_choose_source") {
        setStatus("Du bist dran: Ziehe eine Karte vom Stapel oder von der Ablage.");
      } else if (phase === "human_choose_deck_action") {
        setStatus("Gezogene Stapelkarte: tauschen oder ablegen & verdeckte Karte aufdecken.");
      } else if (
        phase === "human_choose_swap_target_from_discard" ||
        phase === "human_choose_swap_target_from_deck"
      ) {
        setStatus("Wähle eine deiner Karten zum Tauschen.");
      } else if (phase === "human_choose_flip_target") {
        setStatus("Wähle eine deiner verdeckten Karten zum Aufdecken.");
      } else {
        setStatus("Du bist dran.");
      }
    } else {
      setStatus("Bot ist am Zug …");
    }
  }

  function updateTurnHighlights() {
    const isHumanTurn = !gameOver && currentPlayerIndex === HUMAN;
    const isBotTurn = !gameOver && currentPlayerIndex === BOT;

    humanLabel.style.fontWeight = isHumanTurn ? "700" : "400";
    humanLabel.style.textShadow = isHumanTurn
      ? "0 0 8px rgba(255,230,150,0.9)"
      : "none";
    humanLabel.style.opacity = isHumanTurn ? "1" : "0.85";

    botLabel.style.fontWeight = isBotTurn ? "700" : "400";
    botLabel.style.textShadow = isBotTurn
      ? "0 0 8px rgba(150,200,255,0.9)"
      : "none";
    botLabel.style.opacity = isBotTurn ? "1" : "0.85";

    // Board-Highlight für aktiven Spieler + Clear-Flash
    let humanShadow = "none";
    if (lastClearFlashPlayerIndex === HUMAN) {
      humanShadow = "0 0 14px rgba(255,255,180,0.9)";
    } else if (isHumanTurn) {
      humanShadow = "0 0 8px rgba(255,230,150,0.35)";
    }
    humanGridContainer.style.boxShadow = humanShadow;

    let botShadow = "none";
    if (lastClearFlashPlayerIndex === BOT) {
      botShadow = "0 0 14px rgba(180,220,255,0.9)";
    } else if (isBotTurn) {
      botShadow = "0 0 8px rgba(150,200,255,0.35)";
    }
    botGridContainer.style.boxShadow = botShadow;
  }

  function renderAll() {
    if (destroyed) return;
    renderBoards();
    renderPilesAndState();
    updateTurnHighlights();
  }

  // kurzes Flash, wenn bei einem Spieler eine Reihe/Spalte gecleart wurde
  function triggerClearFlash(playerIndex) {
    lastClearFlashPlayerIndex = playerIndex;
    renderAll();
    setTimeout(() => {
      lastClearFlashPlayerIndex = null;
      renderAll();
    }, 260);
  }

  // -------------------------------------------------------
  // Clear-Anwendung mit Animation
  // -------------------------------------------------------

  function animateGridClear(playerIndex, preClearGrid, clearResult, discardValue, onComplete) {
    const player = players[playerIndex];

    // IDs vor dem Clear sammeln
    const beforeIds = [];
    for (const row of preClearGrid) {
      for (const cell of row) {
        beforeIds.push(cell.id);
      }
    }

    // IDs nach dem Clear
    const afterIdSet = new Set();
    for (const row of clearResult.grid) {
      for (const cell of row) {
        afterIdSet.add(cell.id);
      }
    }

    const clearedIds = [];
    for (const id of beforeIds) {
      if (!afterIdSet.has(id)) {
        clearedIds.push(id);
      }
    }

    if (clearedIds.length === 0) {
      // Fallback
      pendingClearAnimation = null;
      player.grid = clearResult.grid;
      discard.push(discardValue);
      drawnCard = null;
      renderAll();
      if (onComplete) onComplete();
      return;
    }

    pendingClearAnimation = {
      playerIndex,
      clearedIds: new Set(clearedIds),
    };

    triggerClearFlash(playerIndex);

    // Nach kurzer Animationszeit Karten wirklich entfernen
    setTimeout(() => {
      pendingClearAnimation = null;
      player.grid = clearResult.grid;
      discard.push(discardValue);
      drawnCard = null;
      renderAll();
      if (onComplete) onComplete();
    }, 260);
  }

  // -------------------------------------------------------
  // Zug-Operationen (Realspiel)
  // -------------------------------------------------------

  function applySwapForPlayer(playerIndex, newValue, source, row, col, onComplete) {
    const player = players[playerIndex];
    const oldGrid = player.grid;
    if (!oldGrid[row] || !oldGrid[row][col]) {
      if (onComplete) onComplete();
      return;
    }

    phase = "resolving";

    const replacedVal = oldGrid[row][col].value;

    // Grid nach dem tatsächlichen Tausch (vor Clears)
    const workingGrid = deepCopyGrid(oldGrid);
    workingGrid[row][col].value = newValue;
    workingGrid[row][col].faceUp = true;

    // Dieses Grid zunächst anzeigen
    player.grid = workingGrid;

    // Mögliche Clears
    const result = computeClearsOnGrid(workingGrid);
    const clearedValues = result.clearedValues || [];

    // Ablage-Karte bestimmen
    let discardValue;
    if (clearedValues.length === 0) {
      // Keine Clears → nur ersetzte Karte auf den Ablagestapel
      discardValue = replacedVal;
      discard.push(discardValue);
      drawnCard = null;
      renderAll();
      if (onComplete) onComplete();
      return;
    } else {
      // Clears → ersetzte Karte + alle gelöschten Karten
      const all = clearedValues.concat([replacedVal]);
      let max = all[0];
      for (let i = 1; i < all.length; i++) {
        if (all[i] > max) max = all[i];
      }
      discardValue = max;
      // Animation + finaler Zustand
      animateGridClear(playerIndex, workingGrid, result, discardValue, onComplete);
    }
  }

  // Deckkarte wird beim "Ablegen & Aufdecken" NICHT verschluckt:
  // Sie geht immer in die Ablage; Clear-Set besteht nur aus den gelöschten Grid-Karten.
  function applyFlipForPlayer(playerIndex, deckValue, row, col, onComplete) {
    const player = players[playerIndex];
    const oldGrid = player.grid;
    if (!oldGrid[row] || !oldGrid[row][col]) {
      if (onComplete) onComplete();
      return;
    }
    if (oldGrid[row][col].faceUp) {
      if (onComplete) onComplete();
      return;
    }

    phase = "resolving";

    // Grid nach Aufdecken der Karte
    const workingGrid = deepCopyGrid(oldGrid);
    workingGrid[row][col].faceUp = true;

    // Zuerst so anzeigen
    player.grid = workingGrid;

    const result = computeClearsOnGrid(workingGrid);
    const clearedValues = result.clearedValues || [];

    // Deckkarte wird IMMER auf den Ablagestapel gelegt – wie im Original
    discard.push(deckValue);

    if (clearedValues.length === 0) {
      // Kein Clear: Deckkarte liegt einfach oben
      drawnCard = null;
      renderAll();
      if (onComplete) onComplete();
      return;
    } else {
      // Clear: nur die gelöschten Grid-Karten bestimmen die "Top-Karte"
      let max = clearedValues[0];
      for (let i = 1; i < clearedValues.length; i++) {
        if (clearedValues[i] > max) max = clearedValues[i];
      }
      // Nach der Clear-Animation liegt diese Max-Karte oben,
      // die Deckkarte liegt darunter in der Ablage.
      animateGridClear(playerIndex, workingGrid, result, max, onComplete);
    }
  }

  // -------------------------------------------------------
  // Runden-Ende & Auswertung
  // -------------------------------------------------------

  function finishRound() {
    if (gameOver) return;
    gameOver = true;

    // Alle Karten aufdecken zur Anzeige & finale Wertung
    for (const p of players) {
      for (const row of p.grid) {
        for (const cell of row) {
          cell.faceUp = true;
        }
      }
    }

    const humanScore = computeScore(players[HUMAN].grid);
    const botScore = computeScore(players[BOT].grid);

    let finalHuman = humanScore;
    let finalBot = botScore;

    let winner = null;
    if (finalHuman < finalBot) {
      winner = HUMAN;
    } else if (finalBot < finalHuman) {
      winner = BOT;
    } else {
      winner = null;
    }

    renderAll();

    if (winner === HUMAN) {
      setStatus(
        `Du gewinnst das Skyjo-Duell! (${finalHuman} vs. ${finalBot})`
      );
      showModal(
        "Du hast gewonnen! 🎉",
        `Deine Summe: ${finalHuman} · Bot: ${finalBot}`,
        "Du darfst nun dein 13. Adventgeschenk öffnen – Roter Stern erspielt!"
      );

      try {
        if (
          typeof window !== "undefined" &&
          typeof window.playVictorySound === "function"
        ) {
          window.playVictorySound();
        }
      } catch (e) {}

      try {
        onWin({ level: "red", label: "Roter Stern" });
      } catch (e) {
        console.error("skyjo_13 onWin error:", e);
      }
    } else if (winner === BOT) {
      setStatus(
        `Der Bot gewinnt das Skyjo-Duell. (${finalHuman} vs. ${finalBot})`
      );
      showModal(
        "Bot gewinnt 😈",
        `Deine Summe: ${finalHuman} · Bot: ${finalBot}`,
        "Vielleicht im nächsten Versuch – oder mit etwas mehr Reihen-/Spaltenmagie."
      );
    } else {
      setStatus(`Unentschieden. (${finalHuman} vs. ${finalBot})`);
      showModal(
        "Unentschieden",
        `Beide haben ${finalHuman} Punkte.`,
        "Revanche? Vielleicht wird der nächste Versuch klarer."
      );
    }

    phase = "game_over";
  }

  function endTurn(playerIndex) {
    if (gameOver) return;

    const grid = players[playerIndex].grid;
    const allUp = allCardsFaceUp(grid);

    if (roundEndingPlayerIndex === null) {
      if (allUp) {
        roundEndingPlayerIndex = playerIndex;
        setStatus(
          playerIndex === HUMAN
            ? "Du hast alle Karten offen – der Bot bekommt noch einen letzten Zug."
            : "Bot hat alle Karten offen – du bekommst noch einen letzten Zug."
        );
      }
    } else {
      if (playerIndex !== roundEndingPlayerIndex) {
        finishRound();
        return;
      }
    }

    // Nächster Spieler
    currentPlayerIndex = playerIndex === HUMAN ? BOT : HUMAN;

    if (gameOver) return;

    if (currentPlayerIndex === HUMAN) {
      phase = "human_choose_source";
      renderAll();
    } else {
      phase = "bot_turn";
      renderAll();
      botTakeTurn();
    }
  }

  // -------------------------------------------------------
  // Bot-Logik (intelligenter Zug mit Heuristik)
  // -------------------------------------------------------

  // Bewertung eines Bot-Grid-Zustands.
  // Kleinere Werte = besser.
  // Berücksichtigt:
  // - Gesamtsumme
  // - Reihen, die (fast) streng auf/absteigend sind
  // - Spalten mit gleichen Werten
  // - Anzahl verdeckter Karten (leicht bestraft)
  function evaluateBotGrid(grid) {
    let baseScore = 0;
    let totalFaceDown = 0;

    for (const row of grid) {
      for (const cell of row) {
        baseScore += cell.value;
        if (!cell.faceUp) totalFaceDown++;
      }
    }

    let rowBonus = 0;
    for (const row of grid) {
      const vals = row.map((c) => c.value);
      const len = vals.length;
      if (len >= 2) {
        let ascBad = 0;
        let descBad = 0;

        // "gute" Paare sind solche mit +1 bzw. -1 Differenz
        for (let i = 0; i < len - 1; i++) {
          if (vals[i + 1] !== vals[i] + 1) ascBad++;
          if (vals[i + 1] !== vals[i] - 1) descBad++;
        }

        const bestBad = Math.min(ascBad, descBad);
        const goodPairs = (len - 1) - bestBad;

        rowBonus += goodPairs; // je mehr passende Paare, desto besser

        if (bestBad === 0) {
          // Reihe ist bereits perfekte +1/-1-Kette → sofort clearbar
          rowBonus += len * 2;
        } else if (bestBad === 1) {
          // Nur eine "falsche" Stelle → fast clear
          rowBonus += len;
        }
      }

      const faceUpCount = row.filter((c) => c.faceUp).length;
      rowBonus += faceUpCount * 0.2;
    }


    let colBonus = 0;
    const rows = grid.length;
    if (rows > 0) {
      const cols = grid[0].length;
      for (let c = 0; c < cols; c++) {
        const freq = new Map();
        let faceUpCountCol = 0;
        for (let r = 0; r < rows; r++) {
          const cell = grid[r][c];
          const v = cell.value;
          freq.set(v, (freq.get(v) || 0) + 1);
          if (cell.faceUp) faceUpCountCol++;
        }
        let maxSame = 0;
        freq.forEach((cnt) => {
          if (cnt > maxSame) maxSame = cnt;
        });
        colBonus += Math.max(0, maxSame - 1);
        if (maxSame === rows) {
          // Spalte bereits komplett gleich
          colBonus += rows * 2;
        }
        colBonus += faceUpCountCol * 0.1;
      }
    }

    // Gewichtung
    const heurScore =
      baseScore - rowBonus * 1.5 - colBonus * 1.2 + totalFaceDown * 0.3;

    return heurScore;
  }

  // Bot-Simulation nutzt dieselbe Clear-Logik wie das echte Spiel
  function simulateSwap(grid, row, col, newValue) {
    const tmpGrid = deepCopyGrid(grid);
    if (!tmpGrid[row] || !tmpGrid[row][col]) return null;

    tmpGrid[row][col].value = newValue;
    tmpGrid[row][col].faceUp = true;

    const result = computeClearsOnGrid(tmpGrid);
    const score = evaluateBotGrid(result.grid);
    return { grid: result.grid, score };
  }

  function simulateFlip(grid, row, col) {
    const tmpGrid = deepCopyGrid(grid);
    if (!tmpGrid[row] || !tmpGrid[row][col]) return null;
    if (tmpGrid[row][col].faceUp) return null;

    tmpGrid[row][col].faceUp = true;

    const result = computeClearsOnGrid(tmpGrid);
    const score = evaluateBotGrid(result.grid);
    return { grid: result.grid, score };
  }

  function decideBotMove() {
    const bot = players[BOT];
    const grid = bot.grid;

    const discardTop = discard.length > 0 ? discard[discard.length - 1] : null;
    const deckTop = deck.length > 0 ? deck[deck.length - 1] : null;

    const candidates = [];

    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;

    // Option 1: Ablagekarte nutzen (muss getauscht werden)
    if (discardTop !== null) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sim = simulateSwap(grid, r, c, discardTop);
          if (!sim) continue;
          candidates.push({
            kind: "useDiscardSwap",
            row: r,
            col: c,
            score: sim.score,
          });
        }
      }
    }

    // Option 2: Deckkarte nutzen → Tausch
    if (deckTop !== null) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sim = simulateSwap(grid, r, c, deckTop);
          if (!sim) continue;
          candidates.push({
            kind: "useDeckSwap",
            row: r,
            col: c,
            score: sim.score,
          });
        }
      }

      // Option 3: Deckkarte ablegen & verdeckte Karte aufdecken
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!grid[r][c] || grid[r][c].faceUp) continue;
          const sim = simulateFlip(grid, r, c);
          if (!sim) continue;
          candidates.push({
            kind: "discardDeckFlip",
            row: r,
            col: c,
            score: sim.score,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Bestes Ergebnis (niedrigste Score) wählen
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      if (c.score < best.score) {
        best = c;
      }
    }

    return best;
  }

  function botTakeTurn() {
    if (destroyed || gameOver) return;
    if (currentPlayerIndex !== BOT) return;

    setTimeout(() => {
      if (destroyed || gameOver || currentPlayerIndex !== BOT) return;

      const move = decideBotMove();

      const finish = () => {
        endTurn(BOT);
      };

      if (!move) {
        // Fallback: wenn gar nichts geht, Deck ziehen & random flip
        if (deck.length > 0) {
          const val = deck.pop();
          const grid = players[BOT].grid;
          let target = null;
          for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
              if (!grid[r][c].faceUp) {
                target = { r, c };
                break;
              }
            }
            if (target) break;
          }
          if (!target) {
            finishRound();
            return;
          }
          applyFlipForPlayer(BOT, val, target.r, target.c, finish);
        } else {
          finish();
        }
        return;
      }

      if (move.kind === "useDiscardSwap") {
        const v = discard.pop();
        applySwapForPlayer(BOT, v, "discard", move.row, move.col, finish);
      } else if (move.kind === "useDeckSwap") {
        const v = deck.pop();
        applySwapForPlayer(BOT, v, "deck", move.row, move.col, finish);
      } else if (move.kind === "discardDeckFlip") {
        const v = deck.pop();
        applyFlipForPlayer(BOT, v, move.row, move.col, finish);
      }
    }, 450);
  }

  // -------------------------------------------------------
  // Input-Handling (Mensch)
  // -------------------------------------------------------

  function onDeckClick() {
    if (destroyed || gameOver) return;
    if (currentPlayerIndex !== HUMAN) return;
    if (phase !== "human_choose_source") return;
    if (deck.length === 0) return;

    const v = deck.pop();
    drawnCard = { value: v, source: "deck" };
    phase = "human_choose_deck_action";
    renderAll();
  }

  function onDiscardClick() {
    if (destroyed || gameOver) return;
    if (currentPlayerIndex !== HUMAN) return;
    if (phase !== "human_choose_source") return;
    if (discard.length === 0) return;

    const v = discard.pop();
    drawnCard = { value: v, source: "discard" };
    phase = "human_choose_swap_target_from_discard";
    renderAll();
  }

  function onCardClick(e) {
    if (destroyed || gameOver) return;
    const el = e.currentTarget;
    const playerIndex = Number(el.dataset.playerIndex);
    const row = Number(el.dataset.row);
    const col = Number(el.dataset.col);

    if (playerIndex !== HUMAN) {
      return;
    }

    const player = players[HUMAN];
    if (!player.grid[row] || !player.grid[row][col]) return;

    if (phase === "human_choose_swap_target_from_discard") {
      if (!drawnCard || drawnCard.source !== "discard") return;
      applySwapForPlayer(HUMAN, drawnCard.value, "discard", row, col, () =>
        endTurn(HUMAN)
      );
    } else if (phase === "human_choose_swap_target_from_deck") {
      if (!drawnCard || drawnCard.source !== "deck") return;
      applySwapForPlayer(HUMAN, drawnCard.value, "deck", row, col, () =>
        endTurn(HUMAN)
      );
    } else if (phase === "human_choose_flip_target") {
      if (!drawnCard || drawnCard.source !== "deck") return;
      const cell = player.grid[row][col];
      if (cell.faceUp) return;
      applyFlipForPlayer(HUMAN, drawnCard.value, row, col, () =>
        endTurn(HUMAN)
      );
    }
  }

  // Buttons / Interaktionen für Deck-Aktion

  function chooseDeckSwap() {
    if (destroyed || gameOver) return;
    if (currentPlayerIndex !== HUMAN) return;
    if (phase !== "human_choose_deck_action") return;
    if (!drawnCard || drawnCard.source !== "deck") return;

    phase = "human_choose_swap_target_from_deck";
    setStatus("Wähle eine deiner Karten zum Tauschen.");
    renderAll();
  }

  function chooseDeckFlip() {
    if (destroyed || gameOver) return;
    if (currentPlayerIndex !== HUMAN) return;
    if (phase !== "human_choose_deck_action") return;
    if (!drawnCard || drawnCard.source !== "deck") return;

    phase = "human_choose_flip_target";
    setStatus("Lege die Karte ab und decke eine verdeckte Karte auf.");
    renderAll();
  }

  function handleKeyDown(e) {
    if (destroyed || gameOver) return;
    if (currentPlayerIndex !== HUMAN) return;

    if (phase === "human_choose_deck_action") {
      if (!drawnCard || drawnCard.source !== "deck") return;
      if (e.code === "Space") {
        chooseDeckSwap();
        e.preventDefault();
      } else if (e.code === "Enter") {
        chooseDeckFlip();
        e.preventDefault();
      }
    }
  }

  function onNewGameClick() {
    if (destroyed) return;
    setupGame();
  }

  deckWrapper.addEventListener("click", onDeckClick);
  discardWrapper.addEventListener("click", onDiscardClick);
  deckSwapBtn.addEventListener("click", chooseDeckSwap);
  deckFlipBtn.addEventListener("click", chooseDeckFlip);
  window.addEventListener("keydown", handleKeyDown);
  newGameBtn.addEventListener("click", onNewGameClick);

  // -------------------------------------------------------
  // Start
  // -------------------------------------------------------

  setupGame();

  // -------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------

  return {
    destroy() {
      destroyed = true;
      try {
        window.removeEventListener("keydown", handleKeyDown);
      } catch (e) {}
      try {
        deckWrapper.removeEventListener("click", onDeckClick);
        discardWrapper.removeEventListener("click", onDiscardClick);
        deckSwapBtn.removeEventListener("click", chooseDeckSwap);
        deckFlipBtn.removeEventListener("click", chooseDeckFlip);
        newGameBtn.removeEventListener("click", onNewGameClick);
      } catch (e) {}
      try {
        modalClose.removeEventListener("click", hideModal);
      } catch (e) {}
      try {
        if (modalOverlay && modalOverlay.parentNode) {
          modalOverlay.parentNode.removeChild(modalOverlay);
        }
      } catch (e) {}
    },
  };
};
