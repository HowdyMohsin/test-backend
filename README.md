# QuickImgConvert v2

Teen hisse:

| Folder | Kya hai | Port |
|---|---|---|
| `api/` | Backend (Python, FastAPI, engines, worker, Postgres) | 8000 |
| `web/` | Website: Home, har converter ka page, Account, Pricing, History (Next.js, TypeScript, Tailwind) | 3000 |
| `admin/` | Admin panel, 9 tabs (Next.js, TypeScript, Tailwind) | 3001 |

`docs/USER_JOURNEY.md`: user ko kab kya dikhta hai, kab popup aata hai, aur accuracy ka matlab.

## PC par chalane ke steps

Zaroori: **Docker Desktop** aur **Node.js 22**.

### 1. Backend
```
cp .env.example .env          # Windows: copy .env.example .env
docker compose up --build
```
Jab chal jaye:
```
docker compose exec api python -m app.cli verify-engines     # har line PASS honi chahiye
docker compose exec api python -m app.cli selfcheck          # 5-10 minute, converters live karta hai
```
Admin panel ke liye pehli baar **admin@gmail.com / admin** se login ho jata hai (sirf `ENV=dev` me; `.env` me `DEFAULT_ADMIN_*` se badlo, live karne se pehle zaroor badlo).
Dusra admin chahiye to: `docker compose exec api python -m app.cli create-admin --email aap@example.com`.
Selfcheck ke baad sandbox me **182 converters live** the. 28 (7 camera RAW formats) tab tak "Testing" rehte hain jab tak
`api/data/samples/<format>/` me ek asli file na rakho (aur PSD ke liye bhi ek asli file rakho). Phir dobara selfcheck.

### 2. Website
```
cd web
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3000
```
Backend chalta hona chahiye (website formats usi se leti hai). Production build: `npm run build` (API chalti ho).

### 3. Admin
```
cd admin
cp .env.example .env.local
npm install
npm run dev            # http://localhost:3001
```
Sign in us email/password se jo `create-admin` me diya.

## Login ke baghair test
`.env` me `ENV=dev` aur `web/.env.local` me `NEXT_PUBLIC_DEV_LOGIN=1` ho to "Create account" par sirf email wala **test login** aata hai
(Free plan, 25/din). `admin@gmail.com` se test login karo to **Pro plan** milta hai. Asli login ke liye Firebase keys (free Spark plan) `web/.env.local` aur `.env` me daalo.
**Firebase ki service-account JSON file kabhi chat ya git me mat dalna.**

## Legal pages
`/privacy-policy` aur `/terms` naye site me hi bane hain. `web/.env.local` me `NEXT_PUBLIC_CONTACT_EMAIL` daalo to footer aur in pages par aap ka contact email dikhta hai (khali ho to chhup jata hai). Launch se pehle in dono pages ka text apne hisaab se parh lo.

## Abhi jo baqi hai
- Plans: Free, Basic ($4), Pro ($9), sab Admin se badalte hain. Payments: Basic/Pro ka "Choose" abhi waiting list leta hai. Provider chunne par sirf `api/app/core/billing.py` badalti hai.
- Per-file alag options (abhi har format ke options poore batch par lagte hain; har file ka alag target chun sakte ho).
- Real Firebase aur real Docker run aap ke PC par pehli baar hoga.
