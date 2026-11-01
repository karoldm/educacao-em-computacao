# Laboratório de Filtros (PDI)
**Site estático** (só front-end, sem servidor): cada aluno trabalha na própria imagem, no próprio navegador. Não há apelido, murais nem visualização de respostas de outros; os **feedbacks são individuais**.

Etapas: Entrada → **Aplicar** → **Analisar** (minijogo Filtro Misterioso) → Feedback → **Avaliar** → Feedback → **Criar** → Resumo.
Aplicar, Analisar, Avaliar e Criar são os níveis da taxonomia de Bloom usados.

## Rodar
- Abra `public/index.html` no navegador (funciona até com duplo clique) ou sirva a pasta `public/` com qualquer servidor estático (ex.: `npx serve public`).
- `npm test` → 22 testes (motor de filtros, regras do jogo/quiz, interface percorrendo todas as etapas, estrutura estática). Slides: `slides/aula_pdi.pptx` (modo apresentação, F5).

## Deploy na Vercel (estático)
1. Apague do repositório o antigo `server.js` (e qualquer pasta `api/`): se ele existir, a Vercel volta a tratar o projeto como servidor.
2. Mantenha o `vercel.json` (`{"outputDirectory":"public"}`). Root Directory = pasta do projeto (ex.: `aula-02`). Framework Preset "Other", sem Build Command e sem variáveis de ambiente.
3. Não há Redis, `ADMIN_KEY`, `RESET_KEY` nem `/api`. Qualquer hospedagem estática serve (GitHub Pages, Netlify, etc.).

## Como funciona
- **Ritmo individual:** ao concluir cada etapa, o botão **Continuar →** é habilitado (Aplicar: aplicar pelo menos um filtro; Analisar: terminar as 3 rodadas, acertando ou pulando; Avaliar: enviar as respostas; Criar: executar pelo menos um filtro). Não se volta atrás.
- **Entrada:** só a imagem. Qualquer imagem é recortada em 4:3, reduzida a 96×72 e convertida para P&B (luminância). Ela fica só no navegador.
- **Aplicar:** original e resultado, filtros e pseudocódigo, e a lupa de pixels (só aqui).
- **Analisar (Filtro Misterioso):** 3 rodadas (1, 2 e 3 filtros sorteados sobre a imagem do aluno); base 100/150/200, −10 por erro, −1 a cada 3 s, mínimo 20%; pular vale 0. **Feedback:** desempenho e os filtros misteriosos com pseudocódigo.
- **Avaliar:** 4 perguntas com 3 opções + recurso de consulta (Cap. 2 (2.3.1), p. 50). O gabarito só aparece no **Feedback** seguinte.
- **Criar:** blocos (incl. **Borda** e **Suavizar**) com pseudocódigo + curiosidade (Cap. 4, p. 103). **Resumo** final individual.
- **Progresso:** salvo no `localStorage` do navegador; recarregar a página continua de onde parou. O botão "Recomeçar do zero" apaga tudo.

## Arquitetura
`public/engine.js` (filtros, blocos, conversão P&B) · `public/game.js` (etapas, minijogo, quiz e regras de progresso; funções puras e testáveis) · `public/index.html` + `style.css` (interface) · `tools/build_slides.py` (regenera os slides; pillow, numpy, python-pptx; usa `assets/folhas.png`).

## Limitações
Como tudo roda no navegador, o gabarito do quiz e as cadeias do minijogo ficam no código da página: quem abrir as ferramentas do navegador consegue vê-los (não há como impedir sem servidor). Não existe ranking nem compartilhamento entre alunos; o progresso é por aparelho/navegador (limpar os dados do navegador apaga). A interface não foi testada por mim em navegador real (os testes simulam o navegador).
