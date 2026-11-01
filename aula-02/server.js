// Servidor sem dependências. Todo o estado (participantes, murais, jogo) fica EM MEMÓRIA. Cada aluno avança no PRÓPRIO ritmo.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), E = require('./public/engine.js');
// Etapas: 0 Entrada · 1 Aplicar · 2 Mural · 3 Analisar (minijogo) · 4 Feedback · 5 Avaliar · 6 Feedback · 7 Criar · 8 Mural
const LAST = 8, MURAL = { apply: 2, create: 8 }; // etapa a partir da qual cada mural (compartilhado) abre para o aluno; os feedbacks (4 e 6) são individuais
// Minijogo "Filtro Misterioso": 3 rodadas com cadeias cada vez maiores, sorteadas por aluno sobre a imagem dele.
const ROUNDS = [{ len: 1, base: 100 }, { len: 2, base: 150 }, { len: 3, base: 200 }];
const QUIZ = [
  { goal: 'Clarear a imagem em 40, sem gerar valores acima de 255.', a: ['p = p + 40'], b: ['p = p + 40', 'SE p > 255:', '    p = 255'], c: ['SE p > 255:', '    p = 255', 'p = p + 40'], ok: 'b', why: 'Primeiro soma, depois limita: 230 + 40 = 270 vira 255. Em A não há limite (270 é inválido) e em C o limite vem antes da soma, então 230 ainda chega a 270.' },
  { goal: 'Escurecer a imagem em 40, sem gerar valores abaixo de 0.', a: ['p = p - 40'], b: ['SE p < 0:', '    p = 0', 'p = p - 40'], c: ['p = p - 40', 'SE p < 0:', '    p = 0'], ok: 'c', why: 'Primeiro subtrai, depois limita: 20 − 40 = −20 vira 0. Em A não há limite e em B o limite vem antes da subtração, então 20 ainda chega a −20.' },
  { goal: 'Inverter: o preto (0) vira branco (255) e o branco vira preto.', a: ['p = 255 - p'], b: ['p = p - 255'], c: ['p = 255 + p'], ok: 'a', why: '255 − p leva 0 → 255 e 255 → 0. Em B o resultado fica entre −255 e 0; em C, entre 255 e 510: ambos saem de 0–255.' },
  { goal: 'Preto e branco: pixels escuros (abaixo de 128) viram preto, os demais viram branco.', a: ['SE p < 128:', '    p = 255', 'SENÃO:', '    p = 0'], b: ['SE p < 128:', '    p = 0', 'SENÃO:', '    p = 255'], c: ['SE p > 128:', '    p = 0', 'SENÃO:', '    p = 255'], ok: 'b', why: 'Com limiar 128: 127 → 0 (preto) e 128 → 255 (branco). A inverte os papéis; C pinta de preto os pixels claros (e o 128 vira branco).' },
];
const bad = (m, s = 400) => Object.assign(new Error(m), { status: s });
const names = (c, max) => { if (!Array.isArray(c) || !c.length || c.length > max || c.some(n => !E.F[n])) throw bad('Sequência inválida.'); return c; };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
// Caminhos literais dentro de path.join(__dirname, '...'): assim o empacotador da Vercel inclui cada arquivo no deploy.
const FILES = {
  '/': ['public/index.html', () => fs.readFileSync(path.join(__dirname, 'public/index.html'))],
  '/engine.js': ['public/engine.js', () => fs.readFileSync(path.join(__dirname, 'public/engine.js'))],
  '/style.css': ['public/style.css', () => fs.readFileSync(path.join(__dirname, 'public/style.css'))],
  '/aula.pptx': ['slides/aula_pdi.pptx', () => fs.readFileSync(path.join(__dirname, 'slides/aula_pdi.pptx'))],
};
// Sorteia a cadeia de cada rodada; o alvo nunca é igual à imagem original.
const mystery = img => ROUNDS.map(({ len }) => { const n = Object.keys(E.F); for (let k = 0; k < 200; k++) { const c = Array.from({ length: len }, () => n[crypto.randomInt(n.length)]); if (!E.same(E.apply(img, c), img)) return c; } return Array(len).fill('inverter'); });

