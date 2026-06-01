# Deploy on Render

This repo is ready for Render deployment using `render.yaml`.

## 1) Push repository

Push this project to GitHub/GitLab/Bitbucket (Render needs a git remote).

## 2) Create Blueprint on Render

1. Open Render dashboard.
2. Click **New +** -> **Blueprint**.
3. Connect your repository.
4. Render will detect `render.yaml` and create:
   - `alubond-crm-db` (Postgres)
   - `alubond-crm-api` (backend)
   - `alubond-crm-web` (frontend)

## 3) Set required secrets

In `alubond-crm-api` service env vars, set:

- `OPENAI_API_KEY`
- `BLOB_READ_WRITE_TOKEN`

## 4) Deploy

Deploy all services from the Blueprint.

## 5) Verify

- Backend health: `https://alubond-crm-api.onrender.com/api/v1/health`
- Frontend: `https://alubond-crm-web.onrender.com`

## Notes

- Backend runs `prisma db push` on startup to sync schema.
- If you rename services, update:
  - `FRONTEND_ORIGIN` in backend
  - `NEXT_PUBLIC_API_BASE_URL` in frontend
- On free plan, cold starts are expected.
