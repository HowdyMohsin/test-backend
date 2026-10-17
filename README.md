# QuickImgConvert v2 — Mukammal Guide (Roman Urdu)

Ye **test phase** ka mukammal project hai: nayi design, frontend + backend, sab kuch.
Is guide ko top se bottom tak parho — har step number-wise hai.

---

## 1. Ye project hai kya?

- **Web** (`web/`) — public site: homepage + 210 format pages (nayi dark "engine room" design)
- **Admin** (`admin/`) — backend UI: dashboard, formats, plans, users, team, jobs, ads, reports, settings
- **API** (`api/`) — Python FastAPI backend: asal conversion (images/audio/video), Docker me chalta hai
- **DB** — PostgreSQL 16, Docker me

**Ports:** Web 3000 | Admin 3001 | API 8000 | DB 5432 (sirf andar, bahar band)

---

## 2. Pehli dafa setup (sirf ek baar)

### Step 1 — Docker Desktop khula hona chahiye
System tray me whale icon stable ho (agar band hai to Start menu se "Docker Desktop" kholo).

### Step 2 — Project folder me jao
```
cd quickimgconvert-v2
```

### Step 3 — Environment file banao
```
copy .env.example .env
```
(Notepad me `.env` khol kar zaroorat ho to values badlo — pehli dafa default theek hain.)

### Step 4 — Backend + Database start karo (pehli build me 10-15 min lag sakte hain)
```
docker compose up --build
```
Jab log me `Uvicorn running on 0.0.0.0:8000` nazar aye = backend tayyar.

### Step 5 — Pehla admin user banao (nayi terminal me)
```
docker compose exec api python -m app.cli create-admin --email tumhara@email.com
```
Password terminal me manga jayega.

### Step 6 — Frontend aur Admin (2 alag terminals)
```
cd web
npm install
npm run dev
```
```
cd admin
npm install
npm run dev
```

### Step 7 — Kholo
- Site: http://localhost:3000
- Admin: http://localhost:3001 (Step 5 wala email/password)
- API check: http://localhost:8000/v1/health

---

## 3. Roz ka istemal

1. Docker Desktop kholo
2. `docker compose up` (pehli build ke baad `--build` ki zaroorat nahi)
3. `web` me `npm run dev`, `admin` me `npm run dev`
4. Band karna ho to har terminal me `Ctrl+C`, phir `docker compose down`

---

## 4. Selfcheck — 210 pairs verify karna

Backend ke sab 210 conversion pairs asal me kaam karte hain ya nahi, ye khud check hota hai:

**Option A — Admin se:** Admin kholo → **Formats** tab → **Run selfcheck** button.

**Option B — Command se:**
```
docker compose exec api python -m app.cli selfcheck
```
Sirf ek pair check karna ho:
```
docker compose exec api python -m app.cli selfcheck --pair jpg-to-png
```

**Zaroori note:** RAW (8), PSD aur HEIC ke liye **asli sample files** chahiye jo `api/data/samples/<format>/` me rakhni hain
(misal: `api/data/samples/cr2/sample.cr2`). Muft RAW samples: raw.pixls.us.
Sample na ho to wo pair **testing** rahega — jhoota "pass" kabhi nahi hoga.

---

## 5. Aam maslay (Troubleshooting)

| Masla | Hal |
|---|---|
| `docker: command not found` | Docker Desktop install/start karo |
| Port 3000/8000 pehle se busy | Purani terminal band karo ya `npx kill-port 3000` |
| `npm install` me error | Node 18+ check karo: `node --version` |
| Conversion fail | Pehle `docker compose logs api` dekho — asal error wahin likha hoga |
| Disk full hone lage | `docker system prune -a` (cache saaf) |
| Web par "API unreachable" | Pehle API chal rahi hai? http://localhost:8000/v1/health kholo |

---

## 6. Folder structure (mukhtasar)

```
quickimgconvert-v2/
  web/                 public site (Next.js) — homepage + 210 /convert/ pages
  admin/               backend UI (Next.js) — 9 tabs
  api/                 backend (FastAPI)
    app/formats/       32 format files (har format ki alag file)
    app/engines/       7 engines (vips, ffmpeg, raw, svg, psd, pdf, trace)
    app/core/          security, quota, plan_guard, worker, selfcheck
    app/api/v1/        public API contract (frozen)
    app/api/admin/     admin API (cookie auth)
    seed/              plans.json + messages.json
    data/samples/      asli sample files (RAW/PSD/HEIC)
    Dockerfile         python:3.12-slim, sab engines andar
  docker-compose.yml   db + api
  .env.example         copy karke .env banao
```

**Usool:** naya format add karna ho = `app/formats/` me ek nayi file. Registry khud utha lega,
pairs khud ban jayenge. Baqi kuch chhone ki zaroorat nahi.

---

## 7. Agla step (jab test phase pass ho)

- Production hosting (server) ka faisla
- Domain + HTTPS
- Real Firebase project connect (abhi test config hai)
- Phir deploy

Koi sawal ho to puchho — code me haath dalne se pehle guide dobara parh lena.
