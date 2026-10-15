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

## Servidor da equipa (projetos e equipamentos partilhados)

```bash
npm run build
npm start                  # http://127.0.0.1:8080
```

O servidor (`server/`) serve a página e guarda os projetos, equipamentos e preços da equipa numa base SQLite (`data/solcor.db`). Usa só o que vem com o Node 22.13 ou mais recente, sem dependências. Cada gravação fica no histórico do projeto: o botão **Versões** no separador Projetos mostra quem gravou o quê e permite repor uma versão anterior. Se duas pessoas alterarem o mesmo projeto, quem grava em segundo lugar é avisado e escolhe entre abrir a versão da outra pessoa ou substituí-la.

**Quem é quem**
- **Com Tailscale (recomendado):** num computador sempre ligado da rede Tailscale da Solcor, corre `npm start` e depois `tailscale serve --bg 8080`. A ferramenta fica em `https://<máquina>.<tailnet>.ts.net` só para quem está na tailnet, e o servidor recebe o nome e o e-mail de cada pessoa a partir do Tailscale.
- **Sem Tailscale (uso local):** a página pede o nome uma vez. Isto serve só para mostrar quem guardou o quê, não é uma palavra-passe.

**Variáveis**: `PORT` (8080), `HOST` (127.0.0.1: deixa assim atrás do Tailscale), `DB_PATH` (data/solcor.db), `ADMINS` (e-mails separados por vírgulas; podem apagar projetos de outras pessoas).

**Cópias de segurança**: copiar `data/solcor.db` com o servidor parado, ou usar `sqlite3 data/solcor.db ".backup copia.db"` com ele a correr. Não guardes a base numa pasta sincronizada (OneDrive): a sincronização pode estragar o ficheiro enquanto está a ser escrito.

Aberto como ficheiro (`cabos-rt.html`) ou como artifact do claude.ai, a ferramenta continua a funcionar como antes.
