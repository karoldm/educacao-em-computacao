Game.Classes.Mage = class Mage extends Game.Classes.Adventurer {
  constructor() {
    super();
    this.id = 'mage';
    this.name = 'Mago';
    this.title = 'Tecelão do Poder Arcano';
    this.hp = 80;
    this.attackPower = 14;
    this.image = 'assets/images/mage.svg';
    this.attacks.push({ id: 'arcane_bolt', name: Game.Data.attackCatalog.arcane_bolt });
    this.recordLineage();
  }
};
