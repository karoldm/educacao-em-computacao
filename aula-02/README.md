# Laboratório de Filtros (PDI)
Plataforma em etapas, com visual pixel art: Entrada → **Aplicar** → Mural → **Analisar** (minijogo Filtro Misterioso) → Feedback → **Avaliar** → Feedback → **Criar** → Mural.
Aplicar, Analisar, Avaliar e Criar são os níveis da taxonomia de Bloom usados. Sem dependências no servidor (Node 18+).

## Rodar
- `npm start` → http://localhost:3000. `npm test` → 16 testes.
- Slides: `slides/aula_pdi.pptx` (modo apresentação, F5, para as animações).

## Ritmo da aula
Ninguém libera etapas: **cada aluno avança no próprio ritmo**. Ao concluir uma etapa, o botão **Continuar →** é habilitado (a etapa seguinte só abre para quem clicou). Não há painel de admin nem chave.
- **Aplicar:** publicar pelo menos um resultado.
- **Analisar:** terminar as 3 rodadas (acertando ou pulando).
- **Avaliar:** enviar as respostas.
- **Criar:** publicar pelo menos um filtro.
- Mural e Feedback são livres para continuar. Ao seguir adiante não se volta atrás (envios da etapa anterior são recusados).
O servidor aplica essas regras: um aluno só age na etapa em que está e só vê o que já alcançou (murais, imagens dos outros e gabaritos).

## Etapas
1. **Entrada:** apelido único + upload de **qualquer imagem** (recortada em 4:3, reduzida a 96×72 e convertida para P&B por luminância). Aviso de que os demais alunos verão a imagem nos murais e feedbacks.
2. **Aplicar:** original e resultado, filtros e pseudocódigo, e a lupa de pixels (só aqui). **Mural:** nome + imagem resultado de cada aluno que já publicou (compartilhado e ao vivo, visível a quem já chegou nele).
3. **Analisar (Filtro Misterioso):** 3 rodadas; pontos e tempo calculados no servidor (base 100/150/200, −10 por erro, −1 a cada 3 s, mínimo 20%). **Feedback individual:** só o seu desempenho e os filtros misteriosos da sua imagem, com pseudocódigo. Não há ranking da turma.
4. **Avaliar:** 4 perguntas com 3 opções + recurso de consulta (livro, Cap. 2 (2.3.1), p. 50). O gabarito só aparece no **feedback individual** seguinte.
5. **Criar:** blocos (incl. **Borda** e **Suavizar**) com pseudocódigo + curiosidade sobre os novos filtros (livro, Cap. 4, p. 103). **Mural** final.

## Arquitetura
`public/engine.js` (filtros, blocos, conversão P&B) · `server.js` (API + estado em memória; exporta também um handler para a Vercel) · `public/index.html` · `public/style.css` · `tools/build_slides.py` (regenera os slides; pillow, numpy, python-pptx; usa `assets/folhas.png`).

## Deploy
- **Render (recomendado):** Root Directory = pasta do projeto, Start `npm start`. Não precisa de variáveis de ambiente. O estado em memória some quando o serviço dorme ou reinicia.
- **Vercel:** sobe, mas é serverless: o estado em memória pode se perder quando a instância muda (alunos "somem"). Para uso confiável é preciso um banco externo (ex.: Upstash Redis). Se aparecer "Arquivo ausente no servidor: ...", o texto diz qual arquivo faltou no deploy.

## Limitações
Estado só em memória (reiniciar apaga tudo); sem login; arrastar e soltar não implementado; interface não testada por mim em navegador real (há testes de servidor, motor e um teste de fumaça da interface).
