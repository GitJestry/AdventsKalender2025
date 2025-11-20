// Hauptlogik für den Exit-Adventskalender – Spiele & Türen

const STORAGE_KEY_COMPLETED = "exitAdvent_completedDays_v8";

let currentGameInstance = null;
let currentGameDay = null;

document.addEventListener("DOMContentLoaded", () => {
  initSnow();
  initHeader();
  initCalendar();
  initGameOverlay();
});

function initHeader() {
  const nameTarget = document.getElementById("nameTarget");
  const missionText = document.getElementById("missionText");

  if (nameTarget && ADVENT_CONFIG.recipientName) {
    nameTarget.textContent = ADVENT_CONFIG.recipientName;
  }

  if (missionText && ADVENT_CONFIG.missionIntro) {
    missionText.textContent = ADVENT_CONFIG.missionIntro;
  }
}

function initCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid || !ADVENT_CONFIG || !Array.isArray(ADVENT_CONFIG.days)) return;

  const completedDays = getCompletedDays();

  ADVENT_CONFIG.days
    .slice()
    .sort((a, b) => a.day - b.day)
    .forEach((entry) => {
      const door = document.createElement("button");
      door.className = "door";
      door.type = "button";
      door.dataset.day = String(entry.day);

      const isAvailable = isDayAvailable(entry.day);
      const isCompleted = completedDays.includes(entry.day);

      if (!isAvailable) {
        door.classList.add("locked");
      } else if (isCompleted) {
        door.classList.add("open");
      } else {
        door.classList.add("available");
      }

      door.innerHTML = `
        <div class="door-inner">
          <div class="door-frame">
            <div class="door-glow"></div>
            <div class="door-star-dust"></div>
            <div class="door-panel">
              <span class="door-number">${entry.day}</span>
              <span class="door-label">Dezember</span>
              <span class="door-knob"></span>
            </div>
          </div>
        </div>
      `;

      door.addEventListener("click", () => handleDoorClick(entry.day));
      grid.appendChild(door);
    });
}

function handleDoorClick(dayNumber) {
  const dayInt = Number(dayNumber);
  const entry = ADVENT_CONFIG.days.find((d) => d.day === dayInt);
  if (!entry) return;

  if (!isDayAvailable(dayInt)) {
    showLockedMessage();
    return;
  }

  openGameForEntry(entry);
}

/* GAME OVERLAY */

function initGameOverlay() {
  const overlay = document.getElementById("gameOverlay");
  if (!overlay) return;

  const closeButton = overlay.querySelector(".game-close");
  const backdrop = overlay.querySelector(".game-backdrop");

  const closeOverlay = () => {
    overlay.classList.add("hidden");
    destroyCurrentGame();
  };

  closeButton?.addEventListener("click", closeOverlay);
  backdrop?.addEventListener("click", closeOverlay);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
      closeOverlay();
    }
  });

  window.closeGameOverlay = closeOverlay;
}

function destroyCurrentGame() {
  if (currentGameInstance && typeof currentGameInstance.destroy === "function") {
    try {
      currentGameInstance.destroy();
    } catch (e) {
      console.error("Fehler beim Zerstören des Spiels:", e);
    }
  }

  const container = document.getElementById("gameContainer");
  if (container) {
    container.innerHTML = "";
  }
  currentGameInstance = null;
  currentGameDay = null;
}

