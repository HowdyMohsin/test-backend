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
Pehla admin banaane ke liye (strong password ka prompt aayega): `docker compose exec api python -m app.cli create-admin --email aap@example.com`. Phir isi email/password se Admin panel me sign in karein. Koi default `admin` password nahin hai.
Dusra admin bhi isi command se bana sakte hain.
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

## Customer accounts
Customer accounts are stored in this app's PostgreSQL database; Firebase and the email-only test login are not used.

- Visitors can create an account with email and password on `/account`. Customer passwords need at least 6 characters and are stored only as Argon2 hashes.
- Login creates a revocable, `HttpOnly` browser session stored in the database. The default lifetime is 30 days; change `USER_SESSION_DAYS` in `.env` if required.
- A signed-in customer can change their password on `/account`. Changing it ends all other customer sessions.
- In **Admin → Users**, staff can block users, set their plan, reset quota, delete an account, or issue a temporary password. A temporary password ends existing sessions and forces the customer to choose a new one after signing in.

There is deliberately no fake "forgot password" button: password-reset email delivery is not configured in this project. If you need self-service reset emails, configure a real transactional email provider first. After moving an existing Firebase-only database to this version, an admin must issue each affected user a temporary password from **Admin → Users**.

## Legal pages
`/privacy-policy` aur `/terms` naye site me hi bane hain. `web/.env.local` me `NEXT_PUBLIC_CONTACT_EMAIL` daalo to footer aur in pages par aap ka contact email dikhta hai (khali ho to chhup jata hai). Launch se pehle in dono pages ka text apne hisaab se parh lo.

## Abhi jo baqi hai
- Plans: Free, Basic ($4), Pro ($9), sab Admin se badalte hain. Payments: Basic/Pro ka "Choose" abhi waiting list leta hai. Provider chunne par sirf `api/app/core/billing.py` badalti hai.
- Per-file alag options (abhi har format ke options poore batch par lagte hain; har file ka alag target chun sakte ho).
- Real Docker run aap ke PC par pehli baar hoga.
