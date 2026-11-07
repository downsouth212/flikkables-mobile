import { API_URL, BEARER_TOKEN_KEY, tokenStorage } from "@/lib/auth";

export const isBackendConfigured = (): boolean => API_URL.length > 0;

export const getBearerToken = async (): Promise<string | null> => {
  try {
    return await tokenStorage.getItem(BEARER_TOKEN_KEY);
  } catch (error) {
    console.error("[API] Error retrieving bearer token:", error);
    return null;
  }
};

export const apiCall = async <T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<T> => {
  if (!isBackendConfigured()) {
    throw new Error("Backend URL not configured. Set API_URL in lib/auth.ts.");
  }

  const token = await getBearerToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Something went wrong (${response.status}). Try again.`;
    try {
      const parsed = JSON.parse(text) as { error?: unknown };
      if (typeof parsed.error === "string") message = parsed.error;
    } catch {}
    throw new Error(message);
  }

  return response.json();
};

export const apiGet = <T = any>(endpoint: string) =>
  apiCall<T>(endpoint, { method: "GET" });

export const apiPost = <T = any>(endpoint: string, data: any) =>
  apiCall<T>(endpoint, { method: "POST", body: JSON.stringify(data) });

export const apiPut = <T = any>(endpoint: string, data: any) =>
  apiCall<T>(endpoint, { method: "PUT", body: JSON.stringify(data) });

export const apiPatch = <T = any>(endpoint: string, data: any) =>
  apiCall<T>(endpoint, { method: "PATCH", body: JSON.stringify(data) });

export const apiDelete = <T = any>(endpoint: string, data: any = {}) =>
  apiCall<T>(endpoint, { method: "DELETE", body: JSON.stringify(data) });
