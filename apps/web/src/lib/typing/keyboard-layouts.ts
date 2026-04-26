'use client';

import type { KeyboardLayoutConfig, KeyboardLayout } from '@/types/tools';

export const KEYBOARD_LAYOUTS: Record<KeyboardLayout, KeyboardLayoutConfig> = {
  qwertz: {
    name: 'qwertz',
    label: 'QWERTZ (German/Swiss)',
    rows: [
      [
        { key: 'q', code: 'KeyQ', finger: 'pinky', hand: 'left' },
        { key: 'w', code: 'KeyW', finger: 'ring', hand: 'left' },
        { key: 'e', code: 'KeyE', finger: 'middle', hand: 'left' },
        { key: 'r', code: 'KeyR', finger: 'index', hand: 'left' },
        { key: 't', code: 'KeyT', finger: 'index', hand: 'left' },
        { key: 'z', code: 'KeyZ', finger: 'index', hand: 'left' },
        { key: 'u', code: 'KeyU', finger: 'index', hand: 'right' },
        { key: 'i', code: 'KeyI', finger: 'middle', hand: 'right' },
        { key: 'o', code: 'KeyO', finger: 'ring', hand: 'right' },
        { key: 'p', code: 'KeyP', finger: 'pinky', hand: 'right' },
        { key: 'ü', code: 'BracketLeft', finger: 'pinky', hand: 'right' },
        { key: '+', code: 'Equal', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: 'a', code: 'KeyA', finger: 'pinky', hand: 'left' },
        { key: 's', code: 'KeyS', finger: 'ring', hand: 'left' },
        { key: 'd', code: 'KeyD', finger: 'middle', hand: 'left' },
        { key: 'f', code: 'KeyF', finger: 'index', hand: 'left' },
        { key: 'g', code: 'KeyG', finger: 'index', hand: 'left' },
        { key: 'h', code: 'KeyH', finger: 'index', hand: 'right' },
        { key: 'j', code: 'KeyJ', finger: 'index', hand: 'right' },
        { key: 'k', code: 'KeyK', finger: 'middle', hand: 'right' },
        { key: 'l', code: 'KeyL', finger: 'ring', hand: 'right' },
        { key: 'ö', code: 'Semicolon', finger: 'pinky', hand: 'right' },
        { key: 'ä', code: 'Quote', finger: 'pinky', hand: 'right' },
        { key: '#', code: 'Backslash', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: '<', code: 'ShiftLeft', finger: 'pinky', hand: 'left' },
        { key: 'y', code: 'KeyY', finger: 'index', hand: 'left' },
        { key: 'x', code: 'KeyX', finger: 'ring', hand: 'left' },
        { key: 'c', code: 'KeyC', finger: 'middle', hand: 'left' },
        { key: 'v', code: 'KeyV', finger: 'index', hand: 'left' },
        { key: 'b', code: 'KeyB', finger: 'index', hand: 'right' },
        { key: 'n', code: 'KeyN', finger: 'index', hand: 'right' },
        { key: 'm', code: 'KeyM', finger: 'index', hand: 'right' },
        { key: ',', code: 'Comma', finger: 'middle', hand: 'right' },
        { key: '.', code: 'Period', finger: 'ring', hand: 'right' },
        { key: '-', code: 'Slash', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: ' ', code: 'Space', finger: 'thumb', hand: 'left' },
      ],
    ],
  },
  qwerty: {
    name: 'qwerty',
    label: 'QWERTY (US/International)',
    rows: [
      [
        { key: 'q', code: 'KeyQ', finger: 'pinky', hand: 'left' },
        { key: 'w', code: 'KeyW', finger: 'ring', hand: 'left' },
        { key: 'e', code: 'KeyE', finger: 'middle', hand: 'left' },
        { key: 'r', code: 'KeyR', finger: 'index', hand: 'left' },
        { key: 't', code: 'KeyT', finger: 'index', hand: 'left' },
        { key: 'y', code: 'KeyY', finger: 'index', hand: 'right' },
        { key: 'u', code: 'KeyU', finger: 'index', hand: 'right' },
        { key: 'i', code: 'KeyI', finger: 'middle', hand: 'right' },
        { key: 'o', code: 'KeyO', finger: 'ring', hand: 'right' },
        { key: 'p', code: 'KeyP', finger: 'pinky', hand: 'right' },
        { key: '[', code: 'BracketLeft', finger: 'pinky', hand: 'right' },
        { key: ']', code: 'BracketRight', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: 'a', code: 'KeyA', finger: 'pinky', hand: 'left' },
        { key: 's', code: 'KeyS', finger: 'ring', hand: 'left' },
        { key: 'd', code: 'KeyD', finger: 'middle', hand: 'left' },
        { key: 'f', code: 'KeyF', finger: 'index', hand: 'left' },
        { key: 'g', code: 'KeyG', finger: 'index', hand: 'left' },
        { key: 'h', code: 'KeyH', finger: 'index', hand: 'right' },
        { key: 'j', code: 'KeyJ', finger: 'index', hand: 'right' },
        { key: 'k', code: 'KeyK', finger: 'middle', hand: 'right' },
        { key: 'l', code: 'KeyL', finger: 'ring', hand: 'right' },
        { key: ';', code: 'Semicolon', finger: 'pinky', hand: 'right' },
        { key: "'", code: 'Quote', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: 'z', code: 'KeyZ', finger: 'pinky', hand: 'left' },
        { key: 'x', code: 'KeyX', finger: 'ring', hand: 'left' },
        { key: 'c', code: 'KeyC', finger: 'middle', hand: 'left' },
        { key: 'v', code: 'KeyV', finger: 'index', hand: 'left' },
        { key: 'b', code: 'KeyB', finger: 'index', hand: 'right' },
        { key: 'n', code: 'KeyN', finger: 'index', hand: 'right' },
        { key: 'm', code: 'KeyM', finger: 'index', hand: 'right' },
        { key: ',', code: 'Comma', finger: 'middle', hand: 'right' },
        { key: '.', code: 'Period', finger: 'ring', hand: 'right' },
        { key: '/', code: 'Slash', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: ' ', code: 'Space', finger: 'thumb', hand: 'left' },
      ],
    ],
  },
  azerty: {
    name: 'azerty',
    label: 'AZERTY (French)',
    rows: [
      [
        { key: 'a', code: 'KeyA', finger: 'pinky', hand: 'left' },
        { key: 'z', code: 'KeyZ', finger: 'ring', hand: 'left' },
        { key: 'e', code: 'KeyE', finger: 'middle', hand: 'left' },
        { key: 'r', code: 'KeyR', finger: 'index', hand: 'left' },
        { key: 't', code: 'KeyT', finger: 'index', hand: 'left' },
        { key: 'y', code: 'KeyY', finger: 'index', hand: 'right' },
        { key: 'u', code: 'KeyU', finger: 'index', hand: 'right' },
        { key: 'i', code: 'KeyI', finger: 'middle', hand: 'right' },
        { key: 'o', code: 'KeyO', finger: 'ring', hand: 'right' },
        { key: 'p', code: 'KeyP', finger: 'pinky', hand: 'right' },
        { key: '^', code: 'BracketLeft', finger: 'pinky', hand: 'right' },
        { key: '$', code: 'BracketRight', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: 'q', code: 'KeyQ', finger: 'pinky', hand: 'left' },
        { key: 's', code: 'KeyS', finger: 'ring', hand: 'left' },
        { key: 'd', code: 'KeyD', finger: 'middle', hand: 'left' },
        { key: 'f', code: 'KeyF', finger: 'index', hand: 'left' },
        { key: 'g', code: 'KeyG', finger: 'index', hand: 'left' },
        { key: 'h', code: 'KeyH', finger: 'index', hand: 'right' },
        { key: 'j', code: 'KeyJ', finger: 'index', hand: 'right' },
        { key: 'k', code: 'KeyK', finger: 'middle', hand: 'right' },
        { key: 'l', code: 'KeyL', finger: 'ring', hand: 'right' },
        { key: 'm', code: 'Semicolon', finger: 'pinky', hand: 'right' },
        { key: 'ù', code: 'Quote', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: 'w', code: 'ShiftLeft', finger: 'pinky', hand: 'left' },
        { key: 'x', code: 'KeyX', finger: 'ring', hand: 'left' },
        { key: 'c', code: 'KeyC', finger: 'middle', hand: 'left' },
        { key: 'v', code: 'KeyV', finger: 'index', hand: 'left' },
        { key: 'b', code: 'KeyB', finger: 'index', hand: 'right' },
        { key: 'n', code: 'KeyN', finger: 'index', hand: 'right' },
        { key: ',', code: 'KeyM', finger: 'index', hand: 'right' },
        { key: ';', code: 'Comma', finger: 'middle', hand: 'right' },
        { key: ':', code: 'Period', finger: 'ring', hand: 'right' },
        { key: '!', code: 'Slash', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: ' ', code: 'Space', finger: 'thumb', hand: 'left' },
      ],
    ],
  },
  dvorak: {
    name: 'dvorak',
    label: 'Dvorak (Ergonomic)',
    rows: [
      [
        { key: "'", code: 'Quote', finger: 'pinky', hand: 'left' },
        { key: ',', code: 'Comma', finger: 'ring', hand: 'left' },
        { key: '.', code: 'Period', finger: 'middle', hand: 'left' },
        { key: 'p', code: 'KeyP', finger: 'index', hand: 'left' },
        { key: 'y', code: 'KeyY', finger: 'index', hand: 'left' },
        { key: 'f', code: 'KeyF', finger: 'index', hand: 'right' },
        { key: 'g', code: 'KeyG', finger: 'index', hand: 'right' },
        { key: 'c', code: 'KeyC', finger: 'middle', hand: 'right' },
        { key: 'r', code: 'KeyR', finger: 'ring', hand: 'right' },
        { key: 'l', code: 'KeyL', finger: 'pinky', hand: 'right' },
        { key: '/', code: 'Slash', finger: 'pinky', hand: 'right' },
        { key: '=', code: 'Equal', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: 'a', code: 'KeyA', finger: 'pinky', hand: 'left' },
        { key: 'o', code: 'KeyO', finger: 'ring', hand: 'left' },
        { key: 'e', code: 'KeyE', finger: 'middle', hand: 'left' },
        { key: 'u', code: 'KeyU', finger: 'index', hand: 'left' },
        { key: 'i', code: 'KeyI', finger: 'index', hand: 'right' },
        { key: 'd', code: 'KeyD', finger: 'index', hand: 'right' },
        { key: 'h', code: 'KeyH', finger: 'index', hand: 'right' },
        { key: 't', code: 'KeyT', finger: 'middle', hand: 'right' },
        { key: 'n', code: 'KeyN', finger: 'ring', hand: 'right' },
        { key: 's', code: 'KeyS', finger: 'pinky', hand: 'right' },
        { key: '-', code: 'Minus', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: ';', code: 'Semicolon', finger: 'pinky', hand: 'left' },
        { key: 'q', code: 'KeyQ', finger: 'ring', hand: 'left' },
        { key: 'j', code: 'KeyJ', finger: 'middle', hand: 'left' },
        { key: 'k', code: 'KeyK', finger: 'index', hand: 'left' },
        { key: 'x', code: 'KeyX', finger: 'index', hand: 'right' },
        { key: 'b', code: 'KeyB', finger: 'index', hand: 'right' },
        { key: 'm', code: 'KeyM', finger: 'index', hand: 'right' },
        { key: 'w', code: 'KeyW', finger: 'middle', hand: 'right' },
        { key: 'v', code: 'KeyV', finger: 'ring', hand: 'right' },
        { key: 'z', code: 'KeyZ', finger: 'pinky', hand: 'right' },
      ],
      [
        { key: ' ', code: 'Space', finger: 'thumb', hand: 'left' },
      ],
    ],
  },
};

export function getKeyboardLayout(layout: KeyboardLayout): KeyboardLayoutConfig {
  return KEYBOARD_LAYOUTS[layout];
}

export function getKeyByCode(code: string, layout: KeyboardLayout): string {
  const config = KEYBOARD_LAYOUTS[layout];
  for (const row of config.rows) {
    for (const keyConfig of row) {
      if (keyConfig.code === code) {
        return keyConfig.key;
      }
    }
  }
  return '';
}

export function getKeyFinger(key: string, layout: KeyboardLayout) {
  const config = KEYBOARD_LAYOUTS[layout];
  const lowerKey = key.toLowerCase();
  for (const row of config.rows) {
    for (const keyConfig of row) {
      if (keyConfig.key.toLowerCase() === lowerKey) {
        return {
          finger: keyConfig.finger,
          hand: keyConfig.hand,
        };
      }
    }
  }
  return null;
}
