// Spiel 15: Malen nach Zahlen – Schneemann C+J
// -----------------------------------------------------
// Bild: Schneemann mit Herz und "C+J" auf der Brust.
// - Alle Flächen sind anfangs UNBEMALT (nur graue Umrisse & Zahlen).
// - Es gibt nummerierte Felder (Farben 1–6).
// - Der Spieler wählt eine Farbe aus der Palette und klickt auf ein Feld.
// - Ein Feld kann NUR mit seiner richtigen Farbe bemalt werden – falsche
//   Farben werden ignoriert (kein Färben).
// - Das Spiel ist gewonnen, wenn alle Felder korrekt ausgemalt sind
//   (automatisch nach dem letzten richtigen Klick).
// - Belohnung: Roter Stern + optional window.playVictorySound().
//
// Regions / Farben:
//   1 – Schneeweiß        → Schneemann-Körper (Kopf, Mitte, unten)
//   2 – Anthrazit         → Hut, Knöpfe, Augen, Mund
//   3 – Karotten-Orange   → Nase
//   4 – Rot               → Schal + Hutband
//   5 – Holzbraun         → Äste (Arme)
//   6 – Herzrot           → Herz auf der Brust
//
// "C+J" wird gut lesbar in Schwarz auf das Herz gesetzt (nicht extra ausmalbar).
// -----------------------------------------------------

window.AdventGames = window.AdventGames || {};

