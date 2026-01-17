// ============================================================================
// MATERIALS DATABASE THUMBNAIL GENERATION
// Thumbnail generation for image materials
// ============================================================================

/**
 * Generate a thumbnail for an image blob
 */
export async function generateThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
  // Server-side check
  if (typeof window === 'undefined') {
    return blob;
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (thumbBlob) => {
          URL.revokeObjectURL(img.src);
          resolve(thumbBlob || blob);
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(blob);
    };

    img.src = URL.createObjectURL(blob);
  });
}
