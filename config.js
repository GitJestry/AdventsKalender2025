// Konfiguration für den Exit-Adventskalender – Celines Spiele-Challenge
// Spiele werden zentral in ADVENT_CONFIG.games registriert und dann
// von den Kalendertüren über gameId referenziert.

const ADVENT_CONFIG = {
  recipientName: "sunny <3",
  missionIntro:
    "Bevor du deine echte Adventstür öffnen darfst, musst du hie...innen. Jeden Tag gibt es eine kleine Challenge nur für dich. ♥",
  debugMode: true,
  year: null,

  // Zentrale Spiele-Definitionen: hier neue Spiele eintragen.
  games: {
    warmflaschen_sort: {
      id: "warmflaschen_sort",
      script: "games/game1_warmflaschen.js",
      style: null
    },
    lip_tracing_runner: {
      id: "lip_tracing_runner",
      script: "games/game2_lip_tracing_runner.js",
      style: null
    },
    fast_hands_reaction: {
      id: "fast_hands_reaction",
      script: "games/game3_fast_hands_reaction.js",
      style: null
    },
    juli_crime_reading: {
      id: "juli_crime_reading",
      script: "games/game4_juli_reading.js",
      style: null
    }
  },

  // Türen: verknüpfen einen Kalendertag mit einem Spiel
  days: [
    {
      day: 1,
      title: "Wärmflaschen Umfüllen Ad",
      giftLabel: "Im echten Kalender: Wärmflasche",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "warmflaschen_sort"
    },
    {
      day: 2,
      title: "Lippenbalsam-auftragen-test",
      giftLabel: "Im echten Kalender: Lippenpflege",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "lip_tracing_runner"
    },
    {
      day: 3,
      title: "Schnelle Hände – Reaktionsklecks",
      giftLabel: "Im echten Kalender: noch geheim 😉",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "fast_hands_reaction"
    },
    {
      day: 4,
      title: "Lese-Challenge mit Juli",
      giftLabel: "Im echten Kalender: Zeit mit Juli <3",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "juli_crime_reading"
    }
  ]
};
