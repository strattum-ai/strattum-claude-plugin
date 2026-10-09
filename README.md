# Plugins da Strattum para Claude

Marketplace de plugins da Strattum para Claude e Claude Code. Cada plugin vive
na própria pasta em `plugins/`, e o catálogo `.claude-plugin/marketplace.json`
lista todos eles.

| Plugin | Pasta | O que faz |
|---|---|---|
| Strattum - Company Brain | `plugins/strattum-company-brain` | Consulta o Company Brain da empresa com o login e as permissões de cada pessoa. Ver o README do plugin. |

## Como a organização recebe os plugins

Em `Organization settings > Plugins & skills > Add > Sync from GitHub`, escolha
este repositório, que precisa continuar privado. A sincronização lê a branch
padrão e entrega cada plugin com o acesso escolhido. Ela não cadastra
conectores: o conector de cada plugin continua em
`Organization settings > Connectors`.

No Claude Code, sem passar pela organização:

```bash
claude plugin marketplace add strattum-ai/strattum-claude-plugin
claude plugin install strattum-company-brain@strattum
```
