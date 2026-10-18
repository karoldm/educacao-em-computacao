Game.Classes.Druid = class Druid extends Game.Classes.Cleric {
  constructor() {
    super();
    this.id = 'druid';
    this.name = 'Druida';
    this.title = 'Guardião das Terras Selvagens';
    this.hp = 115;
    this.attackPower = 16;
    this.image = 'assets/images/druid.svg';
    this.attacks.push({ id: 'natures_wrath', name: Game.Data.attackCatalog.natures_wrath });
    this.recordLineage();
  }
};