window.AdventGames["snow_15"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // ---------------------------------------------------
  // Grund-Layout
  // ---------------------------------------------------

  const root = document.createElement("div");
  root.className = "snowman-paint-15-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 15 – Malen nach Zahlen: Schneemann";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Male den Schneemann nach Zahlen aus. Jede Fläche hat eine feste Farbe – nur die richtige passt.";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.color = "rgba(255,255,255,0.9)";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);

  const statusBar = document.createElement("div");
  statusBar.style.fontSize = "0.82rem";
  statusBar.style.opacity = "0.9";
  statusBar.style.padding = "4px 8px";
  statusBar.style.borderRadius = "999px";
  statusBar.style.background = "rgba(10,18,30,0.9)";
  statusBar.style.border = "1px solid rgba(255,255,255,0.12)";
  statusBar.textContent =
    "Wähle eine Farbe und klicke dann auf ein Feld mit derselben Zahl.";

  root.appendChild(header);
  root.appendChild(statusBar);

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "stretch";
  layout.style.marginTop = "4px";

  const left = document.createElement("div");
  left.style.flex = "1 1 auto";
  left.style.display = "flex";
  left.style.flexDirection = "column";
  left.style.gap = "8px";

  const right = document.createElement("aside");
  right.style.flex = "0 0 230px";
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "10px";
  right.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);
  container.appendChild(root);

  // ---------------------------------------------------
  // Canvas-Setup
  // ---------------------------------------------------

  const canvasWrapper = document.createElement("div");
  canvasWrapper.style.position = "relative";
  canvasWrapper.style.borderRadius = "12px";
  canvasWrapper.style.background =
    "radial-gradient(circle at top, #0f172a, #020617)";
  canvasWrapper.style.boxShadow = "0 4px 16px rgba(0,0,0,0.7)";
  canvasWrapper.style.padding = "8px";

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.borderRadius = "10px";
  canvasWrapper.appendChild(canvas);
  left.appendChild(canvasWrapper);

  const ctx = canvas.getContext("2d");

  // Logischer Zeichenbereich (fix)
  const width = 420;
  const height = 360;

  // 1:1-Canvas, nur per CSS größer gezogen → Klickcoords sind sauber skalierbar
  canvas.width = width;
  canvas.height = height;
  const scaleX = 1.6;
  const scaleY = 1.4;
  canvas.style.width = width * scaleX + "px";
  canvas.style.height = height * scaleY + "px";

  function setStatus(text) {
    statusBar.textContent = text;
  }

  // ---------------------------------------------------
  // Farben / Palette
  // ---------------------------------------------------

  const palette = [
    {
      key: "snow",
      number: 1,
      name: "Schneeweiß (Körper)",
      color: "#f9fafb",
    },
    {
      key: "coal",
      number: 2,
      name: "Anthrazit (Hut, Knöpfe, Augen, Mund)",
      color: "#111827",
    },
    {
      key: "carrot",
      number: 3,
      name: "Karotten-Orange (Nase)",
      color: "#fb923c",
    },
    {
      key: "scarf",
      number: 4,
      name: "Rot (Schal & Hutband)",
      color: "#ef4444",
    },
    {
      key: "wood",
      number: 5,
      name: "Holzbraun (Äste)",
      color: "#92400e",
    },
    {
      key: "heart",
      number: 6,
      name: "Herzrot",
      color: "#fb7185",
    },
  ];

  const paletteByKey = {};
  const paletteByNumber = {};
  for (const p of palette) {
    paletteByKey[p.key] = p;
    paletteByNumber[p.number] = p;
  }

  let selectedColorKey = null;
  let hasWon = false;
  let destroyed = false;

  // ---------------------------------------------------
  // Regionen (Felder)
  // ---------------------------------------------------

  const regions = [];

  function addRegion({ id, colorKey, labelX, labelY, pathFn, showLabel = true }) {
    const pal = paletteByKey[colorKey];
    const number = pal ? pal.number : "?";
    regions.push({
      id,
      requiredColorKey: colorKey,
      fillColorKey: null,
      labelNumber: number,
      labelX,
      labelY,
      pathFn,
      showLabel,
    });
  }

  const cx = width / 2;

  (function buildRegions() {
    // Schneemann-Körper: 3 Kreise (alle Farbe 1)
    addRegion({
      id: "body_bottom",
      colorKey: "snow",
      labelX: cx,
      labelY: 265,
      pathFn: (ctx) => {
        ctx.arc(cx, 265, 75, 0, Math.PI * 2);
      },
    });

    addRegion({
      id: "body_middle",
      colorKey: "snow",
      labelX: cx,
      labelY: 190,
      pathFn: (ctx) => {
        ctx.arc(cx, 190, 60, 0, Math.PI * 2);
      },
    });

    addRegion({
      id: "body_head",
      colorKey: "snow",
      labelX: cx,
      labelY: 115,
      pathFn: (ctx) => {
        ctx.arc(cx, 115, 42, 0, Math.PI * 2);
      },
    });

    // Hut – Anthrazit (2)
    addRegion({
      id: "hat_top",
      colorKey: "coal",
      labelX: cx,
      labelY: 60,
      pathFn: (ctx) => {
        const w = 90;
        const h = 42;
        const x = cx - w / 2;
        const y = 35;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
      },
    });

    addRegion({
      id: "hat_brim",
      colorKey: "coal",
      labelX: cx,
      labelY: 90,
      pathFn: (ctx) => {
        const w = 130;
        const h = 12;
        const x = cx - w / 2;
        const y = 78;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
      },
    });

    // Hutband – Rot (4)
    addRegion({
      id: "hat_band",
      colorKey: "scarf",
      labelX: cx,
      labelY: 82,
      pathFn: (ctx) => {
        const w = 90;
        const h = 8;
        const x = cx - w / 2;
        const y = 72;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
      },
    });

    // Schal – Ring – Rot (4)
    addRegion({
      id: "scarf_ring",
      colorKey: "scarf",
      labelX: cx,
      labelY: 150,
      pathFn: (ctx) => {
        const w = 130;
        const h = 26;
        const x = cx - w / 2;
        const y = 142;
        const r = 10;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      },
    });

    // Schal – herunterhängendes Ende – Rot (4)
    addRegion({
      id: "scarf_tail",
      colorKey: "scarf",
      labelX: cx - 28,
      labelY: 188,
      pathFn: (ctx) => {
        const w = 30;
        const h = 60;
        const x = cx - 40;
        const y = 158;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
      },
    });

    // Nase – Karotte (3) – kleine Fläche → ohne Zahl
    addRegion({
      id: "nose",
      colorKey: "carrot",
      labelX: cx + 30,
      labelY: 115,
      showLabel: false,
      pathFn: (ctx) => {
        ctx.moveTo(cx + 8, 112);
        ctx.lineTo(cx + 55, 118);
        ctx.lineTo(cx + 8, 124);
        ctx.closePath();
      },
    });

    // Arme – Holzbraun (5)
    addRegion({
      id: "arm_left",
      colorKey: "wood",
      labelX: cx - 105,
      labelY: 160,
      pathFn: (ctx) => {
        ctx.moveTo(cx - 60, 190);
        ctx.lineTo(cx - 115, 145);
        ctx.lineTo(cx - 105, 136);
        ctx.lineTo(cx - 52, 182);
        ctx.closePath();
      },
    });

    addRegion({
      id: "arm_right",
      colorKey: "wood",
      labelX: cx + 105,
      labelY: 160,
      pathFn: (ctx) => {
        ctx.moveTo(cx + 60, 190);
        ctx.lineTo(cx + 115, 145);
        ctx.lineTo(cx + 105, 136);
        ctx.lineTo(cx + 52, 182);
        ctx.closePath();
      },
    });

    // Herz – Herzrot (6) – etwas größer
    addRegion({
      id: "heart",
      colorKey: "heart",
      labelX: cx,
      labelY: 182,
      pathFn: (ctx) => {
        const topY = 186;
        const bottomY = 230;
        ctx.moveTo(cx, topY + 12);
        ctx.bezierCurveTo(cx - 28, topY - 10, cx - 46, topY + 14, cx, bottomY);
        ctx.bezierCurveTo(cx + 46, topY + 14, cx + 28, topY - 10, cx, topY + 12);
        ctx.closePath();
      },
    });

    // Augen – Anthrazit (2) – ohne Zahl
    addRegion({
      id: "eye_left",
      colorKey: "coal",
      labelX: cx - 12,
      labelY: 105,
      showLabel: false,
      pathFn: (ctx) => {
        ctx.arc(cx - 12, 105, 5, 0, Math.PI * 2);
      },
    });

    addRegion({
      id: "eye_right",
      colorKey: "coal",
      labelX: cx + 12,
      labelY: 105,
      showLabel: false,
      pathFn: (ctx) => {
        ctx.arc(cx + 12, 105, 5, 0, Math.PI * 2);
      },
    });

    // Mund – Anthrazit (2) – kleine Kohlen, ohne Zahl
    const mouthPoints = [
      { x: cx - 18, y: 134 },
      { x: cx - 6, y: 138 },
      { x: cx + 6, y: 138 },
      { x: cx + 18, y: 134 },
    ];
    mouthPoints.forEach((p, i) =>
      addRegion({
        id: "mouth_" + (i + 1),
        colorKey: "coal",
        labelX: p.x,
        labelY: p.y,
        showLabel: false,
        pathFn: (ctx) => {
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        },
      })
    );

    // Knöpfe – Anthrazit (2) – nur der oberste bleibt
    const buttons = [{ x: cx, y: 176 }];
    buttons.forEach((p, i) =>
      addRegion({
        id: "button_" + (i + 1),
        colorKey: "coal",
        labelX: p.x,
        labelY: p.y,
        showLabel: false,
        pathFn: (ctx) => {
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        },
      })
    );
  })();

  // ---------------------------------------------------
  // Zeichnen
  // ---------------------------------------------------

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.5, "#020617");
    grad.addColorStop(1, "#0b1220");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(0, 305);
    ctx.quadraticCurveTo(width / 2, 285, width, 305);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 30; i++) {
      const x = (i * 47.3) % width;
      const y = 20 + ((i * 59.1) % 100);
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  function drawRegions() {
    const outlineColor = "rgba(148,163,184,0.9)";
    const outlineWidth = 2;

    // Flächen
    for (const region of regions) {
      ctx.save();
      ctx.beginPath();
      region.pathFn(ctx);

      if (region.fillColorKey) {
        const pal = paletteByKey[region.fillColorKey];
        ctx.fillStyle = pal ? pal.color : "rgba(255,255,255,0.5)";
        ctx.fill();
      }

      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = outlineWidth;
      ctx.stroke();
      ctx.restore();
    }

    // Zahlen – nur für größere Flächen
    ctx.save();
    ctx.font =
      "bold 11px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const region of regions) {
      if (!region.showLabel) continue;
      const pal = paletteByKey[region.requiredColorKey];
      const label = pal ? pal.number : "?";

      ctx.fillStyle = region.fillColorKey
        ? "rgba(15,23,42,0.8)"
        : "rgba(148,163,184,0.97)";
      ctx.fillText(String(label), region.labelX, region.labelY);
    }
    ctx.restore();
  }

  function drawTextCJ() {
    // "C+J" im Herz – etwas tiefer und gut erkennbar in Schwarz
    ctx.save();
    ctx.font =
      "bold 22px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#020617";
    ctx.fillText("C+J", cx, 207); // etwas tiefer ins Herz gesetzt
    ctx.restore();
  }

  function drawScene() {
    drawBackground();
    drawRegions();
    drawTextCJ();
  }

  drawScene();

  // ---------------------------------------------------
  // Palette-UI rechts
  // ---------------------------------------------------

  const paletteCard = document.createElement("div");
  paletteCard.style.borderRadius = "10px";
  paletteCard.style.padding = "10px 8px";
  paletteCard.style.background = "rgba(5,10,20,0.95)";
  paletteCard.style.border = "1px solid rgba(255,255,255,0.16)";
  paletteCard.style.display = "flex";
  paletteCard.style.flexDirection = "column";
  paletteCard.style.gap = "6px";

  const paletteTitle = document.createElement("div");
  paletteTitle.textContent = "Farben";
  paletteTitle.style.fontSize = "0.8rem";
  paletteTitle.style.fontWeight = "600";

  const paletteHint = document.createElement("div");
  paletteHint.textContent = "Zahl wählen, dann Feld mit derselben Zahl anklicken.";
  paletteHint.style.fontSize = "0.74rem";
  paletteHint.style.opacity = "0.9";

  const paletteListEl = document.createElement("div");
  paletteListEl.style.display = "flex";
  paletteListEl.style.flexDirection = "column";
  paletteListEl.style.gap = "4px";

  paletteCard.appendChild(paletteTitle);
  paletteCard.appendChild(paletteHint);
  paletteCard.appendChild(paletteListEl);
  right.appendChild(paletteCard);

  const paletteElements = new Map();

  function updatePaletteSelection() {
    for (const [key, el] of paletteElements.entries()) {
      if (key === selectedColorKey) {
        el.style.borderColor = "rgba(248,250,252,1)";
        el.style.boxShadow = "0 0 10px rgba(251,191,36,0.9)";
        el.style.background = "rgba(15,23,42,0.9)";
      } else {
        el.style.borderColor = "rgba(148,163,184,0.6)";
        el.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
        el.style.background = "rgba(15,23,42,0.6)";
      }
    }
  }

  for (const pal of palette) {
    const entry = document.createElement("div");
    entry.style.display = "flex";
    entry.style.alignItems = "center";
    entry.style.gap = "6px";
    entry.style.borderRadius = "999px";
    entry.style.padding = "4px 6px";
    entry.style.border = "1px solid rgba(148,163,184,0.6)";
    entry.style.cursor = "pointer";

    const swatch = document.createElement("div");
    swatch.style.width = "24px";
    swatch.style.height = "24px";
    swatch.style.borderRadius = "999px";
    swatch.style.display = "flex";
    swatch.style.alignItems = "center";
    swatch.style.justifyContent = "center";
    swatch.style.fontSize = "0.8rem";
    swatch.style.fontWeight = "700";
    swatch.style.color = "#0f172a";
    swatch.style.background = pal.color;
    swatch.textContent = pal.number;

    const label = document.createElement("div");
    label.style.fontSize = "0.75rem";
    label.style.opacity = "0.9";
    label.textContent = pal.name;

    entry.appendChild(swatch);
    entry.appendChild(label);

    entry.addEventListener("click", () => {
      if (hasWon) return;
      selectedColorKey = pal.key;
      updatePaletteSelection();
      setStatus(
        `Farbe ${pal.number} gewählt – klicke auf ein Feld mit der ${pal.number}.`
      );
    });

    paletteListEl.appendChild(entry);
    paletteElements.set(pal.key, entry);
  }

  updatePaletteSelection();

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

  // Nur noch die Regeln rechts anzeigen
  const rulesCard = makeSideCard("Regeln", "🎨", [
    "1. Wähle eine Nummer-Farbe.",
    "2. Klicke auf ein Feld mit derselben Nummer.",
    "3. Nur die richtige Farbe funktioniert.",
    "4. Wenn alles vollständig ausgemalt ist → automatisch gewonnen.",
  ]);

  right.appendChild(rulesCard);

  // ---------------------------------------------------
  // Gewinn-Modal
  // ---------------------------------------------------

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
  modalTitle.textContent = "Schneemann fertig ausgemalt! ❄️";
  modalTitle.style.fontWeight = "700";

  const modalBody = document.createElement("div");
  modalBody.textContent =
    "Du hast alle Felder richtig ausgemalt – der Schneemann trägt stolz sein Herz mit C+J.";

  const modalSmall = document.createElement("div");
  modalSmall.style.fontSize = "0.7rem";
  modalSmall.style.opacity = "0.8";
  modalSmall.textContent =
    "Du darfst nun dein 15. Adventgeschenk öffnen – und der rote Stern gehört dir.";

  const modalClose = document.createElement("button");
  modalClose.type = "button";
  modalClose.textContent = "Awww 🧣";
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

  function showModal() {
    modalOverlay.style.opacity = "1";
    modalOverlay.style.pointerEvents = "auto";
  }

  function hideModal() {
    modalOverlay.style.opacity = "0";
    modalOverlay.style.pointerEvents = "none";
  }

  modalClose.addEventListener("click", hideModal);

  // ---------------------------------------------------
  // Game-Logik (inkl. Auto-Win)
  // ---------------------------------------------------

  function checkWin() {
    for (const region of regions) {
      if (region.fillColorKey !== region.requiredColorKey) {
        return false;
      }
    }

    if (!hasWon) {
      hasWon = true;
      setStatus("Bild vollständig & korrekt ausgemalt – du hast gewonnen! ⭐");

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
        console.error("snowman_paint_15 onWin error:", e);
      }

      showModal();
    }
    return true;
  }

  function canvasClickHandler(ev) {
    if (destroyed || hasWon) return;

    if (!selectedColorKey) {
      setStatus("Wähle zuerst eine Farbe in der Palette.");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;

    // Von oben nach unten durchgehen (kleine Details zuletzt hinzugefügt)
    for (let i = regions.length - 1; i >= 0; i--) {
      const region = regions[i];
      ctx.save();
      ctx.beginPath();
      region.pathFn(ctx);
      const hit = ctx.isPointInPath(x, y);
      ctx.restore();

      if (hit) {
        if (region.requiredColorKey !== selectedColorKey) {
          const pal = paletteByKey[region.requiredColorKey];
          const correctNumber = pal ? pal.number : "?";
          setStatus(
            `Dieses Feld braucht die Farbe ${correctNumber}. Du hast aktuell ${paletteByKey[selectedColorKey].number} ausgewählt.`
          );
          return;
        }

        region.fillColorKey = selectedColorKey;
        drawScene();
        checkWin();
        return;
      }
    }
  }

  canvas.addEventListener("click", canvasClickHandler);

  // ENTER-Shortcut: füllt ein zufälliges noch nicht passendes Feld
  function keydownHandler(e) {
    if (destroyed || hasWon) return;
    if (e.code !== "Enter") return;
    if (!selectedColorKey) return;

    const candidates = regions.filter(
      (r) =>
        r.requiredColorKey === selectedColorKey &&
        r.fillColorKey !== selectedColorKey
    );
    if (candidates.length === 0) return;

    const target =
      candidates[Math.floor(Math.random() * candidates.length)];
    target.fillColorKey = selectedColorKey;
    drawScene();
    checkWin();
  }

  window.addEventListener("keydown", keydownHandler);

  // ---------------------------------------------------
  // Cleanup
  // ---------------------------------------------------

  return {
    destroy() {
      destroyed = true;
      try {
        canvas.removeEventListener("click", canvasClickHandler);
      } catch (e) {}
      try {
        window.removeEventListener("keydown", keydownHandler);
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
