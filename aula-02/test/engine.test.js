const t = require('node:test'), assert = require('node:assert/strict'), E = require('../public/engine.js');
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

t('filtros prontos Suavizar e Borda: iguais aos blocos, com pseudocódigo próprio', () => {
  assert.ok(E.same(E.apply(img, ['suavizar']), E.run(img, [{ t: 'blur' }]).out)); assert.ok(E.same(E.apply(img, ['borda']), E.run(img, [{ t: 'edge' }]).out));
  assert.ok(E.same(E.apply(img, ['suavizar', 'inverter', 'borda']), E.run(img, [{ t: 'blur' }, { t: 'inv' }, { t: 'edge' }]).out)); // a ordem é respeitada
  assert.ok(Object.keys(E.F).includes('suavizar') && Object.keys(E.F).includes('borda')); assert.match(E.F.suavizar.nome, /Suavizar/); assert.match(E.F.borda.nome, /Borda/);
  assert.ok(E.same(E.apply(img, ['inverter', 'suavizar']), E.apply(img, ['suavizar', 'inverter']))); // suavizar e inverter comutam (média não tem empates)
  assert.ok(!E.same(E.apply(img, ['suavizar', 'borda']), E.apply(img, ['borda', 'suavizar'])));
  const c = E.chainPseudo(['clarear', 'suavizar', 'inverter', 'borda']); assert.equal((c.match(/PARA CADA pixel p/g) || []).length, 4); assert.ok(c.indexOf('p + 40') < c.indexOf('soma / 9') && c.indexOf('soma / 9') < c.indexOf('255 - p') && c.indexOf('255 - p') < c.indexOf('|D - E|'));
  assert.equal(E.chainPseudo(['escurecer', 'inverter']).split('\n').filter(l => /PARA CADA/.test(l)).length, 1); // filtros por pixel continuam agrupados
});
t('casos de margem: o primeiro pixel (sem vizinhos acima e à esquerda) usa o pixel mais próximo dentro da imagem', () => {
  const m = { w: 3, h: 3, d: Int32Array.of(10, 20, 30, 40, 50, 60, 70, 80, 90) };
  assert.deepEqual(E.window3(m, 0, 0), [[10, 10, 20], [10, 10, 20], [40, 40, 50]]); // canto superior esquerdo: linha e coluna de fora são cópias
  assert.deepEqual(E.window3(m, 2, 2), [[50, 60, 60], [80, 90, 90], [80, 90, 90]]); // canto inferior direito
  assert.deepEqual(E.window3(m, 1, 1), [[10, 20, 30], [40, 50, 60], [70, 80, 90]]); // miolo: nada é copiado
  assert.equal(E.run(m, [{ t: 'edge' }]).out.d[0], 40); // |D − E| + |B − C| = |20 − 10| + |40 − 10|, com E = C = o próprio 10
  assert.equal(E.run(m, [{ t: 'blur' }]).out.d[0], 23); // (10+10+20+10+10+20+40+40+50) / 9 = 210 / 9
  assert.equal(E.run(m, [{ t: 'edge' }]).out.d[8], 40); assert.equal(E.run(m, [{ t: 'blur' }]).out.d[8], 77); // último pixel: 690 / 9
  const e = E.run(img, [{ t: 'edge' }]).out, b = E.run(img, [{ t: 'blur' }]).out; // a janela mostrada na tela é a mesma que o filtro usa, em TODOS os pixels
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const w = E.window3(img, x, y), i = y * img.w + x; assert.equal(b.d[i], Math.round(w.flat().reduce((a, v) => a + v, 0) / 9)); assert.equal(e.d[i], Math.min(255, Math.abs(w[1][2] - w[1][0]) + Math.abs(w[2][1] - w[0][1]))); }
  for (const p of [E.F.borda.pc.join('\n'), E.F.suavizar.pc.join('\n'), E.pseudo([{ t: 'edge' }]), E.pseudo([{ t: 'blur' }])]) assert.match(p, /\(vizinho fora da imagem/); // o pseudocódigo diz como as margens são tratadas
  assert.match(E.F.borda.exp, /primeiro pixel/); assert.match(E.F.suavizar.exp, /primeiro pixel/);
});
