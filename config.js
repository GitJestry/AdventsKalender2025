// Konfiguration für den Exit-Adventskalender – Celines Spiele-Challenge
// Spiele werden zentral in ADVENT_CONFIG.games registriert und dann
// von den Kalendertüren über gameId referenziert.

const ADVENT_CONFIG = {
  recipientName: "meine Celine",
  missionIntro:
    "Bevor du deine echte Adventstür öffnen darfst, musst du die tägliche Challenge bestehen ♥",
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
    },
    maiswaffel_shooting: {
      id: "maiswaffel_shooting",
      script: "games/game5_maiswaffel_shooting.js",
      style: null
    },
    capybara_sprint: {
      id: "capybara_sprint",
      script: "games/game6_capybara_sprint.js",
      style: null
    },
      wire_runner_7: {
      id: "wire_runner_7",
      script: "games/game7_wire_runner.js",
      style: null
    },
    brick_heart_pong: {
      id: "brick_heart_pong",
      script: "games/game8_brick_heart_pong.js",
      style: null
    },
    akame_quiz_9: {
      id: "akame_quiz_9",
      script: "games/game9_akame_quiz.js",
      style: null
    },
    guitar_terms_10: {
      id: "guitar_terms_10",
      script: "games/game10_guitar_terms.js",
      style: null
    },
    lego_plant_11: {
      id: "lego_plant_11",
      script: "games/game11_lego_plant.js",
      style: null
    },
    chai_12: {
      id: "chai_12",
      script: "games/game12_chai.js",
      style: null
    },
    skyjo_13: {
      id: "skyjo_13",
      script: "games/game13_skyjo.js",
      style: null
    },
    socks_14: {
      id: "socks_14",
      script: "games/game14_socks.js",
      style: null
    },
    snow_15: {
      id: "snow_15",
      script: "games/game15_snow.js",
      style: null
    },
    candy_16: {
      id: "candy_16",
      script: "games/game16_candy.js",
      style: null
    },
    nail_17: {
      id: "nail_17",
      script: "games/game17_nails.js",
      style: null
    },
    sort_18: {
      id: "nail_18",
      script: "games/game18_sort.js",
      style: null
    },
    keks_19: {
      id: "keks_19",
      script: "games/game19_keks.js",
      style: null
    },
    guitar_20: {
      id: "guitar_20",
      script: "games/game20_guitar.js",
      style: null
    },
    game21: {
      id: "game21",
      script: "games/game21.js",
      style: null
    },
    game22: {
      id: "game22",
      script: "games/game22.js",
      style: null
    },
    game23: {
      id: "game23",
      script: "games/game23.js",
      style: null
    },
    game24: {
      id: "game24",
      script: "games/game24.js",
      style: null
    }

  },

  // Türen: verknüpfen einen Kalendertag mit einem Spiel
  days: [
    {
      day: 1,
      title: "Wärmflaschen Umfüllen Ad",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "warmflaschen_sort"
    },
    {
      day: 2,
      title: "Lippenbalsam-auftragen-test",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "lip_tracing_runner"
    },
    {
      day: 3,
      title: "Schnelle Hände – Reaktionsklecks",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "fast_hands_reaction"
    },
    {
      day: 4,
      title: "Lese-Challenge mit Juli",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "juli_crime_reading"
    },
    {
      day: 5,
      title: "Maiswaffel schießen",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "maiswaffel_shooting"
    },
    {
      day: 6,
      title: "Nikolaus-Capybara-Sprint",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "capybara_sprint"
    },
    {
      day: 7,
      title: "Golden Wire Runner",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "wire_runner_7"
    },
      {
      day: 8,
      title: "Brick Heart Pong",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "brick_heart_pong"
    }
    ,
    {
      day: 9,
      title: "Akame Ga Kill Quiz",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "akame_quiz_9"
    },
    {
      day: 10,
      title: "Wofür das wohl gut ist?",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "guitar_terms_10"
    },
    {
      day: 11,
      title: "Zusammen wachsen",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "lego_plant_11"
    },
    {
      day: 12,
      title: "Spicy Chai",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "chai_12"
    },
    {
      day: 13,
      title: "Skyjo Duell",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "skyjo_13"
    },
    {
      day: 14,
      title: "kuschelig",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "socks_14"
    },
     {
      day: 15,
      title: "Malen nach Zahlen",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "snow_15"
    },
     {
      day: 16,
      title: "Candy crush",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "candy_16"
    },
    {
      day: 17,
      title: "Deine wundervollen Nägel",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "nail_17"
    },
    {
      day: 18,
      title: "Einkauf einsortieren",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "sort_18"
    },
    {
      day: 19,
      title: "Kekseeee",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "keks_19"
    },
    {
      day: 20,
      title: "My cute musician",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "guitar_20"
    }
    ,
     {
      day: 21,
      title: "Part 1/3 Loveseries",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "game21"
    },
     {
      day: 22,
      title: "Part 2/3 Loveseries",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "game22"
    },
     {
      day: 23,
      title: "Part 3/3 Loveseries",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "game23"
    },
     {
      day: 24,
      title: "Merry Christmas Racing",
      giftLabel: "",
      story: "",
      memory: "",
      magicLetter: "",
      gameId: "game24"
    }

  ]
};
