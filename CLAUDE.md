# Dimensionamento de Cabos FV · Solcor

Ferramenta web (uma página HTML) para dimensionar cabos AC e escolher disjuntores ABB em instalações fotovoltaicas, segundo as RTIEBT (Portaria 949-A/2006), com esquema unifilar no estilo dos desenhos Solcor e sugestão de quadros. Interface e textos em português de Portugal.

## Como gerar e testar

```bash
npm test                              # build + todos os testes abaixo, por esta ordem
python build.py                       # junta os módulos e gera cabos-rt.html
node --test tests/engine.test.js      # testes unitários do motor em Node, sem navegador (regras, fórmulas, exemplo)
node --test tests/api.test.js         # API do servidor (base em memória)
node dumpcalc.js && python verify.py  # verificação independente dos cálculos (tem de dar "ERROS 0")
node tests/separadores.js             # abre todos os separadores; tem de dar "ERR []"
node tests/cenarios_unifilar.js       # gera sA–sD.png com 4 topologias (com/sem gateway, contagem)
node tests/sem_solucao.js             # 3 × 150 kW em tubo (B2): explicação "sem secção" em tests/sem_solucao.png
node tests/relatorio.js               # relatório de cálculo PDF (botão) para o exemplo e o caso sem secção: tests/relatorio_*.pdf e _pN.png
node tests/dxf.js                     # unifilar em DXF: estrutura R12 e comparação visual com o SVG
node tests/poder_corte.js             # poder de corte: não verificado por omissão; PT 2500 kVA → E1.2 42 kA a rever
node tests/comparar.js                # comparar alternativas sem mexer no projeto; aplicar
node tests/avisos.js                  # componentes nos Quadros, coluna Esteira (agrupamento), ΔU acumulada, seletividade, proteção de interface
node tests/precos.js                  # Excel de compras na página = mkprice.py; atualização dos preços da equipa
node tests/partilha_mock.js           # modo claude.ai simulado: projetos, equipamentos, gateway, descargas
node tests/obra.js                    # resumo dos projetos e acompanhamento em obra (duas pessoas)
node tests/aprovacao.js               # aprovar, só de leitura, estado até concluído, nova revisão, versões
node tests/partilha_servidor.js       # duas pessoas no servidor próprio: partilha, permissões, conflitos, versões (tests/conflito.png)
node tests/orcamento.js               # descarrega o orçamento PDF do exemplo e confere os totais com solveAll()
node tests/quadros_indus.js           # componentes dos quadros à Indusmelec: envolvente, corte, DST, repartição, bornes, montagem
npm start                             # servidor em http://127.0.0.1:8080 (depois de npm run build)
```
Os testes de interface usam Playwright (`npm i && npx playwright install chromium`).
Correr sempre `npm test` depois de qualquer alteração. No Windows usar `python` (não `python3`).

## Estrutura

