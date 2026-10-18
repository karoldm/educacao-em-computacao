Game.Classes.Priest = class Priest extends Game.Classes.Cleric {
  constructor() {
    super();
    this.id = 'priest';
    this.name = 'Sacerdote';
    this.title = 'Voz do Divino';
    this.hp = 105;
    this.attackPower = 17;
    this.image = 'assets/images/priest.svg';
    this.attacks.push({ id: 'holy_smite', name: Game.Data.attackCatalog.holy_smite });
    this.recordLineage();
  }
};
