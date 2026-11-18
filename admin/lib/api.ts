export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let onUnauthorized: () => void = () => undefined;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/v1/admin${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Requested-With": "qic-admin" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network", "Cannot reach the API.", 0);
  }
  if (!res.ok) {
    let code = "internal";
    let message = "Something went wrong.";
    try {
      const j = await res.json();
      code = j.error?.code ?? code;
      message = j.error?.message ?? message;
    } catch {
      /* keep defaults */
    }
    if (res.status === 401 && code === "not_signed_in") onUnauthorized();
    throw new ApiError(code, message, res.status);
  }
  return (await res.json()) as T;
}

export const adminApi = {
  get: <T,>(p: string) => req<T>("GET", p),
  post: <T,>(p: string, b?: unknown) => req<T>("POST", p, b ?? {}),
  put: <T,>(p: string, b: unknown) => req<T>("PUT", p, b),
  patch: <T,>(p: string, b: unknown) => req<T>("PATCH", p, b),
  del: <T,>(p: string) => req<T>("DELETE", p),
};

export type Me = { email: string; role: "super_admin" | "staff"; tabs: string[]; must_change_password: boolean };
