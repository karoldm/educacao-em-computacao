// Motor único de pixels: usado pelo navegador (Aplicar/Analisar/Criar) e pelo servidor (revalida tudo).
(function (root) {
  // Filtros predefinidos. Saturação: o resultado é sempre limitado a [0,255] (min/max).
  const F = {
    clarear: { nome: 'Clarear em 40', f: p => Math.min(255, p + 40), exp: 'Soma 40 a cada pixel; se passar de 255, vira 255 (saturação no branco).', pc: ['PARA CADA pixel p:', '    p = p + 40', '    SE p > 255:', '        p = 255'] },
    escurecer: { nome: 'Escurecer em 40', f: p => Math.max(0, p - 40), exp: 'Subtrai 40 de cada pixel; se ficar abaixo de 0, vira 0 (saturação no preto).', pc: ['PARA CADA pixel p:', '    p = p - 40', '    SE p < 0:', '        p = 0'] },
    inverter: { nome: 'Inverter', f: p => 255 - p, exp: 'Troca claro por escuro: cada pixel vira 255 menos o seu valor.', pc: ['PARA CADA pixel p:', '    p = 255 - p'] },
    pb: { nome: 'Preto e branco (limiar 128)', f: p => (p < 128 ? 0 : 255), exp: 'Pixels abaixo de 128 viram preto (0); os demais viram branco (255).', pc: ['PARA CADA pixel p:', '    SE p < 128:', '        p = 0', '    SENÃO:', '        p = 255'] },
  };
  // Todas as imagens (enviadas pelos alunos) são recortadas em 4:3 e reduzidas para W×H, em escala de cinza.
  const W = 96, H = 72;
  const b64 = u => typeof Buffer !== 'undefined' ? Buffer.from(u).toString('base64') : (() => { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(s); })();
  const unb64 = s => typeof Buffer !== 'undefined' ? Uint8Array.from(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const toB64 = img => b64(Uint8Array.from(img.d)), fromB64 = s => ({ w: W, h: H, d: Int32Array.from(unb64(s)) });
  // Informativo: indica se a imagem já era preto e branco (R≈G≈B: ≤1% dos pixels com canais diferindo >16 e diferença média ≤4).
  const bwCheck = rgb => { let col = 0, sum = 0; const n = rgb.length / 3; for (let i = 0; i < rgb.length; i += 3) { const df = Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) - Math.min(rgb[i], rgb[i + 1], rgb[i + 2]); sum += df; if (df > 16) col++; } const frac = col / n, mean = sum / n; return { ok: frac <= 0.01 && mean <= 4, frac, mean }; };
  // Conversão para cinza por luminância: cinza = 0,299·R + 0,587·G + 0,114·B (se R=G=B, o valor não muda).
  const grayFromRgb = rgb => { const d = new Int32Array(rgb.length / 3); for (let i = 0; i < d.length; i++) d[i] = Math.round(0.299 * rgb[3 * i] + 0.587 * rgb[3 * i + 1] + 0.114 * rgb[3 * i + 2]); return { w: W, h: H, d }; };
  const same = (a, b) => a.d.length === b.d.length && a.d.every((v, i) => v === b.d[i]);
  const apply = (img, names) => names.reduce((m, n) => ({ w: m.w, h: m.h, d: m.d.map(F[n].f) }), img);
  const equivalents = (img, target, len) => {
    let seqs = [[]];
    for (let i = 0; i < len; i++) seqs = seqs.flatMap(s => Object.keys(F).map(n => [...s, n]));
    return seqs.filter(s => same(apply(img, s), target));
  };
  // Lupa: recorte n×n (linhas de valores) para mostrar pixels e números.
  const patch = (m, x, y, n = 8) => { x = Math.max(0, Math.min(m.w - n, x)); y = Math.max(0, Math.min(m.h - n, y)); return Array.from({ length: n }, (_, j) => Array.from({ length: n }, (_, i) => m.d[(y + j) * m.w + x + i])); };

  // DSL de blocos (sem eval): interpretador determinístico.
  const LIM = { add: [0, 255], sub: [0, 255], thr: [1, 254] };
  const TYPES = ['add', 'sub', 'inv', 'min0', 'max255', 'thr', 'edge', 'blur'];
  const validate = blocks => {
    if (!Array.isArray(blocks) || !blocks.length) return 'Adicione ao menos um bloco.';
    if (blocks.length > 20) return 'Use no máximo 20 blocos.';
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (!b || !TYPES.includes(b.t)) return `Bloco ${i + 1}: tipo desconhecido.`;
      const l = LIM[b.t];
      if (l && (!Number.isInteger(b.x) || b.x < l[0] || b.x > l[1])) return `Bloco ${i + 1}: X deve ser um número inteiro entre ${l[0]} e ${l[1]}.`;
    }
    return null;
  };
  const step = (p, b) => ({ add: () => p + b.x, sub: () => p - b.x, inv: () => 255 - p, min0: () => (p < 0 ? 0 : p), max255: () => (p > 255 ? 255 : p), thr: () => (p < b.x ? 0 : 255) })[b.t]();
  // Sem saturação automática: valores fora de 0–255 são mantidos e contados em "invalid"; a interface só limita a renderização.
  // Os blocos rodam em ordem. Blocos comuns agem pixel a pixel; o bloco "edge" (borda) compara os 4 vizinhos (fora da imagem = o próprio pixel).
  const edge = (d, w, h) => {
    const o = new Int32Array(d.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const e = d[y * w + Math.max(x - 1, 0)], r = d[y * w + Math.min(x + 1, w - 1)], c = d[Math.max(y - 1, 0) * w + x], b = d[Math.min(y + 1, h - 1) * w + x];
      o[y * w + x] = Math.min(255, Math.abs(r - e) + Math.abs(b - c));
    }
    return o;
  };
  // Suavizar: cada pixel vira a média (arredondada) dele e dos 8 vizinhos; fora da imagem vale o pixel mais próximo.
  const blur = (d, w, h) => {
    const o = new Int32Array(d.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += d[Math.min(Math.max(y + dy, 0), h - 1) * w + Math.min(Math.max(x + dx, 0), w - 1)];
      o[y * w + x] = Math.round(s / 9);
    }
    return o;
  };
  const NB = { edge, blur }; // blocos que olham a vizinhança (os demais agem pixel a pixel)
  const run = (img, blocks) => {
    const er = validate(blocks); if (er) throw new Error(er);
    let d = img.d;
    for (let i = 0; i < blocks.length;) {
      if (NB[blocks[i].t]) { d = NB[blocks[i].t](d, img.w, img.h); i++; continue; }
      let j = i; while (j < blocks.length && !NB[blocks[j].t]) j++;
      const g = blocks.slice(i, j); d = d.map(v => { let p = v; for (const b of g) p = step(p, b); return p; }); i = j;
    }
    let invalid = 0; for (const v of d) if (v < 0 || v > 255) invalid++;
    return { out: { w: img.w, h: img.h, d }, invalid };
  };
  const PC = { add: b => [`p = p + ${b.x}`], sub: b => [`p = p - ${b.x}`], inv: () => ['p = 255 - p'], min0: () => ['SE p < 0:', '    p = 0'], max255: () => ['SE p > 255:', '    p = 255'], thr: b => [`SE p < ${b.x}:`, '    p = 0', 'SENÃO:', '    p = 255'] };
  const pseudo = blocks => {
    const o = []; let open = false;
    for (const b of blocks) {
      if (b.t === 'edge') { open = false; o.push('PARA CADA pixel p (E = esquerda, D = direita, C = cima, B = baixo):', '    p = |D - E| + |B - C|', '    SE p > 255:', '        p = 255'); }
      else if (b.t === 'blur') { open = false; o.push('PARA CADA pixel p (com os 8 vizinhos ao redor):', '    soma = p + (soma dos 8 vizinhos)', '    p = soma / 9   (arredondado)'); }
      else { if (!open) { open = true; o.push('PARA CADA pixel p:'); } o.push(...PC[b.t](b).map(l => '    ' + l)); }
    }
    return o.join('\n');
  };
  const chainPseudo = names => ['PARA CADA pixel p:', ...names.flatMap(n => F[n].pc.slice(1))].join('\n'); // pseudocódigo de uma cadeia de filtros prontos

  const E = { F, W, H, b64, unb64, toB64, fromB64, bwCheck, grayFromRgb, chainPseudo, edge, blur, apply, same, equivalents, patch, validate, run, pseudo };
  if (typeof module !== 'undefined') module.exports = E; else root.E = E;
})(this);
