(function () {
  const imgEl = document.getElementById('enemy-reveal-img');
  const nameEl = document.getElementById('enemy-reveal-name');
  const titleEl = document.getElementById('enemy-reveal-title');
  const weaknessEl = document.getElementById('enemy-reveal-weakness');
  const continueBtn = document.getElementById('btn-enemy-continue');

  Game.UI.showEnemyReveal = function showEnemyReveal(enemy, onContinue) {
    Game.UI.showScreen('screen-enemy');

    imgEl.src = enemy.image;
    imgEl.alt = enemy.name;
    nameEl.textContent = enemy.name;
    titleEl.textContent = enemy.title;
    weaknessEl.textContent = Game.Data.attackCatalog[enemy.weaknessAttackId];

    continueBtn.onclick = onContinue;
  };
})();
