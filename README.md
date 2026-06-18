# Alubond CRM Monorepo

This repository is now split into deployable services:

- `frontend/` - Next.js CRM web application
- `backend/` - Express API service (`/api/v1`)
- `mobile/` - Expo (React Native) app for iOS and Android

## Local development

Install dependencies separately:

```bash
npm install --prefix frontend
npm install --prefix backend
npm install --prefix mobile
```

Run both services with a single command (kills ports `3000` and `4001` first):

```bash
npm run dev
```

The `dev` script also starts Postgres using Docker on port `5433`.

Or run in separate terminals:

```bash
npm run dev:frontend
npm run dev:backend
npm run dev:mobile
```

## Mobile app

The Expo app talks to the same REST API as the web client.

1. Copy env file and set your API URL:

```bash
cp mobile/.env.example mobile/.env
```

For a physical device on the same network, use your machine IP instead of `localhost`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:4001/api/v1
```

2. Start Expo:

```bash
npm run dev:mobile
```

3. Build with EAS (requires [Expo account](https://expo.dev) and `eas login`):

```bash
cd mobile
eas build --profile preview --platform all
```

Profiles in `mobile/eas.json`:

- `development` - dev client with simulator support
- `preview` - internal APK / TestFlight build
- `production` - store release build

Bundle IDs: `com.alubond.crm` (iOS and Android).

API defaults:

- Base URL: `http://localhost:4001`
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

## Email notifications (Resend)

Follow-up create/update emails are sent via the **Resend HTTP API** from `no-reply@crm.alubond.com`.

Verified domain in Resend: `crm.alubond.com`

> **Render free tier:** outbound SMTP ports (587/465) are blocked. Use `RESEND_API_KEY` (or `SMTP_PASS` as a legacy alias), not SMTP.

### Local setup

1. Copy `backend/.env.example` → `backend/.env` if needed.
2. Set `RESEND_API_KEY` (or `SMTP_PASS`) to a Resend API key with **sending access** for `crm.alubond.com`.
3. Restart the backend, then test:

```bash
node scripts/test-email.mjs your-email@example.com
```

### Render production

In the **alubond-crm-api** service on Render, set:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | your Resend API key (Secret) |
| `EMAIL_FROM` | `Alubond CRM <no-reply@crm.alubond.com>` |
| `APP_BASE_URL` | your frontend URL (e.g. Vercel) |

`SMTP_PASS` also works as a fallback name for the same Resend API key.

`render.yaml` declares `RESEND_API_KEY` with `sync: false` — add the key manually in the Render dashboard.

Emails are triggered when follow-ups are created or updated (including from project activity and the AI assistant).

Each notification includes:

- An **`follow-up.ics`** calendar attachment (30-minute event at the due date/time)
- **Google Calendar** and **Outlook** quick-add links in the HTML email

Open the `.ics` file or tap a calendar link to add the follow-up to your calendar.
