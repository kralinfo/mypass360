const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })

    if (!response.ok) {
      let message = `API error ${response.status}: ${response.statusText}`
      try {
        const body = (await response.json()) as { message?: string | string[] }
        if (body.message) {
          message = Array.isArray(body.message) ? body.message.join(', ') : body.message
        }
      } catch {
        // ignora erro de parse do body
      }
      throw new Error(message)
    }

    const text = await response.text()
    return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
  } catch (error) {
    console.error(`API request failed for ${path}:`, error)
    if (error instanceof TypeError) {
      throw new Error(
        'Não foi possível conectar com a API. Inicie o backend em http://localhost:3001 e tente novamente.'
      )
    }

    throw error
  }
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
}

/**
 * Versão autenticada do cliente de API.
 * Inclui o Bearer token em todas as requisições.
 *
 * @example
 * const { data: session } = await supabase.auth.getSession()
 * const authApi = apiWithAuth(session.session?.access_token ?? '')
 * const myEvents = await authApi.get<Event[]>('/events/my')
 */
export function apiWithAuth(token: string) {
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  return {
    get: <T>(path: string, init?: RequestInit) =>
      request<T>(path, { ...init, method: 'GET', headers: { ...authHeaders, ...init?.headers } }),

    post: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: 'POST',
        body: JSON.stringify(body),
        headers: { ...authHeaders, ...init?.headers },
      }),

    patch: <T>(path: string, body: unknown, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: 'PATCH',
        body: JSON.stringify(body),
        headers: { ...authHeaders, ...init?.headers },
      }),

    delete: <T>(path: string, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: 'DELETE',
        headers: { ...authHeaders, ...init?.headers },
      }),
  }
}
