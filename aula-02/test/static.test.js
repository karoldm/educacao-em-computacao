const t = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
t('é um site estático: sem servidor, sem chamadas de rede, só arquivos em public/', () => {
  assert.ok(!fs.existsSync(path.join(root, 'server.js'))); assert.ok(!fs.existsSync(path.join(root, 'api')));
  assert.deepEqual(fs.readdirSync(path.join(root, 'public')).sort(), ['engine.js', 'game.js', 'index.html', 'style.css']);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')), { framework: null, installCommand: null, buildCommand: null, outputDirectory: 'public' });
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')); assert.ok(!pkg.scripts.start && !pkg.dependencies);
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.match(html, /<script src="engine\.js">/); assert.match(html, /<script src="game\.js">/); assert.match(html, /href="style\.css"/); // caminhos relativos: funciona até abrindo o arquivo direto
  for (const f of ['index.html', 'engine.js', 'game.js']) assert.ok(!/fetch\(|XMLHttpRequest|\/api\//.test(fs.readFileSync(path.join(root, 'public', f), 'utf8')), f);
});
