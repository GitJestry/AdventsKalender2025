// Spiel 4: Lese-Challenge mit Juli – reine Bestätigung

window.AdventGames = window.AdventGames || {};

window.AdventGames["juli_crime_reading"] = function initReadingChallenge(
  container,
  options
) {
  const opts = options || {};
  const onWin = typeof opts.onWin === "function" ? opts.onWin : () => {};

  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "reading-challenge";

  const message = document.createElement("p");
  message.className = "reading-challenge__message";
  message.textContent =
    "Heute ist die Challenge mit Juli 2 Kapitel des Krimis zu lesen.";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "reading-challenge__button";
  button.textContent = "Erledigt?";

  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Geschafft!";
    wrapper.classList.add("reading-challenge--completed");
    onWin();
  });

  wrapper.appendChild(message);
  wrapper.appendChild(button);
  container.appendChild(wrapper);
};
