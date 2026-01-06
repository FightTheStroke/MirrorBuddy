/**
 * @file dyscalculia.ts
 * @brief Dyscalculia support functions (DC01-06)
 */

import type { AccessibilityProfile } from './types';
import { Severity } from './types';

/**
 * Format a number with color-coded digits for dyscalculia
 * DC01: Color code place values (units=blue, tens=green, hundreds=red)
 */
export function formatNumberColored(num: number, useColors: boolean = true): string {
  if (!useColors) {
    return num.toString();
  }

  const str = Math.abs(num).toString();
  const digits = str.split('').reverse();

  const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6']; // blue, green, red, orange, purple

  let html = '';
  for (let i = 0; i < digits.length; i++) {
    const color = colors[i % colors.length];
    html = `<span style="color: ${color}; font-weight: 600;">${digits[i]}</span>` + html;

    // Add comma separators for thousands
    if (i > 0 && i % 3 === 2 && i < digits.length - 1) {
      html = ',' + html;
    }
  }

  return (num < 0 ? '-' : '') + html;
}

/**
 * Generate visual place value blocks for a number
 * DC02: Show hundreds, tens, ones as visual blocks
 */
export function generatePlaceValueBlocks(num: number): string {
  const absNum = Math.abs(num);
  const hundreds = Math.floor(absNum / 100);
  const tens = Math.floor((absNum % 100) / 10);
  const ones = absNum % 10;

  let blocks = '';

  // Hundreds (large red blocks)
  if (hundreds > 0) {
    blocks += `<div class="place-value-group">`;
    blocks += `<span class="place-label">Centinaia</span>`;
    for (let i = 0; i < hundreds; i++) {
      blocks += `<div class="hundred-block" style="width: 40px; height: 40px; background: #ef4444; display: inline-block; margin: 2px;"></div>`;
    }
    blocks += `</div>`;
  }

  // Tens (medium green blocks)
  if (tens > 0) {
    blocks += `<div class="place-value-group">`;
    blocks += `<span class="place-label">Decine</span>`;
    for (let i = 0; i < tens; i++) {
      blocks += `<div class="ten-block" style="width: 30px; height: 30px; background: #10b981; display: inline-block; margin: 2px;"></div>`;
    }
    blocks += `</div>`;
  }

  // Ones (small blue blocks)
  if (ones > 0) {
    blocks += `<div class="place-value-group">`;
    blocks += `<span class="place-label">Unità</span>`;
    for (let i = 0; i < ones; i++) {
      blocks += `<div class="one-block" style="width: 20px; height: 20px; background: #3b82f6; display: inline-block; margin: 2px;"></div>`;
    }
    blocks += `</div>`;
  }

  return blocks;
}

/**
 * Check if math timer should be disabled
 * DC03: Remove time pressure for dyscalculia students
 */
export function shouldDisableMathTimer(profile: AccessibilityProfile): boolean {
  return profile.dyscalculia && profile.dyscalculiaSeverity >= Severity.MODERATE;
}

/**
 * Format a math step into atomic sub-steps
 * DC04: Break complex operations into simple steps
 */
export function formatMathStep(step: string): string[] {
  // Example: "2 + 3 × 4" becomes ["First: 3 × 4 = 12", "Then: 2 + 12 = 14"]

  // This is a simplified example - real implementation would need proper parsing
  const steps: string[] = [];

  // Check for order of operations
  if (step.includes('×') || step.includes('÷')) {
    // Handle multiplication/division first
    steps.push(`Primo passo: Risolvi le moltiplicazioni e divisioni`);
    steps.push(`Secondo passo: Risolvi le addizioni e sottrazioni`);
  } else {
    // Simple left-to-right
    steps.push(`Risolvi da sinistra a destra: ${step}`);
  }

  return steps;
}

/**
 * Get alternative math representation preference
 * DC05: Offer multiple representations (visual, verbal, symbolic)
 */
export function getAlternativeRepresentation(profile: AccessibilityProfile): 'visual' | 'verbal' | 'both' {
  if (profile.dyscalculia) {
    return 'both'; // Always show both for dyscalculia
  }
  return 'visual';
}

/**
 * Format a fraction with visual representation
 * DC06: Show fractions as visual pie charts or bars
 */
export function formatFractionVisual(numerator: number, denominator: number): string {
  const percentage = (numerator / denominator) * 100;

  let visual = '<div class="fraction-visual" style="display: inline-flex; flex-direction: column; align-items: center; margin: 0 8px;">';

  // Show as fraction
  visual += `<div class="fraction-notation" style="text-align: center; margin-bottom: 4px;">`;
  visual += `<div style="border-bottom: 2px solid #000; padding: 2px 8px;">${numerator}</div>`;
  visual += `<div style="padding: 2px 8px;">${denominator}</div>`;
  visual += `</div>`;

  // Show as bar
  visual += `<div class="fraction-bar" style="width: 100px; height: 20px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">`;
  visual += `<div style="width: ${percentage}%; height: 100%; background: #3b82f6;"></div>`;
  visual += `</div>`;

  visual += `<div class="fraction-percentage" style="margin-top: 4px; font-size: 12px; color: #6b7280;">${percentage.toFixed(0)}%</div>`;
  visual += '</div>';

  return visual;
}

