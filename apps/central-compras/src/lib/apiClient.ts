const apiBaseUrl = import.meta.env.VITE_CENTRAL_API_URL?.replace(/\/$/, "");

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function getApiUrl(path: string) {
  if (!apiBaseUrl) {
    throw new ApiClientError(
      "A API local não foi configurada. Defina VITE_CENTRAL_API_URL no .env local.",
      0,
      "API_NOT_CONFIGURED",
    );
  }

  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    throw new ApiClientError(
      payload?.error?.message || "Não foi possível concluir a solicitação.",
      response.status,
      payload?.error?.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
