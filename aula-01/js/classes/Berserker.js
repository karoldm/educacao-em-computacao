Game.Classes.Berserker = class Berserker extends Game.Classes.Warrior {
  constructor() {
    super();
    this.id = 'berserker';
    this.name = 'Berserker';
    this.title = 'Voz da Fúria';
    this.hp = 140;
    this.attackPower = 22;
    this.image = 'assets/images/berserker.svg';
    this.attacks.push({ id: 'rage_strike', name: Game.Data.attackCatalog.rage_strike });
    this.recordLineage();
  }
};
