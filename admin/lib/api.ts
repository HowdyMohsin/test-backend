// API client for the FastAPI backend. Contract-first: every endpoint below
// mirrors CONTRACT.md exactly. No demo data, no fallbacks — if the backend
// is unreachable, callers get an ApiError and show an honest error state.

import {
  AdminMe,
  AdSlot,
  ApiError,
  AuditEntry,
  FormatState,
  Job,
  JobStats,
  Messages,
  PairReport,
  Plan,
  PlanReport,
  ReportPoint,
  ReportRange,
  SelfcheckResult,
  SettingsMap,
  SiteUser,
  TeamMember,
  TeamRole,
  UserStats,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ErrorPayload {
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include", // httpOnly admin cookie
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (e) {
    throw new ApiError(
      "backend_unreachable",
      `Backend not reachable at ${API_URL}. Start it with: docker compose up`,
      0
    );
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as ErrorPayload | null)?.error;
    throw new ApiError(
      err?.code ?? "request_failed",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
      err?.details ?? {}
    );
  }
  return body as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ---------- auth ----------
export const adminLogin = (email: string, password: string): Promise<AdminMe> =>
  req<AdminMe>("/v1/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const adminLogout = (): Promise<{ ok: boolean }> =>
  req<{ ok: boolean }>("/v1/admin/auth/logout", { method: "POST" });

export const adminMe = (): Promise<AdminMe> => req<AdminMe>("/v1/admin/auth/me");

// ---------- formats ----------
export const getFormatStates = (): Promise<FormatState[]> =>
  req<FormatState[]>("/v1/admin/formats");

/** Backend PATCH key: format slugs as-is, pair slugs as "pair:<slug>". */
export function toBackendKey(uiKey: string, formatSlugs: Set<string>): string {
  if (uiKey.startsWith("pair:") || formatSlugs.has(uiKey)) return uiKey;
  return `pair:${uiKey}`;
}

/** Backend GET key → UI key: strip "pair:" prefix. */
export function toUiKey(backendKey: string): string {
  return backendKey.startsWith("pair:") ? backendKey.slice(5) : backendKey;
}

export interface FormatStatePatch {
  visible?: boolean;
  plans?: string[];
  status?: string;
  note?: string;
}

export const updateFormatState = (
  backendKey: string,
  patch: FormatStatePatch
): Promise<FormatState> =>
  req<FormatState>(`/v1/admin/formats/${encodeURIComponent(backendKey)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const runSelfcheck = (pair?: string): Promise<SelfcheckResult> =>
  req<SelfcheckResult>("/v1/admin/formats/selfcheck", {
    method: "POST",
    body: JSON.stringify(pair ? { pair } : {}),
  });

// ---------- plans & messages ----------
export const getPlans = (): Promise<Plan[]> => req<Plan[]>("/v1/admin/plans");

export interface PlanPatch {
  name?: string;
  price_cents?: number;
  limits?: Record<string, number | string | boolean>;
}
export const updatePlan = (planId: string, patch: PlanPatch): Promise<Plan> =>
  req<Plan>(`/v1/admin/plans/${encodeURIComponent(planId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const getMessages = (): Promise<Messages> => req<Messages>("/v1/admin/messages");

export const updateMessage = (key: string, text: string): Promise<{ key: string; text: string }> =>
  req<{ key: string; text: string }>(`/v1/admin/messages/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });

// ---------- users ----------
export interface UserQuery {
  q?: string;
  plan?: string;
  banned?: boolean;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}
export const getUsers = (query: UserQuery = {}): Promise<SiteUser[]> =>
  req<SiteUser[]>(`/v1/admin/users${qs(query)}`);

/** NOTE: plan_id and banned are QUERY params on this endpoint, not a body. */
export const updateUser = (
  userId: string,
  query: { plan_id?: string; banned?: boolean }
): Promise<SiteUser> =>
  req<SiteUser>(`/v1/admin/users/${encodeURIComponent(userId)}${qs(query)}`, {
    method: "PATCH",
  });

export const getUserStats = (): Promise<UserStats> => req<UserStats>("/v1/admin/users/stats");

// ---------- team ----------
export const getTeam = (): Promise<TeamMember[]> => req<TeamMember[]>("/v1/admin/team");

export interface TeamCreate {
  email: string;
  password: string;
  role: TeamRole;
  allowed_tabs: string[];
}
export const createTeamMember = (body: TeamCreate): Promise<TeamMember> =>
  req<TeamMember>("/v1/admin/team", { method: "POST", body: JSON.stringify(body) });

export interface TeamPatch {
  role?: TeamRole;
  allowed_tabs?: string[];
  disabled?: boolean;
}
export const updateTeamMember = (memberId: string, patch: TeamPatch): Promise<TeamMember> =>
  req<TeamMember>(`/v1/admin/team/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const deleteTeamMember = (memberId: string): Promise<{ ok: boolean }> =>
  req<{ ok: boolean }>(`/v1/admin/team/${encodeURIComponent(memberId)}`, { method: "DELETE" });

// ---------- jobs ----------
export interface JobQuery {
  status?: string;
  pair?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}
export const getJobs = (query: JobQuery = {}): Promise<Job[]> =>
  req<Job[]>(`/v1/admin/jobs${qs(query)}`);

export const getJobStats = (): Promise<JobStats> => req<JobStats>("/v1/admin/jobs/stats");

// ---------- ads ----------
export const getAdSlots = (): Promise<AdSlot[]> => req<AdSlot[]>("/v1/admin/ads");

export const updateAdSlot = (
  slotId: string,
  patch: { code?: string; enabled?: boolean }
): Promise<AdSlot> =>
  req<AdSlot>(`/v1/admin/ads/${encodeURIComponent(slotId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

// ---------- reports ----------
export const getReportSummary = (range: ReportRange = "week"): Promise<ReportPoint[]> =>
  req<ReportPoint[]>(`/v1/admin/reports/summary${qs({ range })}`);

export const getReportPairs = (range: ReportRange = "week", limit = 20): Promise<PairReport[]> =>
  req<PairReport[]>(`/v1/admin/reports/pairs${qs({ range, limit })}`);

export const getReportPlans = (range: ReportRange = "week"): Promise<PlanReport[]> =>
  req<PlanReport[]>(`/v1/admin/reports/plans${qs({ range })}`);

export const getAuditLog = (limit = 50, offset = 0): Promise<AuditEntry[]> =>
  req<AuditEntry[]>(`/v1/admin/reports/audit${qs({ limit, offset })}`);

// ---------- settings ----------
export const getSettings = (): Promise<SettingsMap> => req<SettingsMap>("/v1/admin/settings");

export const updateSetting = (
  key: string,
  value: Record<string, unknown>
): Promise<{ key: string; value: Record<string, unknown> }> =>
  req(`/v1/admin/settings/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
