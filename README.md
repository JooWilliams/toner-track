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

### Build de produção

```bash
npm run build   # gera o front em dist/
npm start       # Express serve o dist/ + a API na mesma porta
# App completo em  http://localhost:3001
```

A porta da API pode ser alterada com a variável de ambiente `PORT` (padrão `3001`).

## Estrutura

```
tonerTrack/
├─ server/                 # API Express + SQLite
│  ├─ index.js             # app, rotas, serve o front em produção
│  ├─ db.js                # conexão SQLite + schema (criado no 1º start)
│  ├─ seed.js              # dados de exemplo
│  ├─ lib/
│  │  ├─ yield.js          # regra de rendimento (thresholds) 🟢🟡🔴
│  │  ├─ enriched.js       # cálculo de "páginas rodadas" (window function LAG)
│  │  ├─ stats.js          # KPIs do dashboard e estatísticas por impressora
│  │  └─ http.js           # helpers (erros, validação)
│  ├─ routes/              # printers, changes, dashboard, stats, reports, backup
│  └─ data/tonertrack.db   # o banco (criado automaticamente; ignorado no git)
├─ src/                    # front-end React
│  ├─ routes/              # Dashboard, Printers, RegisterChange, History, Reports
│  ├─ components/          # layout, cards, gráfico, UI base (ui/)
│  ├─ hooks/               # React Query + tema
│  └─ lib/                 # api client, tipos, formatação
└─ ...
```

## Como o rendimento é calculado

Para cada troca, o sistema busca a troca **anterior do mesmo componente na mesma impressora** e calcula:

```
páginas rodadas = contador atual − contador da troca anterior
```

Compara com o rendimento esperado do componente (definido na impressora):

| Situação | Regra | Cor |
|---|---|---|
| Excelente | páginas ≥ 100% do esperado | 🟢 |
| Dentro do esperado | ≥ 90% | 🟢 |
| Próximo do limite | ≥ 75% | 🟡 |
| Abaixo do esperado (alerta) | < 75% | 🔴 |

Os limites (90% / 75%) ficam em **`server/lib/yield.js`** (`GREEN_MIN` / `YELLOW_MIN`) — basta ajustar ali. A primeira troca de cada componente não tem base de comparação e aparece como *Primeira troca*; se o contador for reiniciado (valor menor que o anterior), aparece como *Contador reiniciado*.

## Backup do banco

- Pela interface: **Relatórios → Backup do banco** baixa uma cópia do `.db`.
- Manualmente: copie o arquivo `server/data/tonertrack.db`.

Para restaurar, substitua o arquivo e reinicie a API.

## Funcionalidades

- ✅ Cadastro de impressoras (nome, localização, modelo) com rendimento esperado configurável por toner e cilindro.
- ✅ Registro de trocas (data, impressora, tipo, contador, responsável, observações).
- ✅ Cálculo automático de páginas rodadas e do rendimento com indicadores coloridos.
- ✅ Dashboard: páginas impressas, toners/cilindros trocados, médias, maior volume, maior consumo e gráficos de consumo mensal e anual.
- ✅ Histórico com filtros (impressora, componente, período, responsável).
- ✅ Relatórios em **PDF** e **Excel** + estatísticas por impressora.
- ✅ Pesquisa rápida de impressoras, exportação para Excel e backup do banco.
- ✅ Notificação (alerta) quando o rendimento fica muito abaixo do esperado.
- ✅ Interface responsiva (desktop, tablet, celular) com tema claro/escuro.

### Ainda não incluído (próximos passos)

- 🔜 Login / controle de usuários e auditoria de quem fez cada alteração (adiado nesta versão — a base de dados já reserva o campo *responsável* por troca).
- 🔜 Notificações por e-mail e migração opcional para PostgreSQL.
