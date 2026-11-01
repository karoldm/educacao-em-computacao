const t = require('node:test'), assert = require('node:assert/strict'), E = require('../public/engine.js'), { createServer } = require('../server.js');
const N = E.W * E.H, mk = f => { const u = new Uint8Array(N * 3); for (let i = 0; i < N; i++) u.set(f(i), i * 3); return u; };
const grayRgb = mk(i => { const v = (i * 7) % 256; return [v, v, v]; }), img = E.grayFromRgb(grayRgb), b64 = u => Buffer.from(u).toString('base64');
const one = v => ({ w: 1, h: 1, d: Int32Array.of(v) }), px = (n, v) => E.apply(one(v), [n]).d[0];
t('conversão para P&B (luminância) e detecção informativa de imagem já P&B', () => {
  const g = E.grayFromRgb(mk(() => [255, 0, 0])).d[0], gr = E.grayFromRgb(mk(() => [0, 255, 0])).d[0], bl = E.grayFromRgb(mk(() => [0, 0, 255])).d[0];
  assert.deepEqual([g, gr, bl], [76, 150, 29]); assert.ok(E.same(E.grayFromRgb(grayRgb), E.grayFromRgb(grayRgb))); assert.equal(E.grayFromRgb(mk(() => [200, 200, 200])).d[0], 200); // cinza fica igual
  assert.ok(E.bwCheck(grayRgb).ok);
  assert.ok(!E.bwCheck(mk(() => [255, 0, 0])).ok);
  assert.ok(!E.bwCheck(mk(i => { const v = (i * 7) % 256; return [Math.min(255, v + 30), v, v]; })).ok); // sépia/tingida
  const few = Uint8Array.from(grayRgb); for (let i = 0; i < 20; i++) few[i * 3] = Math.min(255, few[i * 3] + 80); // 20 px (<1%) com cor
  assert.ok(E.bwCheck(few).ok);
  assert.equal(img.d.length, N);
});
t('base64 ida e volta', () => assert.ok(E.same(E.fromB64(E.toB64(img)), img)));
t('clarear', () => assert.deepEqual([200, 230, 255].map(v => px('clarear', v)), [240, 255, 255]));
t('escurecer', () => assert.deepEqual([40, 20, 100].map(v => px('escurecer', v)), [0, 0, 60]));
t('inverter', () => assert.deepEqual([0, 128, 255].map(v => px('inverter', v)), [255, 127, 0]));
t('preto e branco', () => assert.deepEqual([127, 128].map(v => px('pb', v)), [0, 255]));
t('ordem, imutabilidade e inverter duas vezes', () => {
  const c = Array.from(img.d);
  assert.notEqual(E.apply(one(230), ['clarear', 'inverter']).d[0], E.apply(one(230), ['inverter', 'clarear']).d[0]);
  E.apply(img, ['clarear', 'inverter']); assert.deepEqual(Array.from(img.d), c);
  assert.ok(E.same(E.apply(img, ['inverter', 'inverter']), img));
  assert.ok(E.apply(img, ['clarear', 'inverter', 'pb']).d.every(v => v === 0 || v === 255));
});
t('DSL: ordem, execução real e pseudocódigo', () => {
  const a = [{ t: 'add', x: 10 }, { t: 'inv' }], b = [{ t: 'inv' }, { t: 'add', x: 10 }];
  assert.equal(E.run(one(100), a).out.d[0], 145); assert.equal(E.run(one(100), b).out.d[0], 165);
  assert.ok(E.pseudo(a).indexOf('p + 10') < E.pseudo(a).indexOf('255 - p'));
  assert.equal(E.run(img, [{ t: 'inv' }]).out.d[5], 255 - img.d[5]);
});
t('DSL: valor inválido sem limite; com limite não; blocos inválidos', () => {
  const r = E.run(one(230), [{ t: 'add', x: 40 }]); assert.equal(r.out.d[0], 270); assert.equal(r.invalid, 1);
  assert.equal(E.run(one(230), [{ t: 'add', x: 40 }, { t: 'max255' }]).out.d[0], 255);
  assert.ok(E.validate([])); assert.match(E.validate([{ t: 'thr', x: 0 }]), /Bloco 1/); assert.throws(() => E.run(img, [{ t: 'eval' }]));
});
t('borda: bordas fortes, imagem lisa vira 0, limites e ordem dos blocos', () => {
  const flat = { w: 4, h: 3, d: Int32Array.from({ length: 12 }, () => 100) };
  assert.ok(E.run(flat, [{ t: 'edge' }]).out.d.every(v => v === 0)); // sem diferença, sem borda (inclusive nas margens)
  const step = { w: 4, h: 1, d: Int32Array.of(0, 0, 255, 255) }, e = E.run(step, [{ t: 'edge' }]).out.d;
  assert.deepEqual(Array.from(e), [0, 255, 255, 0]); // o salto 0→255 marca os dois pixels vizinhos; as pontas usam o próprio pixel
  const big = { w: 3, h: 3, d: Int32Array.of(0, 255, 0, 255, 0, 255, 0, 255, 0) }; assert.ok(E.run(big, [{ t: 'edge' }]).out.d.every(v => v >= 0 && v <= 255)); // limitado a 255
  assert.ok(E.run(img, [{ t: 'edge' }, { t: 'inv' }]).out.d.every((v, i) => v === 255 - E.edge(img.d, E.W, E.H)[i]));
  assert.equal(E.run(img, [{ t: 'edge' }]).invalid, 0);
  const p = E.pseudo([{ t: 'add', x: 5 }, { t: 'edge' }, { t: 'inv' }]); assert.ok(p.indexOf('p + 5') < p.indexOf('|D - E|') && p.indexOf('|D - E|') < p.indexOf('255 - p'));
  assert.equal((p.match(/PARA CADA pixel p/g) || []).length, 3);
});
t('suavizar: média 3x3, limites, ruído e ordem dos blocos', () => {
  const dot = { w: 3, h: 3, d: Int32Array.of(0, 0, 0, 0, 90, 0, 0, 0, 0) };
  assert.ok(E.run(dot, [{ t: 'blur' }]).out.d.every(v => v === 10)); // 90/9 em todos os pixels (margens usam o pixel mais próximo)
  const flat = { w: 4, h: 3, d: Int32Array.from({ length: 12 }, () => 77) }; assert.ok(E.run(flat, [{ t: 'blur' }]).out.d.every(v => v === 77));
  const sum = a => a.reduce((x, y) => x + y, 0), e1 = sum(E.run(img, [{ t: 'edge' }]).out.d), e2 = sum(E.run(img, [{ t: 'blur' }, { t: 'edge' }]).out.d);
  assert.ok(e2 < e1); // suavizar antes reduz as bordas (e a ordem importa)
  assert.ok(!E.same(E.run(img, [{ t: 'blur' }, { t: 'edge' }]).out, E.run(img, [{ t: 'edge' }, { t: 'blur' }]).out));
  assert.equal(E.run(img, [{ t: 'blur' }]).invalid, 0);
  const p = E.pseudo([{ t: 'add', x: 5 }, { t: 'blur' }, { t: 'inv' }]); assert.ok(p.indexOf('p + 5') < p.indexOf('soma / 9') && p.indexOf('soma / 9') < p.indexOf('255 - p')); assert.equal((p.match(/PARA CADA pixel p/g) || []).length, 3);
});
t('pseudocódigo de cadeia de filtros prontos', () => { const c = E.chainPseudo(['clarear', 'inverter']); assert.equal((c.match(/PARA CADA/g) || []).length, 1); assert.ok(c.indexOf('p + 40') < c.indexOf('255 - p')); });
t('servidor: páginas são HTML/CSS/JS de verdade', async () => {
  const s = createServer({ adminKey: 'k' }); await new Promise(r => s.listen(0, r)); const u = 'http://localhost:' + s.address().port;
  for (const [p, re] of [['/', /^<!doctype html>/i], ['/engine.js', /^\/\/ Motor/], ['/style.css', /^:root/]]) assert.match(await (await fetch(u + p)).text(), re);
  s.close();
});
t('servidor: cada aluno avança no próprio ritmo; feedbacks individuais; murais; sem controle de etapas', async () => {
  const s = createServer(); await new Promise(r => s.listen(0, r)); const u = 'http://localhost:' + s.address().port;
  const P = (p, b) => fetch(u + p, { method: 'POST', body: JSON.stringify(b) }).then(async r => ({ s: r.status, ...(await r.json()) }));
  const G = p => fetch(u + p).then(async r => ({ s: r.status, j: await r.json() })), nx = tk => P('/api/next', { token: tk }), st = async tk => (await G('/api/state?token=' + tk)).j;
  for (const r of ['/admin', '/api/admin/status', '/api/ranking', '/api/quiz/stats']) assert.equal((await G(r)).s, 404); // sem painel, sem ranking de turma
  assert.equal((await P('/api/admin/advance', {})).s, 404); // ninguém libera etapas
  assert.deepEqual(await st('x'), { stage: 0, nick: null, pid: null, can: false, total: 0 });
  assert.equal((await P('/api/join', { nick: '  ', rgb: b64(grayRgb) })).s, 400);
  assert.equal((await P('/api/join', { nick: 'Ana', rgb: b64(grayRgb.slice(0, 100)) })).s, 400);
  assert.equal((await P('/api/join', { nick: 'Ana' })).s, 400);
  const ja = await P('/api/join', { nick: 'Ana', rgb: b64(grayRgb) }), ana = ja.token; assert.equal(ja.s, 200);
  assert.equal((await P('/api/join', { nick: 'ana', rgb: b64(grayRgb) })).s, 409);
  const colorRgb = mk(i => [i % 256, (i * 5) % 256, (i * 11) % 256]), jb = await P('/api/join', { nick: 'Bia', rgb: b64(colorRgb) }), bia = jb.token; assert.equal(jb.s, 200); // colorida: aceita e convertida
  assert.ok(E.same(E.fromB64((await G('/api/img/' + jb.pid + '?token=' + bia)).j.d), E.grayFromRgb(colorRgb)));
  assert.equal((await st(ana)).stage, 1); assert.equal((await st(ana)).can, false);
  assert.equal((await G('/api/img/' + ja.pid + '?token=' + bia)).s, 403); // a imagem dos outros só a partir do mural
  assert.equal((await G('/api/wall/apply?token=' + ana)).s, 403); assert.equal((await G('/api/wall/apply')).s, 401); // sem token não vê
  assert.equal((await nx(ana)).s, 409); // precisa publicar antes de continuar
  assert.equal((await P('/api/apply', { token: ana, chain: ['nada'] })).s, 400);
  assert.equal((await P('/api/apply', { token: ana, chain: ['inverter'] })).s, 200); assert.equal((await st(ana)).can, true);
  assert.equal((await nx(ana)).stage, 2); assert.equal((await st(bia)).stage, 1); // Ana adiantou, Bia segue na etapa 1 (individual)
  assert.equal((await P('/api/apply', { token: ana, chain: ['inverter'] })).s, 409); // Ana já saiu de Aplicar
  const w = (await G('/api/wall/apply?token=' + ana)).j; assert.equal(w.length, 1); assert.equal(w[0].nick, 'Ana'); assert.ok(!('note' in w[0]));
  assert.equal((await G('/api/wall/apply?token=' + bia)).s, 403); assert.equal((await G('/api/img/' + ja.pid + '?token=' + bia)).s, 403);
  assert.equal((await G('/api/img/' + jb.pid + '?token=' + ana)).s, 200); // Ana já vê o mural, então vê as imagens
  await P('/api/apply', { token: bia, chain: ['pb'] }); await nx(bia); assert.equal((await G('/api/wall/apply?token=' + ana)).j.length, 2); // o mural é compartilhado e ao vivo
  assert.equal((await G('/api/game?token=' + ana)).s, 403); assert.equal((await nx(ana)).stage, 3); // Analisar (minijogo)
  assert.equal((await nx(ana)).s, 409); // precisa terminar as 3 rodadas
  let g = (await G('/api/game?token=' + ana)).j; assert.equal(g.round, 0); assert.equal(g.len, 1); assert.equal(g.reveal, null);
  const tg = E.fromB64(g.target), right = E.equivalents(img, tg, 1)[0], wrong = Object.keys(E.F).find(n => !E.same(E.apply(img, [n]), tg));
  const w1 = await P('/api/game/guess', { token: ana, chain: [wrong] }); assert.equal(w1.ok, false); assert.ok(w1.match >= 0 && w1.match < 1);
  const r1 = await P('/api/game/guess', { token: ana, chain: right }); assert.ok(r1.ok && r1.pts <= 90 && r1.pts >= 20);
  g = (await G('/api/game?token=' + ana)).j; assert.equal(g.round, 1); assert.equal(g.len, 2); assert.equal(g.rounds.length, 1);
  assert.equal((await P('/api/game/guess', { token: ana, chain: ['inverter'] })).s, 400);
  const r2 = await P('/api/game/guess', { token: ana, chain: E.equivalents(img, E.fromB64(g.target), 2)[0] }); assert.ok(r2.ok && r2.pts > 20);
  assert.ok((await P('/api/game/skip', { token: ana })).ok); g = (await G('/api/game?token=' + ana)).j; assert.ok(g.done); assert.equal(g.target, null); assert.equal(g.score, r1.pts + r2.pts); assert.equal(g.reveal, null);
  assert.equal((await nx(ana)).stage, 4); assert.equal((await P('/api/game/guess', { token: ana, chain: ['inverter'] })).s, 409); // saiu do minijogo
  g = (await G('/api/game?token=' + ana)).j; assert.equal(g.reveal.length, 3); // feedback individual: solução liberada
  assert.equal((await G('/api/game?token=' + bia)).s, 403); await nx(bia); // Bia (etapa 2) ainda não chegou a Analisar; depois chega
  const gb = (await G('/api/game?token=' + bia)).j; assert.equal(gb.score, 0); assert.equal(gb.reveal, null); assert.ok(!JSON.stringify(gb).includes('Ana')); // cada um vê só o seu
  assert.equal((await nx(ana)).stage, 5); // Avaliar
  const qs = (await G('/api/quiz?token=' + ana)).j; assert.ok(qs.every(q => q.a && q.b && q.c)); assert.ok(!qs.some(q => 'ok' in q));
  assert.equal((await G('/api/quiz?token=' + bia)).s, 403); assert.equal((await nx(ana)).s, 409); // precisa responder antes
  assert.equal((await P('/api/quiz', { token: ana, answers: ['a', 'a', 'a', 'x'] })).s, 400); // opção inválida
  const pq = await P('/api/quiz', { token: ana, answers: ['b', 'c', 'a', 'b'] }); assert.equal(pq.ok, true); assert.ok(!('score' in pq) && !('items' in pq)); // sem feedback na hora
  assert.equal((await P('/api/quiz', { token: ana, answers: ['b', 'c', 'a', 'b'] })).s, 409); assert.equal((await G('/api/quiz/feedback?token=' + ana)).s, 403);
  assert.equal((await nx(ana)).stage, 6); const fa = (await G('/api/quiz/feedback?token=' + ana)).j;
  assert.equal(fa.score, 4); assert.equal(fa.items[0].mine, 'b'); assert.equal(fa.items[0].correct, 'b'); assert.ok(fa.items[0].why && fa.items[0].a);
  for (let i = 0; i < 3; i++) await P('/api/game/skip', { token: bia }); await nx(bia); await nx(bia); // Bia: termina o jogo, vê o feedback, chega a Avaliar
  await P('/api/quiz', { token: bia, answers: ['a', 'a', 'b', 'a'] }); await nx(bia);
  const fb = (await G('/api/quiz/feedback?token=' + bia)).j; assert.equal(fb.score, 0); assert.equal(fb.answered, true); assert.equal(fb.items[0].mine, 'a'); assert.ok(!JSON.stringify(fb).includes('Ana')); // individual
  assert.equal((await G('/api/quiz/feedback')).s, 401);
  assert.equal((await nx(ana)).stage, 7); assert.equal((await nx(ana)).s, 409); // Criar: precisa publicar
  assert.equal((await P('/api/create', { token: ana, blocks: [{ t: 'thr', x: 999 }] })).s, 400);
  assert.equal((await P('/api/create', { token: ana, blocks: [{ t: 'thr', x: 100 }] })).invalid, 0);
  const ce = await P('/api/create', { token: ana, blocks: [{ t: 'edge' }] }); assert.equal(ce.invalid, 0); assert.match(ce.pseudo, /\|D - E\|/); // bloco de borda aceito
  const cb = await P('/api/create', { token: ana, blocks: [{ t: 'blur' }, { t: 'edge' }] }); assert.equal(cb.invalid, 0); assert.match(cb.pseudo, /soma \/ 9/); // bloco de suavizar aceito
  assert.equal((await G('/api/wall/create?token=' + ana)).s, 403); assert.equal((await nx(ana)).stage, 8); // Mural final
  assert.equal((await G('/api/wall/create?token=' + ana)).j.length, 3); assert.equal((await nx(ana)).s, 409); assert.equal((await st(ana)).can, false); // fim
  s.close();
  const s2 = createServer(); await new Promise(r => s2.listen(0, r)); // reiniciar o servidor apaga tudo
  assert.equal((await (await fetch('http://localhost:' + s2.address().port + '/api/state?token=' + ana)).json()).nick, null); s2.close();
});
t('exporta handler (req, res) para a Vercel, com estado compartilhado entre requisições', async () => {
  const handler = require('../server.js'); assert.equal(typeof handler, 'function'); assert.equal(typeof handler.createServer, 'function');
  const s = require('node:http').createServer(handler); await new Promise(r => s.listen(0, r)); const u = 'http://localhost:' + s.address().port;
  assert.match(await (await fetch(u + '/')).text(), /^<!doctype html>/i);
  const j = await (await fetch(u + '/api/join', { method: 'POST', body: JSON.stringify({ nick: 'Zé', rgb: b64(grayRgb) }) })).json();
  assert.equal((await (await fetch(u + '/api/state?token=' + j.token)).json()).nick, 'Zé'); s.close();
});
