# TonerTrack

Sistema web responsivo para **controle de consumo de toner e cilindros de impressoras**. Registra todas as trocas, calcula automaticamente quantas páginas foram impressas entre uma troca e outra e compara o rendimento obtido com o esperado — destacando desperdícios com indicadores 🟢 🟡 🔴.

## Stack

Escolhida para rodar **sem Docker e sem serviço de nuvem**, com o mínimo de infraestrutura:

- **Front-end:** React + TypeScript + Vite + Tailwind CSS (componentes próprios no estilo shadcn/ui) · gráficos com Recharts.
- **Back-end:** Node.js + Express.
- **Banco de dados:** SQLite via módulo nativo do Node (`node:sqlite`) — banco em **arquivo único**, sem servidor de banco, sem compilação nativa.

> O banco é SQL de verdade. Se um dia precisar de PostgreSQL/MySQL, a camada de dados fica isolada em `server/lib` e as queries são portáveis.

## Pré-requisitos

- **Node.js 22.5+ (recomendado 24.x)** — o `node:sqlite` já vem embutido.
- npm.

Nada além disso: sem Docker, sem Postgres/MySQL, sem conta em nuvem.

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. (opcional) Popular com dados de exemplo
npm run seed          # só popula se o banco estiver vazio
npm run seed:reset    # apaga tudo e recria os dados de exemplo

