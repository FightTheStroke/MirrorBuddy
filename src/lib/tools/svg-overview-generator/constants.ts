/**
 * Constants for SVG Overview Generator
 */

import type { ThemeColors, OverviewNode } from './types';

/**
 * Theme color definitions
 */
export const THEMES: Record<'light' | 'dark', ThemeColors> = {
  light: {
    background: '#ffffff',
    mainNode: { fill: '#3b82f6', stroke: '#2563eb', text: '#ffffff' },
    sectionNode: { fill: '#8b5cf6', stroke: '#7c3aed', text: '#ffffff' },
    conceptNode: { fill: '#f0f9ff', stroke: '#0ea5e9', text: '#0c4a6e' },
    detailNode: { fill: '#fafafa', stroke: '#a3a3a3', text: '#404040' },
    line: '#94a3b8',
  },
  dark: {
    background: '#1e293b',
    mainNode: { fill: '#3b82f6', stroke: '#60a5fa', text: '#ffffff' },
    sectionNode: { fill: '#8b5cf6', stroke: '#a78bfa', text: '#ffffff' },
    conceptNode: { fill: '#1e3a5f', stroke: '#3b82f6', text: '#93c5fd' },
    detailNode: { fill: '#334155', stroke: '#64748b', text: '#cbd5e1' },
    line: '#475569',
  },
};

/**
 * Node type icons (emoji or unicode)
 */
export const NODE_ICONS: Record<OverviewNode['type'], string> = {
  main: '🎯',
  section: '📑',
  concept: '💡',
  detail: '•',
};
