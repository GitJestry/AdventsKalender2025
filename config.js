// Konfiguration für den Exit-Adventskalender – aktuell nur Tag 1 & 2 für die Spiele

const ADVENT_CONFIG = {
  recipientName: "DEIN SCHATZ",
  missionIntro:
    "Der Weihnachtsstern über unserer kleinen Welt ist verschwunden. Hinter jeder Tür wartet ein kleines Spiel. " +
    "Wenn du gewinnst, öffnet sich dahinter eine Nachricht, ein geheimer Buchstabe und natürlich dein echtes Geschenk am jeweiligen Tag.",
  debugMode: true,
  year: null,
  days: [
    {
      day: 1,
      title: "Kapitel 1 – Wärmflaschen voller Sternenlicht",
      giftLabel: "Im echten Kalender: Wärmflasche",
      story: `In dieser Nacht ist etwas anders: Der Weihnachtsstern über eurer kleinen Welt ist verschwunden.
      Statt warmem Licht liegt ein leiser, blauer Schimmer über allem. Nur ein Brief bleibt zurück – mit deinem Namen darauf.
      Darin steht, dass nur jemand mit einem besonders warmen Herzen den Stern zurückholen kann.
      Die Wärmflasche heute ist dein erstes Ausrüstungsstück: Sie hält nicht nur dich warm, sondern auch die Funken der Hoffnung.`,
      memory: `Ersetze diesen Text durch eine eurer Erinnerungen. Zum Beispiel: <strong>„Weißt du noch, wie wir zum ersten Mal gemeinsam einen kalten Winterabend überlebt haben – nur mit Decken, Tee und einem Film?“</strong>`,
      magicLetter: "D",
      gameId: "warmflaschen_sort"
    },
    {
      day: 2,
      title: "Kapitel 2 – Die flüsternde Winterluft",
      giftLabel: "Im echten Kalender: Lippenpflege",
      story: `Draußen ist es eisig. Der Winterwind flüstert dir Hinweise zu, doch die kalte Luft lässt deine Lippen fast gefrieren.
      Du merkst: Um mit dem Winter selbst zu verhandeln, brauchst du geschützte Lippen.
      Die Lippenpflege heute ist wie ein kleiner Zauberschild gegen die Kälte – damit du jede Botschaft des Windes verstehen kannst.`,
      memory: `Hier kannst du eine Erinnerung einfügen, bei der ihr draußen wart. Zum Beispiel ein Spaziergang im Schnee oder ein Weihnachtsmarkt-Besuch.`,
      magicLetter: "U",
      gameId: "lip_tracing_runner"
    }
  ]
};
