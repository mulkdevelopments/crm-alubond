# Deploy on Render

This repo uses Render for the **API and database** only. The frontend is hosted on **Vercel** at [https://crm.alubond.com](https://crm.alubond.com).

## 1) Push repository

Push this project to GitHub/GitLab/Bitbucket (Render needs a git remote).

## 2) Create Blueprint on Render

1. Open Render dashboard.
2. Click **New +** -> **Blueprint**.
3. Connect your repository.
4. Render will detect `render.yaml` and create:
   - `alubond-crm-db` (Postgres)
   - `alubond-crm-api` (backend)

## 3) Set required secrets

In `alubond-crm-api` service env vars, set:

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `RESEND_API_KEY` (or `SMTP_PASS` with the same Resend API key)
- `ADMIN_PASSWORD` (strong secret; not stored in Git)

## 4) Deploy

Deploy all services from the Blueprint.

## 5) Verify

- Backend health: `https://alubond-crm-api.onrender.com/api/v1/health`
- Frontend (Vercel): `https://crm.alubond.com`

## Notes

- Backend runs `prisma db push` on startup to sync schema.
- Frontend env on Vercel: `NEXT_PUBLIC_API_BASE_URL=https://alubond-crm-api.onrender.com/api/v1`
- On free plan, cold starts are expected.
