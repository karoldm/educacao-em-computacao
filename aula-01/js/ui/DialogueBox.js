(function () {
  const speakerEl = document.getElementById('dialogue-speaker');
  const textEl = document.getElementById('dialogue-text');
  const nextBtn = document.getElementById('btn-dialogue-next');

  Game.UI.playDialogue = function playDialogue(lines, onComplete) {
    Game.UI.showScreen('screen-dialogue');
    let index = 0;

    function renderLine() {
      const line = lines[index];
      speakerEl.textContent = line.speaker;
      textEl.textContent = line.text;
      nextBtn.textContent = index === lines.length - 1 ? 'Continuar' : 'Próximo';
    }

    function handleNext() {
      index += 1;
      if (index >= lines.length) {
        nextBtn.removeEventListener('click', handleNext);
        onComplete();
        return;
      }
      renderLine();
    }

    nextBtn.addEventListener('click', handleNext);
    renderLine();
  };
})();
