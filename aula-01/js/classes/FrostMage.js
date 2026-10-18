Game.Classes.FrostMage = class FrostMage extends Game.Classes.Mage {
  constructor() {
    super();
    this.id = 'frost_mage';
    this.name = 'Mago do Gelo';
    this.title = 'Convocador do Inverno';
    this.hp = 78;
    this.attackPower = 18;
    this.image = 'assets/images/frost-mage.svg';
    this.attacks.push({ id: 'ice_shard', name: Game.Data.attackCatalog.ice_shard });
    this.recordLineage();
  }
};
