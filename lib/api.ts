// lib/api.ts

// --- Configuration -----------------------------------------------------------
// Local dev default; change if your backend runs elsewhere in dev.
const DEV_DEFAULT_API_BASE = "http://localhost:5000/api";

// Reads env at runtime in both server and client contexts.
function readEnv(): string | undefined {
  // Client-side: only NEXT_PUBLIC_* is available
  if (typeof window !== "undefined") {
    const v = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? undefined;
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  }

  // Server-side (Node / Edge): try server var first, then public one
  const server = (process.env.API_URL as string | undefined) ?? undefined;
  if (typeof server === "string" && server.trim()) return server.trim();

  const clientVisible = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? undefined;
  if (typeof clientVisible === "string" && clientVisible.trim()) return clientVisible.trim();

  return undefined;
}

/**
 * Returns the API origin/base URL, with no trailing slash.
 * Fallbacks:
 *   - dev: http://localhost:5000/api
 *   - prod: (must come from env; otherwise returns empty string and you’ll 404)
 */
export function getApiBase(): string {
  const fromEnv = readEnv();
  const candidate = fromEnv && fromEnv.replace(/\/+$/, "");
  if (candidate && candidate.length > 0) {
    return candidate;
  }

  // In production, an empty base will make absolute URLs impossible.
  // Prefer setting NEXT_PUBLIC_API_URL / API_URL in Vercel.
  if (process.env.NODE_ENV === "production") {
    return ""; // forces caller to provide absolute path or ensures you see failures early
  }

  return DEV_DEFAULT_API_BASE.replace(/\/+$/, "");
}

/**
 * Joins a path to the API base, being smart about duplicate `/api` segments.
 * - If `path` is already absolute (http/https), it is returned unchanged.
 * - If base ends with `/api` and path starts with `/api`, we avoid double `/api/api`.
 */
export function resolveApiUrl(path: string): string {
  const base = getApiBase();

  // Absolute URL? Return as-is.
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const trimmedBase = base.replace(/\/+$/, "");
  let relative = path.startsWith("/") ? path : `/${path}`;
  const baseHasApi = trimmedBase.endsWith("/api");

  if (baseHasApi && relative.startsWith("/api/")) {
    relative = relative.slice(4); // drop leading "/api"
  } else if (baseHasApi && relative === "/api") {
    relative = ""; // avoid trailing duplicate
  }

  // If base is empty (e.g., misconfigured in prod), fall back to relative path.
  // This allows Next.js Route Handlers (`/api/*`) to still work if that's your intent.
  if (!trimmedBase) {
    return relative || "/"; // at least return something sane
  }

  return `${trimmedBase}${relative}`;
}

// --- Fetch helpers -----------------------------------------------------------

/** Error type for non-2xx responses. */
export class ApiError extends Error {
  status: number;
  bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

/** Thin wrapper over fetch that resolves the URL against your API base. */
export async function apiFetch(path: string, init?: RequestInit) {
  const url = resolveApiUrl(path);
  return fetch(url, init);
}

/** Fetch JSON, throwing ApiError on non-2xx. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new ApiError(`Request failed with ${res.status}`, res.status, text);
  }

  // If no content, return undefined as any (caller decides)
  if (res.status === 204) return undefined as unknown as T;

  return (await res.json()) as T;
}

/** Convenience for JSON POST/PUT/PATCH with automatic headers/serialization. */
export async function apiJsonBody<T>(
  path: string,
  body: unknown,
  init?: RequestInit & { method?: "POST" | "PUT" | "PATCH" }
): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  return apiJson<T>(path, {
    ...init,
    method: init?.method ?? "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// --- Internals ---------------------------------------------------------------

async function safeReadText(res: Response): Promise<string | undefined> {
  try {
    return await res.text();
  } catch {
    return undefined;
  }
}
