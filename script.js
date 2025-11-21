// Hauptlogik für den Exit-Adventskalender – Spiele & Türen

const STORAGE_KEY_COMPLETED = "exitAdvent_completedDays_v8";
const STORAGE_KEY_OPENED = "exitAdvent_openedDays_v1";

let currentGameInstance = null;
let currentGameDay = null;

let isDoorFlyAnimating = false;

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

  // Debug-Leiste nur im Testmodus anzeigen
  if (ADVENT_CONFIG.debugMode) {
    const header = document.querySelector(".page-header");
    if (header && !header.querySelector(".debug-bar")) {
      const dbg = document.createElement("div");
      dbg.className = "debug-bar";
      dbg.innerHTML = `
        <span class="debug-pill">Testmodus aktiv</span>
        <button type="button" class="debug-reset-button">
          Fortschritt zurücksetzen
        </button>
      `;
      header.appendChild(dbg);

      const resetBtn = dbg.querySelector(".debug-reset-button");
      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          const ok = window.confirm(
            "Möchtest du wirklich alle gelösten Türen und den Spiel-Fortschritt löschen?"
          );
          if (!ok) return;

          try {
            localStorage.removeItem(STORAGE_KEY_COMPLETED);
            localStorage.removeItem(STORAGE_KEY_OPENED);
          } catch (e) {
            console.warn("Konnte lokalen Fortschritt nicht löschen:", e);
          }
          window.location.reload();
        });
      }
    }
  }
}

function initCalendar() {
  const grid = document.getElementById("calendarGrid");
  if (!grid || !ADVENT_CONFIG || !Array.isArray(ADVENT_CONFIG.days)) return;

  grid.innerHTML = "";

  const completedDays = getCompletedDays();
  const openedDays = typeof getOpenedDays === "function" ? getOpenedDays() : [];

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
      const isOpened = isCompleted || openedDays.includes(entry.day);

      if (!isAvailable) {
        door.classList.add("locked");
      } else if (isCompleted) {
        door.classList.add("open", "completed");
      } else if (isOpened) {
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
              <span class="door-knob"></span>
            </div>
            <div class="door-status">
              <div class="door-status-icon" aria-hidden="true">✓</div>
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

  const door = document.querySelector(`.door[data-day="${dayInt}"]`);

  // Zustand: geöffnet speichern
  if (door) {
    const openedDays = getOpenedDays();
    if (!openedDays.includes(dayInt)) {
      openedDays.push(dayInt);
      saveOpenedDays(openedDays);
    }

    if (!door.classList.contains("completed")) {
      door.classList.remove("locked", "available");
      door.classList.add("open");
    }
  }

  // Kamera-"hineinfliegen"-Animation, danach Spiel öffnen
  if (door && typeof animateDoorFlyIn === "function") {
    animateDoorFlyIn(door, () => {
      openGameForEntry(entry);
    });
  } else {
    openGameForEntry(entry);
  }
}

function animateDoorFlyIn(door, onComplete) {
  if (isDoorFlyAnimating) {
    if (typeof onComplete === "function") onComplete();
    return;
  }
  isDoorFlyAnimating = true;

  const rect = door.getBoundingClientRect();
  const flyLayer = document.createElement("div");
  flyLayer.className = "door-fly-layer";

  const clone = door.cloneNode(true);
  clone.removeAttribute("id");
  clone.classList.remove("door-opening");
  flyLayer.appendChild(clone);

  document.body.appendChild(flyLayer);

  flyLayer.style.position = "fixed";
  flyLayer.style.left = rect.left + "px";
  flyLayer.style.top = rect.top + "px";
  flyLayer.style.width = rect.width + "px";
  flyLayer.style.height = rect.height + "px";
  flyLayer.style.zIndex = "40";
  flyLayer.style.pointerEvents = "none";
  flyLayer.style.transformOrigin = "center center";
  flyLayer.style.transition = "transform 0.8s cubic-bezier(0.22, 0.9, 0.25, 1), opacity 0.8s ease-out";
  flyLayer.style.transform = "translate3d(0, 0, 0) scale(1)";
  flyLayer.style.opacity = "1";

  clone.style.width = "100%";
  clone.style.height = "100%";

  // Original-Tür kurz ausblenden, damit es nicht doppelt wirkt
  door.classList.add("door-hidden-for-flight");

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;
  const doorCenterX = rect.left + rect.width / 2;
  const doorCenterY = rect.top + rect.height / 2;

  const translateX = viewportCenterX - doorCenterX;
  const translateY = viewportCenterY - doorCenterY;

  // Skaliere so, dass die Tür ungefähr die Größe des Spielfensters bekommt
  const targetWidth = Math.min(1100, viewportWidth * 0.82);
  const targetHeight = viewportHeight * 0.82;
  const scaleX = targetWidth / rect.width;
  const scaleY = targetHeight / rect.height;
  const scale = Math.min(scaleX, scaleY);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      flyLayer.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
      flyLayer.style.opacity = "0.95";
    });
  });

  window.setTimeout(() => {
    if (flyLayer.parentNode) {
      flyLayer.parentNode.removeChild(flyLayer);
    }
    door.classList.remove("door-hidden-for-flight");
    isDoorFlyAnimating = false;
    if (typeof onComplete === "function") {
      onComplete();
    }
  }, 800);
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
  if (gameStory) gameStory.textContent = entry.story ?? "";

  if (gameMemory) {
    if (entry.memory) {
      gameMemory.innerHTML = entry.memory;
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

  if (msgLocked) msgLocked.style.display = isCompleted ? "none" : "block";
  if (msgBody) {
    if (isCompleted) {
      msgBody.classList.remove("hidden");
    } else {
      msgBody.classList.add("hidden");
    }
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
      container.innerHTML =
        "<p style='font-size:0.9rem;color:#a6b0d8;'>Für dieses Türchen ist das Spiel noch nicht eingebaut – du kannst es später ergänzen. 🎄</p>";
    }
  }

  overlay.classList.remove("hidden");
  // Animationsklasse für das „hineingehen“ durch die Tür
  overlay.classList.remove("door-enter-animation");
  // Reflow erzwingen, damit die Animation jedes Mal neu startet
  void overlay.offsetWidth;
  overlay.classList.add("door-enter-animation");
}

