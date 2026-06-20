const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    console.error(`API request failed for ${path}:`, error)
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
