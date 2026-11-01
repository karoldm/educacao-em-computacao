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
