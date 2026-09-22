import { afterEach, beforeEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import './composition-test-setup';

export const decodeImage = vi.fn();
const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');

beforeEach(() => {
  Object.defineProperty(HTMLImageElement.prototype, 'decode', {
    configurable: true,
    value: decodeImage.mockResolvedValue(undefined),
  });
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(640);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(480);
});
afterEach(() => {
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode);
  else Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
});

export function interceptPicker() {
  const selected: { input?: HTMLInputElement } = {};
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
    this: HTMLInputElement,
  ) {
    selected.input = this;
  });
  return {
    click,
    input: () => {
      if (!selected.input) throw new Error('The real gallery helper has not opened a file input');
      return selected.input;
    },
    select: (file = new File(['synthetic image bytes'], 'photo.png', { type: 'image/png' })) => {
      if (!selected.input) throw new Error('No file picker');
      fireEvent.change(selected.input, { target: { files: [file] } });
    },
  };
}
