// Hauptlogik für den Exit-Adventskalender – Spiele & Türen

const STORAGE_KEY_COMPLETED = "exitAdvent_completedDays_v8";
const STORAGE_KEY_OPENED = "exitAdvent_openedDays_v1";

const STORAGE_KEY_PULL_PROGRESS = "exitAdvent_pullProgress_v1";

function getDoorPullProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PULL_PROGRESS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch (e) {
    return {};
  }
}

function saveDoorPullProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY_PULL_PROGRESS, JSON.stringify(progress || {}));
  } catch (e) {
    console.warn("Konnte Tür-Aufzieh-Fortschritt nicht speichern:", e);
  }
}

let doorPullProgress = getDoorPullProgress();



let backgroundMusic = null;
let tearEffectSound = null;
let backgroundMusicPlaybackGuard = null;

function setupBackgroundMusic() {
  try {
    backgroundMusic = new Audio("assets/audio/driving_home_for_christmas.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.10; // noch leiser (~20% weniger)
    backgroundMusic.autoplay = true;
    backgroundMusic.preload = "auto";

    // Falls das Loop-Flag vom Browser ignoriert wird oder das Playback unterbrochen wurde,
    // starte das Lied erneut sobald es endet.
    const ensureBackgroundMusicPlays = () => {
      if (!backgroundMusic || !backgroundMusic.paused) return;
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(() => {});
    };

    backgroundMusic.addEventListener("ended", ensureBackgroundMusicPlays);

    // Wiederkehrender Guard, damit die Musik auch nach automatischen Pausen
    // (z. B. durch Browser-Policies) ohne Nutzereingriff weiterläuft.
    backgroundMusicPlaybackGuard = window.setInterval(ensureBackgroundMusicPlays, 2000);

    // Initialer Versuch
    ensureBackgroundMusicPlays();
  } catch (e) {
    console.error("Fehler beim Initialisieren der Hintergrundmusik", e);
  }
}

function setupDoorSounds() {
  try {
    tearEffectSound = new Audio("assets/audio/tear_effect_paper.wav");
    tearEffectSound.volume = 0.9; // ca. 20% lauter
  } catch (e) {
    console.error("Fehler beim Laden des Reiß-Sounds", e);
  }
}

let currentGameInstance = null;
let currentGameDay = null;

let isDoorFlyAnimating = false;

const loadedGameScripts = new Set();
const loadingGameScripts = {};
const loadedGameStyles = new Set();

function randomizeDoorStarPosition(star, palette) {
  // neue Zufallsposition
  star.style.setProperty("--star-x", `${Math.random() * 100}%`);
  star.style.setProperty("--star-y", `${Math.random() * 100}%`);

  // Größe / Scale
  const size = (Math.random() * 1.2 + 0.6).toFixed(2);
  const scale = (Math.random() * 1.4 + 0.86).toFixed(2);
  const tilt = Math.floor(Math.random() * 360);

  star.style.setProperty("--star-size", `${size}px`);
  star.style.setProperty("--star-scale", scale);
  star.style.setProperty("--star-tilt", `${tilt}deg`);

  // Farbe
  star.style.setProperty(
    "--star-color",
    palette[Math.floor(Math.random() * palette.length)]
  );

  // Burst-Effekt nur manchmal
  if (Math.random() > 0.4) {
    star.classList.add("door-star--burst");
  } else {
    star.classList.remove("door-star--burst");
  }
}

function createDoorStarfield(starLayer) {
  if (!starLayer) return;

  const palette = ["#ffd166", "#ffe9a3", "#fff4d6", "#f7c948", "#ffdf85"];
  const totalStars = 20; // nur 15 Sterne pro Tür

  starLayer.innerHTML = "";

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < totalStars; i += 1) {
    const star = document.createElement("span");
    star.className = "door-star";

    // Dauer & Verzögerung pro Stern EINMAL festlegen (für ruhigen Rhythmus)
    const twinkle = (2.4 + Math.random() * 2.6).toFixed(2);  // 2.4s–5.0s
    const delay = (Math.random() * twinkle).toFixed(2);      // zufälliger Offset

    star.style.setProperty("--star-twinkle", `${twinkle}s`);
    star.style.setProperty("--star-delay", `${delay}s`);

    // Start-Position und Look
    randomizeDoorStarPosition(star, palette);

    // Wenn ein Glow-Zyklus zu Ende ist: neue Position + Größe + Farbe
    star.addEventListener("animationiteration", () => {
      randomizeDoorStarPosition(star, palette);
    });

    fragment.appendChild(star);
  }

  starLayer.appendChild(fragment);
}

