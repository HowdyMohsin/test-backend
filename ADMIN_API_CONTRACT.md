# QuickImgConvert v2 — Admin API Contract (ground truth)

Extracted 2026-10-17 directly from the backend source in `api/app/api/admin/*.py`,
`api/app/schemas/v1.py`, `api/app/core/errors.py`, `api/app/api/deps.py`,
`api/app/core/selfcheck.py`, `api/app/settings.py`.
The frontend rebuild MUST match this exactly. No demo data, no guessing.

## Base + auth transport

- Base URL: the API origin (locally `http://localhost:8000`). All admin routes under `/v1/admin`.
- Auth = httpOnly cookie named `qic_admin_session` (12h TTL, path `/`, samesite=lax).
  Frontend MUST send `credentials: "include"` on every fetch. 401 means login/session expired.
- Roles: `owner` (all tabs) / `admin` / `viewer`. Non-owner tab access is gated by
  `require_tab("<tab>")` → 403 `{"error":{"code":"forbidden","message":"no access to the <tab> section","details":{}}}`
  when the tab is not in the user's `allowed_tabs`.
- All 9 valid tabs: `dashboard`, `formats`, `plans`, `users`, `team`, `jobs`, `ads`, `reports`, `settings`.

## Error envelope (every failure)

```json
{"error": {"code": "<snake_case>", "message": "<human text>", "details": {}}}
```
HTTP status: 401 unauthorized · 403 forbidden/plan_required/banned · 404 not_found ·
413 file_too_large · 429 quota_exceeded/rate_limited · 422 everything else (incl. bad_request).

## Endpoints

### Auth (`api/app/api/admin/auth.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| POST | `/v1/admin/auth/login` | `{"email","password"}` | `AdminMeResponse` + sets session cookie |
| POST | `/v1/admin/auth/logout` | — | `{"ok": true}` + deletes cookie |
| GET | `/v1/admin/auth/me` | — | `AdminMeResponse` |

`AdminMeResponse` (TRAP — the Topbar crash):
```json
{"user": {"id": "<uuid>", "email": "…", "role": "owner|admin|viewer",
          "allowed_tabs": ["…"], "disabled": false},
 "tabs": ["dashboard","formats","plans","users","team","jobs","ads","reports","settings"]}
```
Email lives at `res.user.email`, NOT `res.email`. Login lowercases+trims the email.
Wrong credentials → 401 `wrong email or password`.

### Formats (`api/app/api/admin/formats.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/formats` | — | **flat array** `FormatStateSchema[]` |
| PATCH | `/v1/admin/formats/{key}` | `FormatStateUpdate` | `FormatStateSchema` |
| POST | `/v1/admin/formats/selfcheck` | `{"pair": "<slug>"?}` | `{"ok":true,"run_id","total","passed","failed","testing"}` |

`FormatStateSchema` — **exactly these fields, nothing else**:
```json
{"key": "jpg | pair:jpg-to-png", "visible": true,
 "plans": ["anonymous","free","pro"], "status": "testing|live|broken", "note": ""}
```
TRAPS:
1. GET returns a **flat array**, not `{formats, pairs, states}`.
2. Keys: formats = bare slug (e.g. `jpg`); pairs = `pair:` + slug (e.g. `pair:jpg-to-png`).
3. Response has **NO `last_check_at`** and **NO `kind`** field — derive kind from the `pair:` prefix client-side.
4. PATCH `key` must be the exact key (`pair:jpg-to-png`, not `jpg-to-png`) or 404 `unknown format or pair key`.
5. PATCH body: `visible` bool; `plans` must be a subset of `["anonymous","free","pro"]`;
   `status` must be `live|testing|broken`; `note` truncated to 2000 chars. All optional.
6. Selfcheck runs **all 210 pairs synchronously** when `pair` is omitted — long-running request;
   frontend needs a long timeout + progress UI. Per-pair: `{"pair": "<slug>"?}` → 404 `unknown pair`.
7. After a selfcheck run, broken pairs get their `note` auto-filled with the failure detail.

### Plans & messages (`api/app/api/admin/plans.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/plans` | — | `PlanSchema[]` ordered by price |
| PATCH | `/v1/admin/plans/{plan_id}` | `PlanUpdate` | `PlanSchema` |
| GET | `/v1/admin/messages` | — | `{"<key>": "<text>", …}` |
| PATCH | `/v1/admin/messages/{key}` | `{"text": "…"}` | `{"key":"…","text":"…"}` |

`PlanSchema`: `{"id","name","price_cents","limits": {…}}`.
`PlanUpdate`: `name?` (64 chars max), `price_cents?` (≥ 0 or 400 bad_request), `limits?`
**merged** into existing limits (not replaced). Unknown plan → 404 `plan not found`.
Unknown message key → 404 `message key not found`.

