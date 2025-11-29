// Spiel 17: Noch eine Woche bis Weihnachten – Love-Reminder
// Gewinn: Klick auf den Button „I love you“ → Roter Stern

window.AdventGames = window.AdventGames || {};

window.AdventGames["nail_17"] = function (container, options) {
  "use strict";

  const onWin =
    options && typeof options.onWin === "function" ? options.onWin : () => {};

  container.innerHTML = "";

  // ---------------------------------------------------------------------------
  // GRUNDLAYOUT
  // ---------------------------------------------------------------------------

  const root = document.createElement("div");
  root.className = "love-reminder-17-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "10px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "4px";

  const title = document.createElement("div");
  title.textContent = "Tür 17 – In einer Woche ist Weihnachten 🎄";
  title.style.fontWeight = "600";
  title.style.fontSize = "1.1rem";

  const subtitle = document.createElement("div");
  subtitle.textContent =
    "Noch sieben Tage bis Weihnachten – und ich freue mich unendlich darauf, dieses Weihnachten mit dir zu verbringen.";
  subtitle.style.fontSize = "0.85rem";
  subtitle.style.opacity = "0.9";

  header.appendChild(title);
  header.appendChild(subtitle);

  // kleines Badge
  const badgeRow = document.createElement("div");
  badgeRow.style.display = "flex";
  badgeRow.style.gap = "6px";
  badgeRow.style.marginTop = "2px";

  const badge = document.createElement("div");
  badge.textContent = "Noch 1 Woche";
  badge.style.fontSize = "0.75rem";
  badge.style.padding = "2px 8px";
  badge.style.borderRadius = "999px";
  badge.style.background = "rgba(15,23,42,0.95)";
  badge.style.border = "1px solid rgba(248,250,252,0.2)";
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.gap = "6px";

  const dot = document.createElement("span");
  dot.style.width = "6px";
  dot.style.height = "6px";
  dot.style.borderRadius = "999px";
  dot.style.background = "#f97316";
  badge.prepend(dot);

  badgeRow.appendChild(badge);
  header.appendChild(badgeRow);

  root.appendChild(header);

  // ---------------------------------------------------------------------------
  // KARTEN-INHALT (der Liebes-Text)
  // ---------------------------------------------------------------------------

  const card = document.createElement("div");
  card.style.borderRadius = "14px";
  card.style.padding = "14px 16px 16px";
  card.style.background =
    "radial-gradient(circle at top left, rgba(251, 113, 133, 0.20), rgba(15,23,42,0.98))";
  card.style.border = "1px solid rgba(248,250,252,0.18)";
  card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.55)";
  card.style.display = "flex";
  card.style.flexDirection = "column";
  card.style.gap = "10px";

  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.justifyContent = "space-between";
  topRow.style.alignItems = "center";

  const cardTitle = document.createElement("div");
  cardTitle.textContent = "Ein kleiner Reminder, wie sehr ich dich liebe";
  cardTitle.style.fontSize = "0.9rem";
  cardTitle.style.fontWeight = "600";

  const tinyHeart = document.createElement("div");
  tinyHeart.textContent = "❤️";
  tinyHeart.style.fontSize = "1.4rem";

  topRow.appendChild(cardTitle);
  topRow.appendChild(tinyHeart);

  const text = document.createElement("div");
  text.style.fontSize = "0.9rem";
  text.style.lineHeight = "1.5";
  text.style.whiteSpace = "pre-line";

  // leicht überarbeiteter Text, Stil beibehalten
  text.textContent =
    "Jedes Mal, wenn du mit deinen neuen Nägel-Designs strahlend zu mir angerannt kommst, " +
    "werde ich völlig weich und mein Herz geht auf. Deine leuchtenden Augen, deine sanften Hände " +
    "und dieses leicht angewinkelte, umwerfend schöne Lächeln, wenn ich deiner Kunst Komplimente machen darf, " +
    "bedeuten mir unglaublich viel.\n\n" +
    "Ich liebe es, wie du in den Nägel-Designs aufgehst – deine Ruhe beim Machen, deine Kreativität " +
    "und deine Hingabe, dir sogar deine eigene Zeit zu nehmen, um deinen Freundinnen ihre Nägel zu machen.\n\n" +
    "Dich in deinem Hobby so aufblühen zu sehen und dich dabei unterstützen zu können, erfüllt mich mit so viel Freude, " +
    "dass mein Herz überfließen könnte.\n\n" +
    "Bitte schreck niemals davor zurück, so viel darüber zu reden, wie du möchtest – " +
    "dein Juli würde sich sehr freuen, dir zuhören zu dürfen. <3";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "center";
  footer.style.marginTop = "6px";

  const loveButton = document.createElement("button");
  loveButton.type = "button";
  loveButton.textContent = "I love you";
  loveButton.style.padding = "8px 20px";
  loveButton.style.borderRadius = "999px";
  loveButton.style.border = "none";
  loveButton.style.cursor = "pointer";
  loveButton.style.fontWeight = "600";
  loveButton.style.fontSize = "0.95rem";
  loveButton.style.letterSpacing = "0.03em";
  loveButton.style.background =
    "linear-gradient(135deg, #fb7185, #f97316, #facc15)";
  loveButton.style.color = "#0b1120";
  loveButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  loveButton.style.transition = "transform 120ms ease-out, box-shadow 120ms ease-out";

  loveButton.addEventListener("mousedown", () => {
    loveButton.style.transform = "translateY(1px) scale(0.98)";
    loveButton.style.boxShadow = "0 2px 8px rgba(0,0,0,0.5)";
  });
  loveButton.addEventListener("mouseup", () => {
    loveButton.style.transform = "translateY(0) scale(1)";
    loveButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  });
  loveButton.addEventListener("mouseleave", () => {
    loveButton.style.transform = "translateY(0) scale(1)";
    loveButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  });

  footer.appendChild(loveButton);

  card.appendChild(topRow);
  card.appendChild(text);
  card.appendChild(footer);

  root.appendChild(card);

  // ---------------------------------------------------------------------------
  // Gewonnen-Overlay
  // ---------------------------------------------------------------------------

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
    "radial-gradient(circle at top, rgba(251,113,133,0.36), rgba(15,23,42,0.98))";
  winCard.style.border = "1px solid rgba(248,250,252,0.2)";
  winCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
  winCard.style.display = "flex";
  winCard.style.flexDirection = "column";
  winCard.style.gap = "6px";
  winCard.style.textAlign = "center";

  const winEmoji = document.createElement("div");
  winEmoji.textContent = "✨❤️✨";
  winEmoji.style.fontSize = "1.6rem";
  winEmoji.style.marginBottom = "2px";

  const winTitle = document.createElement("div");
  winTitle.textContent = "Du hast gewonnen!";
  winTitle.style.fontWeight = "600";
  winTitle.style.fontSize = "1rem";

  const winText = document.createElement("div");
  winText.textContent = "Du darfst nun dein 17. Adventgeschenk öffnen. 🎁";
  winText.style.fontSize = "0.85rem";
  winText.style.opacity = "0.95";

  const winSmall = document.createElement("div");
  winSmall.textContent =
    "Und ganz nebenbei: Ich liebe dich noch mehr. – dein Juli 💛";
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

  container.appendChild(root);
  container.appendChild(winOverlay);

  // ---------------------------------------------------------------------------
  // WIN-LOGIK
  // ---------------------------------------------------------------------------

  let finished = false;

  function handleWin() {
    if (finished) return;
    finished = true;

    // roten Stern vergeben
    const reward = { level: "red", label: "Roter Stern" };

    try {
      onWin(reward);
    } catch (e) {
      console.error("love_reminder_17 onWin error:", e);
    }

    // optional globaler Victory-Sound
    try {
      if (
        typeof window !== "undefined" &&
        typeof window.playVictorySound === "function"
      ) {
        window.playVictorySound();
      }
    } catch (e) {}

    // Overlay anzeigen
    winOverlay.style.opacity = "1";
    winOverlay.style.pointerEvents = "auto";
  }

  loveButton.addEventListener("click", handleWin);

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  return {
    destroy() {
      try {
        loveButton.removeEventListener("click", handleWin);
        closeBtn.removeEventListener("click", () => {});
      } catch (e) {}
    },
  };
};
