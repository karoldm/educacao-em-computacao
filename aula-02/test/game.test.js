const t = require('node:test'), assert = require('node:assert/strict'), E = require('../public/engine.js'), Game = require('../public/game.js');
const N = E.W * E.H, rgb = new Uint8Array(N * 3).map((_, i) => ((i / 3 | 0) * 7) % 256), img = E.grayFromRgb(rgb);
const lcg = s => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; // aleatório repetível
const fresh = () => Game.newState(img, lcg(7)), pick = (st, r) => E.equivalents(img, E.apply(img, st.mys[r]), st.mys[r].length)[0]; // uma cadeia que acerta a rodada r

t('estado novo: 3 rodadas (1, 2, 3 filtros), alvo diferente da original, serializa em JSON', () => {
  const st = fresh(); assert.equal(st.stage, 1); assert.deepEqual(st.mys.map(m => m.length), [1, 2, 3]);
  for (const m of st.mys) assert.ok(!E.same(E.apply(img, m), img));
  const back = JSON.parse(JSON.stringify(st)); assert.ok(E.same(Game.image(back), img)); assert.equal(Game.gview(back, 0).len, 1); // vai e volta do localStorage
  assert.deepEqual(Game.STAGES, ['Entrada', 'Aplicar', 'Analisar', 'Feedback', 'Avaliar', 'Feedback', 'Criar', 'Resumo']);
});
t('Continuar só habilita ao concluir cada etapa de atividade', () => {
  const st = fresh();
  assert.equal(Game.canNext(st), false); assert.throws(() => Game.next(st, 0), /Aplique pelo menos um filtro/); st.applied = 1; assert.equal(Game.canNext(st), true); Game.next(st, 1000); assert.equal(st.stage, 2); assert.equal(st.game.t0, 1000); // o tempo da 1ª rodada começa ao entrar
  assert.throws(() => Game.next(st, 0), /3 rodadas/);
  st.game.res = [{ pts: 0 }, { pts: 0 }, { pts: 0 }]; Game.next(st, 0); assert.equal(st.stage, 3); assert.equal(Game.canNext(st), true); Game.next(st, 0); // 3 → 4
  assert.equal(st.stage, 4); assert.equal(Game.canNext(st), false); assert.throws(() => Game.next(st, 0), /Envie suas respostas/);
  st.quizAns = ['a', 'a', 'a', 'a']; Game.next(st, 0); Game.next(st, 0); assert.equal(st.stage, 6); assert.throws(() => Game.next(st, 0), /Execute pelo menos um filtro/);
  st.created = 1; Game.next(st, 0); assert.equal(st.stage, 7); assert.equal(Game.canNext(st), false); assert.throws(() => Game.next(st, 0), /Não há próxima etapa/);
});
t('minijogo: pontos, erros, tempo, rodadas e pular', () => {
  const st = fresh(); st.applied = 1; Game.next(st, 1000); let v = Game.gview(st, 1000);
  assert.equal(v.round, 0); assert.equal(v.len, 1); assert.equal(v.reveal, null); assert.ok(v.target); // a solução não aparece durante o jogo
  const wrong = Object.keys(E.F).find(n => !E.same(E.apply(img, [n]), v.target)), w = Game.guess(st, [wrong], 2000);
  assert.equal(w.ok, false); assert.ok(w.match >= 0 && w.match < 1); assert.equal(Game.gview(st, 2000).wrong, 1);
  const r1 = Game.guess(st, pick(st, 0), 8000); assert.equal(r1.ok, true); assert.equal(r1.pts, 100 - 10 - 2); assert.equal(r1.secs, 7); // 100 − 10 (1 erro) − 7 s/3
  assert.equal(st.game.t0, null); v = Game.gview(st, 9000); assert.equal(v.round, 1); assert.equal(v.len, 2); assert.equal(v.elapsed, 0); // a próxima rodada só conta quando abrir
  assert.throws(() => Game.guess(st, ['inverter'], 9000), /exatamente 2/); Game.startRound(st, 10000); assert.equal(st.game.t0, 10000);
  const r2 = Game.guess(st, pick(st, 1), 10000); assert.equal(r2.pts, 150); // sem erro e sem demora
  const slow = fresh(); slow.applied = 1; Game.next(slow, 0); assert.equal(Game.guess(slow, pick(slow, 0), 1e9).pts, 20); // mínimo = 20% da base
  const sk = fresh(); sk.applied = 1; Game.next(sk, 0); Game.skip(sk, 5000); Game.skip(sk, 6000); Game.skip(sk, 7000);
  v = Game.gview(sk, 8000); assert.ok(v.done); assert.equal(v.score, 0); assert.equal(v.target, null); assert.equal(sk.game.t0, null); assert.throws(() => Game.skip(sk, 9000), /terminou/); assert.throws(() => Game.guess(sk, ['inverter'], 9000), /terminou/);
});
t('Feedback do minijogo só revela a solução depois de sair da etapa', () => {
  const st = fresh(); st.applied = 1; Game.next(st, 0); for (let i = 0; i < 3; i++) Game.skip(st, 0);
  assert.equal(Game.gview(st, 0).reveal, null); Game.next(st, 0); const v = Game.gview(st, 0); assert.equal(v.reveal.length, 3); assert.throws(() => Game.guess(st, ['inverter'], 0), /não está aberto/);
});
t('Avaliar: sem gabarito nas perguntas, 3 opções, uma resposta só, feedback individual', () => {
  const qs = Game.quizQuestions(); assert.equal(qs.length, 4); assert.ok(qs.every(q => q.a && q.b && q.c && !('ok' in q) && !('why' in q)));
  const st = fresh(); assert.throws(() => Game.submitQuiz(st, ['a', 'a', 'a', 'a']), /não está aberto/); st.stage = 4;
  assert.throws(() => Game.submitQuiz(st, ['a', 'a', 'a']), /4 questões/); assert.throws(() => Game.submitQuiz(st, ['a', 'a', 'a', 'x']), /4 questões/);
  assert.equal(Game.quizFeedback(st).answered, false); assert.equal(Game.quizFeedback(st).score, 0);
  Game.submitQuiz(st, ['b', 'c', 'a', 'b']); assert.throws(() => Game.submitQuiz(st, ['b', 'c', 'a', 'b']), /já enviou/);
  const f = Game.quizFeedback(st); assert.equal(f.score, 4); assert.equal(f.items[0].mine, 'b'); assert.equal(f.items[0].correct, 'b'); assert.ok(f.items.every(i => i.why && i.ok));
  const bad = fresh(); bad.stage = 4; Game.submitQuiz(bad, ['a', 'a', 'b', 'a']); assert.equal(Game.quizFeedback(bad).score, 0);
});
t('Criar: executa os blocos (incl. Borda e Suavizar) e rejeita blocos inválidos', () => {
  const st = fresh(); const r = Game.runBlocks(st, [{ t: 'blur' }, { t: 'edge' }]);
  assert.equal(st.created, 1); assert.equal(st.blocks.length, 2); assert.equal(r.invalid, 0); assert.ok(E.same(r.out, E.run(img, [{ t: 'blur' }, { t: 'edge' }]).out));
  const st2 = fresh(); assert.throws(() => Game.runBlocks(st2, [{ t: 'thr', x: 999 }]), /Bloco 1/); assert.equal(st2.created, 0); assert.throws(() => Game.runBlocks(st2, []), /ao menos um bloco/);
});
