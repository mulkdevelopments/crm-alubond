# Alubond CRM Monorepo

This repository is now split into deployable services:

- `frontend/` - Next.js CRM web application
- `backend/` - Express API service (`/api/v1`)

## Local development

Install dependencies separately:

```bash
npm install --prefix frontend
npm install --prefix backend
```

Run both services with a single command (kills ports `3000` and `4000` first):

```bash
npm run dev
```

The `dev` script also starts Postgres using Docker on port `5433`.

Or run in separate terminals:

```bash
npm run dev:frontend
npm run dev:backend
```

API defaults:

- Base URL: `http://localhost:4000`
- Health: `GET /api/v1/health`
- Projects: `GET /api/v1/projects`

## Authentication foundation

Role model implemented in backend:

- `ADMIN` - full access and can create all users
- `MANAGER` - sees sales reps assigned under them
- `SALES_REP` - must belong to one manager
- `CEO` - read-oriented leadership role (manager listing enabled)

Key endpoints:

- `POST /api/v1/auth/login`
- `GET /api/v1/users/me` (requires Bearer token)
- `POST /api/v1/users` (admin only)
- `GET /api/v1/users/my-team` (manager/admin)
- `GET /api/v1/users/managers` (admin/ceo)

Default seeded admin (dev):

- Email: `admin@alubondcrm.local`
- Password: `Admin@12345`
