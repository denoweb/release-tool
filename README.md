# Release Tool

Jednoduchý nástroj pro sledování release tasků — stav, branch, služby k nasazení (CI / Stage / Prod).

## Stack

- **Backend:** Node.js + Express + TypeScript + lowdb (JSON soubor)
- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui-style komponenty
- **Monorepo:** npm workspaces (`shared`, `server`, `client`)

## Spuštění

Vyžaduje Node 24 (testováno na 24.14.0).

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API:      http://localhost:3003/api

Data jsou v `server/data/db.json`.

## Struktura

```
shared/   — sdílené TS typy (Task, Service, Status…)
server/   — Express API
client/   — React UI
```

## API

- `GET    /api/tasks`
- `POST   /api/tasks`
- `GET    /api/tasks/:id`
- `PATCH  /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `PATCH  /api/tasks/:id/deployments/:serviceId` — `{ env: "ci"|"stage"|"prod", deployed: boolean }`
- `GET    /api/services`
- `POST   /api/services`
- `PATCH  /api/services/:id`
- `DELETE /api/services/:id`
