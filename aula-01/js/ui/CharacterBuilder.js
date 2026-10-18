(function () {
  const lineageContainer = document.getElementById('lineage-cards');
  const optionsContainer = document.getElementById('option-cards');
  const confirmBtn = document.getElementById('btn-confirm-class');
  const promptEl = document.getElementById('builder-prompt');

  function renderLineage(classId) {
    lineageContainer.innerHTML = '';
    const character = Game.createCharacter(classId);
    character.lineage.forEach((step, i) => {
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'lineage-arrow';
        arrow.textContent = '\u2192';
        lineageContainer.appendChild(arrow);
      }
      const ownStep = Object.assign({}, step, { attacks: Game.getOwnAbilities(step.id) });
      lineageContainer.appendChild(Game.UI.renderClassCard(ownStep));
    });
  }

  function renderOptions(childIds, onPick) {
    optionsContainer.innerHTML = '';
    childIds.forEach((childId) => {
      const preview = Game.createCharacter(childId);
      const lastStep = preview.lineage[preview.lineage.length - 1];
      const ownStep = Object.assign({}, lastStep, { attacks: Game.getOwnAbilities(childId) });
      const card = Game.UI.renderClassCard(ownStep);
      card.classList.add('option-card');
      card.addEventListener('click', () => onPick(childId));
      optionsContainer.appendChild(card);
    });
  }

  Game.UI.runCharacterBuilder = function runCharacterBuilder(currentClassId, onComplete) {
    Game.UI.showScreen('screen-builder');
    confirmBtn.classList.add('hidden');
    optionsContainer.classList.remove('hidden');

    renderLineage(currentClassId);
    promptEl.textContent = 'Treine mais dessa vez: você vai precisar se especializar e aprender uma habilidade nova para derrotar esse inimigo.';

    renderOptions(Game.getChildren(currentClassId), (chosenId) => {
      renderLineage(chosenId);
      optionsContainer.innerHTML = '';
      optionsContainer.classList.add('hidden');
      promptEl.textContent = 'Habilidade aprendida! Sua classe está pronta para a batalha.';
      confirmBtn.classList.remove('hidden');
      confirmBtn.onclick = () => onComplete(chosenId);
    });
  };
})();
