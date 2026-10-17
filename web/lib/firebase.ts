/**
 * Firebase Auth WITHOUT the JS SDK (no extra npm dependency).
 * Uses the Identity Toolkit REST API directly with NEXT_PUBLIC_FIREBASE_API_KEY.
 * Email/password is fully supported. Google sign-in needs the project's OAuth
 * client id (NEXT_PUBLIC_GOOGLE_CLIENT_ID) and hides itself otherwise.
 */

export interface AuthUser {
  uid: string;
  email: string | null;
}

type AuthListener = (user: AuthUser | null) => void;
const listeners = new Set<AuthListener>();
let currentUser: AuthUser | null = null;
let tokenExpiryAt = 0;

const TOKEN_KEY = "qic_id_token";
const REFRESH_KEY = "qic_refresh_token";
const USER_KEY = "qic_user";

function apiKey(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
}

export function isFirebaseConfigured(): boolean {
  return Boolean(apiKey() && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

export function isGoogleConfigured(): boolean {
  return isFirebaseConfigured() && Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function notify(): void {
  for (const listener of Array.from(listeners)) listener(currentUser);
}

interface TokenResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email?: string;
}

async function tokenRequest(path: string, body: Record<string, unknown>): Promise<TokenResponse> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/${path}?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true, ...body }),
    }
  );
  const data = (await response.json()) as TokenResponse & {
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(friendlyError(data?.error?.message));
  return data;
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "EMAIL_EXISTS":
      return "This email is already registered. Try signing in.";
    case "EMAIL_NOT_FOUND":
    case "INVALID_PASSWORD":
    case "INVALID_LOGIN_CREDENTIALS":
      return "Wrong email or password.";
    case "WEAK_PASSWORD : Password should be at least 6 characters":
    case "WEAK_PASSWORD":
      return "Password must be at least 6 characters.";
    case "INVALID_EMAIL":
      return "Please enter a valid email address.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Too many attempts. Please try again later.";
    default:
      return "Login failed. Please try again.";
  }
}

function persistSession(token: TokenResponse): AuthUser {
  const user: AuthUser = { uid: token.localId, email: token.email ?? null };
  tokenExpiryAt = Date.now() + Number(token.expiresIn) * 1000;
  storageSet(TOKEN_KEY, token.idToken);
  storageSet(REFRESH_KEY, token.refreshToken);
  storageSet(USER_KEY, JSON.stringify(user));
  currentUser = user;
  notify();
  return user;
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  // Restore session from storage on first subscribe.
  if (currentUser === null) {
    const raw = storageGet(USER_KEY);
    const token = storageGet(TOKEN_KEY);
    if (raw && token) {
      try {
        currentUser = JSON.parse(raw) as AuthUser;
      } catch {
        currentUser = null;
      }
    }
  }
  listener(currentUser);
  return () => {
    listeners.delete(listener);
  };
}

/** Valid ID token for backend calls; refreshes when expired. */
export async function refreshIdToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const token = storageGet(TOKEN_KEY);
  if (token && Date.now() < tokenExpiryAt - 60_000) return token;
  const refreshToken = storageGet(REFRESH_KEY);
  if (!refreshToken) {
    clearSession();
    return null;
  }
  try {
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      }
    );
    const data = (await response.json()) as {
      id_token?: string;
      refresh_token?: string;
      expires_in?: string;
    };
    if (!response.ok || !data.id_token) throw new Error("refresh failed");
    tokenExpiryAt = Date.now() + Number(data.expires_in) * 1000;
    storageSet(TOKEN_KEY, data.id_token);
    if (data.refresh_token) storageSet(REFRESH_KEY, data.refresh_token);
    return data.id_token;
  } catch {
    clearSession();
    return null;
  }
}

function clearSession(): void {
  currentUser = null;
  tokenExpiryAt = 0;
  storageRemove(TOKEN_KEY);
  storageRemove(REFRESH_KEY);
  storageRemove(USER_KEY);
  notify();
}

export async function signInEmail(email: string, password: string): Promise<void> {
  const token = await tokenRequest("accounts:signInWithPassword", { email, password });
  persistSession(token);
}

export async function signUpEmail(email: string, password: string): Promise<void> {
  const token = await tokenRequest("accounts:signUp", { email, password });
  persistSession(token);
}

/** Google sign-in via manual OAuth implicit flow (needs NEXT_PUBLIC_GOOGLE_CLIENT_ID). */
export function signInGoogleRedirect(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const redirectUri = `${window.location.origin}/auth/google-callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: Math.random().toString(36).slice(2),
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Completes the Google redirect flow on /auth/google-callback. */
export async function completeGoogleRedirect(): Promise<void> {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const idToken = hash.get("id_token");
  if (!idToken) throw new Error("Google login was cancelled.");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${idToken}&providerId=google.com`,
        requestUri: `${window.location.origin}/auth/google-callback`,
        returnSecureToken: true,
      }),
    }
  );
  const data = (await response.json()) as TokenResponse & { error?: { message?: string } };
  if (!response.ok) throw new Error(friendlyError(data?.error?.message));
  persistSession(data);
}

export function signOutUser(): void {
  clearSession();
}