# 3. Desenvolvimento (API + front com hot reload)
npm run dev
# Front-end:  http://localhost:5173
# API:        http://localhost:3001  (o Vite faz proxy de /api para cá)
```

Na primeira abertura local, crie a conta administradora antes de expor a aplicação a outros dispositivos. O usuário aceita letras, números, ponto, hífen ou sublinhado; a senha deve ter de 12 a 256 caracteres. Há uma única conta compartilhada nesta versão, e as alterações ficam registradas com o nome dessa conta e o responsável informado no formulário.

Por padrão, a API escuta apenas em `127.0.0.1`. Para disponibilizá-la na rede local, configure `HOST=0.0.0.0`, `COOKIE_SECURE=true` e coloque-a atrás de um proxy HTTPS; não exponha a porta diretamente à internet. As sessões expiram após 8 horas e o cookie é `HttpOnly` e `SameSite=Strict`.

### Build de produção

```bash
npm run build   # gera o front em dist/
npm start       # Express serve o dist/ + a API na mesma porta
# App completo em  http://localhost:3001
```

A porta da API pode ser alterada com a variável de ambiente `PORT` (padrão `3001`).

### Testes e verificação de backup

```bash
npm test
npm run backup:verify -- caminho\para\tonertrack-backup.db
```

O verificador abre o arquivo como somente leitura e confere a integridade SQLite, as chaves estrangeiras e a versão do esquema. Antes de restaurar, verifique o backup; depois substitua o banco com o servidor parado e execute o verificador novamente.

## Estrutura

```
tonerTrack/
├─ server/                 # API Express + SQLite
│  ├─ index.js             # app, rotas, serve o front em produção
│  ├─ app.js                # configuração Express e proteção da API
│  ├─ db.js                # conexão SQLite + schema (criado no 1º start)
│  ├─ lib/migrations.js    # migrações de esquema versionadas
│  ├─ seed.js              # dados de exemplo
│  ├─ lib/
│  │  ├─ yield.js          # regra de rendimento (thresholds) 🟢🟡🔴
│  │  ├─ enriched.js       # cálculo de "páginas rodadas" (window function LAG)
│  │  ├─ stats.js          # KPIs do dashboard e estatísticas por impressora
│  │  └─ http.js           # helpers (erros, validação)
│  ├─ routes/              # auth, auditoria, printers, changes, dashboard, relatórios, backup
│  └─ data/tonertrack.db   # o banco (criado automaticamente; ignorado no git)
├─ src/                    # front-end React
│  ├─ routes/              # Dashboard, Printers, RegisterChange, History, Audit, Reports
│  ├─ components/          # layout, cards, gráfico, UI base (ui/)
│  ├─ hooks/               # React Query + tema
│  └─ lib/                 # api client, tipos, formatação
└─ ...
```

Os testes nativos do Node ficam em `test/` e rodam com `npm test`.

## Como as páginas e o rendimento são calculados

Para medir o volume de impressão, o sistema usa as leituras do contador **em ordem cronológica por impressora**, sem separar toner e cilindro:

```
páginas impressas = contador atual − contador da leitura anterior
```

Assim, no exemplo de leituras 1.000, 1.300 e 1.800, são contabilizadas 300 + 500 = 800 páginas, uma única vez. A primeira leitura estabelece a base e não soma páginas; se o contador diminuir, o evento é tratado como reinício e a leitura seguinte passa a ser a nova base. Gráficos, totais e estatísticas por impressora usam essa mesma regra.

O rendimento de cada suprimento continua sendo calculado em separado: para toner, compara-se a leitura atual com a troca anterior de toner daquela impressora; para cilindro, compara-se com a troca anterior de cilindro. O resultado é comparado com o rendimento esperado definido na impressora:

| Situação | Regra | Cor |
|---|---|---|
| Excelente | páginas ≥ 100% do esperado | 🟢 |
| Dentro do esperado | ≥ 90% | 🟢 |
| Próximo do limite | ≥ 75% | 🟡 |
| Abaixo do esperado (alerta) | < 75% | 🔴 |

Os limites (90% / 75%) ficam em **`server/lib/yield.js`** (`GREEN_MIN` / `YELLOW_MIN`) — basta ajustar ali. A primeira troca de cada componente não tem base de comparação e aparece como *Primeira troca*; se o contador for reiniciado (valor menor que o anterior), aparece como *Contador reiniciado*.

## Backup do banco

- Pela interface: **Relatórios → Backup do banco** gera uma cópia consistente do SQLite e baixa o `.db`. A tela mostra a data do último backup gerado.
- Manualmente: pare a API antes de copiar `server/data/tonertrack.db`; copiar apenas o arquivo principal enquanto o WAL está ativo pode gerar um backup incompleto.

Backups são manuais nesta versão. O arquivo contém o banco completo, inclusive histórico de auditoria e hash da conta; armazene-o em local protegido. Para restaurar, pare a API, valide o arquivo com `npm run backup:verify -- caminho\para\backup.db`, substitua o banco e reinicie a API. O banco mantém um histórico de auditoria de cadastros, alterações, exclusões, logins e backups; os arquivos baixados contêm esse histórico.

## Funcionalidades

- ✅ Cadastro de impressoras (nome, localização, modelo) com rendimento esperado configurável por toner e cilindro.
- ✅ Registro de trocas (data, impressora, tipo, contador, responsável, observações).
- ✅ Cálculo automático de páginas rodadas e do rendimento com indicadores coloridos.
- ✅ Dashboard: páginas impressas, toners/cilindros trocados, médias, maior volume, maior consumo e gráficos de consumo mensal e anual.
- ✅ Histórico com filtros (impressora, componente, período, responsável).
- ✅ Histórico paginado e edição de trocas com recálculo do rendimento e auditoria dos valores anteriores e posteriores.
- ✅ Relatórios em **PDF** e **Excel** + estatísticas por impressora.
- ✅ Pesquisa rápida de impressoras, exportação para Excel e backup do banco.
- ✅ Login de administrador, proteção das rotas da API, trilha de auditoria e migrações de banco versionadas.
- ✅ Notificação (alerta) quando o rendimento fica muito abaixo do esperado.
- ✅ Interface responsiva (desktop, tablet, celular) com tema claro/escuro.

### Limitações conhecidas

- Existe uma única conta administradora compartilhada: a auditoria identifica essa conta; informe o nome do operador no campo **Responsável** para atribuir cada troca a uma pessoa. Contas individuais e permissões por função ainda não fazem parte desta versão.
- Notificações por e-mail e migração opcional para PostgreSQL ainda não estão incluídas.
