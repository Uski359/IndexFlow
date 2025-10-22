const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function safeApiFetch<T>(path: string, fallback: T, options?: RequestInit): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    console.warn(`API fallback triggered for ${path}:`, error);
    return fallback;
  }
}
