const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!res.ok) {
    const message = data?.message || res.statusText;
    const err = new Error(message);
    (err as any).status = res.status;
    (err as any).body = data;
    throw err;
  }

  return data;
}
