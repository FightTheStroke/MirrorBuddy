import { describe, expect, it } from 'vitest';
import { getPhotoUrl } from '../photo-content';

describe('getPhotoUrl', () => {
  const image = 'data:image/png;base64,UE5H';

  it.each(['url', 'imageData', 'imageBase64'])('reads the existing %s shape', (field) => {
    const content = Object.freeze({ [field]: image });
    expect(getPhotoUrl(content)).toBe(image);
    expect(content).toEqual({ [field]: image });
  });

  it('keeps the canonical URL ahead of legacy aliases', () => {
    expect(getPhotoUrl({ url: image, imageData: 'legacy', imageBase64: 'old' })).toBe(image);
  });

  it('accepts raw JPEG base64 from historical webcam payloads', () => {
    expect(getPhotoUrl({ imageBase64: '/9j/AA==' })).toBe('data:image/jpeg;base64,/9j/AA==');
  });

  it.each([null, undefined, false, 42, 'image', [], {}, { imageBase64: '' }])(
    'leaves missing or invalid photo data for the caller empty state: %j',
    (content) => {
      expect(getPhotoUrl(content)).toBeUndefined();
    },
  );

  it('skips malformed aliases without losing the persisted image', () => {
    expect(getPhotoUrl({ url: 42, imageData: ' ', imageBase64: image })).toBe(image);
  });
});
