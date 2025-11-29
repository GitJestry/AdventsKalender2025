// Tag 23 – Spiel 23: Obsessed mit allem an dir
// --------------------------------------------
// Aufgabe: Liebestext lesen, dann auf "I love you" klicken.
// Gewinn: Roter Stern.

window.AdventGames = window.AdventGames || {};

window.AdventGames["game23"] = function (container, options) {
  "use strict";

  const onWin =
    options && typeof options.onWin === "function" ? options.onWin : () => {};

  container.innerHTML = "";
  container.style.position = "relative";

  const root = document.createElement("div");
  root.className = "beautiful-23-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "10px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "4px";

  const title = document.createElement("div");
  title.textContent = "Tür 23 – Obsessed mit allem an dir";
  title.style.fontWeight = "600";
  title.style.fontSize = "1.1rem";

  header.appendChild(title);
  root.appendChild(header);

  const card = document.createElement("div");
  card.style.borderRadius = "14px";
  card.style.padding = "14px 16px 16px";
  card.style.background =
    "radial-gradient(circle at top, rgba(196,181,253,0.3), rgba(15,23,42,0.98))";
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
  cardTitle.textContent = "My Beautiful Celine";
  cardTitle.style.fontSize = "0.9rem";
  cardTitle.style.fontWeight = "600";

  const icon = document.createElement("div");
  icon.textContent = "❤️";
  icon.style.fontSize = "1.4rem";

  topRow.appendChild(cardTitle);
  topRow.appendChild(icon);

  const text = document.createElement("div");
  text.style.fontSize = "0.9rem";
  text.style.lineHeight = "1.5";
  text.style.whiteSpace = "pre-line";

  text.textContent = `Nur noch ein Tag bis Weihnachten – schon gespannt?
Das wird unser erstes Weihnachten sein, und ich bin immer noch am Träumen.

Dir sind in den letzten zwei Tagen wahrscheinlich schon die süßen kleinen Bilder aufgefallen. Neben dem Verlangen, unbedingt zig Fotoalben von uns zu erstellen, ist mir noch etwas anderes aufgefallen:
Ich bin leider erkrankt.
Erkrankt an der Krankheit, obsessed mit allem an dir zu sein.

Deine weichen, duftenden, warmfarbigen Haare, die in jeglicher Form – ob wellig, als Zopf, als Dutt oder offen und glatt – deinem Gesicht schmeicheln.
Deine ozeantiefen, schimmernden Augen, die mich hypnotisieren.
Dein ansteckendes Lachen, deine wundervollen Lippen, die so zart und perfekt sind, dass ich sie nicht von meinen lassen will.
Dein perfekt abgestimmter Style, der deine sanduhrförmige Figur einer griechischen Göttin hervorhebt.
Deine süßen, kleinen Ohren, bei denen ich immer wieder fasziniert bin, wie schön du sie schmückst.

Deine vielen Fähigkeiten im Haushalt, dein Allgemeinwissen und deine Hobbys schreien für mich förmlich: das ist Sie.
Dich streicheln zu dürfen und der Mann zu sein, der dir ehrlich sagen kann, dass alles gut ist – und der jeden Tag dafür kämpfen würde.

Deine Ruhe und Gelassenheit, wenn du merkst, dass es mir nicht gut geht, dein sofortiges Für-mich-da-Sein oder die Art, wie du die Situation angenehmer machst.
Deine kleinen Gesten, wie das Umarmen meiner Arme, deine klugen Worte, wenn du mir wieder etwas erklären musst, oder deine Anstrengungen, mich angekommen fühlen zu lassen.

Und ich erinnere mich immer wieder an unser erstes Date:
In diesem Moment verstand ich zum ersten Mal, was das Wort Beautiful bedeutet – nichts anderes konnte dich beschreiben. Deine Seele und dein Aussehen machen dich wahrlich Beautiful.

I love you, my Beautiful Celine ❤️`;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "center";
  footer.style.marginTop = "6px";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "I love you too 💖";
  btn.style.padding = "8px 22px";
  btn.style.borderRadius = "999px";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.fontWeight = "600";
  btn.style.fontSize = "0.95rem";
  btn.style.letterSpacing = "0.03em";
  btn.style.background =
    "linear-gradient(135deg, #ec4899, #a855f7, #f97316)";
  btn.style.color = "#020617";
  btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  btn.style.transition =
    "transform 120ms ease-out, box-shadow 120ms ease-out";

  btn.addEventListener("mousedown", () => {
    btn.style.transform = "translateY(1px) scale(0.98)";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.5)";
  });
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "translateY(0) scale(1)";
    btn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.55)";
  });

  footer.appendChild(btn);

  card.appendChild(topRow);
  card.appendChild(text);
  card.appendChild(footer);

  root.appendChild(card);
  container.appendChild(root);

  const winOverlay = document.createElement("div");
  winOverlay.style.position = "absolute";
  winOverlay.style.inset = "0";
  winOverlay.style.display = "flex";
  winOverlay.style.alignItems = "center";
  winOverlay.style.justifyContent = "center";
  winOverlay.style.background = "rgba(15,23,42,0.78)";
  winOverlay.style.zIndex = "10";
  winOverlay.style.opacity = "0";
  winOverlay.style.pointerEvents = "none";
  winOverlay.style.transition = "opacity 160ms ease-out";

  const winCard = document.createElement("div");
  winCard.style.minWidth = "260px";
  winCard.style.maxWidth = "340px";
  winCard.style.borderRadius = "16px";
  winCard.style.padding = "16px 18px 14px";
  winCard.style.background =
    "radial-gradient(circle at top, rgba(236,72,153,0.32), rgba(15,23,42,0.98))";
  winCard.style.border = "1px solid rgba(248,250,252,0.22)";
  winCard.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
  winCard.style.display = "flex";
  winCard.style.flexDirection = "column";
  winCard.style.gap = "6px";
  winCard.style.textAlign = "center";

  const winEmoji = document.createElement("div");
  winEmoji.textContent = "🎁❤️";
  winEmoji.style.fontSize = "1.6rem";
  winEmoji.style.marginBottom = "2px";

  const winTitle = document.createElement("div");
  winTitle.textContent = "Beautiful.";
  winTitle.style.fontWeight = "600";
  winTitle.style.fontSize = "1rem";

  const winText = document.createElement("div");
  winText.textContent = "Du darfst nun dein 23. Adventgeschenk öffnen. 🎁";
  winText.style.fontSize = "0.85rem";
  winText.style.opacity = "0.95";

  const winSmall = document.createElement("div");
  winSmall.textContent =
    "Und morgen feiern wir unser erstes gemeinsames Weihnachten. ❤️";
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
  container.appendChild(winOverlay);

  let finished = false;

  function handleWin() {
    if (finished) return;
    finished = true;

    const reward = { level: "red", label: "Roter Stern" };

    try {
      onWin(reward);
    } catch (e) {
      console.error("beautiful_23 onWin error:", e);
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

  btn.addEventListener("click", handleWin);

  return {
    destroy() {
      try {
        btn.removeEventListener("click", handleWin);
      } catch (e) {}
    },
  };
};
