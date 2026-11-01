// Teste de fumaça da interface: executa o script de public/index.html com um DOM falso e renderiza as telas.
const vm = require('vm'), fs = require('fs'), assert = require('node:assert/strict'), t = require('node:test');
t('interface: telas renderizam e seguem as regras de layout, feedbacks individuais e recursos', async () => {
  const html = fs.readFileSync(__dirname + '/../public/index.html', 'utf8'), ui = html.match(/<script>\n([\s\S]*?)<\/script>/)[1], eng = fs.readFileSync(__dirname + '/../public/engine.js', 'utf8');
  const el = () => ({ innerHTML: '', textContent: '', disabled: false, style: {}, getContext: () => ({ createImageData: () => ({ data: { set() {} } }), putImageData() {}, strokeRect() {} }) });
  const DATA = u => /\/api\/quiz$/.test(u) ? [{ goal: 'g', a: ['x'], b: ['y'], c: ['z'] }]
    : /\/api\/quiz\/feedback/.test(u) ? { score: 1, answered: true, items: [{ goal: 'g', a: ['x'], b: ['y'], c: ['z'], mine: 'a', correct: 'b', ok: false, why: 'porque sim' }] }
    : /\/api\/game/.test(u) ? { round: 3, total: 3, done: true, score: 150, rounds: [{ pts: 100, secs: 5, wrong: 1, solved: 1 }, { pts: 50, secs: 20, wrong: 2, solved: 1 }], reveal: [['inverter'], ['clarear', 'inverter'], ['pb', 'pb', 'pb']] } : null;
  const ctx = vm.createContext({ document: { querySelector: el, getElementById: el, createElement: el }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {} }, location: { search: '', pathname: '/' }, history: { replaceState() {} },
    fetch: u => { const d = DATA(u); return d ? Promise.resolve({ ok: true, json: async () => d }) : Promise.reject(new Error('sem rede')); }, setInterval() {}, atob, btoa, URLSearchParams, console, Uint8Array, Int32Array, confirm: () => true });
  vm.runInContext(eng, ctx); vm.runInContext(ui, ctx);
  const out = await vm.runInContext(`(async()=>{const R={};const u=new Uint8Array(E.W*E.H*3);for(let i=0;i<E.W*E.H;i++){const v=(i*7)%256;u.set([v,v,v],i*3)}
    me=E.grayFromRgb(u);nick='Ana';pid='aaaaaaaa';tok='t';chain=['clarear','inverter'];
    R.apl=aplicar();G={round:0,total:3,done:false,len:2,wrong:0,score:0,rounds:[],t:me,t0:Date.now()};R.mis=await misterioso();
    gfb={ok:true,pts:90,secs:5,expected:['clarear'],exact:true};R.ok=await misterioso();gfb=null;
    blocks=[{t:'add',x:40},{t:'edge'},{t:'blur'}];res=E.run(me,blocks);R.cri=criar();R.join=join();R.esp=espera();R.av=await avaliar();
    R.fbg=await fbGame();R.fbq=await fbQuiz();phase=1;can=false;R.nb1=nextBar();can=true;R.nb2=nextBar();phase=8;R.nb8=nextBar();phase=0;R.nb0=nextBar();
    return R})()`, ctx);
  const n = (s, x) => s.split(x).length - 1, BOOK = 'https://drive.google.com/file/d/1o1cbUXzI7vCnaJ9BBb4ftBJOAk7DszAo/view?usp=sharing';
  assert.equal(n(out.apl, 'Lupa'), 1); assert.ok(out.apl.indexOf('Original') < out.apl.indexOf('Pseudocódigo') && out.apl.indexOf('Pseudocódigo') < out.apl.indexOf('Lupa')); assert.equal(n(out.apl, 'class="g2"'), 2);
  assert.match(out.apl, /Etapa 2 · Aplicar/); assert.ok(!/observou/i.test(out.apl)); assert.ok(!/professor|liberad/i.test(out.apl + out.esp));
  assert.match(out.mis, /Etapa 4 · Analisar/); assert.match(out.mis, /Pseudocódigo do seu teste/); assert.match(out.mis, /PARA CADA pixel p:/); assert.ok(!out.mis.includes('Lupa')); assert.match(out.ok, /PARA CADA pixel p:/);
  assert.match(out.cri, /Etapa 8 · Criar/); assert.match(out.cri, /BORDA/); assert.match(out.cri, /SUAVIZAR/); assert.match(out.cri, /soma \/ 9/); assert.ok(!out.cri.includes('Lupa')); assert.ok(!/intenção/i.test(out.cri));
  assert.match(out.cri, /Curiosidade sobre os novos filtros/); assert.match(out.cri, /Cap\. 4, página 103/); assert.ok(out.cri.includes(BOOK)); assert.match(out.cri, /target="_blank" rel="noopener noreferrer"/);
  assert.equal(n(out.av, 'type="radio"'), 3); assert.match(out.av, /Cap\. 2 \(2\.3\.1\), página 50/); assert.ok(out.av.includes(BOOK)); assert.ok(!/porque sim/.test(out.av)); // sem gabarito durante Avaliar
  assert.match(out.join, /type="file"/); assert.match(out.join, /qualquer imagem/); assert.match(out.join, /convertida para preto e branco/); assert.match(out.join, /demais alunos verão essa imagem[^<]*murais e feedbacks/);
  assert.match(out.fbg, /Etapa 5 · Feedback/); assert.match(out.fbg, /Seu desempenho/); assert.match(out.fbg, /<b>150<\/b>/); assert.match(out.fbg, /não jogada/); assert.match(out.fbg, /PARA CADA pixel p:/); assert.ok(!/Apelido/.test(out.fbg)); // individual, sem placar da turma
  assert.match(out.fbq, /Etapa 7 · Feedback/); assert.match(out.fbq, /Você acertou <b>1<\/b> de 1/); assert.match(out.fbq, /sua resposta/); assert.match(out.fbq, /✔ correta/); assert.match(out.fbq, /porque sim/);
  assert.match(out.nb1, /disabled/); assert.match(out.nb1, /Publique pelo menos um resultado/); assert.ok(!/disabled/.test(out.nb2)); assert.match(out.nb2, /Continuar →/); assert.match(out.nb8, /Fim da aula/); assert.equal(out.nb0, ''); // botão Continuar por etapa
  assert.ok(!html.includes('O professor liberou')); assert.ok(!/host|x-admin-key|hostBar|liberou|liberada/i.test(html)); assert.ok(!html.includes('stats')); assert.ok(html.includes("['a','b','c']"));
});
