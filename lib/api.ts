const DEFAULT_API_BASE = 'http://localhost:5000/api'

function getViteEnv(): string | undefined {
  try {
    const meta = (import.meta as unknown as { env?: Record<string, string> })
    return meta?.env?.VITE_API_URL
  } catch (error) {
    return undefined
  }
}

function getNextEnv(): string | undefined {
  if (typeof process === 'undefined') {
    return undefined
  }
  const value = process.env?.NEXT_PUBLIC_API_URL
  return typeof value === 'string' ? value : undefined
}

export function getApiBase(): string {
  const candidate = getNextEnv() || getViteEnv()
  if (candidate && candidate.trim().length > 0) {
    return candidate.trim().replace(/\/$/, '')
  }
  return DEFAULT_API_BASE
}

export function resolveApiUrl(path: string): string {
  const base = getApiBase()
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  let relative = path.startsWith('/') ? path : `/${path}`
  const trimmedBase = base.replace(/\/+$/, '')
  const baseHasApi = trimmedBase.endsWith('/api')

  if (baseHasApi && relative.startsWith('/api/')) {
    relative = relative.slice(4)
  } else if (baseHasApi && relative === '/api') {
    relative = ''
  }

  return `${trimmedBase}${relative}`
}

export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(resolveApiUrl(path), init)
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Request failed with ${response.status}: ${text}`)
  }
  return (await response.json()) as T
}
