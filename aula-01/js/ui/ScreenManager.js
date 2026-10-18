Game.UI.screenIds = [
  'screen-intro',
  'screen-dialogue',
  'screen-enemy',
  'screen-builder',
  'screen-hierarchy',
  'screen-battle',
  'screen-result'
];

Game.UI.showScreen = function showScreen(id) {
  Game.UI.screenIds.forEach((screenId) => {
    const element = document.getElementById(screenId);
    element.classList.toggle('hidden', screenId !== id);
  });
};
