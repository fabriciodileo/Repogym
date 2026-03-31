export type ApiErrorShape = {
  error?: {
    message?: string;
  };
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/proxy/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = (payload as ApiErrorShape)?.error?.message ?? 'No se pudo completar la solicitud.';
    throw new Error(errorMessage);
  }

  return payload as T;
}
