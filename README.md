# Dimensionamento de Cabos FV · Solcor

Abre `cabos-rt.html` no navegador para usar a ferramenta tal como está.

## Passar o desenvolvimento para o Claude Code

1. Descompacta esta pasta (`solcor-cabos`) no teu computador.
2. Instala o Claude Code (ou usa a app de ambiente de trabalho do Claude, separador **Code**):
   - macOS / Linux: `curl -fsSL https://claude.ai/install.sh | bash`
   - Windows (PowerShell): `irm https://claude.ai/install.ps1 | iex`
3. Instala as ferramentas usadas no build e nos testes: Python 3 (com `openpyxl`) e Node.js. Na pasta: `npm i -D playwright && npx playwright install chromium`.
4. Cria um repositório git para guardar o histórico: `git init && git add . && git commit -m "Versão inicial"` (opcional: envia para o GitHub/GitLab da Solcor).
5. Abre o Claude Code na pasta: `cd solcor-cabos && claude`.
6. O Claude Code lê o `CLAUDE.md` automaticamente: lá estão a estrutura, os comandos de build e teste e todas as regras de dimensionamento e de desenho já acordadas.

Primeiro pedido sugerido: *"Lê o CLAUDE.md, corre o build e os testes e confirma que está tudo a funcionar."*

## Comandos

```bash
python3 build.py                      # gera cabos-rt.html
node dumpcalc.js && python3 verify.py # verificação dos cálculos → "ERROS 0"
node tests/separadores.js             # abre todos os separadores → "ERR []"
node tests/cenarios_unifilar.js       # esquemas de teste sA–sD.png
python3 mkprice.py                    # atualiza preços a partir de jmm/base.xlsx
python3 mkbrk.py                      # atualiza disjuntores a partir de cat/cat.json
```

## Alojar internamente

A página funciona sozinha, mas os **projetos e equipamentos partilhados** usam a base de dados dos artifacts do claude.ai. Para pôr a ferramenta num servidor da Solcor (por exemplo junto a media.tail00ca9b.ts.net), pede ao Claude Code para substituir `rt-share.js` por uma API própria (ex.: SQLite/Postgres) — está indicado no `CLAUDE.md`.
