/**
 * Client-side CSRF token management
 * Handles token fetching and automatic header injection for mutations
 */

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

/**
 * Fetch CSRF token from /api/session
 * Token is cached in memory and reused
 */
export async function getCSRFToken(): Promise<string> {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }

  // Dedupe concurrent requests
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = fetch("/api/session", {
    method: "GET",
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      const data = await response.json();
      cachedToken = data.csrfToken;
      tokenPromise = null;
      return cachedToken!;
    })
    .catch((error) => {
      tokenPromise = null;
      throw error;
    });

  return tokenPromise;
}

/**
 * Clear cached token (call on 403 to force refresh)
 */
export function clearCSRFToken(): void {
  cachedToken = null;
  tokenPromise = null;
}

/**
 * Fetch wrapper that automatically includes CSRF token for mutations
 *
 * @example
 * const response = await csrfFetch('/api/resource', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!isMutation) {
    return fetch(url, options);
  }

  // Get CSRF token for mutations
  const csrfToken = await getCSRFToken();

  const headers = new Headers(options.headers);
  headers.set("X-CSRF-Token", csrfToken);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If 403, token may have expired - clear and retry once
  if (response.status === 403) {
    const body = await response
      .clone()
      .json()
      .catch(() => ({}));
    if (body.error === "Invalid CSRF token") {
      clearCSRFToken();
      const newToken = await getCSRFToken();
      headers.set("X-CSRF-Token", newToken);
      return fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  return response;
}
