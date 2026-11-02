# Laboratório de Filtros (PDI)
**Site estático** (só front-end, sem servidor): cada aluno trabalha na própria imagem, no próprio navegador. Não há apelido, murais nem visualização de respostas de outros; os **feedbacks são individuais**.

Etapas: Entrada → **Aplicar** → **Analisar** (minijogo Filtro Misterioso) → Feedback → **Avaliar** → Feedback → **Criar** → Resumo.
Aplicar, Analisar, Avaliar e Criar são os níveis da taxonomia de Bloom usados.

## Rodar
- Abra `public/index.html` no navegador (funciona até com duplo clique) ou sirva a pasta `public/` com qualquer servidor estático (ex.: `npx serve public`).
- `npm test` → 27 testes (motor de filtros, regras do jogo/quiz, interface percorrendo todas as etapas, estrutura estática).

## Deploy na Vercel (estático)
1. Apague do repositório o antigo `server.js` (e qualquer pasta `api/`). O `vercel.json` já pede deploy estático (`framework: null`, sem build, `outputDirectory: public`). Root Directory = pasta do projeto (ex.: `aula-02`). Sem variáveis de ambiente.
2. Se a Vercel ainda procurar um "entrypoint", o projeto guardou um preset de servidor: em Settings → Build & Deployment, escolha Framework Preset **Other** e deixe Build/Install Command vazios, Output Directory `public`.
3. Qualquer hospedagem estática serve (GitHub Pages, Netlify, etc.).

## Filtros
Por pixel: **Clarear**, **Escurecer**, **Inverter**, **Preto e branco**. De vizinhança: **Suavizar** (média 3×3) e **Borda** (`p = |D − E| + |B − C|`, máx. 255). Estão disponíveis em **Aplicar**, **Analisar** (minijogo), **Avaliar** (perguntas) e **Criar** (blocos), sempre com pseudocódigo.

### Casos de margem (também chamados de casos de borda)
O primeiro pixel não tem vizinho acima nem à esquerda (e o mesmo vale para toda a primeira/última linha e coluna). Regra usada: **o vizinho que falta é substituído pelo pixel mais próximo que existe dentro da imagem**; no canto, isso repete o próprio pixel.
- **Borda:** no primeiro pixel, E = C = o próprio pixel, então `p = |D − p| + |B − p|`.
- **Suavizar:** a janela 3×3 do primeiro pixel repete valores (o canto entra 4 vezes), e a soma continua sendo dividida por 9.
Isso aparece em: pseudocódigo (linha "vizinho fora da imagem"), explicação de cada filtro, um cartão com a janela 3×3 do primeiro pixel da imagem do aluno (com números e as cópias tracejadas) em Aplicar, Analisar e Criar, e uma pergunta no Avaliar. Em `engine.js`, `window3` usa a mesma regra dos filtros.

## Como funciona
- **Ritmo individual:** ao concluir cada etapa, o botão **Continuar →** é habilitado (Aplicar: aplicar pelo menos um filtro; Analisar: terminar as 3 rodadas, acertando ou pulando; Avaliar: enviar as respostas; Criar: executar pelo menos um filtro). Não se volta atrás.
- **Entrada:** só a imagem. Qualquer imagem é recortada em 4:3, reduzida a 96×72 e convertida para P&B (luminância). Ela fica só no navegador.
- **Aplicar:** original e resultado, filtros e pseudocódigo, e a lupa de pixels (só aqui).
- **Analisar (Filtro Misterioso):** 3 rodadas **fixas, iguais para toda a turma** (sem sorteio): 1) Borda; 2) Suavizar → Inverter; 3) Suavizar → Borda → Inverter. Cada aluno as aplica na própria imagem (por isso o alvo muda, mas o filtro misterioso é o mesmo). Pontos: base 100/150/200, −10 por erro, −1 a cada 3 s, mínimo 20%; pular vale 0; sequências equivalentes valem. **Feedback:** desempenho e a solução com pseudocódigo.
- **Avaliar:** 7 perguntas fixas (3 opções cada; Clarear, Escurecer, Inverter, Preto e branco, Suavizar, Borda e o caso do primeiro pixel) + recurso de consulta (Cap. 2 (2.3.1), p. 50). O gabarito só aparece no **Feedback** seguinte.
- **Criar:** blocos (incl. **Borda** e **Suavizar**) com pseudocódigo + curiosidade (Cap. 4, p. 103). **Resumo** final individual.
- **Progresso:** salvo no `localStorage`; recarregar continua de onde parou ("Recomeçar do zero" apaga). Progresso salvo por versões antigas é descartado.

## Arquitetura
`public/engine.js` (filtros, blocos, conversão P&B, janela 3×3) · `public/game.js` (etapas, minijogo, quiz e regras de progresso; funções puras e testáveis) · `public/index.html` + `style.css` (interface).

## Limitações
Como tudo roda no navegador, o gabarito do Avaliar e as soluções do minijogo ficam no código da página (quem abrir as ferramentas do navegador consegue vê-los; sem servidor não há como impedir). Não existe ranking nem compartilhamento entre alunos; o progresso é por aparelho/navegador. Imagens totalmente lisas (uma cor só) tornam o minijogo pouco útil, pois o filtro não muda nada. A interface não foi testada por mim em navegador real (os testes simulam o navegador).
