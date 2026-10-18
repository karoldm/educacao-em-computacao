Game.pickEnemyForChildrenOf = function pickEnemyForChildrenOf(classId) {
  const children = Game.getChildren(classId);
  const randomChildId = children[Math.floor(Math.random() * children.length)];
  const attackId = Game.createCharacter(randomChildId).signatureAttack.id;
  return Game.Data.enemiesByWeakness[attackId];
};
