/**
 * API types — hand-written from the section-12 contract.
 * Must match api/app/schemas/v1.py exactly. No `any`.
 */

export interface HealthResponse {
  status: string;
  queue_depth: number;
  version: string;
}

export interface SiteMaintenance {
  on: boolean;
  message: string;
}

export interface SiteAnnouncement {
  text: string;
  link: string;
  expires_at: string | null;
}

export interface SiteResponse {
  maintenance: SiteMaintenance;
  announcement: SiteAnnouncement | null;
  public_counter: number | null;
}

export interface SettingField {
  key: string;
  label: string;
  type: "select" | "range" | "number" | "boolean" | "color" | string;
  default: unknown;
  min: number | null;
  max: number | null;
  options: string[];
  help: string;
}

export interface ApiFormat {
  slug: string;
  name: string;
  category: string; // image | audio | video
  subgroup: string | null; // raw | null
  extensions: string[];
  mime: string;
  flags: string[]; // lossy, alpha, animated, vector, multipage
  output_settings: SettingField[];
}

export interface ApiPair {
  slug: string;
  from: string;
  to: string;
  label: string | null;
  status: string;
  plans: string[];
}

export interface ApiCategory {
  id: string;
  formats: string[];
}

export interface Preset {
  id: string;
  name: string;
  category: string; // image | audio | video
  settings: Record<string, unknown>;
}

export interface FormatsResponse {
  categories: ApiCategory[];
  formats: ApiFormat[];
  pairs: ApiPair[];
  presets: Preset[];
  popular: string[];
}

export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  limits: Record<string, number>;
}

export interface PlansResponse {
  plans: Plan[];
  messages: Record<string, string>;
}

export interface UsageInfo {
  used: number;
  limit: number;
  resets_at: string;
}

export interface Banner {
  kind: string; // info | warning | pro
  text: string;
}

export interface MeUser {
  id: string;
  email: string | null;
  anonymous: boolean;
}

export interface MeResponse {
  user: MeUser;
  plan: string;
  usage: UsageInfo;
  banner: Banner | null;
}

export interface AdsResponse {
  slot: string;
  code: string;
}

export interface UploadResponse {
  upload_id: string;
  detected_format: string;
  size: number;
  expires_at: string;
}

export interface JobError {
  code: string;
  message: string;
}

export type JobStatus = "queued" | "processing" | "done" | "failed" | "cancelled" | "expired";

export interface JobResponse {
  id: string;
  status: JobStatus;
  progress: number;
  queue_position: number | null;
  download_url: string | null;
  error: JobError | null;
}

export type SettingValue = string | number | boolean;
