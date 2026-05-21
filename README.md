# Intelligent Academic Scheduling and Decision-Support System (IASDS)

Production-ready academic timetabling with OR-Tools CSP scheduling, bulk Excel/CSV data management, and manual timetable editing.

## Stack

| Service | Path | Port (local) |
|---------|------|----------------|
| Frontend | `frontend/` | 3000 |
| Backend API | `backend/` | 5001 |
| Scheduler (FastAPI) | `scheduler/` | 8000 |
| MongoDB | — | 27017 |
| Redis | optional (async jobs) | 6379 |
| Nginx | `nginx/` | 80 (Docker) |

## Local development

Run each service in its own terminal:

```powershell
# 1. MongoDB must be running

# 2. Backend
cd IASDS\backend
npm run dev

# 3. Scheduler (required for "Generate AI Timetable")
cd IASDS\scheduler
pip install -r requirements.txt
python main.py

# 4. Frontend (run from frontend folder only)
cd IASDS\frontend
npm install
npm run dev
```

Frontend env (`frontend/.env`):

```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

Backend env: copy `backend/.env.example` → `.env`. Use **local MongoDB** if Atlas fails:

```
MONGO_URI=mongodb://127.0.0.1:27017/iasds
```

Then `npm run seed` in `backend/`.

## Features

- **AI timetable generation** — OR-Tools CSP (`POST /generate-sync`), sync from admin UI
- **Manual timetable editing** — drag-and-drop, add/edit/delete slots, force override on conflicts
- **Bulk import/export** — Faculty, subjects, rooms, subject–faculty mappings (`.xlsx` / `.csv`)
- **Bulk delete from file** — Upload spreadsheet with `employeeId`, `code`, or `roomNumber`
- **Export timetable** — PDF, Excel, ICS
- **Constraints** — `/dashboard/admin/constraints`

## Docker deployment

```bash
docker-compose up --build -d
```

Nginx proxies:

- `/` → frontend
- `/api/` → backend (prefix preserved)
- `/scheduler/` → scheduler (internal networks only)

Set `NEXT_PUBLIC_API_URL` to your public origin + `/api` (e.g. `https://your-domain.com/api`).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `/dashboard` 404 | Run `npm run dev` from `IASDS/frontend`; remove stray `package-lock.json` in user home if Turbopack warns |
| Generation 422 | Import subjects, rooms, faculty mappings; check Constraints page |
| Solver infeasible | Reduce hours, add faculty mappings, widen faculty availability |
| Redis warnings | OK for sync generation; Redis only needed for async Celery path |
| Hydration warning on body | Browser extension; safe to ignore with `suppressHydrationWarning` |
| Frontend OOM crash | Kill old `node` processes; run dev only from `frontend/`; avoid OneDrive-synced `node_modules` if possible |
| Constraints page empty | Auto-seeds on first load; or use Reset Defaults |

**Default admin (after seed):** `admin@miet.ac.in` / `Admin@123`

```powershell
cd IASDS\backend
npm run seed
```

**Quick launcher:** `.\scripts\start-dev.ps1`

## Test scheduler (no HTTP)

```powershell
cd IASDS\scheduler
python test_solver.py
```

Expected: `Status: OPTIMAL` or `FEASIBLE` with assignments > 0.