function copyComputedProperties(source, target, properties) {
  if (!source || !target || !properties || !properties.length) return;

  const computed = window.getComputedStyle(source);

  properties.forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value) {
      target.style.setProperty(prop, value);
    }
  });
}

function syncDoorVisualState(sourceDoor, targetDoor) {
  if (!sourceDoor || !targetDoor) return;

  const sourceGlow = sourceDoor.querySelector(".door-glow");
  const targetGlow = targetDoor.querySelector(".door-glow");

  copyComputedProperties(sourceGlow, targetGlow, [
    "background",
    "opacity",
    "filter",
    "box-shadow",
    "mix-blend-mode",
  ]);

  const sourceStarLayer = sourceDoor.querySelector(".door-star-dust");
  const targetStarLayer = targetDoor.querySelector(".door-star-dust");

  if (sourceStarLayer && targetStarLayer) {
    copyComputedProperties(sourceStarLayer, targetStarLayer, [
      "background",
      "opacity",
      "filter",
      "box-shadow",
      "transform",
    ]);

    const sourceStars = sourceStarLayer.querySelectorAll(".door-star");
    const targetStars = targetStarLayer.querySelectorAll(".door-star");

    sourceStars.forEach((star, index) => {
      const targetStar = targetStars[index];
      if (!targetStar) return;

      copyComputedProperties(star, targetStar, [
        "--star-x",
        "--star-y",
        "--star-size",
        "--star-scale",
        "--star-tilt",
        "--star-color",
        "opacity",
        "transform",
        "animation-duration",
        "animation-delay",
      ]);

      targetStar.style.animationPlayState = "paused";
    });

    targetStarLayer.style.animationPlayState = "paused";
  }
}

/**
 * Liefert die Spiel-Definition aus ADVENT_CONFIG.games für eine gegebene gameId.
 */
function getGameDefinition(gameId) {
  if (!gameId || typeof ADVENT_CONFIG === "undefined" || !ADVENT_CONFIG.games) return null;
  return ADVENT_CONFIG.games[gameId] || null;
}

/**
 * Stellt sicher, dass Skript (und optional Stylesheet) für das Spiel geladen sind.
 * Ruft onReady auf, sobald das Spiel initialisiert werden kann.
 */
function ensureGameAssetsLoaded(entry, onReady, onError) {
  const gameId = entry && entry.gameId;
  const def = getGameDefinition(gameId);

  if (!def || !def.script) {
    if (typeof onReady === "function") onReady();
    return;
  }

  // Optional: Spiel-spezifische Styles
  if (def.style && !loadedGameStyles.has(def.style)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = def.style;
    link.dataset.gameId = gameId;
    document.head.appendChild(link);
    loadedGameStyles.add(def.style);
  }

  const src = def.script;

  // Skript bereits geladen?
  if (loadedGameScripts.has(src)) {
    if (typeof onReady === "function") onReady();
    return;
  }

  // Lädt bereits? -> Listener anhängen
  if (loadingGameScripts[src]) {
    loadingGameScripts[src].push({ onReady, onError });
    return;
  }

  loadingGameScripts[src] = [{ onReady, onError }];

  const scriptEl = document.createElement("script");
  scriptEl.src = src;
  scriptEl.async = true;

  scriptEl.onload = () => {
    loadedGameScripts.add(src);
    const handlers = loadingGameScripts[src] || [];
    delete loadingGameScripts[src];
    handlers.forEach((h) => {
      if (h && typeof h.onReady === "function") {
        h.onReady();
      }
    });
  };

  scriptEl.onerror = () => {
    console.error("Konnte Spielskript nicht laden:", src);
    const handlers = loadingGameScripts[src] || [];
    delete loadingGameScripts[src];
    handlers.forEach((h) => {
      if (h && typeof h.onError === "function") {
        h.onError();
      }
    });
  };

  document.head.appendChild(scriptEl);
}



