Game.Classes.Warrior = class Warrior extends Game.Classes.Adventurer {
  constructor() {
    super();
    this.id = 'warrior';
    this.name = 'Guerreiro';
    this.title = 'Mestre da Lâmina';
    this.hp = 130;
    this.attackPower = 16;
    this.image = 'assets/images/warrior.svg';
    this.attacks.push({ id: 'power_slash', name: Game.Data.attackCatalog.power_slash });
    this.recordLineage();
  }
};
