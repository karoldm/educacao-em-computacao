const t = require('node:test'), assert = require('node:assert/strict'), E = require('../public/engine.js'), Game = require('../public/game.js');
const N = E.W * E.H, rgb = new Uint8Array(N * 3).map((_, i) => ((i / 3 | 0) * 7 + ((i / 3 | 0) % 96) * 3) % 256), img = E.grayFromRgb(rgb);
const fresh = () => Game.newState(img), chainOf = r => Game.ROUNDS[r].chain, pick = r => E.equivalents(img, E.apply(img, chainOf(r)), chainOf(r).length)[0]; // uma cadeia que acerta a rodada r

t('rodadas FIXAS: iguais para todos os alunos (sem sorteio), com Suavizar e Borda', () => {
  assert.deepEqual(Game.ROUNDS.map(r => r.chain), [['borda'], ['suavizar', 'inverter'], ['suavizar', 'borda', 'inverter']]);
  assert.deepEqual(Game.ROUNDS.map(r => r.len), [1, 2, 3]); for (const r of Game.ROUNDS) assert.equal(r.chain.length, r.len);
  const other = E.grayFromRgb(new Uint8Array(N * 3).map((_, i) => (i * 13) % 251)), a = fresh(), b = Game.newState(other); // imagens diferentes
  assert.deepEqual(Game.gview({ ...a, stage: 3 }, 0).reveal, Game.gview({ ...b, stage: 3 }, 0).reveal); // mesma solução para a turma toda
  assert.ok(!E.same(Game.gview(a, 0).target, Game.gview(b, 0).target)); // o alvo muda só porque cada um usa a própria imagem
  for (const r of Game.ROUNDS) assert.ok(!E.same(E.apply(img, r.chain), img)); // o alvo nunca é a imagem original
  assert.deepEqual(Game.quizQuestions(), Game.quizQuestions()); // perguntas também fixas
});
t('estado novo serializa em JSON e tem versão', () => {
  const st = fresh(); assert.equal(st.stage, 1); assert.equal(st.v, Game.VERSION); assert.ok(!('mys' in st)); // nada sorteado é guardado
  const back = JSON.parse(JSON.stringify(st)); assert.ok(E.same(Game.image(back), img)); assert.equal(Game.gview(back, 0).len, 1);
  assert.deepEqual(Game.STAGES, ['Entrada', 'Aplicar', 'Analisar', 'Feedback', 'Avaliar', 'Feedback', 'Criar', 'Resumo']);
});
t('Continuar só habilita ao concluir cada etapa de atividade', () => {
  const st = fresh();
  assert.equal(Game.canNext(st), false); assert.throws(() => Game.next(st, 0), /Aplique pelo menos um filtro/); st.applied = 1; assert.equal(Game.canNext(st), true); Game.next(st, 1000); assert.equal(st.stage, 2); assert.equal(st.game.t0, 1000);
  assert.throws(() => Game.next(st, 0), /3 rodadas/);
  st.game.res = [{ pts: 0 }, { pts: 0 }, { pts: 0 }]; Game.next(st, 0); assert.equal(st.stage, 3); assert.equal(Game.canNext(st), true); Game.next(st, 0);
  assert.equal(st.stage, 4); assert.equal(Game.canNext(st), false); assert.throws(() => Game.next(st, 0), /Envie suas respostas/);
  st.quizAns = ['a', 'a', 'a', 'a', 'a', 'a', 'a']; Game.next(st, 0); Game.next(st, 0); assert.equal(st.stage, 6); assert.throws(() => Game.next(st, 0), /Execute pelo menos um filtro/);
  st.created = 1; Game.next(st, 0); assert.equal(st.stage, 7); assert.equal(Game.canNext(st), false); assert.throws(() => Game.next(st, 0), /Não há próxima etapa/);
});
t('minijogo: pontos, erros, tempo, rodadas e pular', () => {
  const st = fresh(); st.applied = 1; Game.next(st, 1000); let v = Game.gview(st, 1000);
  assert.equal(v.round, 0); assert.equal(v.len, 1); assert.equal(v.reveal, null); assert.ok(v.target);
  const wrong = Object.keys(E.F).find(n => !E.same(E.apply(img, [n]), v.target)), w = Game.guess(st, [wrong], 2000);
  assert.equal(w.ok, false); assert.ok(w.match >= 0 && w.match < 1); assert.equal(Game.gview(st, 2000).wrong, 1);
  const r1 = Game.guess(st, pick(0), 8000); assert.equal(r1.ok, true); assert.deepEqual(r1.expected, ['borda']); assert.equal(r1.pts, 100 - 10 - 2); assert.equal(r1.secs, 7);
  assert.equal(st.game.t0, null); v = Game.gview(st, 9000); assert.equal(v.round, 1); assert.equal(v.len, 2); assert.equal(v.elapsed, 0);
  assert.throws(() => Game.guess(st, ['inverter'], 9000), /exatamente 2/); Game.startRound(st, 10000); assert.equal(st.game.t0, 10000);
  const r2 = Game.guess(st, ['inverter', 'suavizar'], 10000); assert.equal(r2.ok, true); assert.equal(r2.exact, false); assert.equal(r2.pts, 150); // Inverter→Suavizar dá o mesmo resultado: vale como equivalente
  const slow = fresh(); slow.applied = 1; Game.next(slow, 0); assert.equal(Game.guess(slow, pick(0), 1e9).pts, 20); // mínimo = 20% da base
  const sk = fresh(); sk.applied = 1; Game.next(sk, 0); Game.skip(sk, 5000); Game.skip(sk, 6000); Game.skip(sk, 7000);
  v = Game.gview(sk, 8000); assert.ok(v.done); assert.equal(v.score, 0); assert.equal(v.target, null); assert.equal(sk.game.t0, null); assert.throws(() => Game.skip(sk, 9000), /terminou/); assert.throws(() => Game.guess(sk, ['inverter'], 9000), /terminou/);
  const exact = fresh(); exact.applied = 1; Game.next(exact, 0); Game.skip(exact, 0); Game.skip(exact, 0); assert.equal(Game.guess(exact, ['suavizar', 'borda', 'inverter'], 0).exact, true); // rodada 3
});
t('Feedback do minijogo só revela a solução depois de sair da etapa', () => {
  const st = fresh(); st.applied = 1; Game.next(st, 0); for (let i = 0; i < 3; i++) Game.skip(st, 0);
  assert.equal(Game.gview(st, 0).reveal, null); Game.next(st, 0); const v = Game.gview(st, 0); assert.deepEqual(v.reveal, Game.ROUNDS.map(r => r.chain)); assert.throws(() => Game.guess(st, ['inverter'], 0), /não está aberto/);
});
t('Avaliar: 7 perguntas fixas, 3 opções, sem gabarito, uma resposta só, feedback individual', () => {
  const qs = Game.quizQuestions(); assert.equal(qs.length, 7); assert.ok(qs.every(q => q && q.a && q.b && q.c && !('ok' in q) && !('why' in q)));
  const txt = JSON.stringify(qs); assert.match(txt, /Suavizar/); assert.match(txt, /Borda/); assert.match(txt, /primeiro pixel/); // filtros novos e casos de margem
  const st = fresh(); assert.throws(() => Game.submitQuiz(st, ['a', 'a', 'a', 'a', 'a', 'a', 'a']), /não está aberto/); st.stage = 4;
  assert.throws(() => Game.submitQuiz(st, ['a', 'a', 'a']), /7 questões/); assert.throws(() => Game.submitQuiz(st, ['a', 'a', 'a', 'a', 'a', 'a', 'x']), /7 questões/);
  assert.equal(Game.quizFeedback(st).answered, false); assert.equal(Game.quizFeedback(st).score, 0);
  const good = ['b', 'c', 'a', 'b', 'c', 'a', 'b']; Game.submitQuiz(st, good); assert.throws(() => Game.submitQuiz(st, good), /já enviou/);
  const f = Game.quizFeedback(st); assert.equal(f.score, 7); assert.equal(f.items[0].mine, 'b'); assert.ok(f.items.every(i => i.why && i.ok && i.a && i.b && i.c));
  const bad = fresh(); bad.stage = 4; Game.submitQuiz(bad, ['a', 'a', 'b', 'a', 'a', 'b', 'a']); assert.equal(Game.quizFeedback(bad).score, 0);
  const last = f.items[6]; assert.match(last.why, /pixel mais próximo/); assert.match(last.why, /canto/); // explica o caso do primeiro pixel
});
t('Criar: executa os blocos (incl. Borda e Suavizar) e rejeita blocos inválidos', () => {
  const st = fresh(); const r = Game.runBlocks(st, [{ t: 'blur' }, { t: 'edge' }]);
  assert.equal(st.created, 1); assert.equal(st.blocks.length, 2); assert.equal(r.invalid, 0); assert.ok(E.same(r.out, E.run(img, [{ t: 'blur' }, { t: 'edge' }]).out));
  const st2 = fresh(); assert.throws(() => Game.runBlocks(st2, [{ t: 'thr', x: 999 }]), /Bloco 1/); assert.equal(st2.created, 0); assert.throws(() => Game.runBlocks(st2, []), /ao menos um bloco/);
});
