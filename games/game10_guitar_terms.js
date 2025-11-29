// Spiel 10: Wofür das wohl gut ist?
// Eine "AGB- / Datenschutz"-artige, viel zu lange Anleitung zur Gitarrenpflege.
// Oben: "Vollständig lesen um zu gewinnen".
// Unten: "Alles akzeptieren" (highlight) oder "Ablehnen".
// - "Alles akzeptieren" erst anklickbar, wenn bis ganz unten gescrollt wurde.
// - Ablehnen: "leider falsche antwort", zurück zum Anfang.
// - Akzeptieren: Gewinn-Popup + roter Stern via onWin + Victory-Sound.

window.AdventGames = window.AdventGames || {};

window.AdventGames["guitar_terms_10"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  // ---------------------------------------------------------------------------
  // ROOT / HEADER
  // ---------------------------------------------------------------------------

  const root = document.createElement("div");
  root.className = "guitar-terms-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.flexDirection = "column";
  header.style.gap = "2px";

  const titleEl = document.createElement("div");
  titleEl.textContent = "Tür 10 – Wofür das wohl gut ist?";
  titleEl.style.fontWeight = "600";
  titleEl.style.fontSize = "1.1rem";

  const subtitleEl = document.createElement("div");
  subtitleEl.textContent = "Vollständig lesen um zu gewinnen";
  subtitleEl.style.fontSize = "0.9rem";
  subtitleEl.style.color = "rgba(255,255,255,0.9)";
  subtitleEl.style.padding = "2px 8px";
  subtitleEl.style.borderRadius = "999px";
  subtitleEl.style.display = "inline-flex";
  subtitleEl.style.alignItems = "center";
  subtitleEl.style.gap = "6px";
  subtitleEl.style.background = "rgba(15,25,40,0.95)";
  subtitleEl.style.border = "1px solid rgba(255,255,255,0.16)";
  const dot = document.createElement("span");
  dot.textContent = "⚠";
  subtitleEl.prepend(dot);

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
  right.style.flex = "0 0 190px";
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
  // SCROLL-PANEL (AGB-Style)
  // ---------------------------------------------------------------------------

  const panel = document.createElement("div");
  panel.style.position = "relative";
  panel.style.borderRadius = "12px";
  panel.style.background =
    "linear-gradient(145deg, #050813, #0e1926 45%, #131f30)";
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
  scrollBox.style.background = "rgba(3,9,18,0.95)";
  scrollBox.style.border = "1px solid rgba(255,255,255,0.1)";
  scrollBox.style.overflowY = "auto";
  scrollBox.style.fontSize = "0.8rem";
  scrollBox.style.lineHeight = "1.5";
  scrollBox.style.color = "rgba(230,230,235,0.95)";

  // Extra lange "AGB"-artige Anleitung für Gitarrenpflege
  scrollBox.innerHTML = `
    <h3 style="margin:0 0 6px;font-size:0.9rem;">§1 Gegenstand dieses Gitarrenpflege-Dokuments</h3>
    <p style="margin:0 0 6px;">
      Mit Annahme dieser Bedingungen verpflichtest du dich, deine Gitarre (im Folgenden „Instrument“ genannt)
      verantwortungsbewusst zu behandeln, regelmäßig zu pflegen und unnötige Schäden zu vermeiden.
      Ziel ist der langfristige Erhalt von Klang, Spielgefühl und emotionalem Wert deines Instruments.
    </p>

    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§2 Grundlegende Pflichten der Gitarrenhalterin / des Gitarrenhalters</h3>
    <p style="margin:0 0 6px;">
      (1) Vor jedem Spielen sind die Hände gründlich zu waschen und zu trocknen, um Schweiß, Fett und
      Fremdpartikel vom Griffbrett fernzuhalten. Starkes Parfum, Cremes oder klebrige Substanzen sind
      vor dem Spielen zu vermeiden.
    </p>
    <p style="margin:0 0 6px;">
      (2) Das Instrument ist vor direkter Sonneneinstrahlung, Heizkörpern und extremer Luftfeuchtigkeit zu schützen.
      Eine relative Luftfeuchtigkeit zwischen 40% und 60% wird als optimal anerkannt. Bei Abweichungen sind geeignete
      Befeuchter oder Entfeuchter einzusetzen.
    </p>

    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§3 Reinigung von Korpus, Hals und Hardware</h3>
    <p style="margin:0 0 6px;">
      (1) Zur täglichen Reinigung sind weiche, fusselfreie Mikrofasertücher zu verwenden. Aggressive
      Haushaltsreiniger, Glasreiniger oder lösemittelhaltige Polituren sind ausdrücklich untersagt, um eine
      Beschädigung des Lacks zu vermeiden.
    </p>
    <p style="margin:0 0 6px;">
      (2) Leichte Verschmutzungen werden mit einem leicht angefeuchteten Tuch entfernt, wobei stehende Feuchtigkeit
      auf Holzoberflächen strikt zu vermeiden ist. Metallteile wie Mechaniken oder Brücke dürfen bei Bedarf mit einem
      trockenen Tuch nachpoliert werden.
    </p>
    <p style="margin:0 0 6px;">
      (3) Bei matten oder offenen Poren-Finishes ist auf spezielle, vom Hersteller freigegebene Reinigungsprodukte
      zurückzugreifen. Glänzende Polyester- oder Polyurethan-Lacke vertragen sanfte Gitarrenpolituren, die ausdrücklich
      für Instrumente deklariert sind.
    </p>

    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§4 Pflege des Griffbretts und der Bünde</h3>
    <p style="margin:0 0 6px;">
      (1) Das Griffbrett ist mindestens ein- bis zweimal jährlich bei abgenommenen Saiten mit einem trockenen Tuch
      vom aufgelaufenen Schmutz zu befreien. Für hartnäckige Rückstände darf ein dafür vorgesehenes Griffbrettöl oder
      -reiniger sparsam eingesetzt werden.
    </p>
    <p style="margin:0 0 6px;">
      (2) Palisander-, Ebenholz- und andere unlackierte Griffbretter dürfen in moderaten Abständen mit wenigen Tropfen
      Pflegeöl behandelt werden, um Austrocknung und Rissbildung vorzubeugen. Ahorn-Griffbretter mit Lackschicht werden
      dagegen nur trocken oder leicht angefeuchtet gereinigt.
    </p>
    <p style="margin:0 0 6px;">
      (3) Bundstäbchen sind frei von Korrosion zu halten. Leichte Oxidation kann vorsichtig mit Polierwatte für
      Instrumente entfernt werden. Abkleben des Griffbretts zum Schutz der Holzoberfläche wird ausdrücklich empfohlen.
    </p>

    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§5 Saitenwechsel, Aufziehen und Entsorgung</h3>
    <p style="margin:0 0 6px;">
      (1) Saiten sind je nach Spielhäufigkeit und Schweißintensität in angemessenen Intervallen zu wechseln. Spätestens
      bei deutlich nachlassender Brillanz, Rostspuren oder Intonationsproblemen ist ein vollständiger Satzwechsel
      verpflichtend durchzuführen.
    </p>
    <p style="margin:0 0 6px;">
      (2) Beim Aufziehen neuer Saiten ist darauf zu achten, dass die Windungen sauber und ohne Überkreuzungen auf der
      Mechanik liegen. Es wird empfohlen, ein bis zwei Wicklungen bei stärkerer Saitenstärke und zwei bis drei Wicklungen
      bei dünneren Saiten zu verwenden.
    </p>
    <p style="margin:0 0 6px;">
      (3) Alte Saiten sind sorgfältig zu entsorgen. Lose herumliegende Saitenreste sind geeignet, Verletzungen zu
      verursachen oder Mechaniken zu beschädigen und sind daher unverzüglich in einem geeigneten Behälter zu sammeln.
    </p>

    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§6 Transport, Lagerung und Temperaturwechsel</h3>
    <p style="margin:0 0 6px;">
      (1) Für den Transport ist ein gepolsterter Gigbag oder ein Hartschalenkoffer zu verwenden. Das Instrument ist
      gegen Schläge, Stöße und Herunterfallen zu sichern. Schultergurte sollen korrekt eingestellt und vernünftig
      getragen werden.
    </p>
    <p style="margin:0 0 6px;">
      (2) Bei Temperaturwechseln, etwa im Winter von draußen in beheizte Räume, ist die Gitarre vor dem Öffnen des Koffers
      langsam akklimatisieren zu lassen, um Haarrisse im Lack oder Spannungsrisse im Holz zu vermeiden.
    </p>
    <p style="margin:0 0 6px;">
      (3) Wird das Instrument über längere Zeit nicht gespielt, ist eine Lagerung in einem trockenen, gut belüfteten, aber
      nicht zugigen Raum zu bevorzugen. Direkte Ablage auf dem Boden in der Nähe von Heizkörpern oder Fenstern ist zu
      vermeiden.
    </p>

    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§7 Elektronik, Kabel und Stecker</h3>
    <p style="margin:0 0 6px;">
      (1) Elektrische Gitarren und Bässe sind mit intakten Kabeln zu betreiben. Kabel werden am Stecker gefasst und nicht
      am Kabel selbst herausgezogen, um Zugbelastungen an der Buchse zu verhindern.
      Wir bleiben für immer zusammen my Wonderful girlfriend.
    </p>
    <p style="margin:0 0 6px;">
      (2) Kratzende Potis sind mit geeignetem Kontaktspray vorsichtig zu pflegen. Ein Übermaß an Spray ist zu vermeiden,
      da es Schmutz anziehen und Komponenten langfristig schädigen kann.
    </p>
    <p style="margin:0 0 6px;">
      (3) Lose Schrauben an Pickups, Gurthaltern oder Buchsen sind zeitnah nachzuziehen. Wiederholtes Ignorieren solcher
      Anzeichen kann zum vollständigen Versagen der Hardware oder im Extremfall zum Herunterfallen des Instruments führen.
    </p>
    <h3 style="margin:10px 0 6px;font-size:0.9rem;">§9 Haftungsausschluss und Schlussbestimmungen</h3>
    <p style="margin:0 0 6px;">
      (1) Diese fiktive Pflegevereinbarung ersetzt keine professionelle Beratung durch Gitarrenbauerinnen, Gitarrenbauer
      oder qualifizierte Fachwerkstätten. Im Zweifel ist immer die Empfehlung der herstellenden Firma zu beachten.
    </p>
    <p style="margin:0 0 6px;">
      (2) Durch Auswahl von „Alles akzeptieren“ erklärst du dich einverstanden, die oben genannten Maßnahmen nach bestem
      Wissen und Gewissen umzusetzen.
    </p>
    <p style="margin:0 0 0;">
      (3) Solltest du mit einzelnen Punkten nicht einverstanden sein, steht es dir frei, „Ablehnen“ zu wählen.
    </p>
  `;

  panel.appendChild(scrollBox);

  // ---------------------------------------------------------------------------
  // BUTTON-BAR
  // ---------------------------------------------------------------------------

  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.justifyContent = "space-between";
  buttonRow.style.alignItems = "center";
  buttonRow.style.gap = "8px";
  buttonRow.style.marginTop = "8px";

  const infoSmall = document.createElement("div");
  infoSmall.style.fontSize = "0.75rem";
  infoSmall.style.opacity = "0.85";
  infoSmall.textContent = "Bitte bis zum Ende scrollen, um „Alles akzeptieren“ freizuschalten.";

  const buttonGroup = document.createElement("div");
  buttonGroup.style.display = "flex";
  buttonGroup.style.gap = "6px";

  const declineBtn = document.createElement("button");
  declineBtn.type = "button";
  declineBtn.textContent = "Ablehnen";
  declineBtn.style.padding = "6px 10px";
  declineBtn.style.borderRadius = "999px";
  declineBtn.style.border = "1px solid rgba(255,255,255,0.25)";
  declineBtn.style.background = "rgba(10,16,28,0.95)";
  declineBtn.style.color = "rgba(255,255,255,0.9)";
  declineBtn.style.cursor = "pointer";
  declineBtn.style.fontSize = "0.8rem";

  const acceptBtn = document.createElement("button");
  acceptBtn.type = "button";
  acceptBtn.textContent = "Alles akzeptieren";
  acceptBtn.style.padding = "6px 14px";
  acceptBtn.style.borderRadius = "999px";
  acceptBtn.style.border = "none";
  acceptBtn.style.cursor = "not-allowed";
  acceptBtn.style.fontSize = "0.82rem";
  acceptBtn.style.fontWeight = "600";
  acceptBtn.style.background =
    "linear-gradient(135deg, rgba(180,120,255,0.7), rgba(255,220,150,0.95))";
  acceptBtn.style.boxShadow = "0 0 10px rgba(255,220,150,0.9)";
  acceptBtn.style.color = "#111";
  acceptBtn.style.opacity = "0.45";

  let acceptEnabled = false;

  function setAcceptEnabled(enabled) {
    acceptEnabled = enabled;
    if (enabled) {
      acceptBtn.style.opacity = "1";
      acceptBtn.style.cursor = "pointer";
      infoSmall.textContent =
        "Du hast alles durchgescrollt. Du kannst jetzt „Alles akzeptieren“ wählen.";
    } else {
      acceptBtn.style.opacity = "0.45";
      acceptBtn.style.cursor = "not-allowed";
      infoSmall.textContent =
        "Bitte bis zum Ende scrollen, um „Alles akzeptieren“ freizuschalten.";
    }
  }

  buttonGroup.appendChild(declineBtn);
  buttonGroup.appendChild(acceptBtn);

  buttonRow.appendChild(infoSmall);
  buttonRow.appendChild(buttonGroup);

  panel.appendChild(buttonRow);
  left.appendChild(panel);

  // ---------------------------------------------------------------------------
  // RECHTE SPALTE – kleine Info-Karten
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
    iconEl.style.width = "22px";
    iconEl.style.height = "22px";
    iconEl.style.borderRadius = "999px";
    iconEl.style.display = "flex";
    iconEl.style.alignItems = "center";
    iconEl.style.justifyContent = "center";
    iconEl.style.fontSize = "0.9rem";
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

  const hintCard = makeSideCard("Hinweis", "📜", [
    "Sieht aus wie AGBs,",
    "ist aber nur ein Gitarrenpflege-Vertrag.",
  ]);

  const starCard = makeSideCard("Belohnung", "⭐", [
    "„Alles akzeptieren“",
    "→ Roter Stern",
    "→ 10. Adventgeschenk!",
  ]);

  right.appendChild(hintCard);
  right.appendChild(starCard);

  // ---------------------------------------------------------------------------
  // OVERLAY FÜR "VERLOREN" UND "GEWONNEN"
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
  modalTitle.style.fontWeight = "700";

  const modalBody = document.createElement("div");
  modalBody.style.fontSize = "0.8rem";
  modalBody.style.opacity = "0.92";

  const modalSmall = document.createElement("div");
  modalSmall.style.fontSize = "0.7rem";
  modalSmall.style.opacity = "0.8";
  modalSmall.style.marginTop = "4px";

  const modalClose = document.createElement("button");
  modalClose.textContent = "OK";
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

  // ---------------------------------------------------------------------------
  // SCROLL-LOGIK: akzeptieren erst am Ende
  // ---------------------------------------------------------------------------

  function checkScrollBottom() {
    const threshold = 16; // px Toleranz
    const atBottom =
      scrollBox.scrollTop + scrollBox.clientHeight >=
      scrollBox.scrollHeight - threshold;
    if (atBottom && !acceptEnabled) {
      setAcceptEnabled(true);
    }
  }

  scrollBox.addEventListener("scroll", checkScrollBottom);
  // falls Inhalt kleiner als maxHeight ist
  setTimeout(checkScrollBottom, 50);

  // ---------------------------------------------------------------------------
  // BUTTON-AKTIONEN
  // ---------------------------------------------------------------------------

  let finished = false;

  declineBtn.addEventListener("click", () => {
    if (finished) return;
    // Falsche Antwort → zurück zum Anfang
    showModal("Leider falsche Antwort", "Du wurdest wieder an den Anfang geschickt.", "");
    scrollBox.scrollTo({ top: 0, behavior: "smooth" });
    setAcceptEnabled(false);
  });

  acceptBtn.addEventListener("click", () => {
    if (finished || !acceptEnabled) return;
    finished = true;

    // Gewinn-Popup
    showModal(
      "Gewonnen!",
      "Du darfst nun dein 10. Adventgeschenk öffnen!",
      "muhahahahha du bist jetzt an mich vertraglich für immer gebunden"
    );

    // Victory-Sound (falls vorhanden)
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
      console.error("guitar_terms_10 onWin error:", e);
    }
  });

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  return {
    destroy() {
      try {
        scrollBox.removeEventListener("scroll", checkScrollBottom);
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
