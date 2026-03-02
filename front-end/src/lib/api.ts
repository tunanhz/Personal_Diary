const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Flag để tránh gọi refresh đồng thời nhiều lần
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Lấy auth data từ localStorage
function getAuthData(): { user: any; accessToken: string; refreshToken: string } | null {
  try {
    const stored = localStorage.getItem("pd_auth");
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Lưu tokens mới vào localStorage
function updateTokens(accessToken: string, refreshToken: string) {
  const stored = getAuthData();
  if (stored) {
    stored.accessToken = accessToken;
    stored.refreshToken = refreshToken;
    localStorage.setItem("pd_auth", JSON.stringify(stored));
  }
}

// Xóa auth data (force logout)
function clearAuth() {
  localStorage.removeItem("pd_auth");
}

// Gọi API refresh token
async function doRefreshToken(): Promise<string | null> {
  const auth = getAuthData();
  if (!auth?.refreshToken) {
    clearAuth();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const data = await res.json();
    const { accessToken, refreshToken } = data.data;
    updateTokens(accessToken, refreshToken);
    return accessToken;
  } catch {
    clearAuth();
    return null;
  }
}

// Refresh token với dedup (chỉ gọi 1 lần nếu nhiều request cùng lúc)
async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = doRefreshToken().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string | null
) {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Auto-attach JSON content type (skip for FormData - browser sets boundary automatically)
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  // Ensure Content-Type is NOT set for FormData (browser must set multipart boundary)
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  // Auto-attach Authorization header
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // Nếu 401 và có token → thử refresh rồi retry 1 lần
  if (res.status === 401 && token) {
    const newAccessToken = await refreshAccessToken();

    if (newAccessToken) {
      // Retry request với token mới
      headers["Authorization"] = `Bearer ${newAccessToken}`;
      const retryRes = await fetch(url, {
        ...options,
        headers,
      });

      const retryText = await retryRes.text();
      let retryData: any = null;
      try {
        retryData = retryText ? JSON.parse(retryText) : null;
      } catch {
        retryData = retryText;
      }

      if (!retryRes.ok) {
        const message = retryData?.message || retryRes.statusText;
        const err = new Error(message);
        (err as any).status = retryRes.status;
        (err as any).body = retryData;
        throw err;
      }

      // Dispatch event để AuthProvider cập nhật token trong state
      window.dispatchEvent(new CustomEvent("token-refreshed", { detail: { accessToken: newAccessToken } }));

      return retryData;
    } else {
      // Refresh thất bại → force logout
      window.dispatchEvent(new Event("force-logout"));
    }
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
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
