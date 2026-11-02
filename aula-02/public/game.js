// Regras do jogo, do Avaliar e do progresso de cada aluno. Roda só no navegador (site estático, sem servidor).
// O estado é um objeto simples (JSON) que a interface guarda no localStorage.
(function (root) {
  const E = typeof module !== "undefined" ? require("./engine.js") : root.E;
  // Etapas (índice): 0 Entrada · 1 Aplicar · 2 Analisar (minijogo) · 3 Feedback · 4 Avaliar · 5 Feedback · 6 Criar · 7 Resumo
  const STAGES = [
      "Entrada",
      "Aplicar",
      "Analisar",
      "Feedback",
      "Avaliar",
      "Feedback",
      "Criar",
      "Resumo",
    ],
    LAST = STAGES.length - 1;
  // Minijogo "Filtro Misterioso": 3 rodadas FIXAS (iguais para todos os alunos, sem sorteio), com cadeias cada vez maiores.
  // Cada aluno as aplica na própria imagem; por isso o alvo muda, mas o filtro misterioso é o mesmo para a turma toda.
  const ROUNDS = [
    { len: 1, base: 100, chain: ["borda"] },
    { len: 2, base: 150, chain: ["suavizar", "inverter"] },
    { len: 3, base: 200, chain: ["suavizar", "borda", "inverter"] },
  ];
  const VERSION = 2; // muda quando o formato do progresso salvo muda (progresso antigo é descartado)
  const QUIZ = [
    {
      goal: "Clarear a imagem em 40, sem gerar valores acima de 255.",
      a: ["p = p + 40"],
      b: ["p = p + 40", "SE p > 255:", "    p = 255"],
      c: ["SE p > 255:", "    p = 255", "p = p + 40"],
      ok: "b",
      why: "Primeiro soma, depois limita: 230 + 40 = 270 vira 255. Em A não há limite (270 é inválido) e em C o limite vem antes da soma, então 230 ainda chega a 270.",
    },
    {
      goal: "Escurecer a imagem em 40, sem gerar valores abaixo de 0.",
      a: ["p = p - 40"],
      b: ["SE p < 0:", "    p = 0", "p = p - 40"],
      c: ["p = p - 40", "SE p < 0:", "    p = 0"],
      ok: "c",
      why: "Primeiro subtrai, depois limita: 20 − 40 = −20 vira 0. Em A não há limite e em B o limite vem antes da subtração, então 20 ainda chega a −20.",
    },
    {
      goal: "Inverter: o preto (0) vira branco (255) e o branco vira preto.",
      a: ["p = 255 - p"],
      b: ["p = p - 255"],
      c: ["p = 255 + p"],
      ok: "a",
      why: "255 − p leva 0 → 255 e 255 → 0. Em B o resultado fica entre −255 e 0; em C, entre 255 e 510: ambos saem de 0–255.",
    },
    {
      goal: "Preto e branco: pixels escuros (abaixo de 128) viram preto, os demais viram branco.",
      a: ["SE p < 128:", "    p = 255", "SENÃO:", "    p = 0"],
      b: ["SE p < 128:", "    p = 0", "SENÃO:", "    p = 255"],
      c: ["SE p > 128:", "    p = 0", "SENÃO:", "    p = 255"],
      ok: "b",
      why: "Com limiar 128: 127 → 0 (preto) e 128 → 255 (branco). A inverte os papéis; C pinta de preto os pixels claros (e o 128 vira branco).",
    },
    {
      goal: "Suavizar: trocar cada pixel pela média dele e dos 8 vizinhos (janela 3×3).",
      a: ["soma = p + (soma dos 8 vizinhos)", "p = soma / 8"],
      b: ["soma = soma dos 8 vizinhos", "p = soma / 9"],
      c: ["soma = p + (soma dos 8 vizinhos)", "p = soma / 9"],
      ok: "c",
      why: "A janela 3×3 tem 9 pixels (o próprio pixel e 8 vizinhos): soma-se os 9 e divide-se por 9. Com 9 pixels iguais a 90, C dá 810 / 9 = 90 (a média certa); A dá 810 / 8 ≈ 101 (clareia a imagem) e B esquece o próprio pixel e dá 720 / 9 = 80 (escurece).",
    },

    {
      goal: "Borda: destacar contornos (onde há grande diferença entre vizinhos); áreas lisas devem ficar pretas (0).",
      a: [
        "soma = (p * 4) - E - D - C - B",
        "p = ABSOLUTO(soma)",
        "SE p > 255 ENTÃO:",
        "    p = 255",
      ],
      b: ["soma = (p * 4) - E - D - C - B", "SE p > 255 ENTÃO:", "    p = 255"],
      c: ["soma = (p * 4) - E - D - C - B", "p = ABSOLUTO(soma)"],
      ok: "a",
      why: "A alternativa A é a correta pois calcula a variação com o Laplaciano, aplica o ABSOLUTO para que resultados negativos virem bordas claras e limita o teto em 255. A alternativa B erra ao omitir o módulo (resultados negativos fazem a borda sumir). A alternativa C erra ao não limitar o valor máximo em 255 (estouro de limite).",
    },
  ];

  const newState = (img) => ({
    v: VERSION,
    stage: 1,
    img: E.toB64(img),
    game: { res: [], wrong: 0, t0: null },
    quizAns: null,
    applied: 0,
    created: 0,
    blocks: [],
  });
  const image = (st) => E.fromB64(st.img);
  const total = (st) => st.game.res.reduce((a, x) => a + x.pts, 0);
  // Cada etapa de atividade exige ser concluída para continuar; os feedbacks são livres.
  const RULE = {
    1: (st) => st.applied >= 1,
    2: (st) => st.game.res.length >= ROUNDS.length,
    4: (st) => !!st.quizAns,
    6: (st) => st.created >= 1,
  };
  const HINT = {
    1: "Aplique pelo menos um filtro antes de continuar.",
    2: "Termine as 3 rodadas (acertando ou pulando) antes de continuar.",
    4: "Envie suas respostas antes de continuar.",
    6: "Execute pelo menos um filtro antes de continuar.",
  };
  const canNext = (st) =>
    st.stage < LAST && (RULE[st.stage] ? RULE[st.stage](st) : true);
  const startRound = (st, now) => {
    if (
      st.stage === 2 &&
      st.game.res.length < ROUNDS.length &&
      st.game.t0 == null
    )
      st.game.t0 = now;
  };
  const next = (st, now) => {
    if (!canNext(st))
      throw new Error(HINT[st.stage] || "Não há próxima etapa.");
    st.stage++;
    startRound(st, now);
    return st;
  };
  const gview = (st, now) => {
    // visão do jogo: o alvo só vale para a rodada atual; a solução só aparece no Feedback
    const g = st.game,
      r = g.res.length,
      live = r < ROUNDS.length;
    return {
      round: r,
      total: ROUNDS.length,
      done: !live,
      len: live ? ROUNDS[r].len : 0,
      target: live ? E.apply(image(st), ROUNDS[r].chain) : null,
      wrong: g.wrong,
      elapsed: live && g.t0 != null ? now - g.t0 : 0,
      score: total(st),
      rounds: g.res.map((x) => ({
        pts: x.pts,
        secs: x.secs,
        wrong: x.wrong,
        solved: x.solved,
      })),
      reveal: st.stage >= 3 ? ROUNDS.map((x) => x.chain.slice()) : null,
    };
  };
  const guess = (st, chain, now) => {
    if (st.stage !== 2) throw new Error("O minijogo não está aberto.");
    const g = st.game,
      r = g.res.length;
    if (r >= ROUNDS.length) throw new Error("Você já terminou o jogo.");
    if (
      !Array.isArray(chain) ||
      chain.length !== ROUNDS[r].len ||
      chain.some((n) => !E.F[n])
    )
      throw new Error(
        "Use exatamente " + ROUNDS[r].len + " filtro(s) nesta rodada.",
      );
    if (g.t0 == null) g.t0 = now;
    const img = image(st),
      out = E.apply(img, chain),
      tg = E.apply(img, ROUNDS[r].chain);
    if (E.same(out, tg)) {
      // vale o RESULTADO igual ao alvo (sequências equivalentes contam)
      const secs = Math.floor((now - g.t0) / 1000),
        base = ROUNDS[r].base,
        pts = Math.max(
          Math.round(base * 0.2),
          base - 10 * g.wrong - Math.floor(secs / 3),
        );
      g.res.push({ pts, secs, wrong: g.wrong, solved: 1 });
      g.wrong = 0;
      g.t0 = null;
      return {
        ok: true,
        pts,
        secs,
        expected: ROUNDS[r].chain.slice(),
        exact: chain.join() === ROUNDS[r].chain.join(),
      };
    }
    g.wrong++;
    return {
      ok: false,
      wrong: g.wrong,
      match: out.d.reduce((a, v, i) => a + (v === tg.d[i]), 0) / out.d.length,
    };
  };
  const skip = (st, now) => {
    // pular vale 0 e abre a próxima rodada na hora
    if (st.stage !== 2) throw new Error("O minijogo não está aberto.");
    const g = st.game;
    if (g.res.length >= ROUNDS.length)
      throw new Error("Você já terminou o jogo.");
    g.res.push({
      pts: 0,
      secs: g.t0 != null ? Math.floor((now - g.t0) / 1000) : 0,
      wrong: g.wrong,
      solved: 0,
    });
    g.wrong = 0;
    g.t0 = null;
    startRound(st, now);
    return st;
  };
  const quizQuestions = () =>
    QUIZ.map(({ goal, a, b, c }) => ({ goal, a, b, c })); // sem o gabarito
  const submitQuiz = (st, ans) => {
    if (st.stage !== 4) throw new Error("O Avaliar não está aberto.");
    if (st.quizAns) throw new Error("Você já enviou suas respostas.");
    if (
      !Array.isArray(ans) ||
      ans.length !== QUIZ.length ||
      ans.some((a) => !["a", "b", "c"].includes(a))
    )
      throw new Error("Responda as " + QUIZ.length + " questões.");
    st.quizAns = ans.slice();
    return st;
  };
  const quizFeedback = (st) => {
    // feedback individual: as respostas do aluno com o gabarito comentado
    const items = QUIZ.map((q, i) => {
      const mine = st.quizAns ? st.quizAns[i] : null;
      return {
        goal: q.goal,
        a: q.a,
        b: q.b,
        c: q.c,
        mine,
        correct: q.ok,
        ok: mine === q.ok,
        why: q.why,
      };
    });
    return {
      score: items.filter((i) => i.ok).length,
      answered: !!st.quizAns,
      items,
    };
  };
  const runBlocks = (st, blocks) => {
    const r = E.run(image(st), blocks);
    st.blocks = blocks.map((b) => ({ ...b }));
    st.created = 1;
    return r;
  }; // lança erro se houver bloco inválido
  const Game = {
    VERSION,
    STAGES,
    LAST,
    ROUNDS,
    HINT,
    newState,
    image,
    canNext,
    next,
    startRound,
    gview,
    guess,
    skip,
    quizQuestions,
    submitQuiz,
    quizFeedback,
    runBlocks,
  };
  if (typeof module !== "undefined") module.exports = Game;
  else root.Game = Game;
})(this);
