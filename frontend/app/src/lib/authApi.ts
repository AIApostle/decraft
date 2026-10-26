export interface AuthUser {
  id: string
  email: string | null
  profile: {
    display_name: string
    profile_type: 'individual' | 'workshop' | 'business'
  }
}

export interface AuthResponse {
  user: AuthUser
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/+$/, '')
  : import.meta.env.PROD
    ? 'https://decraft.onrender.com'
    : ''

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    })
  } catch {
    throw new ApiError('The Decraft service is unavailable. Check your connection and try again.', 0)
  }

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError(`The request could not be completed (${response.status}). Try again.`, response.status)
    }
    return undefined as T
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError(
      response.ok
        ? 'The Decraft service returned an unreadable response. Try again.'
        : `The Decraft service returned an error (${response.status}). Try again.`,
      response.status,
    )
  }

  if (!response.ok) {
    const detail =
      typeof payload === 'object' && payload !== null && 'detail' in payload
        ? payload.detail
        : undefined
    throw new ApiError(
      typeof detail === 'string' ? detail : 'The request could not be completed. Try again.',
      response.status,
    )
  }

  return payload as T
}

export function getCurrentUser() {
  return apiRequest<AuthResponse>('/api/v1/auth/me')
}

export function logIn(email: string, password: string) {
  return apiRequest<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signUp(
  displayName: string,
  email: string,
  password: string,
  profileType: AuthUser['profile']['profile_type'],
) {
  return apiRequest<AuthResponse>('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      display_name: displayName,
      email,
      password,
      profile_type: profileType,
    }),
  })
}

export function logOut() {
  return apiRequest<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' })
}
