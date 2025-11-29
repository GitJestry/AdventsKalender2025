// Spiel 20: Gitarren-Serenade für Juli
// --------------------------------------------
// Aufgabe:
//  - Schicke Juli ein Video, in dem du Gitarre spielst.
//  - Er hat sich die ganzen 20 Tage darauf gefreut. <3
//  - Wenn du auf "Erledigt" klickst, gilt das Spiel als gewonnen
//    und du erhältst einen Roten Stern.

window.AdventGames = window.AdventGames || {};

window.AdventGames["guitar_20"] = function (container, options) {
  "use strict";

  const onWin =
    options && typeof options.onWin === "function" ? options.onWin : () => {};

  container.innerHTML = "";
  container.style.position = "relative";

  const root = document.createElement("div");
  root.className = "guitar-video-20-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "10px";

  // Header
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "4px";

  root.appendChild(header);

  // Karte mit Aufgabe
  const card = document.createElement("div");
  card.style.borderRadius = "14px";
  card.style.padding = "14px 16px 16px";
  card.style.background =
    "radial-gradient(circle at top, rgba(56,189,248,0.25), rgba(15,23,42,0.98))";
  card.style.border = "1px solid rgba(148,163,184,0.5)";
  card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "10px";

  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.justifyContent = "space-between";
  topRow.style.alignItems = "center";

  const cardTitle = document.createElement("div");
  cardTitle.textContent = "Deine kleine Konzert-Aufgabe";
  cardTitle.style.fontSize = "0.9rem";
  cardTitle.style.fontWeight = "600";

  const icon = document.createElement("div");
  icon.textContent = "🎸";
  icon.style.fontSize = "1.6rem";

  topRow.appendChild(cardTitle);
  topRow.appendChild(icon);

  const text = document.createElement("div");
  text.style.fontSize = "0.9rem";
  text.style.lineHeight = "1.5";
  text.style.whiteSpace = "pre-line";
  text.textContent =
    "Die heutige Aufgabe ist: Facetime mit Juli und spiele Guitarre vor";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "center";
  footer.style.marginTop = "8px";

  const doneBtn = document.createElement("button");
  doneBtn.type = "button";
  doneBtn.textContent = "Erledigt";
  doneBtn.style.padding = "8px 22px";
  doneBtn.style.borderRadius = "999px";
  doneBtn.style.border = "none";
  doneBtn.style.cursor = "pointer";
  doneBtn.style.fontWeight = "600";
  doneBtn.style.fontSize = "0.95rem";
  doneBtn.style.letterSpacing = "0.03em";
  doneBtn.style.background =
    "linear-gradient(135deg, #22c55e, #16a34a, #a3e635)";
  doneBtn.style.color = "#020617";
  doneBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  doneBtn.style.transition =
    "transform 120ms ease-out, box-shadow 120ms ease-out";

  doneBtn.addEventListener("mousedown", () => {
    doneBtn.style.transform = "translateY(1px) scale(0.98)";
    doneBtn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.5)";
  });
  doneBtn.addEventListener("mouseup", () => {
    doneBtn.style.transform = "translateY(0) scale(1)";
    doneBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  });
  doneBtn.addEventListener("mouseleave", () => {
    doneBtn.style.transform = "translateY(0) scale(1)";
    doneBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  });

  footer.appendChild(doneBtn);

  card.appendChild(topRow);
  card.appendChild(text);
  card.appendChild(footer);

  root.appendChild(card);
  container.appendChild(root);

  // Gewinn-Overlay
  const winOverlay = document.createElement("div");
  winOverlay.style.position = "fixed";
  winOverlay.style.inset = "0";
  winOverlay.style.display = "flex";
  winOverlay.style.alignItems = "center";
  winOverlay.style.justifyContent = "center";
  winOverlay.style.background = "rgba(15,23,42,0.78)";
  winOverlay.style.zIndex = "9999";
  winOverlay.style.opacity = "0";
  winOverlay.style.pointerEvents = "none";
  winOverlay.style.transition = "opacity 160ms ease-out";

  const winCard = document.createElement("div");
  winCard.style.minWidth = "260px";
  winCard.style.maxWidth = "340px";
  winCard.style.borderRadius = "16px";
  winCard.style.padding = "16px 18px 14px";
  winCard.style.background =
    "radial-gradient(circle at top, rgba(74,222,128,0.3), rgba(15,23,42,0.98))";
  winCard.style.border = "1px solid rgba(248,250,252,0.22)";
  winCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
  winCard.style.display = "flex";
  winCard.style.flexDirection = "column";
  winCard.style.gap = "6px";
  winCard.style.textAlign = "center";

  const winEmoji = document.createElement("div");
  winEmoji.textContent = "🎁🎸";
  winEmoji.style.fontSize = "1.6rem";
  winEmoji.style.marginBottom = "2px";

  const winTitle = document.createElement("div");
  winTitle.textContent = "Du hast dein Gitarren-Quest erfüllt!";
  winTitle.style.fontWeight = "600";
  winTitle.style.fontSize = "1rem";

  const winText = document.createElement("div");
  winText.textContent = "Du darfst nun dein 20. Adventgeschenk öffnen. ❤️";
  winText.style.fontSize = "0.85rem";
  winText.style.opacity = "0.95";

  const winSmall = document.createElement("div");
  winSmall.textContent =
    "Und irgendwo da draußen freut sich gerade ein Juli wahnsinnig über deine Musik.";
  winSmall.style.fontSize = "0.75rem";
  winSmall.style.opacity = "0.9";
  winSmall.style.marginTop = "4px";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Weiter";
  closeBtn.style.marginTop = "6px";
  closeBtn.style.alignSelf = "center";
  closeBtn.style.padding = "6px 14px";
  closeBtn.style.borderRadius = "999px";
  closeBtn.style.border = "none";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "0.8rem";
  closeBtn.style.background = "rgba(15,23,42,0.98)";
  closeBtn.style.color = "rgba(248,250,252,0.95)";
  closeBtn.style.border = "1px solid rgba(248,250,252,0.22)";

  closeBtn.addEventListener("click", () => {
    winOverlay.style.opacity = "0";
    winOverlay.style.pointerEvents = "none";
  });

  winCard.appendChild(winEmoji);
  winCard.appendChild(winTitle);
  winCard.appendChild(winText);
  winCard.appendChild(winSmall);
  winCard.appendChild(closeBtn);

  winOverlay.appendChild(winCard);
  document.body.appendChild(winOverlay);

  let finished = false;

  function handleWin() {
    if (finished) return;
    finished = true;

    const reward = { level: "red", label: "Roter Stern" };

    try {
      onWin(reward);
    } catch (e) {
      console.error("guitar_video_20 onWin error:", e);
    }

    try {
      if (
        typeof window !== "undefined" &&
        typeof window.playVictorySound === "function"
      ) {
        window.playVictorySound();
      }
    } catch (e) {}

    winOverlay.style.opacity = "1";
    winOverlay.style.pointerEvents = "auto";
  }

  doneBtn.addEventListener("click", handleWin);

  // Cleanup
  return {
    destroy() {
      try {
        doneBtn.removeEventListener("click", handleWin);
        closeBtn.removeEventListener("click", () => {});
        if (winOverlay.parentNode) {
          winOverlay.parentNode.removeChild(winOverlay);
        }
      } catch (e) {}
    },
  };
};
