Game.Enemy = class Enemy {
  constructor({ id, name, title, image, hp, weaknessAttackId, defeatFlavor }) {
    this.id = id;
    this.name = name;
    this.title = title;
    this.image = image;
    this.hp = hp;
    this.weaknessAttackId = weaknessAttackId;
    this.defeatFlavor = defeatFlavor;
  }

  isDefeatedBy(attackId) {
    return attackId === this.weaknessAttackId;
  }
};
