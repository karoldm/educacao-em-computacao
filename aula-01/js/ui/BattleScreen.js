(function () {
  const characterNameEl = document.getElementById('battle-character-name');
  const characterImgEl = document.getElementById('battle-character-img');
  const characterAttackEl = document.getElementById('battle-character-attack');
  const enemyNameEl = document.getElementById('battle-enemy-name');
  const enemyImgEl = document.getElementById('battle-enemy-img');
  const enemyBtn = document.getElementById('battle-enemy-btn');

  Game.UI.runBattle = function runBattle(character, enemy, onResolved) {
    Game.UI.showScreen('screen-battle');

    characterNameEl.textContent = `${character.name}, o Herói`;
    characterImgEl.src = character.image;
    characterImgEl.alt = character.name;
    characterAttackEl.textContent = `Pronto para usar: ${character.signatureAttack.name}`;

    enemyNameEl.textContent = enemy.name;
    enemyImgEl.src = enemy.image;
    enemyImgEl.alt = enemy.name;

    function handleAttack() {
      enemyBtn.removeEventListener('click', handleAttack);
      const victorious = enemy.isDefeatedBy(character.signatureAttack.id);
      onResolved(victorious);
    }

    enemyBtn.addEventListener('click', handleAttack);
  };
})();
