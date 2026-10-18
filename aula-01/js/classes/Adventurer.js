Game.Classes.Adventurer = class Adventurer {
  constructor() {
    this.id = 'adventurer';
    this.name = 'Aventureiro';
    this.title = 'A Classe Base';
    this.hp = 100;
    this.attackPower = 10;
    this.image = 'assets/images/adventurer.svg';
    this.attacks = [
      { id: 'basic_strike', name: Game.Data.attackCatalog.basic_strike }
    ];
    this.lineage = [];
    this.recordLineage();
  }

  recordLineage() {
    this.lineage.push({
      id: this.id,
      name: this.name,
      image: this.image,
      attacks: [...this.attacks]
    });
  }

  get signatureAttack() {
    return this.attacks[this.attacks.length - 1];
  }
};
