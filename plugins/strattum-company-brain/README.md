# Strattum - Company Brain

Plugin da Strattum para Claude e Claude Code. Com ele, cada pessoa da empresa
pergunta ao Company Brain em linguagem natural e recebe a resposta com as fontes
que o Brain devolveu, usando o próprio login e as próprias permissões.

> **English overview.** Strattum - Company Brain lets each employee query their
> company's Strattum Company Brain from Claude and Claude Code. The Brain runs
> in the company's own cloud (BYOC). The plugin ships a query skill and, for
> Claude Code, a remote MCP server whose URL each company provides. Every person
> signs in with OAuth to their company's Strattum Identity; the Brain applies
> that person's permissions on every call. The plugin holds no URL, token or
> data.

## O que o plugin faz

- Traz a skill **consult-company-brain**, que orienta o Claude a usar as
  ferramentas de leitura do Company Brain e a citar só as fontes que elas
  devolveram.
- No Claude Code, declara o servidor MCP `company-brain`, apontado para a URL do
  Company Brain da sua empresa.

## O que o plugin não faz

- Não traz URL, token, senha ou dado de nenhuma empresa. Cada empresa tem o
  próprio endereço, informado na configuração.
- Não faz login por você. Cada pessoa entra com a própria conta Strattum, e o
  Brain aplica as permissões dela em toda consulta.
- Não faz chamadas de rede próprias, não executa scripts e não grava nada no
  Brain. Todo acesso passa pelo servidor MCP da sua empresa.

## Para onde os dados vão

As consultas vão para o servidor MCP do Company Brain da sua empresa, que roda
na nuvem da própria empresa, e o login acontece no Strattum Identity dessa
mesma instalação. A origem da chamada depende da superfície:

- No Claude Code, com o servidor do plugin, a chamada sai do seu computador.
- No chat do Claude, e no Claude Code quando ele usa o conector da organização,
  a chamada sai da infraestrutura da Anthropic. Por isso o endereço do MCP
  precisa ser alcançável pela internet: um Brain acessível só por VPN não
  funciona no chat.

O plugin não recebe nem guarda tokens ou resultados, e a Strattum não opera um
intermediário entre o Claude e a sua empresa.

## Claude Code

Antes de começar, peça ao administrador a URL do MCP do Company Brain da sua
empresa. Ela tem o formato `https://<domínio-da-empresa>/mcp/` e não é segredo:
o acesso depende do seu login, feito no passo 4.

1. **Instale o plugin.** Se a sua organização distribui o plugin, ele já aparece
   em `/plugin`. Se não, instale pelo `/plugin` a partir da origem que o
   administrador indicar. A TI pode instalar já com a URL:

   ```bash
   claude plugin install strattum-company-brain@<origem> \
     --config mcp_url=https://<domínio-da-empresa>/mcp/
   ```

   Pela linha de comando não aparece formulário. Sem `--config`, o plugin fica
   instalado com a URL pendente.

2. **Informe a URL uma vez**, se ela ainda não estiver configurada, com
   `/plugin configure strattum-company-brain@<origem>`. A TI também pode gravar
   o valor por conta ou por máquina:

   ```bash
   echo '{"mcp_url":"https://<domínio-da-empresa>/mcp/"}' \
     | claude plugin configure strattum-company-brain@<origem> --values-stdin
   ```

   Use o identificador completo mostrado por `claude plugin list`. A instalação
   feita pela organização não preenche a URL. Depois de salvar, reinicie o
   Claude Code.

3. **Confira o servidor** em `/mcp`:
   `plugin:strattum-company-brain:company-brain` aponta para a URL da sua
   empresa e para nenhuma outra.

4. **Entre com a sua conta.** Em `/mcp`, escolha `company-brain` e depois
   **Authenticate**. O navegador abre o login Strattum da sua empresa. Entre com
   a sua conta e autorize. Instalar o plugin ou preencher a URL não faz esse
   login por você.

5. **Pergunte**, por exemplo: "O que o Company Brain sabe sobre a nossa política
   de reembolso?"

Se a sua organização já cadastrou o conector **Strattum - Company Brain** no
claude.ai e você conectou a sua conta lá, o Claude Code mostra esse conector em
`/mcp` como `claude.ai Strattum - Company Brain`, sem URL para configurar. Os
passos 2 a 4 servem para quem usa o servidor do plugin. Quando os dois apontam
para o mesmo endereço, o Claude Code usa o servidor do plugin e esconde o
conector repetido.

### Quando a URL está errada

O Claude Code só confere se o endereço é absoluto. Ele aceita `http://` e
qualquer caminho, então confira que a URL começa com `https://` e termina em
`/mcp/`. Nunca use `http://`: o Claude Code conecta mesmo assim, e o seu login
iria pela rede sem criptografia. Comportamento observado no Claude Code 2.1.285:

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| `company-brain` não aparece em `/mcp` | URL ainda não configurada | Faça o passo 2. |
| `required but not provided` ao salvar | Valor vazio | Informe a URL completa. |
| `URL is unset or invalid` | Endereço sem `https://` | Corrija para `https://<domínio-da-empresa>/mcp/`. |
| `Failed to connect` | Domínio errado, rede ou VPN, ou caminho diferente de `/mcp/` | Confira a URL com o administrador. |