function handleGameWin(day) {
  const completedDays = getCompletedDays();
  if (!completedDays.includes(day)) {
    completedDays.push(day);
    saveCompletedDays(completedDays);
  }

  const door = document.querySelector(`.door[data-day="${day}"]`);
  if (door) {
    door.classList.remove("locked", "available");
    door.classList.add("open", "completed");
  }

  const msgLocked = document.getElementById("gameMessageLocked");
  const msgBody = document.getElementById("gameMessageBody");
  if (msgLocked) msgLocked.style.display = "none";
  if (msgBody) msgBody.classList.remove("hidden");

  // Gewinner-Text für Celines Advent-Challenge
  const message = `Du hast Gewonnen! Nun darfst du dein ${day}-tes Adventgeschenk öffnen.`;

  const winOverlay = document.getElementById("gameWinOverlay");
  const winOverlayInner = winOverlay ? winOverlay.querySelector(".game-win-overlay-inner") : null;
  const winPersistent = document.getElementById("gameWinPersistent");

  if (winOverlay && winOverlayInner) {
    winOverlayInner.innerHTML = `<p>${message}</p><small>(Klick hier, um weiterzuspielen)</small>`;
    winOverlay.classList.remove("hidden");
    winOverlay.onclick = () => {
      winOverlay.classList.add("hidden");
      winOverlay.onclick = null;
      if (winPersistent) {
        winPersistent.textContent = message;
        winPersistent.classList.remove("hidden");
      }
    };
  } else if (winPersistent) {
    // Falls das Overlay aus irgendeinem Grund nicht existiert, zeigen wir zumindest den Balken an
    winPersistent.textContent = message;
    winPersistent.classList.remove("hidden");
  }
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



// GESPEICHERTE GEÖFFNETE TÜREN (auch wenn das Spiel noch nicht geschafft ist)
function getOpenedDays() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPENED);
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

function saveOpenedDays(days) {
  const uniqueSorted = Array.from(new Set(days))
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 24)
    .sort((a, b) => a - b);

  try {
    localStorage.setItem(STORAGE_KEY_OPENED, JSON.stringify(uniqueSorted));
  } catch {
    // Falls localStorage nicht verfügbar ist, ist nur die Merk-Funktion betroffen.
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
