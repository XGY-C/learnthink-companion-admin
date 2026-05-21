// ===================================================================
// Admin API layer — shared with student frontend auth logic
// ===================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'method' | 'headers'> {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: unknown
  skipAuth?: boolean
}

export class ApiError extends Error {
  status: number
  code?: number

  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function getToken(): string {
  return localStorage.getItem('token') || ''
}

function getRefreshToken(): string {
  return localStorage.getItem('refreshToken') || ''
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('token', accessToken)
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
}

function decodeJwt(token: string): { exp?: number; role?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

function isTokenExpiringSoon(token: string, seconds = 60): boolean {
  const decoded = decodeJwt(token)
  if (!decoded?.exp) return false
  return (decoded.exp * 1000) < (Date.now() + seconds * 1000)
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken()
  if (!rt) return false

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })
    if (!res.ok) return false
    const result = await res.json()
    if (result.code === 0 || result.code === 200) {
      const { accessToken, refreshToken: newRt } = result.data
      setTokens(accessToken, newRt || rt)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function ensureValidToken(): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  if (isTokenExpiringSoon(token, 60)) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
    }
    return refreshPromise
  }
  return true
}

function handleUnauthorized() {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('userInfo')
  const redirect = encodeURIComponent(location.pathname + location.search)
  if (!location.pathname.startsWith('/login')) {
    location.href = `/login?redirect=${redirect}`
  }
}

export function getUserRole(): string | null {
  // 后端使用不透明Token（随机hex），角色信息存储在userInfo中
  try {
    const info = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return info.role || null
  } catch {
    return null
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<ApiResult<T>> {
  const { method = 'GET', headers = {}, body, skipAuth = false, ...rest } = options

  if (!skipAuth) {
    await ensureValidToken()
  }

  const isFormData = body instanceof FormData

  const buildHeaders = (): Record<string, string> => {
    const h: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    }
    if (!isFormData) {
      h['Content-Type'] = 'application/json'
    }
    if (!skipAuth) {
      const token = getToken()
      if (token) h.Authorization = `Bearer ${token}`
    }
    return h
  }

  const doFetch = () =>
    fetch(`/api${path}`, {
      method,
      headers: buildHeaders(),
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      ...rest,
    })

  let res = await doFetch()

  if (res.status === 401 && !skipAuth) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null })
    }
    const refreshed = await refreshPromise
    if (refreshed) {
      res = await doFetch()
    }
  }

  if (res.status === 401) {
    handleUnauthorized()
    throw new ApiError('未登录或登录已过期', 401)
  }

  let payload: any
  try {
    payload = await res.json()
  } catch {
    payload = undefined
  }

  if (!res.ok) {
    const message = payload?.message || `请求失败（HTTP ${res.status}）`
    throw new ApiError(message, res.status, payload?.code)
  }

  // 检查业务状态码（后端 Result<T> 统一返回 HTTP 200 + 业务 code）
  if (payload && payload.code !== undefined && payload.code !== 0 && payload.code !== 200) {
    throw new ApiError(payload.message || '请求失败', res.status, payload.code)
  }

  return payload as ApiResult<T>
}
