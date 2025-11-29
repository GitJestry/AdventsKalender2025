// Spiel 12: Chai – Hafermilch + Tiger Spice
// Aufgabe:
//   - Rezept für einen Chai mit Hafermilch und deiner Sorte "Tiger Spice" lesen.
//   - Danach auf "Gelesen" klicken → gewonnen, roter Stern + Victory-Sound.

window.AdventGames = window.AdventGames || {};

window.AdventGames["chai_12"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // ---------------------------------------------------------------------------
  // ROOT / HEADER
  // ---------------------------------------------------------------------------

  const root = document.createElement("div");
  root.className = "chai-12-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 12 – Chai-Ritual";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Rezept für Chai mit Hafermilch und deiner Sorte „Tiger Spice“. Lesen, dann auf Gelesen klicken.";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.color = "rgba(255,255,255,0.9)";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------

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
  right.style.flex = "0 0 210px";
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "10px";
  right.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  layout.appendChild(left);
  layout.appendChild(right);
  root.appendChild(layout);
  container.appendChild(root);

  // ---------------------------------------------------------------------------
  // REZEPT-PANEL
  // ---------------------------------------------------------------------------

  const panel = document.createElement("div");
  panel.style.position = "relative";
  panel.style.borderRadius = "12px";
  panel.style.background =
    "radial-gradient(circle at top, #3b2845, #121827 55%, #050812)";
  panel.style.boxShadow = "0 4px 16px rgba(0,0,0,0.7)";
  panel.style.padding = "10px 10px 12px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "8px";

  const scrollBox = document.createElement("div");
  scrollBox.style.flex = "1 1 auto";
  scrollBox.style.maxHeight = "260px";
  scrollBox.style.minHeight = "210px";
  scrollBox.style.padding = "10px 12px";
  scrollBox.style.borderRadius = "8px";
  scrollBox.style.background = "rgba(3,7,16,0.95)";
  scrollBox.style.border = "1px solid rgba(255,255,255,0.1)";
  scrollBox.style.overflowY = "auto";
  scrollBox.style.fontSize = "0.8rem";
  scrollBox.style.lineHeight = "1.5";
  scrollBox.style.color = "rgba(230,230,235,0.95)";

  scrollBox.innerHTML = `
    <h3 style="margin:0 0 6px;font-size:0.9rem;">Chai mit Hafermilch & „Tiger Spice“</h3>
    <p style="margin:0 0 6px;">
      Dieses kleine Ritual ist für kalte Tage gedacht, an denen du und dein Chai
      euch gegenseitig aufwärmt. Du brauchst:
    </p>
    <ul style="margin:0 0 6px 1.1rem;padding:0;">
      <li>250 ml Hafermilch (Barista-Style ideal)</li>
      <li>2–3 gehäufte TL deiner Chai-Sorte <strong>„Tiger Spice“</strong> (oder nach Geschmack)</li>
      <li>Optional: etwas Süße (Agavendicksaft, Zucker, Sirup)</li>
      <li>Optional: Zimtstange oder Kardamom für extra Duft</li>
    </ul>

    <h4 style="margin:10px 0 4px;font-size:0.85rem;">1. Hafermilch vorbereiten</h4>
    <p style="margin:0 0 6px;">
      Gieße etwa 250 ml Hafermilch in einen kleinen Topf. Stelle die Herdplatte auf mittlere
      Stufe. Die Milch soll heiß werden, aber nicht wild kochen. Rühre gelegentlich um, damit
      sie nicht anhängt und sich die Hitze gleichmäßig verteilt.
    </p>

    <h4 style="margin:10px 0 4px;font-size:0.85rem;">2. „Tiger Spice“ einrühren</h4>
    <p style="margin:0 0 6px;">
      Gib nun 2–3 gehäufte Teelöffel deiner Chai-Mischung „Tiger Spice“ in die warme Hafermilch.
      Rühre mit einem Schneebesen oder Löffel so lange, bis sich alles komplett gelöst hat und
      keine Klümpchen mehr sichtbar sind.
    </p>
    <p style="margin:0 0 6px;">
      Wenn du es intensiver magst, kannst du noch einen halben Teelöffel dazugeben – Chai
      verzeiht es, wenn man ein bisschen übertreibt.
    </p>

    <h4 style="margin:10px 0 4px;font-size:0.85rem;">3. Temperatur & Süße einstellen</h4>
    <p style="margin:0 0 6px;">
      Lass den Chai kurz unter dem Siedepunkt ziehen – er darf leicht dampfen, aber nicht sprudelnd
      kochen. Probiere vorsichtig und süße bei Bedarf nach. Hafermilch ist von Natur aus leicht süß,
      deshalb lieber langsam herantasten.
    </p>

    <h4 style="margin:10px 0 4px;font-size:0.85rem;">4. Optional: schaumig machen</h4>
    <p style="margin:0 0 6px;">
      Wenn du Lust auf ein kleines Café-Feeling hast, kannst du einen Teil der Hafermilch separat
      aufschäumen (mit Milchaufschäumer oder French Press) und nur konzentrierten Chai in die Tasse
      geben. Dann den Milchschaum oben drauf und mit etwas Zimt bestäuben.
    </p>

    <h4 style="margin:10px 0 4px;font-size:0.85rem;">5. Servieren & genießen</h4>
    <p style="margin:0 0 6px;">
      Gieße den fertigen Chai in deine Lieblings-Tasse. Wenn du magst, kannst du eine Zimtstange,
      eine Prise Kakao oder etwas geriebenen Kardamom darübergeben. Setz dich gemütlich hin,
      vielleicht mit einer Decke, und genieße Schluck für Schluck.
    </p>

    <p style="margin:10px 0 0;font-size:0.8rem;opacity:0.9;">
      Bonus-Tipp: Chai schmeckt besonders gut, wenn man ihn mit einer Person trinkt,
      an die man beim Lesen dieses Textes denken musste. 💛
    </p>
  `;

  panel.appendChild(scrollBox);

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.justifyContent = "space-between";
  buttonRow.style.alignItems = "center";
  buttonRow.style.gap = "8px";
  buttonRow.style.marginTop = "8px";

  const infoText = document.createElement("div");
  infoText.style.fontSize = "0.75rem";
  infoText.style.opacity = "0.85";
  infoText.textContent = "Rezept durchlesen und dann auf „Gelesen“ klicken.";

  const readBtn = document.createElement("button");
  readBtn.type = "button";
  readBtn.textContent = "Gelesen ✨";
  readBtn.style.padding = "6px 14px";
  readBtn.style.borderRadius = "999px";
  readBtn.style.border = "none";
  readBtn.style.cursor = "pointer";
  readBtn.style.fontSize = "0.84rem";
  readBtn.style.fontWeight = "600";
  readBtn.style.background =
    "linear-gradient(135deg, rgba(255,220,160,0.95), rgba(255,160,120,0.9))";
  readBtn.style.boxShadow = "0 0 10px rgba(255,200,150,0.9)";
  readBtn.style.color = "#26120c";

  buttonRow.appendChild(infoText);
  buttonRow.appendChild(readBtn);
  panel.appendChild(buttonRow);

  left.appendChild(panel);

  // ---------------------------------------------------------------------------
  // RECHTE SPALTE – Karten
  // ---------------------------------------------------------------------------

  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "10px";
    card.style.padding = "10px 8px";
    card.style.background = "rgba(5,10,20,0.9)";
    card.style.border = "1px solid rgba(255,255,255,0.14)";
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
    lines.forEach((txt) => {
      const line = document.createElement("div");
      line.textContent = txt;
      body.appendChild(line);
    });

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  const chaiCard = makeSideCard("Zubereitung", "🍵", [
    "Hafermilch erwärmen,",
    "„Tiger Spice“ einrühren,",
    "nach Geschmack süßen.",
  ]);

  const moodCard = makeSideCard("Stimmung", "🕯️", [
    "Decke, Kerze,",
    "ruhiger Moment –",
    "perfekter Chai-Abend.",
  ]);

  const rewardCard = makeSideCard("Belohnung", "⭐", [
    "Gelesen →",
    "Roter Stern",
    "und Adventgeschenk.",
  ]);

  right.appendChild(chaiCard);
  right.appendChild(moodCard);
  right.appendChild(rewardCard);

  // ---------------------------------------------------------------------------
  // MODAL POPUP – Gewinn
  // ---------------------------------------------------------------------------

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
  modalCard.style.maxWidth = "360px";
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
  modalTitle.textContent = "Chai freigeschaltet!";
  modalTitle.style.fontWeight = "700";

  const modalBody = document.createElement("div");
  modalBody.textContent =
    "Du darfst nun dein 12. Adventgeschenk öffnen – und dir einen Chai machen.";

  const modalSmall = document.createElement("div");
  modalSmall.style.fontSize = "0.7rem";
  modalSmall.style.opacity = "0.8";
  modalSmall.textContent = "Tiger Spice + Hafermilch + du = sehr gute Entscheidung.";

  const modalClose = document.createElement("button");
  modalClose.textContent = "Chai time 🍵";
  modalClose.type = "button";
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

  // ---------------------------------------------------------------------------
  // BUTTON-LOGIK
  // ---------------------------------------------------------------------------

  let hasWon = false;

  readBtn.addEventListener("click", () => {
    if (hasWon) return;
    hasWon = true;

    showModal();

    // Victory Sound
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.playVictorySound === "function"
      ) {
        window.playVictorySound();
      }
    } catch (e) {}

    // Roter Stern
    try {
      onWin({ level: "red", label: "Roter Stern" });
    } catch (e) {
      console.error("chai_12 onWin error:", e);
    }
  });

  // Optional: ENTER/SPACE als "Gelesen" auslösen, wenn Fokus im Spiel
  function handleKeyDown(e) {
    if (e.code === "Space" || e.code === "Enter") {
      if (!hasWon) {
        e.preventDefault();
        readBtn.click();
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown);

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  return {
    destroy() {
      try {
        window.removeEventListener("keydown", handleKeyDown);
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
