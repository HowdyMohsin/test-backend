/**
 * Backend API client (section 4.4 contract).
 * The browser talks directly to the API (default http://localhost:8000).
 * Catalog fetches fall back to the local registry when the API is unreachable.
 */

import { FORMATS, PAIRS, type FormatSpec, type Pair } from "./formats";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

/* ------------------------------------------------------------------ types */

export interface ApiFormatState {
  visible: boolean;
  status: "live" | "testing" | "broken";
  plans: string[];
}

export interface ApiCatalogFormat {
  slug: string;
  name: string;
  category: string;
  extensions: string[];
  flags: Record<string, boolean>;
  output_settings: unknown[];
  state?: ApiFormatState;
}

export interface ApiCatalogPair {
  slug: string;
  from: string;
  to: string;
  label?: string;
  status: "live" | "testing" | "broken";
  plans: string[];
}

export interface Catalog {
  formats: ApiCatalogFormat[];
  pairs: ApiCatalogPair[];
  /** true when this came from the local registry because the API was down */
  offline: boolean;
}

export interface UsageInfo {
  used: number;
  limit: number;
  resets_at: string;
}

export interface MeResponse {
  plan: string;
  usage: UsageInfo;
  banner?: { kind: string; text: string };
  user?: { email?: string } | null;
}

export interface UploadResponse {
  upload_id: string;
  detected_format: string;
  size: number;
  expires_at: string;
}

export interface JobStatus {
  status: "queued" | "processing" | "done" | "failed" | "expired";
  progress?: number;
  queue_position?: number;
  download_url?: string;
  error?: { code: string; message: string };
}

export class ApiError extends Error {
  code: string;
  http: number;
  constructor(http: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.http = http;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "request_failed";
  let message = `Request failed (${res.status}).`;
  try {
    const body = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (body?.error?.code) code = body.error.code;
    if (body?.error?.message) message = body.error.message;
  } catch {
    /* keep defaults */
  }
  return new ApiError(res.status, code, message);
}

/* ---------------------------------------------------------------- catalog */

function localCatalog(): Catalog {
  return {
    formats: FORMATS.map(
      (f: FormatSpec): ApiCatalogFormat => ({
        slug: f.slug,
        name: f.name,
        category: f.category,
        extensions: f.extensions,
        flags: { ...(f.flags as Record<string, boolean>) },
        output_settings: f.outputSettings,
      })
    ),
    pairs: PAIRS.map(
      (p: Pair): ApiCatalogPair => ({
        slug: p.slug,
        from: p.from,
        to: p.to,
        label: p.label,
        status: "live",
        plans: ["free", "pro"],
      })
    ),
    offline: true,
  };
}

/** GET /v1/formats — falls back to the local registry when the API is down. */
export async function fetchCatalog(): Promise<Catalog> {
  try {
    const res = await fetch(`${API_BASE}/v1/formats`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { formats: ApiCatalogFormat[]; pairs: ApiCatalogPair[] };
    return { formats: data.formats, pairs: data.pairs, offline: false };
  } catch {
    return localCatalog();
  }
}

/* -------------------------------------------------------------------- user */

const authHeaders = (): HeadersInit => {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("qic_id_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** GET /v1/me — plan + usage + banner. Null when unreachable/anonymous-safe. */
export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/me`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- conversion */

function isApiReachableError(e: unknown): boolean {
  return e instanceof TypeError; // fetch network failure
}

/** POST /v1/uploads (multipart) */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/uploads`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
  } catch (e) {
    if (isApiReachableError(e))
      throw new ApiError(0, "api_unreachable", "Could not reach the conversion server. Is the backend running?");
    throw e;
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as UploadResponse;
}

/** POST /v1/convert */
export async function createJob(
  uploadId: string,
  to: string,
  settings: Record<string, string | number | boolean>
): Promise<{ job_id: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ upload_id: uploadId, to, settings }),
    });
  } catch (e) {
    if (isApiReachableError(e))
      throw new ApiError(0, "api_unreachable", "Could not reach the conversion server. Is the backend running?");
    throw e;
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { job_id: string };
}

/** GET /v1/jobs/{id} */
export async function fetchJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/v1/jobs/${jobId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as JobStatus;
}

export function jobErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message; // backend's own words — never replaced
  return "Something went wrong. Please try again.";
}
