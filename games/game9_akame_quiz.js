// Spiel 9: Akame Quiz – 15 schwere Fragen
// Regeln:
//  - Immer die gleichen 15 Fragen, in fester Reihenfolge
//  - Sterne nach richtigen Antworten:
//      10–11 → Bronze
//      12–13 → Silber
//      14    → Gold
//      15    → Rot
//  - Gewinn spielt den Victory-Sound (window.playVictorySound), falls vorhanden.

window.AdventGames = window.AdventGames || {};

window.AdventGames["akame_quiz_9"] = function (container, options) {
  "use strict";

  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  // ---------------------------------------------------------------------------
  // 15 feste Fragen – schwer
  // ---------------------------------------------------------------------------

  const QUESTIONS = [
    {
      id: "story_group",
      type: "mc",
      text: "Wie heißt die Attentätergruppe, der Tatsumi sich im Anime anschließt?",
      choices: ["Night Raid", "Jaegers", "Wild Hunt", "Elite Seven"],
      correctIndex: 0,
    },
    {
      id: "story_capital_reason",
      type: "yn",
      text: "Stimmt es, dass Tatsumi die Hauptstadt ursprünglich besucht, um Geld für sein hungerndes Dorf zu verdienen?",
      choices: ["Ja", "Nein"],
      correctIndex: 0,
    },
    {
      id: "story_aria_mansion",
      type: "mc",
      text: "Was passiert in Episode 1 im Anwesen der Adligen Aria mit Sayo und Ieyasu?",
      choices: [
        "Sie werden von Aria und ihrer Familie gefoltert und getötet",
        "Sie werden von Night Raid getötet",
        "Sie werden von Danger Beasts gefressen",
        "Sie kehren sicher in ihr Dorf zurück",
      ],
      correctIndex: 0,
    },
    {
      id: "teigu_akame_name",
      type: "mc",
      text: "Wie heißt Akames Teigu im Anime?",
      choices: ["Murasame", "Pumpkin", "Incursio", "Extase"],
      correctIndex: 0,
    },
    {
      id: "teigu_tatsumi_name",
      type: "mc",
      text: "Welche Kaiserwaffe benutzt Tatsumi im Verlauf der Serie?",
      choices: ["Incursio", "Grand Chariot", "Shikoutazer", "Mastema"],
      correctIndex: 0,
    },
    {
      id: "teigu_murasame_effect",
      type: "mc",
      text: "Welche Eigenschaft hat Murasame, wenn es einen Gegner schneidet?",
      choices: [
        "Es injiziert ein tödliches Gift, das in Sekunden tötet",
        "Es stiehlt Erinnerungen",
        "Es versiegelt andere Teigu",
        "Es kontrolliert die Zeit",
      ],
      correctIndex: 0,
    },
    {
      id: "teigu_mine_pumpkin",
      type: "mc",
      text: "Wie heißt Mines Scharfschützen-Teigu?",
      choices: ["Pumpkin", "Cross Tail", "Shikoutazer", "Demon's Extract"],
      correctIndex: 0,
    },
    {
      id: "world_danger_beasts",
      type: "yn",
      text: "Stimmt es, dass die Monster in 'Akame ga Kill!' offiziell 'Danger Beasts' genannt werden?",
      choices: ["Ja", "Nein"],
      correctIndex: 0,
    },
    {
      id: "factions_esdeath_team",
      type: "mc",
      text: "Wie heißt die Spezialeinheit des Imperiums, die Esdeath anführt?",
      choices: ["Jaegers", "Wild Hunt", "Elite Seven", "Night Raid"],
      correctIndex: 0,
    },
    {
      id: "factions_esdeath_element",
      type: "mc",
      text: "Welches Element kontrolliert Esdeath mithilfe ihres Teigu 'Demon's Extract'?",
      choices: ["Eis", "Feuer", "Blitz", "Wind"],
      correctIndex: 0,
    },
    {
      id: "factions_seryu",
      type: "mc",
      text: "Wie heißt die fanatisch 'gerechte' Soldatin mit dem Hund-Teigu Koro?",
      choices: ["Seryu Ubiquitous", "Kurome", "Chelsea", "Run"],
      correctIndex: 0,
    },
    {
      id: "factions_wave_backstory",
      type: "yn",
      text: "Stimmt es, dass Wave ursprünglich aus einer Fischerstadt stammt und zuvor in der Marine diente?",
      choices: ["Ja", "Nein"],
      correctIndex: 0,
    },
    {
      id: "deaths_first_nightraid",
      type: "mc",
      text: "Wer ist der erste Night-Raid-Charakter, der im Anime stirbt?",
      choices: ["Sheele", "Bulat", "Chelsea", "Lubbock"],
      correctIndex: 0,
    },
    {
      id: "deaths_bulat_opponent",
      type: "mc",
      text: "Gegen wen kämpft Bulat, als er stirbt?",
      choices: ["Liver", "Esdeath", "Budo", "Seryu"],
      correctIndex: 0,
    },
    {
      id: "politics_honest",
      type: "mc",
      text: "Wie heißt der Premierminister, gegen den die Revolution gerichtet ist?",
      choices: ["Honest", "Stylish", "Ogre", "Budo"],
      correctIndex: 0,
    },
  ];

  const QUESTIONS_PER_ROUND = QUESTIONS.length; // 15

  // Stern-Schwellen
  const BRONZE_THRESHOLD = 10;
  const SILVER_THRESHOLD = 12;
  const GOLD_THRESHOLD = 14;
  const RED_THRESHOLD = 15;

  const STATE_IDLE = "idle";
  const STATE_ASKING = "asking";
  const STATE_WON = "won";
  const STATE_LOST = "lost";

  let state = STATE_IDLE;

  let currentQuestionIndex = 0;
  let correctCount = 0;
  let answeredCount = 0;

  // DOM-Elemente
  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "akame-quiz-root";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";

  const header = document.createElement("div");
  header.textContent = "Tür 9 – Akame Quiz";
  header.style.fontWeight = "600";
  header.style.fontSize = "1.1rem";
  header.style.marginBottom = "2px";

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.alignItems = "center";
  controls.style.gap = "8px";
  controls.style.margin = "4px 0 0";

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.textContent = "Starten";
  startBtn.style.padding = "6px 12px";
  startBtn.style.borderRadius = "999px";
  startBtn.style.border = "none";
  startBtn.style.cursor = "pointer";

  const statusPill = document.createElement("div");
  statusPill.style.display = "inline-flex";
  statusPill.style.alignItems = "center";
  statusPill.style.gap = "6px";
  statusPill.style.fontSize = "0.8rem";
  statusPill.style.padding = "4px 10px";
  statusPill.style.borderRadius = "999px";
  statusPill.style.background = "rgba(11,22,40,0.9)";
  statusPill.style.border = "1px solid rgba(255,255,255,0.12)";
  statusPill.style.color = "rgba(255,255,255,0.88)";

  const statusIcon = document.createElement("span");
  statusIcon.textContent = "★";
  const statusText = document.createElement("span");
  statusText.textContent =
    "10✔ Bronze · 12✔ Silber · 14✔ Gold · 15✔ Rot";

  statusPill.appendChild(statusIcon);
  statusPill.appendChild(statusText);

  controls.appendChild(startBtn);
  controls.appendChild(statusPill);

  // Layout: links Quizkarte, rechts kleine Info-Icons
  const layout = document.createElement("div");
  layout.style.display = "flex";
  layout.style.gap = "12px";
  layout.style.alignItems = "stretch";
  layout.style.marginTop = "4px";

  const quizCard = document.createElement("div");
  quizCard.style.flex = "1 1 auto";
  quizCard.style.position = "relative";
  quizCard.style.borderRadius = "12px";
  quizCard.style.padding = "14px 14px 16px";
  quizCard.style.background =
    "linear-gradient(145deg, #050813, #111a2a 38%, #1b283e)";
  quizCard.style.boxShadow = "0 4px 16px rgba(0,0,0,0.6)";
  quizCard.style.minHeight = "190px";

  const quizHeaderRow = document.createElement("div");
  quizHeaderRow.style.display = "flex";
  quizHeaderRow.style.justifyContent = "space-between";
  quizHeaderRow.style.alignItems = "center";
  quizHeaderRow.style.marginBottom = "10px";

  const pillRowLeft = document.createElement("div");
  pillRowLeft.style.display = "flex";
  pillRowLeft.style.gap = "6px";

  function makeHudPill(label, valueFn) {
    const pill = document.createElement("div");
    pill.style.display = "inline-flex";
    pill.style.alignItems = "center";
    pill.style.gap = "4px";
    pill.style.fontSize = "0.75rem";
    pill.style.padding = "3px 8px";
    pill.style.borderRadius = "999px";
    pill.style.border = "1px solid rgba(255,255,255,0.14)";
    pill.style.background = "rgba(5,10,20,0.8)";
    pill.style.color = "rgba(255,255,255,0.9)";

    const labelSpan = document.createElement("span");
    labelSpan.style.opacity = "0.8";
    labelSpan.textContent = label;

    const valueSpan = document.createElement("span");
    valueSpan.style.fontWeight = "600";
    valueSpan.textContent = valueFn();

    pill.appendChild(labelSpan);
    pill.appendChild(valueSpan);

    return { pill, valueSpan, valueFn };
  }

  const questionHud = makeHudPill("❓ Frage", () =>
    state === STATE_IDLE ? "–/15" : currentQuestionIndex + 1 + "/15"
  );
  const correctHud = makeHudPill("✔ Richtig", () =>
    state === STATE_IDLE ? "0/15" : correctCount + "/15"
  );

  pillRowLeft.appendChild(questionHud.pill);
  pillRowLeft.appendChild(correctHud.pill);

  const setLabel = document.createElement("div");
  setLabel.style.fontSize = "0.75rem";
  setLabel.style.opacity = "0.85";
  setLabel.style.padding = "3px 8px";
  setLabel.style.borderRadius = "999px";
  setLabel.style.border = "1px solid rgba(255,255,255,0.12)";
  setLabel.style.background = "rgba(5,10,20,0.7)";
  setLabel.style.color = "rgba(255,255,255,0.9)";
  setLabel.textContent = "15 Fragen – Akame ga Kill!";

  quizHeaderRow.appendChild(pillRowLeft);
  quizHeaderRow.appendChild(setLabel);

  const questionTextEl = document.createElement("div");
  questionTextEl.style.fontSize = "0.98rem";
  questionTextEl.style.fontWeight = "500";
  questionTextEl.style.color = "rgba(255,255,255,0.94)";
  questionTextEl.style.marginBottom = "10px";
  questionTextEl.style.minHeight = "40px";

  const answersContainer = document.createElement("div");
  answersContainer.style.display = "flex";
  answersContainer.style.flexDirection = "column";
  answersContainer.style.gap = "6px";

  const overlay = document.createElement("div");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.flexDirection = "column";
  overlay.style.fontSize = "1.7rem";
  overlay.style.fontWeight = "700";
  overlay.style.color = "rgba(255,255,255,0.96)";
  overlay.style.textShadow = "0 0 10px rgba(0,0,0,0.9)";
  overlay.style.background = "rgba(0,0,0,0.25)";
  overlay.style.opacity = "1";
  overlay.style.pointerEvents = "auto";
  overlay.style.transition = "opacity 0.18s ease-out";

  const overlayMain = document.createElement("div");
  const overlaySub = document.createElement("div");
  overlaySub.style.fontSize = "0.9rem";
  overlaySub.style.marginTop = "4px";

  overlay.appendChild(overlayMain);
  overlay.appendChild(overlaySub);

  quizCard.appendChild(quizHeaderRow);
  quizCard.appendChild(questionTextEl);
  quizCard.appendChild(answersContainer);
  quizCard.appendChild(overlay);

  // Rechte kleine Info-Spalte: Icons für Eingabe & Sterne
  const side = document.createElement("aside");
  side.style.flex = "0 0 160px";
  side.style.display = "flex";
  side.style.flexDirection = "column";
  side.style.gap = "10px";
  side.style.alignItems = "stretch";
  side.style.fontFamily =
    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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

  const controlCard = makeSideCard("Bedienung", "🖱", [
    "Antwort anklicken",
    "15 Fragen hintereinander",
  ]);

  const starCard = makeSideCard("Sterne", "⭐", [
    "10–11✔ → Bronze",
    "12–13✔ → Silber",
    "14✔ → Gold",
    "15✔ → Rot",
  ]);

  side.appendChild(controlCard);
  side.appendChild(starCard);

  layout.appendChild(quizCard);
  layout.appendChild(side);

  root.appendChild(header);
  root.appendChild(controls);
  root.appendChild(layout);
  container.appendChild(root);

  // ---------------------------------------------------------------------------
  // HILFSFUNKTIONEN
  // ---------------------------------------------------------------------------

  function updateHud() {
    questionHud.valueSpan.textContent =
      state === STATE_IDLE ? "–/15" : currentQuestionIndex + 1 + "/15";
    correctHud.valueSpan.textContent =
      state === STATE_IDLE ? "0/15" : correctCount + "/15";
  }

  function setOverlay(main, sub, visible) {
    overlayMain.textContent = main || "";
    overlaySub.textContent = sub || "";
    overlay.style.opacity = visible ? "1" : "0";
    overlay.style.pointerEvents = visible ? "auto" : "none";
  }

  function resetRound() {
    currentQuestionIndex = 0;
    correctCount = 0;
    answeredCount = 0;
    state = STATE_ASKING;
    renderCurrentQuestion();
    updateHud();
    setOverlay("Bereit?", "Klicke eine Antwort.", true);
  }

  function startRound() {
    if (state === STATE_ASKING) return;
    resetRound();
    // kleines Intro-Fade
    setTimeout(() => {
      if (state === STATE_ASKING) {
        setOverlay("", "", false);
      }
    }, 420);
  }

  function finishRound() {
    const score = correctCount;
    let reward = null;

    if (score >= RED_THRESHOLD) {
      reward = { level: "red", label: "Roter Stern" };
    } else if (score >= GOLD_THRESHOLD) {
      reward = { level: "gold", label: "Goldener Stern" };
    } else if (score >= SILVER_THRESHOLD) {
      reward = { level: "silver", label: "Silberner Stern" };
    } else if (score >= BRONZE_THRESHOLD) {
      reward = { level: "brown", label: "Bronzener Stern" };
    }

    if (reward) {
      state = STATE_WON;
      const summary = score + "/15 richtig – " + reward.label;
      setOverlay("✔", summary, true);

      // Gewinnsound abspielen, falls vorhanden
      try {
        if (
          typeof window !== "undefined" &&
          typeof window.playVictorySound === "function"
        ) {
          window.playVictorySound();
        }
      } catch (e) {}

      try {
        onWin(reward);
      } catch (e) {
        console.error("akame_quiz_9 onWin error:", e);
      }
    } else {
      state = STATE_LOST;
      const summary = score + "/15 richtig – kein Stern";
      setOverlay("✖", summary, true);
    }
    updateHud();
  }

  function clearAnswers() {
    answersContainer.innerHTML = "";
  }

  let answeringLocked = false;

  function renderCurrentQuestion() {
    clearAnswers();
    if (currentQuestionIndex >= QUESTIONS.length) {
      return;
    }

    const q = QUESTIONS[currentQuestionIndex];
    questionTextEl.textContent = q.text;
    answeringLocked = false;

    q.choices.forEach((choiceText, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = choiceText;
      btn.style.width = "100%";
      btn.style.textAlign = "left";
      btn.style.padding = "7px 9px";
      btn.style.borderRadius = "8px";
      btn.style.border = "1px solid rgba(255,255,255,0.16)";
      btn.style.background = "rgba(8,14,26,0.9)";
      btn.style.color = "rgba(255,255,255,0.9)";
      btn.style.fontSize = "0.86rem";
      btn.style.cursor = "pointer";
      btn.style.transition =
        "background 0.12s ease-out, border-color 0.12s ease-out, transform 0.05s ease-out";

      btn.addEventListener("mouseenter", () => {
        if (answeringLocked) return;
        btn.style.background = "rgba(18,28,46,0.95)";
        btn.style.transform = "translateY(-1px)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(8,14,26,0.9)";
        btn.style.transform = "translateY(0)";
      });

      btn.addEventListener("click", () => {
        if (answeringLocked || state !== STATE_ASKING) return;
        answeringLocked = true;

        const correct = idx === q.correctIndex;
        if (correct) {
          correctCount += 1;
        }
        answeredCount += 1;

        const buttons = Array.from(
          answersContainer.querySelectorAll("button")
        );
        buttons.forEach((b, buttonIdx) => {
          b.disabled = true;
          b.style.cursor = "default";
          if (buttonIdx === q.correctIndex) {
            b.style.background = "rgba(46, 160, 106, 0.95)";
            b.style.borderColor = "rgba(167, 255, 210, 0.9)";
          } else if (buttonIdx === idx) {
            b.style.background = "rgba(180, 60, 60, 0.95)";
            b.style.borderColor = "rgba(255, 170, 170, 0.9)";
          } else {
            b.style.opacity = "0.7";
          }
        });

        updateHud();

        setTimeout(() => {
          if (answeredCount >= QUESTIONS_PER_ROUND) {
            finishRound();
          } else {
            currentQuestionIndex += 1;
            renderCurrentQuestion();
          }
        }, 650);
      });

      answersContainer.appendChild(btn);
    });

    setOverlay("", "", false);
    updateHud();
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  startBtn.addEventListener("click", () => {
    startRound();
  });

  function handleKeyDown(e) {
    if (e.code === "Space" || e.code === "Enter") {
      if (state === STATE_IDLE || state === STATE_WON || state === STATE_LOST) {
        startRound();
        e.preventDefault();
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown);

  // Initialanzeige
  setOverlay("Start?", "Klicke auf Start, dann beantworte 15 Fragen.", true);
  updateHud();

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------

  return {
    destroy() {
      try {
        window.removeEventListener("keydown", handleKeyDown);
      } catch (e) {}
    },
  };
};
