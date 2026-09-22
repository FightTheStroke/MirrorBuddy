/** Read existing photo formats without rewriting persisted material content. */
export function getPhotoUrl(content: unknown): string | undefined {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return undefined;
  const record = content as Record<string, unknown>;
  for (const field of ['url', 'imageData', 'imageBase64']) {
    const value = record[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    // Historical webcam payloads also accepted raw JPEG base64.
    if (field === 'imageBase64' && /^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      return `data:image/jpeg;base64,${value}`;
    }
    return value;
  }
  return undefined;
}
