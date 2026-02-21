export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AuthWorkspace = {
  id: string;
  name: string;
  slug: string;
};

export type AuthPayload = {
  user: AuthUser;
  workspace: AuthWorkspace;
  accessToken: string;
};

const ACCESS_TOKEN_KEY = "axon_access_token";
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

async function parseResponseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.message === "string") return payload.message;
    if (typeof payload?.error === "string") return payload.error;
    return `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function authenticatedFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers as HeadersInit | undefined);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response));
  }

  if (response.status === 204) return undefined as unknown as T;
  return (await response.json()) as T;
}

function writeAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function loginUser(email: string, password: string): Promise<AuthPayload> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response));
  }

  const payload = (await response.json()) as AuthPayload;
  writeAccessToken(payload.accessToken);
  return payload;
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthPayload> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseResponseError(response));
  }

  const payload = (await response.json()) as AuthPayload;
  writeAccessToken(payload.accessToken);
  return payload;
}

export async function refreshAccessToken(): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { accessToken?: string };
  if (!payload.accessToken) return null;

  writeAccessToken(payload.accessToken);
  return payload.accessToken;
}

export async function hasValidSession(): Promise<boolean> {
  const current = getAccessToken();
  if (current) {
    const valid = await verifyAccessToken(current);
    if (valid) return true;
    clearAccessToken();
  }

  const refreshed = await refreshAccessToken();
  return Boolean(refreshed);
}

async function verifyAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