Em nenhum desses casos o plugin tenta outro endereço: ele só conversa com a URL
configurada.

## Claude web e Claude Desktop

No chat do Claude (web e Desktop), o plugin traz a skill, mas ignora a URL da
configuração. O acesso aos dados vem de um conector que o administrador cadastra
uma vez para a organização. Plugin e conector são coisas separadas: ter o plugin
não cria o conector, e ter o conector não faz o login de ninguém.

### Para o administrador da organização (Team ou Enterprise)

1. **Disponibilize o plugin** em `Organization settings > Plugins & skills`. No
   piloto, use `Add > Upload a plugin` com o ZIP versionado que a Strattum
   entregar. Para quem vai usar, escolha **Installed by default**; no
   Enterprise, dá para restringir a um grupo.
2. **Cadastre o conector** em `Organization settings > Connectors`, com
   `Add > Custom > Web`, o nome **Strattum - Company Brain** e a URL
   `https://<domínio-da-empresa>/mcp/`. Na autenticação, escolha OAuth com o
   método que a Strattum homologou para a sua instalação. Não configure
   cabeçalho com token compartilhado. O endereço precisa ser alcançável pela
   internet, porque as chamadas do chat saem da infraestrutura da Anthropic.
3. **Teste antes de liberar**, com uma conta comum e com uma conta sem permissão
   no Brain: a primeira recebe resposta com fontes, a segunda recebe negação.

### Para cada pessoa

1. Abra o Claude com a conta da empresa. Com **Installed by default**, o plugin
   já está lá. Se a política for **Available to install**, adicione o plugin uma
   vez em `Customize > Plugins`.
2. Em `Customize > Connectors`, encontre **Strattum - Company Brain** e escolha
   **Connect**. Entre com a sua conta Strattum e autorize. Esse passo é
   obrigatório mesmo com o plugin instalado.
3. Numa conversa, habilite o conector em `+ > Connectors` se a interface pedir,
   e pergunte.

## Problemas comuns

| Situação | O que fazer |
|---|---|
| O Claude diz que não conseguiu consultar o Company Brain | No Claude Code, confira o servidor do Company Brain em `/mcp` (URL e login). No chat, confira se o conector está conectado em `Customize > Connectors` e habilitado na conversa. Se o conector não existe, fale com o administrador. |
| O login expirou ou foi recusado | Escolha **Authenticate** ou **Re-authenticate** em `/mcp` (Claude Code), ou **Connect** de novo (chat). |
| Acesso negado | O Brain recusou a fonte para a sua conta. Peça a revisão a quem cuida das permissões do Company Brain. Não use a conta de outra pessoa. |
| Nenhuma informação encontrada | O Brain não tem evidência sobre o assunto, ou a sua conta não enxerga essa fonte. A resposta diz isso em vez de completar com suposição. |
| O Brain respondeu com erro interno ou está indisponível | Falha do lado do serviço, sem relação com a sua conta. Tente de novo mais tarde e avise o administrador se continuar. |

O login acontece sempre no navegador, na página Strattum da sua empresa. Nunca
informe senha, token ou chave no chat.

## Revogar o acesso

- **Claude Code:** em `/mcp`, escolha o servidor do Company Brain e **Clear
  authentication** para apagar o login guardado. Para remover o plugin, use
  `/plugin` ou `claude plugin uninstall strattum-company-brain@<origem>`.
- **Chat do Claude:** em `Customize > Connectors`, desconecte **Strattum -
  Company Brain**.
- **Administrador:** remova o conector ou o plugin nas configurações da
  organização.

## O que a skill faz com cada pergunta

A skill **consult-company-brain** usa só as ferramentas do Company Brain da sua
empresa, todas de leitura: `assemble_context` para perguntas abertas;
`list_knowledge_contexts`, `search_knowledge` e `read_knowledge_document` para
documentos; `search_entity` e `get_entity_context` para clientes, pessoas,
contratos e outras entidades; `get_schema`, `run_sql` e `run_cypher` para
contagens e tabelas. A resposta separa o que o Brain devolveu, o que ele não
encontrou, a falta de permissão, o login vencido e as falhas do serviço, e cita
as fontes que vieram nos resultados pelo título ou pelo link.

## Suporte

Fale com o administrador do Claude na sua empresa. Ele aciona a Strattum pelo
canal de suporte da implantação.

## Situação

Versão 0.1.0, em piloto. O plugin ainda não está no diretório público da
Anthropic. A licença é proprietária: veja o arquivo `LICENSE`.

A pasta `evals/` guarda casos de avaliação com dados fictícios, que a Strattum
roda com `claude plugin eval` antes de cada versão. Ela não é carregada quando
você usa o plugin.
