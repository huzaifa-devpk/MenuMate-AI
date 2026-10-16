import type { ApiError } from "@shared";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as ApiError | T | null;
  if (!res.ok) {
    const err = data && typeof data === "object" && "error" in data ? data.error : undefined;
    throw new ApiClientError(res.status, err?.code ?? "REQUEST_FAILED", err?.message ?? "Request failed", err?.details);
  }
  return data as T;
}

export async function downloadPdf(menuId: string, language: string, filename: string) {
  const res = await fetch(`/api/menus/${menuId}/pdf?language=${encodeURIComponent(language)}`);
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiClientError(res.status, data?.error?.code ?? "REQUEST_FAILED", data?.error?.message ?? "Could not download the PDF.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiClientError) {
    if (Array.isArray(error.details) && error.details.length > 0) {
      const first = error.details[0] as { path?: string; message?: string };
      if (first?.message) return first.path ? `${first.path}: ${first.message}` : first.message;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
