// Spiel 14: Warme Socken & Weihnachtsmarkt
// Aufgabe:
//   - Text lesen:
//       "Ich hoffe die Socken halten dich warm.
//        Die heutige Aufgabe ist es, dich ganz warm anzuziehen
//        und auf einen Weihnachtsmarkt mit Juli zu gehen.
//        Du hast auch gewonnen, wenn du mit ihm ein Treffen
//        dafür an einem anderen Tag ausmachst."
//   - Wenn "Erledigt" gedrückt wird → gewonnen, roter Stern.
//   - Es wird optional window.playVictorySound() aufgerufen.

window.AdventGames = window.AdventGames || {};

window.AdventGames["socks_14"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // ---------------------------------------------------------------------------
  // ROOT / HEADER
  // ---------------------------------------------------------------------------

  const root = document.createElement("div");
  root.className = "warm-socks-14-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 14 – Warme Socken & Weihnachtsmarkt";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent =
    "Heute geht es darum, warm eingepackt mit Juli Weihnachtsstimmung zu sammeln.";
  subtitleEl.style.fontSize = "0.85rem";
  subtitleEl.style.color = "rgba(255,255,255,0.9)";

  header.appendChild(titleEl);
  header.appendChild(subtitleEl);
  root.appendChild(header);

  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "stretch";
  layout.style.marginTop = "4px";

  const main = document.createElement("div");
  main.style.flex = "1 1 auto";
  main.style.display = "flex";
  main.style.flexDirection = "column";
  main.style.gap = "8px";

  const side = document.createElement("aside");
  side.style.flex = "0 0 210px";
  side.style.display = "flex";
  side.style.flexDirection = "column";
  side.style.gap = "10px";
  side.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  layout.appendChild(main);
  layout.appendChild(side);
  root.appendChild(layout);
  container.appendChild(root);

  // ---------------------------------------------------------------------------
  // HAUPT-PANEL
  // ---------------------------------------------------------------------------

  const panel = document.createElement("div");
  panel.style.position = "relative";
  panel.style.borderRadius = "12px";
  panel.style.background =
    "radial-gradient(circle at top, #24324f, #111827 55%, #050812)";
  panel.style.boxShadow = "0 4px 16px rgba(0,0,0,0.75)";
  panel.style.padding = "12px 12px 10px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "10px";

  const textBox = document.createElement("div");
  textBox.style.borderRadius = "10px";
  textBox.style.padding = "10px 12px";
  textBox.style.background = "rgba(3,7,16,0.95)";
  textBox.style.border = "1px solid rgba(255,255,255,0.1)";
  textBox.style.fontSize = "0.86rem";
  textBox.style.lineHeight = "1.5";
  textBox.style.color = "rgba(235,238,245,0.96)";

  textBox.innerHTML = `
    <p style="margin:0 0 8px;">
      Ich hoffe, die Socken halten dich warm. 🧦💛
    </p>
    <p style="margin:0 0 6px;">
      <strong>Die heutige Aufgabe</strong> ist es, dich ganz warm anzuziehen
      und auf einen Weihnachtsmarkt mit Juli zu gehen.
    </p>
    <p style="margin:0 0 6px;">
      Du hast auch gewonnen, wenn du mit ihm ein Treffen dafür
      an einem <strong>anderen Tag</strong> ausmachst – Hauptsache,
      ihr habt euren Weihnachtsmarktmoment zusammen.
    </p>
  `;

  panel.appendChild(textBox);

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.alignItems = "center";
  buttonRow.style.justifyContent = "space-between";
  buttonRow.style.gap = "8px";

  const hintText = document.createElement("div");
  hintText.style.fontSize = "0.78rem";
  hintText.style.opacity = "0.9";
  hintText.textContent =
    "Erledigt = du hast dich warm eingepackt & mit Juli Weihnachtsstimmung geplant.";

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.textContent = "Erledigt 🎄";
  doneBtn.style.padding = "7px 14px";
  doneBtn.style.borderRadius = "999px";
  doneBtn.style.border = "none";
  doneBtn.style.cursor = "pointer";
  doneBtn.style.fontSize = "0.86rem";
  doneBtn.style.fontWeight = "600";
  doneBtn.style.background =
    "linear-gradient(135deg, rgba(255,220,180,0.95), rgba(255,140,120,0.95))";
  doneBtn.style.boxShadow = "0 0 12px rgba(255,210,160,0.9)";
  doneBtn.style.color = "#241015";
  doneBtn.style.whiteSpace = "nowrap";

  buttonRow.appendChild(hintText);
  buttonRow.appendChild(doneBtn);
  panel.appendChild(buttonRow);

  main.appendChild(panel);

  // ---------------------------------------------------------------------------
  // SIDE-CARDS
  // ---------------------------------------------------------------------------

  function makeSideCard(title, icon, lines) {
    const card = document.createElement("div");
    card.style.borderRadius = "10px";
    card.style.padding = "10px 8px";
    card.style.background = "rgba(5,10,20,0.95)";
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

    const titleElSmall = document.createElement("div");
    titleElSmall.textContent = title;
    titleElSmall.style.fontSize = "0.8rem";
    titleElSmall.style.fontWeight = "600";

    head.appendChild(iconEl);
    head.appendChild(titleElSmall);

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

  const taskCard = makeSideCard("Aufgabe", "🧣", [
    "Warm anziehen,",
    "Weihnachtsmarkt mit Juli,",
    "oder ein Treffen dafür planen.",
  ]);

  const moodCard = makeSideCard("Stimmung", "✨", [
    "Lichter, Glühwein-Geruch,",
    "Hand in Hand,",
    "und warme Socken.",
  ]);

  const rewardCard = makeSideCard("Belohnung", "⭐", [
    "Erledigt drücken →",
    "Roter Stern",
    "und Adventgeschenk.",
  ]);

  side.appendChild(taskCard);
  side.appendChild(moodCard);
  side.appendChild(rewardCard);

  // ---------------------------------------------------------------------------
  // MODAL – Gewinn
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
  modalTitle.textContent = "Warme Mission erfüllt!";
  modalTitle.style.fontWeight = "700";

  const modalBody = document.createElement("div");
  modalBody.textContent =
    "Du hast dich warm eingepackt und Weihnachtszeit mit Juli eingeplant – Aufgabe bestanden.";

  const modalSmall = document.createElement("div");
  modalSmall.style.fontSize = "0.7rem";
  modalSmall.style.opacity = "0.8";
  modalSmall.textContent =
    "Du darfst nun dein 14. Adventgeschenk öffnen – und die Socken weiter spazieren führen.";

  const modalClose = document.createElement("button");
  modalClose.type = "button";
  modalClose.textContent = "Aww 💛";
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
  // LOGIK
  // ---------------------------------------------------------------------------

  let hasWon = false;

  doneBtn.addEventListener("click", () => {
    if (hasWon) return;
    hasWon = true;

    showModal();

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
      console.error("warm_socks_14 onWin error:", e);
    }

    doneBtn.disabled = true;
    doneBtn.style.opacity = "0.7";
    doneBtn.style.cursor = "default";
    doneBtn.textContent = "Erledigt 🎄";
  });

  // ENTER als Shortcut für „Erledigt“
  function handleKeyDown(e) {
    if (hasWon) return;
    if (e.code === "Enter") {
      doneBtn.click();
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
