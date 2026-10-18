# Laboratório de Filtros (PDI)
Plataforma em **etapas liberadas pelo professor (admin)**, com visual pixel art:
Entrada → **Aplicar** → Mural → **Analisar** (minijogo Filtro Misterioso) → Ranking → **Avaliar** → Mural → **Criar** → Mural. (Aplicar, Analisar, Avaliar e Criar são os níveis da taxonomia de Bloom usados.)
Sem dependências no servidor (Node 18+).

## Rodar
- `npm start` → alunos em http://localhost:3000 · professor em http://localhost:3000/admin
- A **chave de admin** aparece no terminal ao iniciar (ou defina `ADMIN_KEY=suachave npm start`; em hospedagem use a variável de ambiente `ADMIN_KEY`).
- `npm test` → 16 testes (filtros, DSL e bloco de borda, conversão para P&B, etapas, minijogo, ranking, murais, quiz, reinício, fumaça da interface e painel do admin).
- Slides: `slides/aula_pdi.pptx` (também em `/aula.pptx`). Abra no PowerPoint em **modo apresentação (F5)**: as simulações são GIFs animados.

## Sala
1. **Entrada:** apelido único + upload de **qualquer imagem** (colorida ou não). O navegador recorta em 4:3, reduz para 96×72 e a converte para preto e branco por luminância (cinza = 0,299·R + 0,587·G + 0,114·B); o servidor refaz a conversão a partir do RGB enviado. A prévia mostra original e resultado. Imagens que já são P&B ficam iguais.
2. Cada aluno trabalha na **própria imagem** em Aplicar, no minijogo e em Criar. As imagens dos outros só aparecem nos murais.
3. **Aplicar:** imagem original e resultado lado a lado; abaixo, filtros e pseudocódigo; por último o seletor de pixels (lupa 8×8, **só nesta etapa**). O mural mostra apenas o nome e a imagem resultado de cada aluno.
4. **Analisar (Filtro Misterioso):** mostra também o pseudocódigo da sequência testada. 3 rodadas (1, 2 e 3 filtros sorteados sobre a imagem do aluno). Pontos: base 100/150/200, −10 por palpite errado, −1 a cada 3 s (mínimo 20% da base); pular vale 0. Tempo e pontos são do servidor; o tempo de cada rodada começa quando ela abre. Vale o resultado igual ao alvo (sequências equivalentes contam). O **ranking** abre na etapa seguinte, com a solução de cada rodada.
5. **Avaliar:** 4 perguntas com 3 opções cada; o gabarito fica só no servidor.
6. **Criar:** blocos de filtro, incluindo **Borda** (`p = |D − E| + |B − C|`, máx. 255) e **Suavizar** (cada pixel vira a média, arredondada, dele e dos 8 vizinhos). Fora da imagem vale o pixel mais próximo. O pseudocódigo é gerado, e blocos de vizinhança abrem um trecho próprio da receita.
7. **Painel do admin ao vivo:** em `/admin`, além de avançar etapas, o professor vê em tempo real o mural de Aplicar, o ranking do Analisar, os resultados de Avaliar e o mural de Criar (com pseudocódigo), em abas que por padrão seguem a etapa atual. O admin enxerga tudo **mesmo antes** de a etapa abrir para os alunos; as rotas dos alunos continuam bloqueadas por etapa.
8. Etapas só avançam no painel do admin. Ao avançar, a etapa anterior **encerra para todos** (envios novos são recusados). O mural de Avaliar é agregado e anônimo.

## Arquitetura
`public/engine.js` (filtros, DSL de blocos e checagem P&B, no navegador e no servidor) · `server.js` (API + estado) · `public/index.html` (alunos) · `public/admin.html` · `public/style.css` · `tools/build_slides.py` (regenera os slides; precisa de pillow, numpy, python-pptx; usa `assets/folhas.png`).

## Estado em memória
Etapa, participantes, imagens, jogo e murais ficam só na memória do processo. **Reiniciar o servidor (ou "Reiniciar sessão" no admin) apaga tudo.** Em hospedagem gratuita que "dorme", o estado também some.

## Limitações
- A chave de admin é uma proteção simples (sem login real).
- Arrastar e soltar não foi implementado (tudo por clique). Sem bloco condicional genérico em Criar.
- A interface não foi testada por mim em navegador real (só o servidor e o motor têm testes automáticos).