- `rt-template.html` — página, CSS (cores Solcor: verde #38D430, tinta #1A2028; fontes Syne / DM Sans / JetBrains Mono; fundo claro, faixa escura com o logótipo) e separadores. `rt-panes.html` — separadores Esquema unifilar, Quadros, Equipamentos, Projetos.
- `rt-data.js` — tabelas RTIEBT (52-C1…C4, C9…C14, C30, D1, D2, E1…E6), modos de instalação 52H com imagens, `INVDB` (inversores, com dados DC), `PANELDB`.
- `rt-engine.js` — motor de cálculo, sem DOM: constantes, `GWDB`, `example()`, fatores, `izBase`, `calc()` (Iz, In, ΔU), topologia, `solve()` (otimizador), `solveAll()`, `condSizes`, `cableParts`. Lê o estado global `S`. Testado em Node por `tests/engine.test.js` (carregado com `tests/engine-env.js`).
- `rt-app.js` — interface: estado `S` e `localStorage`, tabelas, `render()`, popup "Novo quadro", tipos de quadro.
- `rt-sc.js` — escada de disjuntores ABB (`BRK` de `brk.json`) e curto-circuito (desligado na interface, código mantido).
- `rt-price.js` — preços de cabo e de terminais (`jmm/prices.json`, compras 2026 JMM + Indusmelec, a mais recente; secções sem compra interpoladas e marcadas "estimado"). Terminais (`termLines`/`termCost`): nas duas pontas, por conjunto em paralelo um por fase e um no neutro, mais um de terra; cobre = terminal de cravar, alumínio = bimetálico Cu/Al; multicondutores com ponteiras, não contadas. Entram em `R.termTot`, no orçamento (secção Terminais) e na comparação "Mais barato e também cumpre" (cabo + terminais).
- `rt-sld.js` — esquema unifilar SVG e exportação SVG/PNG/PDF.
- `rt-report.js` — relatório de cálculo em PDF (botão "Relatório de cálculo (PDF)" no topo): identificação, dados gerais, quadro resumo, cálculo de cada circuito (modo e quadro RTIEBT, fatores, Iz, In, I₂, ΔU, cabo, disjuntor), circuitos a rever e o unifilar em A3. Texto vetorial jsPDF; Δ, φ, ≤, → na fonte Symbol (Helvetica só tem Latin-1).
- `rt-docx.js` — relatório de cálculo em Word (botão "Word" ao lado do PDF): o mesmo conteúdo, com as linhas partilhadas de rt-report.js (`idRows`, `critRows`, `REPORT_NOTES`, `circRows`) e o unifilar em PNG; .docx gerado à mão (`zipStore`, que aceita binário). Respeitar a ordem dos elementos do esquema WordprocessingML (o Word recusa ficheiros fora de ordem). Teste: `tests/relatorio_docx.js`. Confirmado no Word pelo utilizador (out. 2026).
- Identificação dos cabos `c.code` (C1…Cn, atribuída em `solveAll` pela ordem da tabela): aparece na tabela, no unifilar, no relatório, no orçamento e no acompanhamento em obra (`cableMapData` em rt-track.js).
- `rt-bom.js` — orçamento em PDF (`bomData`: cabos por função/secção com o modelo de `costPerM`, total = `costTot`; proteções ABB como `brkTot`; composição dos quadros de `boardFor`). Só PDF (jsPDF), botões `data-bom` "Orçamento PDF" nos separadores Cabos AC e Quadros. `zipStore` (zip sem compressão) fica aqui para o relatório Word.
- `rt-dxf.js` — unifilar em DXF R12 (AC1009) para o AutoCAD, convertido do SVG de `sldSVG` (`svgToDxf`): 1 px = 0,2 mm, camadas UNIFILAR / TEXTO / TRACEJADO, barramentos como POLYLINE com espessura, setas como SOLID, texto em ASCII com `\U+XXXX`. Se acrescentares um tipo de elemento SVG ao unifilar, acrescenta-o aqui. Teste: `tests/dxf.js` (redesenha o DXF ao lado do SVG em tests/dxf_A.png e dxf_B.png). Confirmado no AutoCAD pelo utilizador (out. 2026).
- Cópias de segurança (server.js): `VACUUM INTO` a cada `BACKUP_HOURS` (24) para `BACKUP_DIR` (backups/ junto à base), mantém `BACKUP_KEEP` (14); `GET /api/backup` só para `ADMINS`. Exportar/importar projetos `.json` (`projExport`/`projImport` em rt-share.js): importados entram como projeto novo, rascunho, revisão A, sem aprovação. Teste: `tests/exportar.js`.
- `rt-track.js` — separador Projetos: resumo por estado (nº, kW AC, €/kW; ao guardar, o projeto leva `custo`) e "Acompanhamento em obra": cada cabo (C1…Cn) lançado / ligado / ensaiado, com quem e quando, em `S.obra.track`. No servidor, `POST /api/projects/:id/track` funciona também numa revisão aprovada e não mexe no resto; as marcas vêm da versão mais recente da equipa (atualização a cada 4 s). Teste: `tests/obra.js`.
- `rt-templates.js` — botão "Novo projeto" (antes "Repor exemplo"): modelos de topologia (`TPL`: exemplo de origem, QFV direto ao cliente, gateway C&I, residencial trifásico com gateway, residencial monofásico). Teste: `tests/modelos.js`.
- `rt-compare.js` — janela "Comparar alternativas" (Cabos AC): `variants()` em rt-engine.js calcula com `solveProject` o projeto atual e variantes (sempre cobre, sempre alumínio, uma esteira por inversor, inversores em tubo 3A, ΔU 2 %) e `summarize` dá cabos + terminais, proteções, total, ΔU máx., cabos diferentes, circuitos a rever; "Aplicar" troca o projeto aberto (não grava). Teste: `tests/comparar.js`.
- `solveProject(estado)` (rt-engine.js) calcula outro projeto sem mexer no aberto (cópia do estado; S reposto mesmo com erro). O resto do motor continua a ler `S`.
- `rt-indus.js` — componentes de cada quadro novo (QFV e interligação) **como a Indusmelec os orçamenta**, aprendido dos orçamentos Indusmelec de 2025–2026 nas pastas de projeto (`SP - Solcor/2_projects/*/3 - EPC/2. Proforma invoices`; decisão do utilizador, out. 2026: só 2025–2026, o que interessa são os componentes, o preço é secundário). `indusParts(node,R)` usa os aparelhos de `qfvParts` (regras Solcor abaixo) e acrescenta referências, envolvente, acessórios e montagem; `INDUS` tem o preço líquido do último orçamento de cada referência. Envolvente: 1 saída modular até 63 A Gewiss 40 CDK 24M (GW40104BS), até 100 A 36M (GW40105BD), acima 54M (GW40108BD); 2+ saídas modulares Hager univers FL52S + barramento UE21D2; com caixa moldada armário Eldon MCS 2000×800×600 (+ MF 2000×400×600 acima de 2 saídas); interligação ≤ 125 A Gewiss 24M, acima Schneider Spacial CRN 1000×800 (≤ 800 A) ou 1200×800. DST Finder 7P.24.8.275.0020 nos de parede, ABB OVR T1+T2 2CTB815710R4000 nos de chão. Repartidor TD 125 A (015.563820) nos modulares maiores que 24M; 5 × WPD 130 por cabo de saída até 50 mm². Relés: porta-fusíveis 1P+N + 2 fusíveis 2 A cada; serviços auxiliares: DS201 C25, S201 C16/C10, tomada Schuko, 3 LED, ventilação Finder. TI da contagem (CTD 125/5, TM3 200/5, TS85 800/5, CTD8S 1250/5). Montagem: 24M 80 €, 36M 90 €, 54M 125 €, univers 105 + 135 €/saída, chão 1950 + 1,75 €/kW (barramento e transporte incluídos), interligação de chão 250/300 €. As proteções de saída aparecem com `prot` e não entram no subtotal (já estão em `brkTot`). No separador Quadros (tabela por quadro) e no orçamento PDF (secção "Quadros elétricos"). Teste: `tests/quadros_indus.js`. Análise completa e linhas dos orçamentos ficaram fora do repositório (scratchpad da sessão).
- `rt-board.js` — composição de cada quadro (`qfvParts`, `meterHost`) e separador Quadros (espaço útil como uma Orion plus, raio de curvatura; o preço Hager das envolventes e o desconto Hager foram retirados: a Indusmelec não usa Orion plus em 2025–2026).
- `rt-share.js` — projetos e equipamentos partilhados, descargas. Usa `claude.use('db'|'user')` no claude.ai ou `apiConnect()` (`rt-api.js`) quando a página vem do servidor próprio; aberta como ficheiro, fica só o projeto local.
- **Aprovação e revisões** (decisão do utilizador, out. 2026): `S.obra.rev` (A, B, …) e `S.obra.aprov` ({id, nome, em}). "Aprovar revisão" (não deixa com circuitos a rever) grava com `lock:true`; o servidor regista quem aprovou pela identidade do pedido e recusa (423) gravar por cima ou apagar (salvo `ADMINS`). Depois de aprovada só o estado avança (aprovado → em obra → concluído) por `POST /api/projects/:id/estado`. "Nova revisão" (`X-New-Revision: 1`) volta a rascunho; a revisão aprovada fica no histórico (Versões). Revisão no unifilar, no relatório e no orçamento. Teste: `tests/aprovacao.js`.
- Dados da obra: `S.obra` = {cliente, morada, desenho, estado, rev, aprov} (separador Projetos; estados em `ESTADOS` de rt-share.js: rascunho, em análise, aprovado, em obra, concluído). Usados na legenda do unifilar (dono de obra, morada, nº do desenho), no relatório e no orçamento; o cliente e o estado vão também para a lista de projetos (filtro e procura). `S.loc` continua a ser a localização para as temperaturas.
- `rt-api.js` — adaptador do navegador para a API do servidor, com a mesma interface (`collection().doc().set/delete`, `onSnapshot` por consulta de `/api/rev` a cada 4 s).
- `server/server.js` + `server/db.js` — servidor Node sem dependências (`node:http`, `node:sqlite`): serve `cabos-rt.html` e a API `/api/{projects,inversores,paineis,gateways,precos}[/id[/history]]`, `/api/me`, `/api/rev`, `/api/users`. Identidade pelos cabeçalhos do `tailscale serve` ou por `X-User-Name` (local). Projetos só podem ser apagados pelo autor ou por `ADMINS`. Conflitos: o PUT leva `If-Match` com o `upd` da versão aberta (`CURUPD` em rt-share.js); se outra pessoa gravou entretanto, 409 e a página mostra a janela `#pjdlg` (abrir a versão dela / substituir). O separador Projetos avisa quando o projeto aberto tem versão mais recente e tem o botão "Versões" (histórico, repor versão anterior). Arranque e alojamento: README.
- `rt-pimport.js` — atualizar preços a partir do Excel de compras no separador Equipamentos › Preços: lê o .xlsx no navegador (zip com `DecompressionStream`, sem bibliotecas) e aplica as mesmas regras de `mkprice.py` (`pricesFromSheets`); mostra o que é novo / mais recente / igual / mais antigo e guarda só os novos e mais recentes na coleção `precos` da equipa. Também descarrega o `prices.json`. Teste: `tests/precos.js` (tem de dar igual a `jmm/prices.json`). Se mudares as regras de `mkprice.py`, muda também `pricesFromSheets`.
- `mkbrk.py` gera `brk.json` a partir da tabela ABB (`cat/`); `mkprice.py` gera `jmm/prices.json` a partir de `jmm/base.xlsx`.
- `fontes/` — Excel original, quadros tipo e os dois DWG de esquemas unifilares de referência.

## Regras de dimensionamento (definidas pelo utilizador — não alterar sem pedir)

- **Saídas pedidas** (decisão do utilizador, out. 2026): orçamento só em PDF. Foram retirados a pedido o dimensionamento de esteiras (largura, diâmetros), o mapa de cabos Excel/PDF, as etiquetas e o orçamento/lista de materiais em Excel; não voltar a propor. A coluna "Esteira" e o nº de esteiras continuam: são o agrupamento das RTIEBT.

- **A ferramenta é só para cabos AC** (decisão do utilizador, out. 2026): sem lado DC (strings, cabo solar, fusíveis gPV). Um separador "Strings DC" chegou a ser feito e foi retirado a pedido; não voltar a propor.

- Material automático: alumínio só se distância > 15 m **e** potência > 30 kW (editáveis); alumínio sempre monocondutor e nunca abaixo de 16 mm².
- No máximo 3 cabos por fase. Preferir o menor nº de cabos por fase e, depois, a menor secção.
- Inversores iguais no mesmo quadro ficam com o mesmo cabo, salvo se a distância obrigar; minimizar o nº de cabos diferentes na obra (subir no máximo 1 secção).
- **Corrente de serviço Ib dos inversores = potência aparente máxima da ficha (Smáx) à tensão da rede: Smáx / (√3·400 V), monofásico Smáx / 230 V**, como a folha Excel de origem (decisão do utilizador, out. 2026: objetivo é a menor secção que cumpre). Não usar a "Iac máx." das fichas, que vem muitas vezes a 380 V (ex.: SUN2000-100KTL-M2 110 kVA → 158,8 A e disjuntor 160 A, em vez de 160,4 A → 200 A). Sem ficha: 1,1 × Pnom / (√3·400).
- Disjuntor: Ib ≤ In ≤ Iz e I₂ ≤ 1,45·Iz (k₂ 1,45 modulares até 125 A, 1,30 caixa moldada). **Modular sempre que exista com o poder de corte pedido** (`pickBreaker`): até 125 A, aos 125 A S804P-C125 + interruptor diferencial F204A-125/0,5 (prática Indusmelec, aprovada pelo utilizador out. 2026; em 2P não há F202 de 125 A e fica a caixa moldada).
- Diferencial das caixas moldadas XT1/XT3/XT5 (prática Indusmelec, aprovada out. 2026): toroide WGC escolhido pelo feixe fases + neutro (`toroidFor`: Ø55…180 ou 105×220, folga de 30 %) + bobina de abertura, e **uma unidade central diferencial 4 E/S (CBS-4, 2CSJ341001R0202) por cada 4 caixas moldadas do mesmo quadro** (`applyCentral`, `R.central`; entra em `brkTot` e no orçamento). E1.2: relé RGU-10 + toroide 105×220 + bobina de mínima tensão.
- Queda de tensão verificada **só por troço** (3 %), nunca acumulada. Fórmula da folha Excel: u = b·(ρ·L'/S·cos φ + X·L'·sin φ)·Ib/n, ΔU% = u/230; L' = L+20 % (< 30 m) ou +10 % (≥ 30 m); b = 1 trifásico, 2 monofásico; ρ Cu 0,0225, Al 0,036. Mostrar ΔU em V e %.
- Monocondutores em E/F: disposição selecionável (trevo, esteira sem afastamento, afastamento H/V). O utilizador só indica o nº de esteiras; o agrupamento é calculado.
- **A Solcor trabalha sempre com neutro**, também até aos inversores trifásicos (decisão do utilizador, out. 2026): não propor cabos sem neutro.
- Apresentação do cabo: Fases / Neutro / Terra (neutro RTIEBT 524.2, PE quadro 54F). No unifilar: notação dos desenhos, ex. "Cabo (LXV) 3x(1x120)+1x(1x70)+1G70 mm²".
- Preços: só compras de 2026, a mais recente de cada cabo; mostrar alternativa mais barata sem a aplicar. A mesma regra para os terminais, mesmo com poucas compras em 2026 (decisão do utilizador, out. 2026: não incluir 2025).
- Curto-circuito: retirado da interface a pedido (o código fica em `rt-sc.js`). Exceção aprovada (out. 2026): **verificação do poder de corte** (Icu ≥ Icc máx. no local), opcional nos Critérios (`S.icu`: Icc conhecida no ponto de ligação ou PT com ucc 4 %/6 %, rede 500 MVA, sem cabo PT–quadro). Não muda a escolha do disjuntor: marca-o "a rever" e indica o da tabela que chega (`applyIcu` em rt-engine.js). Tabela `brk.json` (mkbrk.py): XT1 até H 70 kA, XT3 até S 50 kA (não há XT3 H no catálogo), XT5 até H 70 kA, E1.2 B/C/N (42/50/66 kA) de 800 a 1600 A. Na tabela ABB a descrição do E1.2 vem truncada ("E1.2 Di f 1000"): a versão tira-se do bloco de 10 referências (mkbrk.py, `e12`). O mais barato de cada calibre é o mesmo de antes.
- cos φ por inversor (coluna cos φ; em branco = o dos Critérios): entra na queda de tensão do inversor; nos percursos conta o menor cos φ dos inversores a montante (`c.cos`).
- Agrupamento real (out. 2026): coluna "Esteira" dos inversores (mesmo quadro e mesma letra contam juntos; em branco = todos os do quadro, como antes) e, em cada percurso, "+ N outros circuitos na esteira" (`p.extra`, entra em `nAgr`).
- Avisos que **não** põem o circuito "a rever": ΔU acumulada do inversor até à injeção acima de `S.lim` (5 % por omissão, nos Critérios; a regra continua a ser só por troço) e seletividade (`applySel`: In do percurso < 1,6 × o maior In a jusante → confirmar nas tabelas ABB).
- Proteção de interface: só se o utilizador indicar a potência a partir da qual se aplica (`S.pint`, Critérios); fica no quadro de interligação ou, sem ele, no primeiro QFV (`pintNode` em rt-board.js), como aparelho "a especificar". Não está codificada nenhuma regra regulamentar.
- **Nunca extrapolar os quadros da RTIEBT**: se um cabo, fator de temperatura ou fator de agrupamento não está no quadro, não se usa nesse contexto. O circuito fica "a rever" com a explicação (`noFitMsg`) e a indicação do que mudar. Casos tratados: secções acima de 120 mm² nos métodos B/B2; mais de 3 esteiras sobrepostas (52-E4/E5); mais de 3 circuitos monocondutores por esteira com esteiras sobrepostas (52-E5; numa só esteira usa-se o 52-E1 ref. 4/5, como na folha Excel); temperaturas fora do 52-D1/D2; secção escolhida à mão que não existe no quadro (volta a automático, `dropMsg`). Exceção prevista na norma: nos quadros de agrupamento (52-E1…E4), acima da última coluna usa-se o último valor (nota "sem redução adicional", confirmado pelo utilizador).

## Regras de quadros e esquema unifilar (estilo dos DWG em `fontes/`)

- A Solcor só faz **QFV** e **Quadro de interligação**; sem interligação, a ligação fica no **quadro do cliente** (existente, desenhado a tracejado).
- QFV: interruptor de corte 4P, barramento 3F+N, por inversor bloco diferencial + disjuntor modular (≤ 100 A) ou disjuntor de caixa moldada + relé diferencial com toroide, bobine de emissão e fusível 2 A; DST tipo 2 (protegido por disjuntor S800P 3P 100 A, 2CCG001233R0001, se o corte > 125 A; prática Indusmelec aprovada out. 2026, antes eram fusíveis gG 125 A); serviços auxiliares (diferencial 25 A + 16 A + 10 A) quando há relés; barra PE.
- **Com gateway**: ordem inversor → QFV → gateway → rede. O QFV **não tem barramento comum**: sai um cabo por inversor até à entrada do gateway, com DST por circuito. Sem gateway, o QFV tem barramento comum.
- Gateway Sigenergy desenhado como nos DWG: QF1 rede + KM1, QF3/QF5 backup/cargas (Q. Entrada), QF2 gerador + KM2, bypass QS1, DST, uma proteção por entrada (63 A nos C&I, 250 A nos SigenStack -B). Home* sem contactores. Rede entra no gateway; o quadro do cliente fica na saída de backup.
- Contagem **sempre num quadro de contagem próprio**, nunca dentro do QFV: direta (Honeywell AS3000) até 50 kW, indireta (AS3500 + TI x/5 A) acima. Localização: quadro do tipo Contagem se existir; com gateway, à saída do QFV; senão no quadro de interligação; senão à saída do QFV para o cliente.
- Tipos de quadro escolhidos no popup "Adicionar quadro" (Interligação, Contagem, Gateway, Cliente) ou deduzidos.

## Pendentes / a confirmar com o utilizador

- Nº de entradas do HomePro TP; calibres internos dos gateways além do C60-2.
- Contador com gateway e vários inversores (hoje: indireto com TI por circuito).
- Métodos B e B2 (quadros 52-C1…C4, 52-C13/C14) só têm valores até 120 mm² na RTIEBT (confirmado na folha Excel; não extrapolar). Sem secção que cumpra, o motor mostra a opção de maior Iz e `noFitMsg` explica o limite e sugere outra passagem (decisão do utilizador, out. 2026).

- A folha Excel tem um erro no 52-C13 (Cu 95 mm², B2, 2 condutores: 291 A; o correto é 201 A, que é o valor usado na app).

## Notas técnicas

- O build junta tudo num único HTML (sem bundler). Bibliotecas externas só por CDN (jsPDF 2.5.1, JSZip 3.10.1 em cdnjs).
- Partilha: claude.ai (`window.claude.use`) ou servidor próprio (`server/`, SQLite em `data/`, fora do git). Descargas: `claude.use('downloads')` ou `<a download>`.
- `tests/partilha_mock.js` simula o modo claude.ai (`window.claude.use`): projetos, equipamentos, gateway pela janela "Novo quadro" e descargas. Está no `npm test`.
- Estado guardado em `localStorage` (`cabosrt.v1`).
