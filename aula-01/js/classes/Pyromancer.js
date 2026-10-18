Game.Classes.Pyromancer = class Pyromancer extends Game.Classes.Mage {
  constructor() {
    super();
    this.id = 'pyromancer';
    this.name = 'Piromante';
    this.title = 'Portador das Chamas';
    this.hp = 75;
    this.attackPower = 20;
    this.image = 'assets/images/pyromancer.svg';
    this.attacks.push({ id: 'fireball', name: Game.Data.attackCatalog.fireball });
    this.recordLineage();
  }
};
