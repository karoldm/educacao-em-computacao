Game.GameState = class GameState {
  constructor() {
    this.round = 1;
    this.classId = 'adventurer';
    this.character = null;
    this.enemy = null;
  }

  reset() {
    this.round = 1;
    this.classId = 'adventurer';
    this.character = null;
    this.enemy = null;
  }

  advanceRound() {
    this.round += 1;
  }
};
