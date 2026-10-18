Game.Classes.Knight = class Knight extends Game.Classes.Warrior {
  constructor() {
    super();
    this.id = 'knight';
    this.name = 'Cavaleiro';
    this.title = 'Escudo do Reino';
    this.hp = 150;
    this.attackPower = 15;
    this.image = 'assets/images/knight.svg';
    this.attacks.push({ id: 'shield_bash', name: Game.Data.attackCatalog.shield_bash });
    this.recordLineage();
  }
};