function createServer() {
  const P = new Map(), wall = { apply: [], create: [] };
  const who = b => { const p = P.get(b.token); if (!p) throw bad('Entre com um apelido primeiro.', 401); return p; };
  const at = (p, n) => { if (p.stage !== n) throw bad('Esta etapa não está aberta para você.', 409); }; // só age na etapa em que está
  const need = (p, n) => { if (p.stage < n) throw bad('Você ainda não chegou a esta etapa.', 403); }; // só vê o que já alcançou
  const total = p => p.g.res.reduce((a, x) => a + x.pts, 0);
  // Cada etapa de atividade exige ser concluída para continuar; mural e feedback são livres.
  const RULE = { 1: p => p.apply >= 1, 3: p => p.g.res.length >= ROUNDS.length, 5: p => !!p.quiz, 7: p => p.create >= 1 };
  const HINT = { 1: 'Publique pelo menos um resultado antes de continuar.', 3: 'Termine as 3 rodadas (acertando ou pulando) antes de continuar.', 5: 'Envie suas respostas antes de continuar.', 7: 'Publique pelo menos um filtro antes de continuar.' };
  const canNext = p => p.stage < LAST && (RULE[p.stage] ? RULE[p.stage](p) : true);
  const gstate = p => { // tempo e pontos são do servidor; o alvo só é enviado para a rodada atual
    const g = p.g, r = g.res.length, live = r < ROUNDS.length;
    return { round: r, total: ROUNDS.length, done: !live, len: live ? ROUNDS[r].len : 0, target: live ? E.toB64(p.tg[r]) : null, wrong: g.wrong, elapsed: live && g.t0 ? Date.now() - g.t0 : 0, score: total(p), rounds: g.res.map(x => ({ pts: x.pts, secs: x.secs, wrong: x.wrong, solved: x.solved })), reveal: p.stage >= 4 ? p.mys : null };
  };
  const post = {
    '/api/join': b => {
      const n = String(b.nick || '').trim().slice(0, 20);
      if (!n) throw bad('Informe um apelido (até 20 caracteres).');
      if (P.size >= 300) throw bad('Sala cheia.');
      if ([...P.values()].some(p => p.nick.toLowerCase() === n.toLowerCase())) throw bad('Apelido já em uso. Escolha outro.', 409);
      const rgb = Buffer.from(String(b.rgb || ''), 'base64'); // RGB 96×72 enviado pelo navegador; qualquer imagem vale: o servidor converte para cinza
      if (rgb.length !== E.W * E.H * 3) throw bad('Envie uma imagem válida.');
      const token = crypto.randomUUID(), pid = crypto.randomBytes(4).toString('hex'), img = E.grayFromRgb(rgb), mys = mystery(img);
      P.set(token, { nick: n, pid, img, mys, tg: mys.map(m => E.apply(img, m)), g: { res: [], wrong: 0, t0: null }, stage: 1, apply: 0, create: 0 }); return { token, nick: n, pid };
    },
    '/api/next': b => { const p = who(b); if (!canNext(p)) throw bad(HINT[p.stage] || 'Não há próxima etapa.', 409); p.stage++; if (p.stage === 3) p.g.t0 = null; return { stage: p.stage }; },
    '/api/apply': b => { const p = who(b); at(p, 1); if (p.apply >= 5) throw bad('Limite de 5 publicações.'); const chain = names(b.chain, 6); p.apply++; const e = { pid: p.pid, nick: p.nick, chain, t: Date.now() }; wall.apply.push(e); return e; },
    '/api/game/guess': b => {
      const p = who(b); at(p, 3); const g = p.g, r = g.res.length; if (r >= ROUNDS.length) throw bad('Você já terminou o jogo.', 409);
      const chain = names(b.chain, ROUNDS[r].len); if (chain.length !== ROUNDS[r].len) throw bad('Use exatamente ' + ROUNDS[r].len + ' filtro(s) nesta rodada.');
      if (!g.t0) g.t0 = Date.now(); const out = E.apply(p.img, chain);
      if (E.same(out, p.tg[r])) { // vale o RESULTADO igual ao alvo (sequências equivalentes contam)
        const secs = Math.floor((Date.now() - g.t0) / 1000), base = ROUNDS[r].base, pts = Math.max(Math.round(base * .2), base - 10 * g.wrong - Math.floor(secs / 3));
        g.res.push({ pts, secs, wrong: g.wrong, solved: 1 }); g.wrong = 0; g.t0 = null; return { ok: true, pts, secs, expected: p.mys[r], exact: chain.join() === p.mys[r].join() };
      }
      g.wrong++; return { ok: false, wrong: g.wrong, match: out.d.reduce((a, v, i) => a + (v === p.tg[r].d[i]), 0) / out.d.length };
    },
    '/api/game/skip': b => { const p = who(b); at(p, 3); const g = p.g; if (g.res.length >= ROUNDS.length) throw bad('Você já terminou o jogo.', 409); g.res.push({ pts: 0, secs: g.t0 ? Math.floor((Date.now() - g.t0) / 1000) : 0, wrong: g.wrong, solved: 0 }); g.wrong = 0; g.t0 = null; return { ok: true }; },
    '/api/quiz': b => {
      const p = who(b); at(p, 5); if (p.quiz) throw bad('Você já enviou suas respostas.', 409);
      if (!Array.isArray(b.answers) || b.answers.length !== QUIZ.length || b.answers.some(a => !['a', 'b', 'c'].includes(a))) throw bad('Responda as 4 questões.');
      p.quiz = 1; p.quizAns = b.answers; return { ok: true }; // o feedback é individual e só abre na etapa seguinte
    },
    '/api/create': b => {
      const p = who(b); at(p, 7); if (p.create >= 5) throw bad('Limite de 5 publicações.');
      const blocks = (Array.isArray(b.blocks) ? b.blocks : []).map(x => ({ t: x && x.t, x: x && x.x }));
      const { invalid } = E.run(p.img, blocks); // valida e executa de verdade
      p.create++; const e = { pid: p.pid, nick: p.nick, blocks, pseudo: E.pseudo(blocks), invalid, t: Date.now() }; wall.create.push(e); return e;
    },
  };
  const get = (url, q) => {
    const me = () => who({ token: q.get('token') });
    if (url === '/api/state') { const p = P.get(q.get('token')); return p ? { stage: p.stage, nick: p.nick, pid: p.pid, can: canNext(p), total: P.size } : { stage: 0, nick: null, pid: null, can: false, total: P.size }; }
    if (url === '/api/game') { const p = me(); need(p, 3); if (p.stage === 3 && !p.g.t0 && p.g.res.length < ROUNDS.length) p.g.t0 = Date.now(); return gstate(p); }
    const im = /^\/api\/img\/([0-9a-f]{8})$/.exec(url);
    if (im) { const p = me(), o = [...P.values()].find(x => x.pid === im[1]); if (!o) throw bad('Imagem não encontrada.', 404); if (o.pid !== p.pid) need(p, 2); return { d: E.toB64(o.img) }; } // a sua sempre; as dos outros só a partir do primeiro mural
    if (url === '/api/quiz') { need(me(), 5); return QUIZ.map(({ goal, a, b, c }) => ({ goal, a, b, c })); }
    if (url === '/api/quiz/feedback') { // feedback INDIVIDUAL: cada aluno vê só as próprias respostas (gabarito calculado aqui)
      const p = me(); need(p, 6); const items = QUIZ.map((qq, i) => { const mine = p.quizAns ? p.quizAns[i] : null; return { goal: qq.goal, a: qq.a, b: qq.b, c: qq.c, mine, correct: qq.ok, ok: mine === qq.ok, why: qq.why }; });
      return { score: items.filter(i => i.ok).length, answered: !!p.quizAns, items };
    }
    const m = /^\/api\/wall\/(apply|create)$/.exec(url);
    if (m) { need(me(), MURAL[m[1]]); return [...wall[m[1]]].reverse(); }
    throw bad('Não encontrado', 404);
  };
  return http.createServer((req, res) => {
    const send = (c, o, t = 'application/json') => { res.writeHead(c, { 'Content-Type': t }); res.end(typeof o === 'string' || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
    const [url, qs] = req.url.split('?');
    try {
      if (req.method === 'GET' && FILES[url]) { const [rel, read] = FILES[url]; let buf; try { buf = read(); } catch (e) { throw bad('Arquivo ausente no servidor: ' + rel + ' (procurado em ' + path.join(__dirname, rel) + ')', 404); } return send(200, buf, TYPES[path.extname(rel)]); }
      if (req.method === 'GET') return send(200, get(url, new URLSearchParams(qs || '')));
      if (req.method === 'POST' && post[url]) {
        let raw = ''; req.on('data', c => { raw += c; if (raw.length > 60000) req.destroy(); });
        return req.on('end', () => { try { send(200, post[url](JSON.parse(raw || '{}'))); } catch (e) { send(e.status || 400, { erro: e.status ? e.message : 'Requisição inválida.' }); } });
      }
      send(404, { erro: 'Não encontrado' });
    } catch (e) { send(e.status || 500, { erro: e.status ? e.message : 'Erro interno' }); }
  });
}
// Vercel: o módulo precisa exportar uma função (req, res). Uma única instância atende as requisições deste processo
// (o estado fica em memória: em serverless ele pode sumir quando a instância é trocada; veja o README).
let shared;
const handler = (req, res) => { shared = shared || createServer(); shared.emit('request', req, res); };
module.exports = Object.assign(handler, { createServer });
if (require.main === module) { const miss = Object.values(FILES).map(v => v[0]).filter(f => !fs.existsSync(path.join(__dirname, f))); if (miss.length) console.warn('ATENÇÃO: arquivos ausentes (verifique o commit/deploy): ' + miss.join(', ')); const port = process.env.PORT || 3000; createServer().listen(port, () => console.log('Alunos: http://localhost:' + port)); }
