Game.Classes.registry = {
  adventurer: { ctor: Game.Classes.Adventurer, parent: null, children: ['mage', 'warrior', 'cleric'] },
  mage: { ctor: Game.Classes.Mage, parent: 'adventurer', children: ['pyromancer', 'frost_mage'] },
  warrior: { ctor: Game.Classes.Warrior, parent: 'adventurer', children: ['berserker', 'knight'] },
  cleric: { ctor: Game.Classes.Cleric, parent: 'adventurer', children: ['priest', 'druid'] },
  pyromancer: { ctor: Game.Classes.Pyromancer, parent: 'mage', children: [] },
  frost_mage: { ctor: Game.Classes.FrostMage, parent: 'mage', children: [] },
  berserker: { ctor: Game.Classes.Berserker, parent: 'warrior', children: [] },
  knight: { ctor: Game.Classes.Knight, parent: 'warrior', children: [] },
  priest: { ctor: Game.Classes.Priest, parent: 'cleric', children: [] },
  druid: { ctor: Game.Classes.Druid, parent: 'cleric', children: [] }
};

Game.createCharacter = function createCharacter(classId) {
  const entry = Game.Classes.registry[classId];
  if (!entry) throw new Error(`Unknown class id: ${classId}`);
  return new entry.ctor();
};

Game.getChildren = function getChildren(classId) {
  return Game.Classes.registry[classId].children;
};

Game.getParent = function getParent(classId) {
  return Game.Classes.registry[classId].parent;
};

Game.getOwnAbilities = function getOwnAbilities(classId) {
  const character = Game.createCharacter(classId);
  const parentId = Game.getParent(classId);
  if (!parentId) return character.attacks;
  const parentAttackIds = Game.createCharacter(parentId).attacks.map((a) => a.id);
  return character.attacks.filter((a) => !parentAttackIds.includes(a.id));
};
