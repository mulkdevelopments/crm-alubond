# CRM — Mulk ecosystem notes

This repo is **CRM** in the Mulk platform (clients / projects / leads).

## Siblings (separate Cursor windows)

| App | Absolute path | FE | BE |
|-----|---------------|----|----|
| MULK OS | `/Users/user/Mulk Ecosystem/MULK OS` | 3100 | 4100 |
| HRMS | `/Users/user/Mulk Ecosystem/HRMS` | 5173 | 4000 |
| PO Tracker | `/Users/user/Mulk Ecosystem/PO TRACKER` | 5174 | 4002 |

Full map: `/Users/user/Mulk Ecosystem/ECOSYSTEM.md`

## OS bridge

- `GET /api/v1/ecosystem/summary` + header `X-Ecosystem-Key: mulk-dev-bridge`
- Consumed by MULK OS backend (`:4100`) after OS user JWT login

## Workflow

Work CRM features here. For OS dashboard wiring, open the **MULK OS** window and pass the API contract.
