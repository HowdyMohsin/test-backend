/**
 * Typed fetch wrapper for the FastAPI backend (section-12 contract).
 * Backend error codes/messages are surfaced as-is — never replaced.
 */
import type {
  AdsResponse,
  FormatsResponse,
  HealthResponse,
  JobResponse,
  MeResponse,
  PlansResponse,
  SettingValue,
  SiteResponse,
  UploadResponse,
} from "./generated";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  http: number;
  constructor(http: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.http = http;
    this.code = code;
  }
}

function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError;
}

async function parseError(response: Response): Promise<ApiError> {
  let code = "request_failed";
  let message = `Request failed (${response.status}).`;
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    if (body?.error?.code) code = body.error.code;
    if (body?.error?.message) message = body.error.message;
  } catch {
    /* keep defaults */
  }
  return new ApiError(response.status, code, message);
}

export function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  try {
    const token = window.localStorage.getItem("qic_id_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...authHeaders(), ...(init?.headers ?? {}) },
    });
  } catch (error) {
    if (isNetworkFailure(error))
      throw new ApiError(0, "api_unreachable", "Could not reach the conversion server. Is it running?");
    throw error;
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */

export const getHealth = () => request<HealthResponse>("/v1/health");

export const getSite = () => request<SiteResponse>("/v1/site");

export const getFormats = () =>
  request<FormatsResponse>("/v1/formats", { cache: "no-store" } as RequestInit);

export const getPlans = () => request<PlansResponse>("/v1/plans");

export const getMe = () => request<MeResponse>("/v1/me", { cache: "no-store" } as RequestInit);

export const getAd = (slot: string) =>
  request<AdsResponse>(`/v1/ads?slot=${encodeURIComponent(slot)}`);

/** Upload with progress (fetch has no upload progress, so XHR is used). */
export function uploadFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/v1/uploads`);
    const headers = authHeaders();
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, String(value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new ApiError(xhr.status, "bad_response", "Invalid server response."));
        }
      } else {
        try {
          const body = JSON.parse(xhr.responseText) as {
            error?: { code?: string; message?: string };
          };
          reject(
            new ApiError(
              xhr.status,
              body?.error?.code ?? "upload_failed",
              body?.error?.message ?? "Upload failed."
            )
          );
        } catch {
          reject(new ApiError(xhr.status, "upload_failed", "Upload failed."));
        }
      }
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "api_unreachable", "Could not reach the conversion server."));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export const deleteUpload = (uploadId: string) =>
  request<{ ok: boolean }>(`/v1/uploads/${uploadId}`, { method: "DELETE" });

export function createJob(
  uploadId: string,
  target: string,
  settings: Record<string, SettingValue>
): Promise<{ job_id: string }> {
  return request<{ job_id: string }>("/v1/convert", {
    method: "POST",
    body: JSON.stringify({ upload_id: uploadId, to: target, settings }),
  });
}

/** Batch status for polling — unknown ids are skipped server-side. */
export function getJobs(jobIds: string[]): Promise<JobResponse[]> {
  if (jobIds.length === 0) return Promise.resolve([]);
  return request<JobResponse[]>(
    `/v1/jobs?ids=${jobIds.map(encodeURIComponent).join(",")}`,
    { cache: "no-store" } as RequestInit
  );
}

export const getJob = (jobId: string) =>
  request<JobResponse>(`/v1/jobs/${jobId}`, { cache: "no-store" } as RequestInit);

export const cancelJob = (jobId: string) =>
  request<{ ok: boolean }>(`/v1/jobs/${jobId}/cancel`, { method: "POST" });

export function createZip(jobIds: string[]): Promise<{ download_url: string; expires_at: string }> {
  return request<{ download_url: string; expires_at: string }>("/v1/jobs/zip", {
    method: "POST",
    body: JSON.stringify({ job_ids: jobIds }),
  });
}

/** Backend's own words for an error — never replaced. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

/** Absolute URL for a backend download path. */
export function absoluteUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}
