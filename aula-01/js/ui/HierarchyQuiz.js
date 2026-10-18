(function () {
  const builtEl = document.getElementById("hierarchy-built");
  const questionTextEl = document.getElementById("hierarchy-question-text");
  const optionsEl = document.getElementById("hierarchy-options");
  const feedbackEl = document.getElementById("hierarchy-feedback");
  const continueBtn = document.getElementById("btn-hierarchy-continue");

  function joinNames(names) {
    if (names.length <= 1) return names.join("");
    return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  }

  function buildQuestions() {
    const level0Id = "adventurer";
    const level1Ids = Game.getChildren(level0Id);
    const level2Ids = level1Ids.reduce(
      (acc, id) => acc.concat(Game.getChildren(id)),
      [],
    );

    const level0Name = Game.createCharacter(level0Id).name;
    const level1Names = level1Ids.map((id) => Game.createCharacter(id).name);
    const level2Names = level2Ids.map((id) => Game.createCharacter(id).name);

    const options = ["Classe base", "Classe derivada", "Ambas"];

    return [
      {
        text: `A classe ${level0Name} foi a primeira com a qual você jogou. Ela tem os atributos e ataques base para que você pudesse se especializar em outras classes. Baseado nisso, a classe ${level0Name} pode ser considerada uma classe:`,
        options,
        correctIndex: 0,
        revealLevel: 0,
        feedback: [
          `Correto! ${level0Name} não herda de ninguém — ela só fornece a base para as outras.`,
          `Você selecionou Classe derivada, mas ${level0Name} não herda de nenhuma outra classe, ela é a origem.`,
          `Você selecionou Ambas, mas ${level0Name} não deriva de nada, apenas serve de base.`,
        ],
      },
      {
        text: `As classes ${joinNames(level1Names)}, que se apresentaram como sua primeira opção de especialização, herdaram todos os atributos e métodos de ${level0Name} — e foram também a classe precedente antes de você poder se especializar em ${joinNames(level2Names)}. Baseado nisso, essas classes podem ser consideradas uma classe:`,
        options,
        correctIndex: 2,
        revealLevel: 1,
        feedback: [
          `Você selecionou Classe base, mas essas classes herdam de ${level0Name}, então não são a origem.`,
          `Você selecionou Classe derivada, mas elas também servem de base para ${joinNames(level2Names)}.`,
          `Correto! Elas herdam de ${level0Name} e ao mesmo tempo servem de base para ${joinNames(level2Names)}.`,
        ],
      },
      {
        text: `As classes ${joinNames(level2Names)}, que foram apresentadas como as últimas opções de especialização, herdam todos os atributos das classes precedentes (${joinNames(level1Names)}) e, consequentemente, também de ${level0Name}. Baseado nisso, essas classes podem ser consideradas uma classe:`,
        options,
        correctIndex: 1,
        revealLevel: 2,
        feedback: [
          `Você selecionou Classe base, mas essas classes herdam atributos de ${joinNames(level1Names)} e ${level0Name}.`,
          `Correto! Elas apenas herdam das classes anteriores, sem servir de base para mais nenhuma.`,
          `Você selecionou Ambas, mas elas não têm subclasses próprias — só herdam, não servem de base.`,
        ],
      },
    ];
  }

  Game.UI.runHierarchyQuiz = function runHierarchyQuiz(
    finalClassId,
    onComplete,
  ) {
    Game.UI.showScreen("screen-hierarchy");

    const playerChainIds = Game.createCharacter(finalClassId).lineage.map(
      (step) => step.id,
    );
    const level0Id = "adventurer";
    const level1Ids = Game.getChildren(level0Id);
    const questions = buildQuestions();

    builtEl.innerHTML = "";
    continueBtn.classList.add("hidden");
    feedbackEl.textContent = "";
    feedbackEl.className = "hierarchy-feedback";

    let index = 0;

    function buildCard(classId) {
      const character = Game.createCharacter(classId);
      const step = character.lineage[character.lineage.length - 1];
      const ownStep = Object.assign({}, step, {
        attacks: Game.getOwnAbilities(classId),
      });
      const cardEl = Game.UI.renderClassCard(ownStep);
      if (playerChainIds.includes(classId)) cardEl.classList.add("player-path");
      return cardEl;
    }

    function revealLevel(level) {
      if (builtEl.children.length > 0) {
        const connector = document.createElement("div");
        connector.className = "tree-connector";
        connector.textContent = "\u2193";
        builtEl.appendChild(connector);
      }

      const row = document.createElement("div");
      row.className = "tree-row";

      if (level === 0) {
        row.appendChild(buildCard(level0Id));
      } else if (level === 1) {
        level1Ids.forEach((id) => row.appendChild(buildCard(id)));
      } else {
        row.className = "tree-row tree-row-groups";
        level1Ids.forEach((parentId) => {
          const group = document.createElement("div");
          group.className = "tree-group";
          Game.getChildren(parentId).forEach((childId) =>
            group.appendChild(buildCard(childId)),
          );
          row.appendChild(group);
        });
      }

      builtEl.appendChild(row);
    }

    function renderQuestion() {
      const q = questions[index];
      feedbackEl.textContent = "";
      feedbackEl.className = "hierarchy-feedback";
      continueBtn.classList.add("hidden");
      questionTextEl.textContent = q.text;

      optionsEl.innerHTML = "";
      q.options.forEach((label, optionIndex) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn hierarchy-option-btn";
        btn.textContent = label;
        btn.addEventListener("click", () => handleAnswer(q, optionIndex, btn));
        optionsEl.appendChild(btn);
      });
    }

    function handleAnswer(q, optionIndex, chosenBtn) {
      const message = q.feedback[optionIndex];

      if (optionIndex === q.correctIndex) {
        feedbackEl.textContent = message;
        feedbackEl.className = "hierarchy-feedback success";
        Array.from(optionsEl.children).forEach((btn) => {
          btn.disabled = true;
        });
        chosenBtn.classList.add("correct-choice");
        revealLevel(q.revealLevel);

        const isLast = index === questions.length - 1;
        continueBtn.textContent = isLast
          ? "Ver Recompensa"
          : "Próxima Pergunta";
        continueBtn.classList.remove("hidden");
        continueBtn.onclick = () => {
          index += 1;
          if (index >= questions.length) {
            onComplete();
            return;
          }
          renderQuestion();
        };
      } else {
        feedbackEl.textContent = message;
        feedbackEl.className = "hierarchy-feedback error";
        chosenBtn.classList.add("wrong-choice");
      }
    }

    renderQuestion();
  };
})();
