// Teste de fumaça da interface: executa o script de public/index.html com um DOM falso (sem rede) e percorre TODAS as etapas.
const vm = require('vm'), fs = require('fs'), assert = require('node:assert/strict'), t = require('node:test'), P = f => fs.readFileSync(__dirname + '/../public/' + f, 'utf8');
function boot(storage = new Map()) {
  const els = {}, el = k => els[k] || (els[k] = { innerHTML: '', textContent: '', disabled: false, style: {}, getContext: () => ({ createImageData: () => ({ data: { set() {} } }), putImageData() {}, strokeRect() {} }) });
  const ctx = vm.createContext({ document: { querySelector: el, getElementById: el, createElement: el }, localStorage: { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
    fetch: () => { throw new Error('o site não deve usar a rede'); }, setInterval() {}, atob, btoa, console, Uint8Array, Int32Array, confirm: () => true, scrollTo() {} });
  vm.runInContext(P('engine.js'), ctx); vm.runInContext(P('game.js'), ctx); vm.runInContext(P('index.html').match(/<script>\n([\s\S]*?)<\/script>/)[1], ctx);
  return { storage, els, run: c => vm.runInContext(c, ctx), main: () => els['#main'].innerHTML, steps: () => els['#steps'].innerHTML };
}
const n = (s, x) => s.split(x).length - 1, BOOK = 'https://drive.google.com/file/d/1o1cbUXzI7vCnaJ9BBb4ftBJOAk7DszAo/view?usp=sharing';
const enabled = h => /class="p" +onclick="next\(\)"/.test(h), blocked = h => /class="p" disabled onclick="next\(\)"/.test(h);

t('interface: percorre todas as etapas sem servidor, com feedbacks individuais e sem apelido/murais', () => {
  const b = boot(), m = b.main, ok = () => assert.ok(!/⚠/.test(m()), m().slice(0, 200));
  // Etapa 1: só a imagem
  assert.match(m(), /Etapa 1 · Entrada/); assert.match(m(), /type="file"/); assert.match(m(), /qualquer imagem/); assert.match(m(), /convertida para preto e branco/); assert.ok(!/apelido|compartilh|demais alunos|Mural/i.test(m())); assert.match(m(), /<button id="jb" class="p" disabled/);
  b.run("up={ok:true,img:E.grayFromRgb(new Uint8Array(E.W*E.H*3).map((_,i)=>((i/3|0)*7)%256)),src:'x',msg:'ok'};begin()");
  // Etapa 2: Aplicar (lupa só aqui)
  ok(); assert.match(m(), /Etapa 2 · Aplicar/); assert.equal(n(m(), 'Lupa'), 1); assert.equal(n(m(), 'class="g2"'), 2); assert.ok(m().indexOf('Original') < m().indexOf('Pseudocódigo') && m().indexOf('Pseudocódigo') < m().indexOf('Lupa')); assert.ok(blocked(m())); assert.match(m(), /Aplique pelo menos um filtro/); assert.ok(!/Publicar|observou/i.test(m()));
  b.run("add('clarear',6)"); assert.match(m(), /p = p \+ 40/); assert.ok(enabled(m())); b.run('next()');
  // Etapa 3: Analisar (minijogo), com pseudocódigo e sem lupa
  ok(); assert.match(m(), /Etapa 3 · Analisar/); assert.match(m(), /Pseudocódigo do seu teste/); assert.ok(!m().includes('Lupa')); assert.ok(blocked(m()));
  for (const r of [0, 1, 2]) { b.run(`chain=S.mys[${r}].slice();guess()`); ok(); if (r < 2) { assert.match(m(), /Acertou/); assert.match(m(), /PARA CADA pixel p:/); b.run('nextRound()'); } }
  assert.match(m(), /Fim de jogo/); assert.ok(enabled(m())); b.run('next()');
  // Etapa 4: Feedback individual
  ok(); assert.match(m(), /Etapa 4 · Feedback/); assert.match(m(), /Seu desempenho/); assert.match(m(), /Os filtros misteriosos da sua imagem eram/); assert.ok(!/Apelido/.test(m())); b.run('next()');
  // Etapa 5: Avaliar, com recurso; sem gabarito
  ok(); assert.match(m(), /Etapa 5 · Avaliar/); assert.equal(n(m(), 'type="radio"'), 12); assert.match(m(), /Cap\. 2 \(2\.3\.1\), página 50/); assert.ok(m().includes(BOOK)); assert.ok(!/✔ correta/.test(m())); assert.ok(blocked(m()));
  b.run("ans=['b','c','a',undefined];sendQuiz()"); assert.match(m(), /Etapa 5 · Avaliar/); // faltou uma resposta: não envia
  b.run("ans=['b','c','a','b'];sendQuiz()"); assert.match(m(), /Enviado ✓/); assert.ok(enabled(m())); b.run('next()');
  // Etapa 6: Feedback individual do Avaliar
  ok(); assert.match(m(), /Etapa 6 · Feedback/); assert.match(m(), /Você acertou <b>4<\/b> de 4/); assert.match(m(), /✔ correta/); b.run('next()');
  // Etapa 7: Criar, com Borda, Suavizar e curiosidade; sem lupa
  ok(); assert.match(m(), /Etapa 7 · Criar/); assert.match(m(), /BORDA/); assert.match(m(), /SUAVIZAR/); assert.match(m(), /Curiosidade sobre os novos filtros/); assert.match(m(), /Cap\. 4, página 103/); assert.ok(m().includes(BOOK)); assert.ok(!m().includes('Lupa')); assert.ok(blocked(m()));
  b.run("blocks=[{t:'blur'},{t:'edge'}];runB()"); assert.match(m(), /soma \/ 9/); assert.match(m(), /\|D - E\|/); assert.ok(enabled(m()));
  b.run("blocks=[{t:'thr',x:999}];runB()"); assert.match(m(), /Bloco 1/); b.run("blocks=[{t:'blur'},{t:'edge'}];runB()"); b.run('next()');
  // Etapa 8: Resumo
  ok(); assert.match(m(), /Etapa 8 · Resumo/); assert.match(m(), /Parabéns/); assert.match(m(), /PARA CADA pixel p \(com os 8 vizinhos/); assert.ok(!/Continuar →/.test(m()));
  for (const nm of ['Aplicar', 'Analisar', 'Avaliar', 'Criar']) assert.ok(b.steps().includes('. ' + nm + '<'), nm); // nomes exatos da taxonomia de Bloom
  assert.ok(!/Mural|Ranking|Entrada<\/li><li[^>]*>.*Mural/.test(b.steps()));
  // o progresso fica salvo no navegador: reabrir a página continua de onde parou
  const b2 = boot(b.storage); assert.match(b2.main(), /Etapa 8 · Resumo/); assert.ok(b.storage.get('pdi_state').length > 1000);
  b2.run('restart()'); assert.equal(b2.storage.has('pdi_state'), false); assert.match(b2.main(), /Etapa 1 · Entrada/); // recomeçar apaga tudo
});
t('interface: recarregar no meio do minijogo mantém rodada, pontos e tempo', () => {
  const b = boot(); b.run("up={ok:true,img:E.grayFromRgb(new Uint8Array(E.W*E.H*3).map((_,i)=>((i/3|0)*5)%256)),src:'x',msg:'ok'};begin();add('inverter',6);next()");
  b.run("chain=S.mys[0].slice();guess();nextRound()"); const t0 = b.run('S.game.t0'), score = b.run('Game.gview(S,Date.now()).score');
  const b2 = boot(b.storage); assert.match(b2.main(), /RODADA 2\/3/); assert.equal(b2.run('S.game.t0'), t0); assert.equal(b2.run('Game.gview(S,Date.now()).score'), score); assert.ok(score >= 20);
});
t('interface: sem imagem não há como começar, e o site não cita apelido, murais nem servidor', () => {
  const html = P('index.html'); assert.ok(html.includes('Laboratório de Filtros')); assert.ok(!/apelido|nick|Mural|Ranking|\/api\/|host=|liberou|liberada/i.test(html));
  const b = boot(); assert.throws(() => b.run('begin()')); assert.match(b.main(), /Etapa 1 · Entrada/);
});
