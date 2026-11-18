import type { Catalog, HistoryResponse, JobStatus, Me, PlansResponse, SettingValues, SiteInfo, UploadResult } from "../types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type HeaderProvider = () => Promise<Record<string, string>>;
let authHeaders: HeaderProvider = async () => ({});
export function setAuthHeaderProvider(fn: HeaderProvider): void {
  authHeaders = fn;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(body.error?.code ?? "internal", body.error?.message ?? "Something went wrong.", res.status);
  } catch {
    return new ApiError("network", "Something went wrong. Please try again.", res.status);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1${path}`, {
      ...init,
      headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(await authHeaders()), ...init.headers },
    });
  } catch {
    throw new ApiError("network", "Cannot reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export const api = {
  formats: () => request<Catalog>("/formats"),
  plans: () => request<PlansResponse>("/plans"),
  me: () => request<Me>("/me"),
  site: () => request<SiteInfo>("/site"),
  ads: () => request<{ slots: Record<string, string> }>("/ads"),
  convert: (body: { upload_id: string; to: string; settings: SettingValues; batch_id: string; name_pattern: string }) =>
    request<{ job_id: string }>("/convert", { method: "POST", body: JSON.stringify(body) }),
  jobs: (ids: string[]) => request<{ jobs: JobStatus[] }>(`/jobs?ids=${ids.join(",")}`),
  cancel: (id: string) => request<{ ok: boolean }>(`/jobs/${id}/cancel`, { method: "POST" }),
  removeUpload: (id: string) => request<{ ok: boolean }>(`/uploads/${id}`, { method: "DELETE" }),
  history: () => request<HistoryResponse>("/history"),
  billingConfig: () => request<{ checkout_enabled: boolean }>("/billing/config"),
  checkout: () => request<{ url: string }>("/billing/checkout", { method: "POST" }),
  waitlist: (email: string, source: string, plan: string) =>
    request<{ ok: boolean }>("/billing/waitlist", { method: "POST", body: JSON.stringify({ email, plan, source }) }),
};

export function absolute(path: string): string {
  return `${API_BASE}${path}`;
}

export async function uploadFile(file: File, onProgress: (pct: number) => void, signal: AbortSignal): Promise<UploadResult> {
  const headers = await authHeaders();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/v1/uploads`);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResult);
        else reject(new ApiError(body.error?.code ?? "internal", body.error?.message ?? "Upload failed.", xhr.status));
      } catch {
        reject(new ApiError("network", "Upload failed. Please try again.", xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("network", "Cannot reach the server. Check your connection and try again.", 0));
    xhr.onabort = () => reject(new ApiError("aborted", "Upload cancelled.", 0));
    signal.addEventListener("abort", () => xhr.abort());
    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

export async function downloadZip(jobIds: string[], name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/jobs/zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ job_ids: jobIds, name }),
  });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
