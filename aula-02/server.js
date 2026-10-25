// Servidor sem dependências. Todo o estado (etapa, participantes, murais, jogo) fica EM MEMÓRIA. Etapas só avançam pelo admin.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), E = require('./public/engine.js');
const LAST = 8, MURAL = { apply: 2, quiz: 6, create: 8 }; // etapa em que cada mural abre (o ranking abre na etapa 4)
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
const FILES = { '/': 'public/index.html', '/admin': 'public/admin.html', '/engine.js': 'public/engine.js', '/style.css': 'public/style.css', '/aula.pptx': 'slides/aula_pdi.pptx' };
// Sorteia a cadeia de cada rodada; o alvo nunca é igual à imagem original.
const mystery = img => ROUNDS.map(({ len }) => { const n = Object.keys(E.F); for (let k = 0; k < 200; k++) { const c = Array.from({ length: len }, () => n[crypto.randomInt(n.length)]); if (!E.same(E.apply(img, c), img)) return c; } return Array(len).fill('inverter'); });

function createServer(o = {}) {
  const key = o.adminKey || process.env.ADMIN_KEY || crypto.randomBytes(3).toString('hex');
  let phase, P, wall, scores;
  const reset = () => { phase = 0; P = new Map(); wall = { apply: [], create: [] }; scores = []; };
  reset();
  const who = b => { const p = P.get(b.token); if (!p) throw bad('Entre com um apelido primeiro.', 401); return p; };
  const open = n => { if (phase !== n) throw bad('Esta etapa não está aberta (o professor já passou ou ainda não liberou).', 409); };
  const need0 = n => { if (phase < n) throw bad('Ainda não liberado pelo professor.', 403); };
  const adm = (h, f) => b => { if (h !== key) throw bad('Chave de admin inválida.', 403); return f(b); };
  const total = p => p.g.res.reduce((a, x) => a + x.pts, 0);
  const gstate = p => { // tempo e pontos são do servidor; o alvo só é enviado para a rodada atual
    const g = p.g, r = g.res.length, live = r < ROUNDS.length;
    return { round: r, total: ROUNDS.length, done: !live, len: live ? ROUNDS[r].len : 0, target: live ? E.toB64(p.tg[r]) : null, wrong: g.wrong, elapsed: live && g.t0 ? Date.now() - g.t0 : 0, score: total(p), rounds: g.res.map(x => ({ pts: x.pts, secs: x.secs, wrong: x.wrong, solved: x.solved })), reveal: phase >= 4 ? p.mys : null };
  };
  const counts = () => ({ apply: wall.apply.length, game: [...P.values()].filter(p => p.g.res.some(x => x.solved)).length, quiz: scores.length, create: wall.create.length });
  const post = {
    '/api/join': b => {
      const n = String(b.nick || '').trim().slice(0, 20);
      if (!n) throw bad('Informe um apelido (até 20 caracteres).');
      if (P.size >= 300) throw bad('Sala cheia.');
      if ([...P.values()].some(p => p.nick.toLowerCase() === n.toLowerCase())) throw bad('Apelido já em uso. Escolha outro.', 409);
      const rgb = Buffer.from(String(b.rgb || ''), 'base64'); // RGB 96×72 enviado pelo navegador; qualquer imagem vale: o servidor converte para cinza
      if (rgb.length !== E.W * E.H * 3) throw bad('Envie uma imagem válida.');
      const token = crypto.randomUUID(), pid = crypto.randomBytes(4).toString('hex'), img = E.grayFromRgb(rgb), mys = mystery(img);
      P.set(token, { nick: n, pid, img, mys, tg: mys.map(m => E.apply(img, m)), g: { res: [], wrong: 0, t0: null }, apply: 0, create: 0 }); return { token, nick: n, pid };
    },
    '/api/apply': b => { const p = who(b); open(1); if (p.apply >= 5) throw bad('Limite de 5 publicações.'); const chain = names(b.chain, 6); p.apply++; const e = { pid: p.pid, nick: p.nick, chain, t: Date.now() }; wall.apply.push(e); return e; },
    '/api/game/guess': b => {
      const p = who(b); open(3); const g = p.g, r = g.res.length; if (r >= ROUNDS.length) throw bad('Você já terminou o jogo.', 409);
      const chain = names(b.chain, ROUNDS[r].len); if (chain.length !== ROUNDS[r].len) throw bad('Use exatamente ' + ROUNDS[r].len + ' filtro(s) nesta rodada.');
      if (!g.t0) g.t0 = Date.now(); const out = E.apply(p.img, chain);
      if (E.same(out, p.tg[r])) { // vale o RESULTADO igual ao alvo (sequências equivalentes contam)
        const secs = Math.floor((Date.now() - g.t0) / 1000), base = ROUNDS[r].base, pts = Math.max(Math.round(base * .2), base - 10 * g.wrong - Math.floor(secs / 3));
        g.res.push({ pts, secs, wrong: g.wrong, solved: 1 }); g.wrong = 0; g.t0 = null; return { ok: true, pts, secs, expected: p.mys[r], exact: chain.join() === p.mys[r].join() };
      }
      g.wrong++; return { ok: false, wrong: g.wrong, match: out.d.reduce((a, v, i) => a + (v === p.tg[r].d[i]), 0) / out.d.length };
    },
    '/api/game/skip': b => { const p = who(b); open(3); const g = p.g; if (g.res.length >= ROUNDS.length) throw bad('Você já terminou o jogo.', 409); g.res.push({ pts: 0, secs: g.t0 ? Math.floor((Date.now() - g.t0) / 1000) : 0, wrong: g.wrong, solved: 0 }); g.wrong = 0; g.t0 = null; return { ok: true }; },
    '/api/quiz': b => {
      const p = who(b); open(5); if (p.quiz) throw bad('Você já enviou suas respostas.', 409);
      if (!Array.isArray(b.answers) || b.answers.length !== QUIZ.length || b.answers.some(a => !['a', 'b', 'c'].includes(a))) throw bad('Responda as 4 questões.');
      const items = QUIZ.map((q, i) => ({ ok: b.answers[i] === q.ok, correct: q.ok, why: q.why })); // pontuação recalculada aqui
      const score = items.filter(i => i.ok).length; p.quiz = 1; scores.push(score); return { score, items };
    },
    '/api/create': b => {
      const p = who(b); open(7); if (p.create >= 5) throw bad('Limite de 5 publicações.');
      const blocks = (Array.isArray(b.blocks) ? b.blocks : []).map(x => ({ t: x && x.t, x: x && x.x }));
      const { invalid } = E.run(p.img, blocks); // valida e executa de verdade
      p.create++; const e = { pid: p.pid, nick: p.nick, blocks, pseudo: E.pseudo(blocks), invalid, t: Date.now() }; wall.create.push(e); return e;
    },
  };
  const get = (url, q, h) => {
    const need = n => { if (h !== key) need0(n); }; // o admin enxerga murais, ranking e resultados em qualquer etapa, ao vivo
    if (url === '/api/state') { const p = P.get(q.get('token')); return { phase, nick: p ? p.nick : null, pid: p ? p.pid : null, total: P.size }; }
    if (url === '/api/game') { need(3); const p = who({ token: q.get('token') }); if (phase === 3 && !p.g.t0 && p.g.res.length < ROUNDS.length) p.g.t0 = Date.now(); return gstate(p); }
    if (url === '/api/ranking') {
      need(4); return [...P.values()].map(p => ({ nick: p.nick, pid: p.pid, score: total(p), solved: p.g.res.filter(x => x.solved).length, secs: p.g.res.reduce((a, x) => a + x.secs, 0), wrong: p.g.res.reduce((a, x) => a + x.wrong, 0) }))
        .sort((a, b) => b.score - a.score || a.secs - b.secs || a.nick.localeCompare(b.nick));
    }
    const im = /^\/api\/img\/([0-9a-f]{8})$/.exec(url);
    if (im) { const o = [...P.values()].find(x => x.pid === im[1]); if (!o) throw bad('Imagem não encontrada.', 404); const me = P.get(q.get('token')); if (!(me && me.pid === o.pid)) need(2); return { d: E.toB64(o.img) }; } // a sua sempre; as dos outros só nos murais
    if (url === '/api/quiz') { need(5); return QUIZ.map(({ goal, a, b, c }) => ({ goal, a, b, c })); }
    if (url === '/api/quiz/stats') { need(MURAL.quiz); const dist = [0, 0, 0, 0, 0]; scores.forEach(s => dist[s]++); return { total: scores.length, dist }; } // só agregados
    const m = /^\/api\/wall\/(apply|create)$/.exec(url);
    if (m) { need(MURAL[m[1]]); return [...wall[m[1]]].reverse(); }
    if (url === '/api/admin/status') return adm(h, () => ({ phase, last: LAST, nicks: [...P.values()].map(p => p.nick), counts: counts() }))();
    throw bad('Não encontrado', 404);
  };
  const server = http.createServer((req, res) => {
    const send = (c, o, t = 'application/json') => { res.writeHead(c, { 'Content-Type': t }); res.end(typeof o === 'string' || Buffer.isBuffer(o) ? o : JSON.stringify(o)); };
    const [url, qs] = req.url.split('?'), h = req.headers['x-admin-key'];
    try {
      if (req.method === 'GET' && FILES[url]) { if (!fs.existsSync(path.join(__dirname, FILES[url]))) throw bad('Arquivo ausente no servidor: ' + FILES[url] + ' (procurado em ' + path.join(__dirname, FILES[url]) + ')', 404); return send(200, fs.readFileSync(path.join(__dirname, FILES[url])), TYPES[path.extname(FILES[url])]); }
      if (req.method === 'GET') return send(200, get(url, new URLSearchParams(qs || ''), h));
      const adminPost = { '/api/admin/advance': () => { if (phase < LAST) phase++; return { phase }; }, '/api/admin/back': () => { if (phase > 0) phase--; return { phase }; }, '/api/admin/reset': () => { reset(); return { phase }; } }[url];
      if (req.method === 'POST' && (post[url] || adminPost)) {
        let raw = ''; req.on('data', c => { raw += c; if (raw.length > 60000) req.destroy(); });
        return req.on('end', () => { try { send(200, adminPost ? adm(h, adminPost)({}) : post[url](JSON.parse(raw || '{}'))); } catch (e) { send(e.status || 400, { erro: e.status ? e.message : 'Requisição inválida.' }); } });
      }
      send(404, { erro: 'Não encontrado' });
    } catch (e) { send(e.status || 500, { erro: e.status ? e.message : 'Erro interno' }); }
  });
  server.adminKey = key;
  return server;
}
module.exports = { createServer };
if (require.main === module) { const miss = Object.values(FILES).filter(f => !fs.existsSync(path.join(__dirname, f))); if (miss.length) console.warn('ATENÇÃO: arquivos ausentes (verifique o commit/deploy): ' + miss.join(', ')); const port = process.env.PORT || 3000, s = createServer(); s.listen(port, () => console.log(`Alunos: http://localhost:${port}\nAdmin:  http://localhost:${port}/admin   (chave: ${s.adminKey})`)); }
