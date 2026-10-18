(function () {
  const state = new Game.GameState();
  const startBtn = document.getElementById("btn-start");
  const dialogues = Game.Data.dialogues;

  function goToDefeat() {
    Game.UI.playDialogue(dialogues.defeat, () => {
      state.reset();
      Game.UI.showScreen("screen-intro");
    });
  }

  function goToFinalVictory() {
    Game.UI.showResult({
      title: Game.Data.rewardTitle,
      buttonLabel: "Jogar Novamente",
      onContinue: () => {
        state.reset();
        Game.UI.showScreen("screen-intro");
      },
    });
  }

  function goToRoundReward() {
    Game.UI.showResult({
      title: Game.Data.rewardTitle,
      text: Game.Data.rewardText,
      link: "https://www.kufunda.net/publicdocs/Introdu%C3%A7%C3%A3o%20%C3%80%20Programa%C3%A7%C3%A3o%20orientada%20a%20objetos%20Com%20C++%20(Antonio%20Mendes%20(Auth.))%20(z-lib.org).pdf",
      linkText: "Continue sua jornada... - página 235",
      buttonLabel: "Próxima Fase",
      onContinue: () => {
        goToHierarchyPuzzle();
      },
    });
  }

  function startBattle(round) {
    Game.UI.runBattle(state.character, state.enemy, (victorious) =>
      resolveRound(victorious, round),
    );
  }

  function startRound(round) {
    state.round = round;
    state.enemy =
      round === 1
        ? Game.Data.enemiesByWeakness.basic_strike
        : Game.pickEnemyForChildrenOf(state.classId);

    const introLines = {
      1: dialogues.round1Intro,
      2: dialogues.round2Intro,
      3: dialogues.round3Intro,
    }[round];

    Game.UI.playDialogue(introLines, () => {
      Game.UI.showEnemyReveal(state.enemy, () => {
        if (round === 1) {
          state.character = Game.createCharacter(state.classId);
          startBattle(round);
          return;
        }

        Game.UI.runCharacterBuilder(state.classId, (chosenId) => {
          state.classId = chosenId;
          state.character = Game.createCharacter(chosenId);
          startBattle(round);
        });
      });
    });
  }

  function goToHierarchyPuzzle() {
    Game.UI.playDialogue(dialogues.hierarchyIntro, () => {
      Game.UI.runHierarchyQuiz(state.classId, () => {
        Game.UI.playDialogue(dialogues.hierarchyVictory, () => {
          goToFinalVictory();
        });
      });
    });
  }

  function resolveRound(victorious, round) {
    if (!victorious) {
      goToDefeat();
      return;
    }

    const victoryLines = {
      1: dialogues.round1Victory,
      2: dialogues.round2Victory,
      3: dialogues.round3Victory,
    }[round];

    Game.UI.playDialogue(victoryLines, () => {
      if (round === 3) {
        goToRoundReward();
        return;
      }
      startRound(round + 1);
    });
  }

  startBtn.addEventListener("click", () => {
    state.reset();
    Game.UI.playDialogue(dialogues.intro, () => startRound(1));
  });

  Game.UI.showScreen("screen-intro");
})();
