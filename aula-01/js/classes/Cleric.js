Game.Classes.Cleric = class Cleric extends Game.Classes.Adventurer {
  constructor() {
    super();
    this.id = 'cleric';
    this.name = 'Clérigo';
    this.title = 'Guardião da Luz';
    this.hp = 110;
    this.attackPower = 12;
    this.image = 'assets/images/cleric.svg';
    this.attacks.push({ id: 'blessed_strike', name: Game.Data.attackCatalog.blessed_strike });
    this.recordLineage();
  }
};
