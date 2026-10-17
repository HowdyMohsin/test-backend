# QuickImgConvert v2 — Admin API Contract (from backend source, 2026-10-17)

Base: `{API_URL}` = `NEXT_PUBLIC_API_URL` ?? `http://localhost:8000`.
Auth: httpOnly cookie `qic_admin_session`, sent with `credentials: "include"`.
CORS: `http://localhost:3000,http://localhost:3001`, `allow_credentials=True`.
Error shape (all failures): `{"error": {"code": "<ErrorCode>", "message": "...", "details": {...}}}`
  - 401 `unauthorized` = not logged in / session expired / wrong email+password
  - 403 `forbidden` = logged in but no access to tab (or team write as non-owner)
  - 404 `not_found`, 422 `bad_request` (default), 429/413/403 per code.

ALL_TABS = ["dashboard","formats","plans","users","team","jobs","ads","reports","settings"]

## Auth (`api/app/api/admin/auth.py`, prefix /v1/admin)

| Method | Path | Guard | Request body | Response |
|---|---|---|---|---|
| POST | /v1/admin/auth/login | none | `{email: string, password: string}` | `AdminMeResponse` (sets cookie). 401 `unauthorized` "wrong email or password" |
| POST | /v1/admin/auth/logout | get_admin | — | `{"ok": true}` (deletes cookie) |
| GET | /v1/admin/auth/me | get_admin | — | `AdminMeResponse` |

`AdminMeResponse` = `{ user: { id: UUID, email: string, role: "owner"\|"admin"\|"viewer", allowed_tabs: string[], disabled: bool }, tabs: string[] }`
(owner → tabs = ALL_TABS; others → tabs = allowed_tabs)

## Formats (`api/app/api/admin/formats.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/formats | require_tab("formats") | — | `FormatState[]` — flat ARRAY (not an object!). `{key, visible, plans: string[], status: "live"\|"testing"\|"broken", note}`. Keys: 32 format slugs + 210 pair keys as `"pair:<slug>"` |
| PATCH | /v1/admin/formats/{key} | require_tab("formats") | `{visible?: bool, plans?: string[] (subset of anonymous/free/pro), status?: "live"\|"testing"\|"broken", note?: string}` | updated `FormatState`. Key must be a format slug OR `"pair:<slug>"`, else 404 |
| POST | /v1/admin/formats/selfcheck | require_tab("formats") | `{pair?: string}` — plain pair slug or omitted for all | `{ok: true, run_id: UUID, total: int, passed: int, failed: int, testing: int}` (results excluded) |

## Plans & Messages (`api/app/api/admin/plans.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/plans | require_tab("plans") | — | `Plan[]`: `{id, name, price_cents: int, limits: {audio_mb, batch, daily, image_mb, video_max_sec, video_mb}}` ordered by price |
| PATCH | /v1/admin/plans/{plan_id} | require_tab("plans") | `{name?: string, price_cents?: int (>=0), limits?: object}` — limits are MERGED server-side | updated `Plan` |
| GET | /v1/admin/messages | require_tab("plans") | — | `{[key: string]: string}` — seed keys: anon_teaser, batch_hit, pro_only, pro_usage, quota_hit, size_hit, usage_light |
| PATCH | /v1/admin/messages/{key} | require_tab("plans") | `{text: string}` — REQUIRED field | `{key, text}` |

## Users (`api/app/api/admin/users.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/users | require_tab("users") | query: `q?` (email/uid search), `plan?`, `banned?: bool`, `limit=50 (≤200)`, `offset=0` | `UserAdmin[]`: `{id: UUID, email: string\|null, firebase_uid: string\|null, plan_id: string, banned: bool, created_at: datetime}` |
| PATCH | /v1/admin/users/{user_id} | require_tab("users") | QUERY params: `plan_id?`, `banned?` (NOT body!). user_id must be UUID | updated `UserAdmin` |
| GET | /v1/admin/users/stats | require_tab("users") | — | `{total: int, banned: int, by_plan: {[plan_id]: int}}` |

## Team (`api/app/api/admin/team.py`) — writes are OWNER ONLY (403 otherwise)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/team | get_admin (any admin) | — | `AdminUser[]`: `{id: UUID, email, role, allowed_tabs: string[], disabled: bool}` |
| POST | /v1/admin/team | owner only | `{email, password, role: "owner"\|"admin"\|"viewer" (default "admin"), allowed_tabs: string[] (default [])}` — non-owner roles get tabs filtered to ALL_TABS; owner role gets ALL_TABS | created member, 201 |
| PATCH | /v1/admin/team/{member_id} | owner only | `{role?, allowed_tabs?, disabled?}` | updated member. Cannot disable self |
| DELETE | /v1/admin/team/{member_id} | owner only | — | `{"ok": true}`. Cannot delete self |

## Jobs (`api/app/api/admin/jobs.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/jobs | require_tab("jobs") | query: `status?`, `pair?`, `limit=50 (≤200)`, `offset=0` | `JobAdmin[]`: `{id: UUID, owner_key: string, pair_slug: string, status: "queued"\|"processing"\|"done"\|"failed"\|"expired", progress: float, error_code: string\|null, plan_id: string, created_at: datetime, finished_at: datetime\|null}` |
| GET | /v1/admin/jobs/stats | require_tab("jobs") | — | `{by_status: {[status]: int}}` |

## Ads (`api/app/api/admin/ads.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/ads | require_tab("ads") | — | `AdSlot[]`: `{id: string, code: string, enabled: bool}` |
| PATCH | /v1/admin/ads/{slot_id} | require_tab("ads") | `{code?: string, enabled?: bool}` | updated slot. Slot is CREATED on demand — never 404s |

## Reports (`api/app/api/admin/reports.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/reports/summary | require_tab("reports") | query `range`: "day"\|"week"\|"month" (default "week") | `ReportPoint[]`: `{day: string, conversions: int, failed: int, input_mb: float}` |
| GET | /v1/admin/reports/pairs | require_tab("reports") | query `range` (default "week"), `limit=20 (≤100)` | `{pair: string, conversions: int, failed: int}[]` |
| GET | /v1/admin/reports/plans | require_tab("reports") | query `range` (default "week") | `{plan: string, conversions: int, failed: int}[]` |
| GET | /v1/admin/reports/audit | require_tab("reports") | query `limit=50 (≤200)`, `offset=0` | `{id, admin_id: string\|null, action, target, details: object, ip, created_at: string\|null}[]` |

## Settings (`api/app/api/admin/settings.py`)

| Method | Path | Guard | Request | Response |
|---|---|---|---|---|
| GET | /v1/admin/settings | require_tab("settings") | — | `{[key: string]: object}` — every value is a JSON OBJECT (dict), not a string |
| PATCH | /v1/admin/settings/{key} | require_tab("settings") | `{value: object}` — value must be an object. Key created on demand | `{key, value}` |

## Dashboard

NO backend endpoint exists. Dashboard is composed client-side from:
- GET /v1/admin/jobs/stats → by_status
- GET /v1/admin/users/stats → total, banned, by_plan
- GET /v1/admin/reports/summary?range=day → today's conversions
- GET /v1/admin/formats → count pair states live/testing/broken
Each card shows its own error state if its source fails.
