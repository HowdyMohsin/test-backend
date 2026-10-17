// Types generated from the admin API contract (see CONTRACT.md).
// Every field mirrors the backend schema exactly — no guessing.

export type TeamRole = "owner" | "admin" | "viewer";
export type PairStatus = "live" | "testing" | "broken";
export type PlanId = "anonymous" | "free" | "pro";
export type JobStatus = "queued" | "processing" | "done" | "failed" | "expired";
export type ReportRange = "day" | "week" | "month";

export const ALL_TABS = [
  "dashboard",
  "formats",
  "plans",
  "users",
  "team",
  "jobs",
  "ads",
  "reports",
  "settings",
] as const;
export type TabId = (typeof ALL_TABS)[number];

// GET /v1/admin/auth/me and POST /v1/admin/auth/login
export interface AdminUserInfo {
  id: string;
  email: string;
  role: TeamRole;
  allowed_tabs: string[];
  disabled: boolean;
}
export interface AdminMe {
  user: AdminUserInfo;
  tabs: string[];
}

// GET /v1/admin/formats — flat array; pair keys are "pair:<slug>"
export interface FormatState {
  key: string;
  visible: boolean;
  plans: PlanId[];
  status: PairStatus;
  note: string;
}

// GET /v1/admin/plans
export interface PlanLimits {
  audio_mb: number;
  batch: number;
  daily: number;
  image_mb: number;
  video_max_sec: number;
  video_mb: number;
}
export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  limits: Partial<PlanLimits> & Record<string, number | string | boolean>;
}

// GET /v1/admin/messages
export type Messages = Record<string, string>;

// GET /v1/admin/users
export interface SiteUser {
  id: string;
  email: string | null;
  firebase_uid: string | null;
  plan_id: string;
  banned: boolean;
  created_at: string;
}
export interface UserStats {
  total: number;
  banned: number;
  by_plan: Record<string, number>;
}

// GET /v1/admin/team
export interface TeamMember {
  id: string;
  email: string;
  role: TeamRole;
  allowed_tabs: string[];
  disabled: boolean;
}

// GET /v1/admin/jobs
export interface Job {
  id: string;
  owner_key: string;
  pair_slug: string;
  status: JobStatus;
  progress: number;
  error_code: string | null;
  plan_id: string;
  created_at: string;
  finished_at: string | null;
}
export interface JobStats {
  by_status: Record<string, number>;
}

// GET /v1/admin/ads
export interface AdSlot {
  id: string;
  code: string;
  enabled: boolean;
}

// GET /v1/admin/reports/*
export interface ReportPoint {
  day: string;
  conversions: number;
  failed: number;
  input_mb: number;
}
export interface PairReport {
  pair: string;
  conversions: number;
  failed: number;
}
export interface PlanReport {
  plan: string;
  conversions: number;
  failed: number;
}
export interface AuditEntry {
  id: number;
  admin_id: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  created_at: string | null;
}

// GET /v1/admin/settings
export type SettingsMap = Record<string, Record<string, unknown>>;

// POST /v1/admin/formats/selfcheck
export interface SelfcheckResult {
  ok: boolean;
  run_id: string;
  total: number;
  passed: number;
  failed: number;
  testing: number;
}

// Frozen API error shape: {"error": {"code": "...", "message": "...", "details": {...}}}
export class ApiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;
  constructor(code: string, message: string, status: number, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
