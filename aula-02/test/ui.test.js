// Teste de fumaça da interface: executa o script de public/index.html com um DOM falso e renderiza as telas.
const vm = require('vm'), fs = require('fs'), assert = require('node:assert/strict'), t = require('node:test');
t('interface: telas renderizam e seguem as regras de layout', async () => {
  const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8'), ui = html.match(/<script>\n([\s\S]*?)<\/script>/)[1], eng = fs.readFileSync(__dirname + '/../public/engine.js', 'utf8');
  const el = () => ({ innerHTML: '', textContent: '', disabled: false, style: {}, getContext: () => ({ createImageData: () => ({ data: { set() {} } }), putImageData() {}, strokeRect() {} }) });
  const ctx = vm.createContext({ document: { querySelector: el, getElementById: el, createElement: el }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, fetch: u => /\/api\/quiz$/.test(u) ? Promise.resolve({ ok: true, json: async () => [{ goal: 'g', a: ['x'], b: ['y'], c: ['z'] }] }) : Promise.reject(new Error('sem rede')), setInterval() {}, atob, btoa, console, Uint8Array, Int32Array, confirm: () => true });
  vm.runInContext(eng, ctx); vm.runInContext(ui, ctx);
  const out = await vm.runInContext(`(async()=>{const R={};const u=new Uint8Array(E.W*E.H*3);for(let i=0;i<E.W*E.H;i++){const v=(i*7)%256;u.set([v,v,v],i*3)}
    me=E.grayFromRgb(u);nick='Ana';pid='aaaaaaaa';chain=['clarear','inverter'];
    R.apl=aplicar();G={round:0,total:3,done:false,len:2,wrong:0,score:0,rounds:[],t:me,t0:Date.now()};R.mis=await misterioso();
    gfb={ok:true,pts:90,secs:5,expected:['clarear'],exact:true};R.ok=await misterioso();gfb=null;
    blocks=[{t:'add',x:40},{t:'edge'},{t:'blur'}];res=E.run(me,blocks);R.cri=criar();R.join=join();R.esp=espera();R.pubOk=pubBtn('apply',false);R.av=await avaliar();
    return R})()`, ctx);
  const n = (s, x) => s.split(x).length - 1;
  assert.equal(n(out.apl, 'Lupa'), 1); assert.ok(out.apl.indexOf('Original') < out.apl.indexOf('Pseudocódigo') && out.apl.indexOf('Pseudocódigo') < out.apl.indexOf('Lupa')); assert.equal(n(out.apl, 'class="g2"'), 2);
  assert.match(out.apl, /Etapa 2 · Aplicar/); assert.ok(!/observou/i.test(out.apl));
  assert.match(out.mis, /Etapa 4 · Analisar/); assert.match(out.mis, /Pseudocódigo do seu teste/); assert.match(out.mis, /PARA CADA pixel p:/); assert.ok(!out.mis.includes('Lupa'));
  assert.match(out.ok, /PARA CADA pixel p:/);
  assert.match(out.cri, /Etapa 8 · Criar/); assert.match(out.cri, /BORDA/); assert.match(out.cri, /SUAVIZAR/); assert.match(out.cri, /soma \/ 9/); assert.match(out.cri, /PARA CADA pixel p \(E = esquerda/); assert.ok(!out.cri.includes('Lupa')); assert.ok(!/intenção/i.test(out.cri));
  assert.equal(n(out.av, 'type="radio"'), 3); assert.match(out.join, /type="file"/); assert.match(out.join, /qualquer imagem/); assert.match(out.join, /convertida para preto e branco/); assert.ok(!html.includes('O professor liberou')); assert.ok(!html.includes('Laboratório de Pixels'));
  assert.ok(html.includes('Laboratório de Filtros')); assert.ok(html.includes("['a','b','c']"));
});

t('painel do admin: mostra murais, ranking e resultados ao vivo (inclusive antes de os alunos)', async () => {
  const { createServer } = require('../server.js'), E = require('../public/engine.js'), srv = createServer({ adminKey: 'k' }); await new Promise(r => srv.listen(0, r)); const base = 'http://localhost:' + srv.address().port;
  const P = (p, b, h) => fetch(base + p, { method: 'POST', body: JSON.stringify(b), headers: h }).then(r => r.json()), A = { 'x-admin-key': 'k' };
  const rgb = Buffer.from(Uint8Array.from({ length: E.W * E.H * 3 }, (_, i) => ((i / 3 | 0) * 7) % 256)).toString('base64');
  const ana = await P('/api/join', { nick: 'Ana <b>', rgb }); await P('/api/admin/advance', {}, A); // etapa 1: Aplicar (mural ainda fechado para alunos)
  await P('/api/apply', { token: ana.token, chain: ['inverter'] });
  const html = fs.readFileSync(__dirname + '/../public/admin.html', 'utf8'), ui = html.match(/<script>\n([\s\S]*?)<\/script>/)[1], eng = fs.readFileSync(__dirname + '/../public/engine.js', 'utf8');
  const els = {}, el = k => els[k] || (els[k] = { innerHTML: '', textContent: '', hidden: true, disabled: false, style: {}, getContext: () => ({ createImageData: () => ({ data: { set() {} } }), putImageData() {} }) });
  const ctx = vm.createContext({ document: { querySelector: el, getElementById: el }, sessionStorage: { getItem: () => null, setItem() {} }, fetch: (u, o) => fetch(base + u, o), setInterval() {}, console, Uint8Array, Int32Array, atob, btoa, alert() {}, confirm: () => true });
  vm.runInContext(eng, ctx); vm.runInContext(ui, ctx);
  await vm.runInContext("key='k';refresh()", ctx);
  assert.equal(els['#panel'].hidden, false); assert.match(els['#ph'].textContent, /Etapa 2 de 9: Aplicar/);
  assert.match(els['#live'].innerHTML, /Ana &lt;b&gt;/); assert.ok(!els['#live'].innerHTML.includes('<b>Ana <b>')); assert.match(els['#live'].innerHTML, /<canvas/); // nome escapado + imagem resultado
  assert.match(els['#tabs'].innerHTML, /Aplicar \(agora\)/);
  await vm.runInContext("pickTab('rank')", ctx); assert.match(els['#live'].innerHTML, /<table class=\"rk\">/); assert.match(els['#live'].innerHTML, /Ana &lt;b&gt;/); // ranking ao vivo, antes da etapa Analisar
  await vm.runInContext("pickTab('quiz')", ctx); assert.match(els['#live'].innerHTML, /Nenhuma resposta ainda/);
  await vm.runInContext("pickTab('create')", ctx); assert.match(els['#live'].innerHTML, /Nenhuma publicação ainda/);
  await vm.runInContext('follow()', ctx); assert.match(els['#tabs'].innerHTML, /aria-pressed="true"[^>]*>Aplicar \(agora\)/); assert.match(els['#tabs'].innerHTML, /<button disabled onclick="follow\(\)">/);
  srv.close();
});