### Users (`api/app/api/admin/users.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/users` | `?q=&plan=&banned=&limit=&offset=` | `UserAdminSchema[]` newest first |
| PATCH | `/v1/admin/users/{user_id}` | **query params** `?plan_id=&banned=` | `UserAdminSchema` |
| GET | `/v1/admin/users/stats` | — | `{"total","banned","by_plan": {"<plan_id>": n}}` |

`UserAdminSchema`: `{"id":"<uuid>","email":"…|null","firebase_uid":"…|null","plan_id":"…","banned":bool,"created_at":"<iso>"}`.
TRAPS:
1. PATCH takes `plan_id` and `banned` as **QUERY parameters, not a JSON body**.
2. `user_id` must be a UUID or 400 `invalid user id`; unknown → 404; unknown plan → 400.
3. List filters: `q` matches email OR firebase_uid (case-insensitive, max 120 chars);
   `limit` default 50, max 200; `offset` default 0.

### Team (`api/app/api/admin/team.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/team` | — | `AdminUserSchema[]` (any logged-in admin) |
| POST | `/v1/admin/team` | `TeamCreate` | `AdminUserSchema` (201, **owner only**) |
| PATCH | `/v1/admin/team/{member_id}` | `TeamUpdate` | `AdminUserSchema` (**owner only**) |
| DELETE | `/v1/admin/team/{member_id}` | — | `{"ok": true}` (**owner only**) |

`AdminUserSchema`: `{"id":"<uuid>","email","role":"owner|admin|viewer","allowed_tabs":["…"],"disabled":bool}`.
`TeamCreate`: `{"email","password","role":"admin"(default),"allowed_tabs":[]}` —
role must be owner/admin/viewer; non-owner roles get tabs filtered to the valid 9;
owner members always get all 9. Duplicate email → 400 `email already on the team`.
`TeamUpdate`: `role?`, `allowed_tabs?` (filtered to valid tabs), `disabled?`.
TRAPS: writes return 403 for non-owners; **cannot disable or delete yourself** (400);
`member_id` is a UUID path param.

### Jobs (`api/app/api/admin/jobs.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/jobs` | `?status=&pair=&limit=&offset=` | `JobAdminSchema[]` newest first |
| GET | `/v1/admin/jobs/stats` | — | `{"by_status": {"<status>": n}}` |

`JobAdminSchema`: `{"id":"<uuid>","owner_key":"…","pair_slug":"…","status":"…","progress":0.0,
"error_code":"…|null","plan_id":"…","created_at":"<iso>","finished_at":"<iso>|null"}`.
`limit` default 50, max 200. Read-only — no write endpoints exist.

### Ads (`api/app/api/admin/ads.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/ads` | — | `AdSlotSchema[]` |
| PATCH | `/v1/admin/ads/{slot_id}` | `{"code"?,"enabled"?}` | `AdSlotSchema` |

`AdSlotSchema`: `{"id":"…","code":"…(default \"\")","enabled":true}`.
TRAP: PATCH **creates the slot on demand** — it never 404s. `code` truncated to 20000 chars.

### Reports (`api/app/api/admin/reports.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/reports/summary` | `?range=day|week|month` (default week) | `ReportSummary[]` by day |
| GET | `/v1/admin/reports/pairs` | `?range=&limit=` (default 20, max 100) | `[{"pair","conversions","failed"}]` |
| GET | `/v1/admin/reports/plans` | `?range=` | `[{"plan","conversions","failed"}]` |
| GET | `/v1/admin/reports/audit` | `?limit=&offset=` (default 50, max 200) | `[{"id","admin_id":"<uuid>|null","action","target","details","ip","created_at":"<iso>|null"}]` |

`ReportSummary`: `{"day":"YYYY-MM-DD","conversions":n,"failed":n,"input_mb":x.xx}`.
Invalid range → 400 `range must be day, week or month`. Read-only.

### Settings (`api/app/api/admin/settings.py`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/v1/admin/settings` | — | `{"<key>": {…}, …}` (values are JSON objects) |
| PATCH | `/v1/admin/settings/{key}` | `{"value": {…}}` | `{"key":"…","value":{…}}` |

TRAPS: values are **JSON objects** (`{"value": {...}}`, not a string); PATCH creates the key on demand.

## Dashboard tab

No dedicated endpoint — compose from `GET /v1/admin/users/stats`,
`GET /v1/admin/jobs/stats`, `GET /v1/admin/reports/summary?range=week`.

## Frontend rules for this rebuild

- No `DEV_BYPASS`, no demo data, no placeholder tabs. If the backend is unreachable,
  show a clean error state (backend down ≠ empty demo dashboard).
- Unwrap `auth/me` → `{user:{email,role,…}, tabs}`.
- Treat the formats list as a flat array; split client-side on the `pair:` prefix.
- PATCH /users via query params; team writes owner-only with self-protection errors.
