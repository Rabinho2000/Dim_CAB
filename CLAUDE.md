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
node tests/sem_solucao.js             # 2 × 150 kW em tubo (B2): explicação "sem secção" em tests/sem_solucao.png
node tests/partilha_servidor.js       # duas pessoas no servidor próprio: projeto e equipamento partilhados, permissões
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
- `rt-price.js` — preços de cabo (`jmm/prices.json`, compras 2026 JMM + Indusmelec).
- `rt-sld.js` — esquema unifilar SVG e exportação SVG/PNG/PDF.
- `rt-board.js` — composição de cada quadro (`qfvParts`, `meterHost`) e separador Quadros (dimensão da envolvente, raio de curvatura).
- `rt-share.js` — projetos e equipamentos partilhados, descargas. Usa `claude.use('db'|'user')` no claude.ai ou `apiConnect()` (`rt-api.js`) quando a página vem do servidor próprio; aberta como ficheiro, fica só o projeto local.
- `rt-api.js` — adaptador do navegador para a API do servidor, com a mesma interface (`collection().doc().set/delete`, `onSnapshot` por consulta de `/api/rev` a cada 4 s).
- `server/server.js` + `server/db.js` — servidor Node sem dependências (`node:http`, `node:sqlite`): serve `cabos-rt.html` e a API `/api/{projects,inversores,paineis,gateways,precos}[/id[/history]]`, `/api/me`, `/api/rev`, `/api/users`. Identidade pelos cabeçalhos do `tailscale serve` ou por `X-User-Name` (local). Projetos só podem ser apagados pelo autor ou por `ADMINS`. Arranque e alojamento: README.
- `mkbrk.py` gera `brk.json` a partir da tabela ABB (`cat/`); `mkprice.py` gera `jmm/prices.json` a partir de `jmm/base.xlsx`.
- `fontes/` — Excel original, quadros tipo e os dois DWG de esquemas unifilares de referência.

## Regras de dimensionamento (definidas pelo utilizador — não alterar sem pedir)

- Material automático: alumínio só se distância > 15 m **e** potência > 30 kW (editáveis); alumínio sempre monocondutor e nunca abaixo de 16 mm².
- No máximo 3 cabos por fase. Preferir o menor nº de cabos por fase e, depois, a menor secção.
- Inversores iguais no mesmo quadro ficam com o mesmo cabo, salvo se a distância obrigar; minimizar o nº de cabos diferentes na obra (subir no máximo 1 secção).
- Disjuntor: Iac máx ≤ In ≤ Iz e I₂ ≤ 1,45·Iz (k₂ 1,45 modulares até 125 A, 1,30 caixa moldada).
- Queda de tensão verificada **só por troço** (3 %), nunca acumulada. Fórmula da folha Excel: u = b·(ρ·L'/S·cos φ + X·L'·sin φ)·Ib/n, ΔU% = u/230; L' = L+20 % (< 30 m) ou +10 % (≥ 30 m); b = 1 trifásico, 2 monofásico; ρ Cu 0,0225, Al 0,036. Mostrar ΔU em V e %.
- Monocondutores em E/F: disposição selecionável (trevo, esteira sem afastamento, afastamento H/V). O utilizador só indica o nº de esteiras; o agrupamento é calculado.
- Apresentação do cabo: Fases / Neutro / Terra (neutro RTIEBT 524.2, PE quadro 54F). No unifilar: notação dos desenhos, ex. "Cabo (LXV) 3x(1x120)+1x(1x70)+1G70 mm²".
- Preços: só compras de 2026, a mais recente de cada cabo; mostrar alternativa mais barata sem a aplicar.
- Curto-circuito: retirado da interface a pedido (o código fica em `rt-sc.js`).

## Regras de quadros e esquema unifilar (estilo dos DWG em `fontes/`)

- A Solcor só faz **QFV** e **Quadro de interligação**; sem interligação, a ligação fica no **quadro do cliente** (existente, desenhado a tracejado).
- QFV: interruptor de corte 4P, barramento 3F+N, por inversor bloco diferencial + disjuntor modular (≤ 100 A) ou disjuntor de caixa moldada + relé diferencial com toroide, bobine de emissão e fusível 2 A; DST tipo 2 (porta-fusíveis gG 125 A se o corte > 125 A); serviços auxiliares (diferencial 25 A + 16 A + 10 A) quando há relés; barra PE.
- **Com gateway**: ordem inversor → QFV → gateway → rede. O QFV **não tem barramento comum**: sai um cabo por inversor até à entrada do gateway, com DST por circuito. Sem gateway, o QFV tem barramento comum.
- Gateway Sigenergy desenhado como nos DWG: QF1 rede + KM1, QF3/QF5 backup/cargas (Q. Entrada), QF2 gerador + KM2, bypass QS1, DST, uma proteção por entrada (63 A nos C&I, 250 A nos SigenStack -B). Home* sem contactores. Rede entra no gateway; o quadro do cliente fica na saída de backup.
- Contagem **sempre num quadro de contagem próprio**, nunca dentro do QFV: direta (Honeywell AS3000) até 50 kW, indireta (AS3500 + TI x/5 A) acima. Localização: quadro do tipo Contagem se existir; com gateway, à saída do QFV; senão no quadro de interligação; senão à saída do QFV para o cliente.
- Tipos de quadro escolhidos no popup "Adicionar quadro" (Interligação, Contagem, Gateway, Cliente) ou deduzidos.

## Pendentes / a confirmar com o utilizador

- Dados DC do inversor Sigen PV 150 M1 (marcado "a confirmar").
- Nº de entradas do HomePro TP; calibres internos dos gateways além do C60-2.
- Contador com gateway e vários inversores (hoje: indireto com TI por circuito).
- Métodos B e B2 (quadros 52-C1…C4, 52-C13/C14) só têm valores até 120 mm² na RTIEBT (confirmado na folha Excel; não extrapolar). Sem secção que cumpra, o motor mostra a opção de maior Iz e `noFitMsg` explica o limite e sugere outra passagem (decisão do utilizador, out. 2026).
- A folha Excel tem um erro no 52-C13 (Cu 95 mm², B2, 2 condutores: 291 A; o correto é 201 A, que é o valor usado na app).

## Notas técnicas

- O build junta tudo num único HTML (sem bundler). Bibliotecas externas só por CDN (jsPDF 2.5.1, JSZip 3.10.1 em cdnjs).
- Partilha: claude.ai (`window.claude.use`) ou servidor próprio (`server/`, SQLite em `data/`, fora do git). Descargas: `claude.use('downloads')` ou `<a download>`.
- `tests/partilha_mock.js` (modo claude.ai) já falhava antes do servidor, no passo do gateway (`#gw-body select[data-g=modelo]`); não está no `npm test`.
- Estado guardado em `localStorage` (`cabosrt.v1`).