document.addEventListener("DOMContentLoaded", () => {
  setupDoorSounds();
  setupBackgroundMusic();
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
            localStorage.removeItem(STORAGE_KEY_PULL_PROGRESS);
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
            <div class="door-star-dust"></div>
            <div class="door-panel">
              <span class="door-number">${entry.day}</span>
              <span class="door-knob"></span>
            </div>
            <div class="door-hinge" aria-hidden="true"></div>
            <div class="door-pull-tab" aria-hidden="true">
              <span class="door-pull-arrow">⇠</span>
              <span class="door-pull-text">aufziehen</span>
            </div>
            <div class="door-status">
              <div class="door-status-icon" aria-hidden="true">✓</div>
            </div>
          </div>
        </div>
      `;

      const starLayer = door.querySelector(".door-star-dust");
      createDoorStarfield(starLayer);

      if (isAvailable && !isCompleted && !isOpened) {
        setupDoorPullInteraction(door, Number(entry.day));
      }

      door.addEventListener("click", (event) => handleDoorClick(entry.day, event));
      grid.appendChild(door);
    });
}


function triggerDoorNowOpenEffect(door) {
  if (!door) return;
  const frame = door.querySelector(".door-frame");
  const knob = door.querySelector(".door-knob");
  if (!frame || !knob) return;

  if (tearEffectSound) {
    try {
      tearEffectSound.currentTime = 0;
      tearEffectSound.play().catch(() => {});
    } catch (e) {
      console.warn("Konnte Reiß-Sound nicht abspielen", e);
    }
  }

  const layer = document.createElement("div");
  layer.className = "door-now-open-layer";

  const frameRect = frame.getBoundingClientRect();
  const knobRect = knob.getBoundingClientRect();

  const centerX = (knobRect.left + knobRect.right) / 2 - frameRect.left;
  const centerY = (knobRect.top + knobRect.bottom) / 2 - frameRect.top;

  const totalStars = 10;
  for (let i = 0; i < totalStars; i += 1) {
    const star = document.createElement("span");
    star.className = "door-now-open-star";

    const angle = (Math.PI * 2 * i) / totalStars;
    const radius = 24 + Math.random() * 10;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius - 10;

    star.style.left = `${centerX}px`;
    star.style.top = `${centerY}px`;
    star.style.setProperty("--dx", `${dx}px`);
    star.style.setProperty("--dy", `${dy}px`);

    layer.appendChild(star);
  }

  frame.appendChild(layer);

  window.setTimeout(() => {
    if (layer && layer.parentNode) {
      layer.parentNode.removeChild(layer);
    }
  }, 900);
}


function setupDoorPullInteraction(door, dayInt) {
  const panel = door.querySelector(".door-panel");
  const knob = door.querySelector(".door-knob");
  if (!panel || !knob) return;

  const key = String(dayInt);

  const minAngle = 0;
  const maxAngle = -78;
  const openThreshold = 0.9;
  const dragDistanceFactor = 1.8; // längerer Weg -> langsamer, „satisfying“
  const easingStrength = 0.16;

  let isDragging = false;
  let startX = 0;
  let startProgressOnDrag = 0;
  let pullProgress = 0;

  let currentAngle = 0;
  let targetAngle = 0;
  let rafId = null;

  const stored = doorPullProgress && typeof doorPullProgress[key] === "number"
    ? Math.max(0, Math.min(1, doorPullProgress[key]))
    : 0;

  pullProgress = stored;
  const initialEased = Math.pow(pullProgress, 1.4);
  currentAngle = minAngle + (maxAngle - minAngle) * initialEased;
  targetAngle = currentAngle;
  panel.style.setProperty("--door-angle", `${currentAngle}deg`);
  if (pullProgress > 0) {
    door.dataset.pullProgress = String(pullProgress);
  }

  function startAnimationLoop() {
    if (rafId !== null) return;
    const step = () => {
      const diff = targetAngle - currentAngle;
      if (Math.abs(diff) < 0.1 && !isDragging) {
        currentAngle = targetAngle;
        panel.style.setProperty("--door-angle", `${currentAngle}deg`);
        rafId = null;
        return;
      }
      currentAngle += diff * easingStrength;
      panel.style.setProperty("--door-angle", `${currentAngle}deg`);
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
  }

  const onPointerDown = (event) => {
    if (!isDayAvailable(dayInt)) return;
    if (door.classList.contains("open") || door.classList.contains("completed")) return;

    const ex = event.clientX || 0;

    isDragging = true;
    door.classList.add("door-pulling");

    startX = ex;
    startProgressOnDrag = pullProgress;

    if (panel.setPointerCapture && event.pointerId != null) {
      try {
        panel.setPointerCapture(event.pointerId);
      } catch (e) {
        // ignorieren
      }
    }
  };

  const onPointerMove = (event) => {
    if (!isDragging) return;

    const rect = panel.getBoundingClientRect();
    const width = rect.width || 1;

    const currentX = event.clientX || startX;
    const deltaX = startX - currentX;

    const maxDelta = width * dragDistanceFactor;
    const deltaProgress = deltaX / maxDelta;

    let rawProgress = startProgressOnDrag + deltaProgress;
    rawProgress = Math.max(0, Math.min(1, rawProgress));

    pullProgress = rawProgress;
    door.dataset.pullProgress = String(pullProgress);

    const eased = Math.pow(pullProgress, 1.4);
    targetAngle = minAngle + (maxAngle - minAngle) * eased;

    startAnimationLoop();
  };

  const stopDragging = (event) => {
    if (!isDragging) return;
    isDragging = false;
    door.classList.remove("door-pulling");

    if (panel.releasePointerCapture && event.pointerId != null) {
      try {
        panel.releasePointerCapture(event.pointerId);
      } catch (e) {
        // ignorieren
      }
    }

    const key = String(dayInt);

    if (pullProgress >= openThreshold) {
      pullProgress = 1;
      door.dataset.pullProgress = "1";

      delete doorPullProgress[key];
      saveDoorPullProgress(doorPullProgress);

      targetAngle = maxAngle;
      startAnimationLoop();

      door.classList.remove("locked", "available");
      if (!door.classList.contains("open")) {
        door.classList.add("open");
      }

      door.dataset.skipNextClick = "true";

      triggerDoorNowOpenEffect(door);
    } else {
      if (!doorPullProgress || typeof doorPullProgress !== "object") {
        doorPullProgress = {};
      }
      doorPullProgress[key] = pullProgress;
      saveDoorPullProgress(doorPullProgress);
    }
  };

  if (window.PointerEvent) {
    door.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
  } else {
    door.addEventListener("mousedown", (event) => onPointerDown(event));
    window.addEventListener("mousemove", (event) => onPointerMove(event));
    window.addEventListener("mouseup", (event) => stopDragging(event));
  }
}
function handleDoorClick(dayNumber, event) {
  const dayInt = Number(dayNumber);
  const entry = ADVENT_CONFIG.days.find((d) => d.day === dayInt);
  if (!entry) return;

  if (!isDayAvailable(dayInt)) {
    showLockedMessage();
    return;
  }

  const door = document.querySelector(`.door[data-day="${dayInt}"]`);
  if (!door) {
    openGameForEntry(entry);
    return;
  }

  // Direkt nach dem Aufziehen ausgelösten Klick ignorieren
  if (door.dataset.skipNextClick === "true") {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
      if (typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
    }
    delete door.dataset.skipNextClick;
    return;
  }

  const isCompleted = door.classList.contains("completed");
  const isOpen = door.classList.contains("open");

  // Noch nicht geöffnete, verfügbare Tür: nur ein kurzes Feedback,
  // das eigentliche Aufziehen passiert über den Türknauf.
  if (!isOpen && !isCompleted) {
    door.classList.add("door-opening");
    window.setTimeout(() => {
      door.classList.remove("door-opening");
    }, 600);
    return;
  }

  // Tür ist bereits offen oder abgeschlossen -> ins Spiel gehen
  let openedDays = [];
  if (typeof getOpenedDays === "function") {
    openedDays = getOpenedDays();
  }
  if (!openedDays.includes(dayInt)) {
    openedDays.push(dayInt);
    if (typeof saveOpenedDays === "function") {
      saveOpenedDays(openedDays);
    }
  }

  const startGameSequence = () => {
    if (typeof animateDoorFlyIn === "function") {
      animateDoorFlyIn(door, () => {
        openGameForEntry(entry);
      });
    } else {
      openGameForEntry(entry);
    }
  };

  startGameSequence();
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
  syncDoorVisualState(door, clone);
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
    container.innerHTML =
      "<p class=\"game-loading\">Spiel wird geladen ...</p>";
  }

  const startGame = () => {
    if (!container) return;

    if (entry.gameId && window.AdventGames && typeof window.AdventGames[entry.gameId] === "function") {
      container.innerHTML = "";
      currentGameInstance = window.AdventGames[entry.gameId](container, {
        day: entry.day,
        onWin: () => handleGameWin(entry.day)
      });
    } else {
      container.innerHTML =
        "<p style='font-size:0.9rem;color:#a6b0d8;'>Für dieses Türchen ist das Spiel noch nicht eingebaut – du kannst es später ergänzen. 🎄</p>";
    }
  };

  const onError = () => {
    if (!container) return;
    container.innerHTML =
      "<p style='font-size:0.9rem;color:#ff6b6b;'>Das Spiel konnte nicht geladen werden. Prüfe den Eintrag in <code>config.js</code> (gameId &amp; Script-Pfad).</p>";
  };

  ensureGameAssetsLoaded(entry, startGame, onError);

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

    const duration = 8 + Math.random() * 10;
    const delay = Math.random() * duration;
    const size = 0.6 + Math.random() * 0.9;
    const left = Math.random() * 100;
    const drift = -30 + Math.random() * 60;

    span.style.left = `${left}vw`;
    span.style.fontSize = `${size}rem`;
    span.style.setProperty("--snow-delay", `-${delay}s`);
    span.style.setProperty("--snow-duration", `${duration}s`);
    span.style.setProperty("--snow-drift", `${drift}px`);

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
