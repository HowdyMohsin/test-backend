# QuickImgConvert v2 — Admin Console

Alag Next.js app — backend ka control panel. Port **3001**. Dark "engine room"
theme, public site jaisi.

## Chalana

```bash
cd admin
npm install
cp .env.example .env   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev            # http://localhost:3001
```

Login: pehla admin `docker compose exec api python -m app.cli create-admin --email ...`
se banta hai (backend repo root se). Phir email + password se login.

## Usool (sakht)

- **Koi demo data nahi.** Har page asal backend (`GET /v1/admin/*`, cookie auth)
  se data mangta hai. Backend down ho to saaf error state dikhta hai —
  "Backend not reachable at …" — kabhi fake data nahi.
- **Contract-first.** Tamam endpoints `CONTRACT.md` me backend source se likhe
  gaye hain. Koi naya API call add karne se pehle wahan entry karo.
- Deps change nahi karne (package.json frozen) — user ki connection slow hai.

## Tabs (9)

| Tab | Route | Backend |
|---|---|---|
| Dashboard | `/dashboard` | jobs/stats + users/stats + reports/summary + formats (compose) |
| Formats | `/formats` | GET/PATCH /formats, POST /formats/selfcheck |
| Plans & Messages | `/plans` | GET/PATCH /plans, GET/PATCH /messages |
| Users | `/users` | GET/PATCH /users, GET /users/stats |
| Team | `/team` | GET/POST/PATCH/DELETE /team (writes: owner only) |
| Jobs | `/jobs` | GET /jobs, GET /jobs/stats |
| Ads | `/ads` | GET/PATCH /ads (slots create on demand) |
| Reports | `/reports` | GET /reports/summary\|pairs\|plans\|audit |
| Settings | `/settings` | GET/PATCH /settings (values are JSON objects) |

Pair state keys: backend `pair:<slug>` bhejta hai — `lib/api.ts` me
`toUiKey`/`toBackendKey` isko handle karte hain.

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm run build       # production build
npm start           # production server (port 3001)
```
