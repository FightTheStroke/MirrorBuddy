/**
 * Tests for Safety Indicator Service
 * Validates UI configuration for safety-filtered responses
 */

import { describe, it, expect } from 'vitest';
import {
  getSafetyIndicatorConfig,
  shouldShowProminentIndicator,
  getAccessibleDescription,
} from '../safety-indicator-service';
import type { SafetyFilterResult, SafetyIndicatorConfig } from '../types';

describe('getSafetyIndicatorConfig', () => {
  it('returns hidden config when content was not filtered', () => {
    const result: SafetyFilterResult = { wasFiltered: false };
    const config = getSafetyIndicatorConfig(result);

    expect(config.show).toBe(false);
    expect(config.severity).toBe('info');
    expect(config.label).toBe('');
    expect(config.message).toBe('');
  });

  it('returns blocked config for content_inappropriate', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'content_inappropriate',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.show).toBe(true);
    expect(config.severity).toBe('blocked');
    expect(config.icon).toBe('shield');
    expect(config.color).toBe('red');
    expect(config.explanation).toBeDefined();
  });

  it('returns warning config for off_topic', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'off_topic',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.show).toBe(true);
    expect(config.severity).toBe('warning');
    expect(config.icon).toBe('info');
    expect(config.color).toBe('yellow');
  });

  it('returns blocked config for personal_info_request', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'personal_info_request',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.severity).toBe('blocked');
    expect(config.message).toContain('informazioni personali');
  });

  it('returns blocked config for harmful_content', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'harmful_content',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.severity).toBe('blocked');
    expect(config.icon).toBe('stop');
    expect(config.color).toBe('red');
  });

  it('returns warning config for manipulation_attempt', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'manipulation_attempt',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.severity).toBe('warning');
    expect(config.icon).toBe('warning');
    expect(config.color).toBe('orange');
  });

  it('returns warning config for medical_advice', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'medical_advice',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.severity).toBe('warning');
    expect(config.message).toContain('medico');
  });

  it('returns warning config for legal_advice', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'legal_advice',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.severity).toBe('warning');
    expect(config.message).toContain('legal');
  });

  it('returns info config for unknown filter type', () => {
    const result: SafetyFilterResult = {
      wasFiltered: true,
      filterType: 'unknown',
    };
    const config = getSafetyIndicatorConfig(result);

    expect(config.show).toBe(true);
    expect(config.severity).toBe('info');
    expect(config.icon).toBe('shield');
    expect(config.color).toBe('blue');
  });

  it('handles missing filterType when wasFiltered is true', () => {
    const result: SafetyFilterResult = { wasFiltered: true };
    const config = getSafetyIndicatorConfig(result);

    expect(config.show).toBe(true);
    expect(config.severity).toBe('info');
  });
});

describe('shouldShowProminentIndicator', () => {
  it('returns false when config.show is false', () => {
    const config: SafetyIndicatorConfig = {
      show: false,
      severity: 'blocked',
      icon: 'shield',
      color: 'red',
      label: 'Test',
      message: 'Test message',
    };

    expect(shouldShowProminentIndicator(config)).toBe(false);
  });

  it('returns false when severity is info', () => {
    const config: SafetyIndicatorConfig = {
      show: true,
      severity: 'info',
      icon: 'info',
      color: 'blue',
      label: 'Test',
      message: 'Test message',
    };

    expect(shouldShowProminentIndicator(config)).toBe(false);
  });

  it('returns true for warning severity', () => {
    const config: SafetyIndicatorConfig = {
      show: true,
      severity: 'warning',
      icon: 'warning',
      color: 'yellow',
      label: 'Test',
      message: 'Test message',
    };

    expect(shouldShowProminentIndicator(config)).toBe(true);
  });

  it('returns true for blocked severity', () => {
    const config: SafetyIndicatorConfig = {
      show: true,
      severity: 'blocked',
      icon: 'stop',
      color: 'red',
      label: 'Test',
      message: 'Test message',
    };

    expect(shouldShowProminentIndicator(config)).toBe(true);
  });
});

describe('getAccessibleDescription', () => {
  it('returns empty string when config.show is false', () => {
    const config: SafetyIndicatorConfig = {
      show: false,
      severity: 'info',
      icon: 'info',
      color: 'blue',
      label: '',
      message: '',
    };

    expect(getAccessibleDescription(config)).toBe('');
  });

  it('returns formatted description for blocked content', () => {
    const config: SafetyIndicatorConfig = {
      show: true,
      severity: 'blocked',
      icon: 'shield',
      color: 'red',
      label: 'Test',
      message: 'Contenuto non disponibile',
    };

    const description = getAccessibleDescription(config);
    expect(description).toContain('Contenuto non disponibile');
  });

  it('returns formatted description for warning', () => {
    const config: SafetyIndicatorConfig = {
      show: true,
      severity: 'warning',
      icon: 'warning',
      color: 'yellow',
      label: 'Test',
      message: 'Warning required',
    };

    const description = getAccessibleDescription(config);
    expect(description).toContain('Warning');
  });

  it('includes severity and message in accessible format', () => {
    const config: SafetyIndicatorConfig = {
      show: true,
      severity: 'info',
      icon: 'info',
      color: 'blue',
      label: 'Info',
      message: 'Test info message',
    };

    const description = getAccessibleDescription(config);
    expect(description).toContain('Informazione');
    expect(description).toContain('Test info message');
  });
});