function openGameForEntry(entry) {
  const overlay = document.getElementById("gameOverlay");
  if (!overlay) return;

  const gameDay = document.getElementById("gameDay");
  const gameTitle = document.getElementById("gameTitle");
  const gameGift = document.getElementById("gameGift");
  const gameStory = document.getElementById("gameStory");
  const gameMemory = document.getElementById("gameMemory");
  const gameLetter = document.getElementById("gameLetter");
  const msgLocked = document.getElementById("gameMessageLocked");
  const msgBody = document.getElementById("gameMessageBody");
  const container = document.getElementById("gameContainer");

  if (gameDay) gameDay.textContent = String(entry.day);
  if (gameTitle) gameTitle.textContent = entry.title ?? "";
  if (gameGift) gameGift.textContent = entry.giftLabel ?? "";

  if (gameStory) {
    gameStory.innerHTML = (entry.story ?? "").trim().replace(/\n\s*/g, " ");
  }
  if (gameMemory) {
    if (entry.memory && entry.memory.trim().length > 0) {
      gameMemory.innerHTML = entry.memory.trim();
      gameMemory.style.display = "block";
    } else {
      gameMemory.innerHTML = "";
      gameMemory.style.display = "none";
    }
  }
  if (gameLetter) {
    gameLetter.textContent = entry.magicLetter ?? "";
  }

  const completedDays = getCompletedDays();
  const isCompleted = completedDays.includes(entry.day);

  if (isCompleted) {
    if (msgLocked) msgLocked.style.display = "none";
    if (msgBody) msgBody.classList.remove("hidden");
  } else {
    if (msgLocked) msgLocked.style.display = "block";
    if (msgBody) msgBody.classList.add("hidden");
  }

  destroyCurrentGame();
  currentGameDay = entry.day;

  if (container) {
    if (entry.gameId && window.AdventGames && typeof window.AdventGames[entry.gameId] === "function") {
      currentGameInstance = window.AdventGames[entry.gameId](container, {
        day: entry.day,
        onWin: () => handleGameWin(entry.day)
      });
    } else {
      container.innerHTML = "<p style='font-size:0.9rem;color:#a6b0d8;'>Für dieses Türchen ist das Spiel noch nicht eingebaut – du kannst es später ergänzen. 🎄</p>";
    }
  }

  overlay.classList.remove("hidden");
}

function handleGameWin(day) {
  const completedDays = getCompletedDays();
  if (!completedDays.includes(day)) {
    completedDays.push(day);
    saveCompletedDays(completedDays);
  }

  const door = document.querySelector(`.door[data-day="${day}"]`);
  if (door) {
    door.classList.remove("available", "locked");
    door.classList.add("open");
  }

  const msgLocked = document.getElementById("gameMessageLocked");
  const msgBody = document.getElementById("gameMessageBody");
  if (msgLocked) msgLocked.style.display = "none";
  if (msgBody) msgBody.classList.remove("hidden");
}

/* DATUMSLOGIK */

function isDayAvailable(dayNumber) {
  if (ADVENT_CONFIG.debugMode) return true;

  const today = new Date();
  const yearConfig = ADVENT_CONFIG.year;
  const currentYear = today.getFullYear();
  const targetYear = yearConfig ?? currentYear;

  if (today.getFullYear() !== targetYear || today.getMonth() !== 11) {
    return false;
  }

  const currentDay = today.getDate();
  return currentDay >= dayNumber;
}

/* COMPLETED STORAGE */

function getCompletedDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMPLETED);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 24);
  } catch {
    return [];
  }
}

function saveCompletedDays(days) {
  const uniqueSorted = Array.from(new Set(days))
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 24)
    .sort((a, b) => a - b);

  try {
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(uniqueSorted));
  } catch {
    // Wenn localStorage nicht geht, ist nur das Merken der offenen Türen betroffen.
  }
}

/* SCHNEE-EFFEKT */

function initSnow() {
  const container = document.querySelector(".snow-layer");
  if (!container) return;

  const flakes = 70;
  for (let i = 0; i < flakes; i++) {
    const span = document.createElement("span");
    span.className = "snowflake";
    span.textContent = "✶";

    const delay = Math.random() * 10;
    const duration = 8 + Math.random() * 10;
    const size = 0.6 + Math.random() * 0.9;
    const left = Math.random() * 100;

    span.style.left = `${left}vw`;
    span.style.fontSize = `${size}rem`;
    span.style.animationDelay = `${delay}s`;
    span.style.animationDuration = `${duration}s`;

    container.appendChild(span);
  }
}

/* KURZE NACHRICHT BEI GESPERRTEN TÜRCHEN */

let lockedMessageTimeout = null;

function showLockedMessage() {
  const existing = document.querySelector(".locked-message");
  if (existing) {
    existing.remove();
  }

  const template = document.getElementById("lockedMessageTemplate");
  if (!template) return;

  const clone = template.content.cloneNode(true);
  document.body.appendChild(clone);

  if (lockedMessageTimeout) {
    clearTimeout(lockedMessageTimeout);
  }

  lockedMessageTimeout = setTimeout(() => {
    const msg = document.querySelector(".locked-message");
    if (msg) msg.remove();
  }, 2200);
}
