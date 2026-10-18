(function () {
  const titleEl = document.getElementById("result-title");
  const textEl = document.getElementById("result-text");
  const linkEl = document.getElementById("result-link");
  const continueBtn = document.getElementById("btn-result-continue");

  Game.UI.showResult = function showResult({
    title,
    text,
    link,
    linkText,
    buttonLabel,
    onContinue,
  }) {
    if (!link) {
      linkEl.style.display = "none";
    } else {
      linkEl.style.display = "block";
    }
    Game.UI.showScreen("screen-result");
    titleEl.textContent = title;
    textEl.textContent = text;
    linkEl.href = link;
    linkEl.textContent = linkText;
    continueBtn.textContent = buttonLabel;
    continueBtn.onclick = onContinue;
  };
})();
