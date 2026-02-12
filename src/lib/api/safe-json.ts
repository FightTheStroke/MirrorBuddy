/**
 * Safe JSON body reader for API routes.
 *
 * Some clients (e.g. sendBeacon, aborted navigations, or malformed requests)
 * can hit endpoints with an empty or invalid body. Request.json() throws in
 * those cases. This helper turns that into a null result so routes can return
 * a controlled 4xx instead of a 500 (and avoid noisy Sentry events).
 */

export async function safeReadJson(req: Request): Promise<unknown | null> {
  try {
    // Fast-path: empty bodies should not be treated as server errors.
    const contentLength = req.headers.get('content-length');
    if (contentLength === '0') {
      return null;
    }

    // If Content-Type indicates a non-JSON form payload, skip parsing.
    // Otherwise attempt JSON parsing even for text/plain (some clients omit application/json).
    const contentType = (req.headers.get('content-type') ?? '').toLowerCase();
    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      return null;
    }

    return await req.json();
  } catch {
    return null;
  }
}
