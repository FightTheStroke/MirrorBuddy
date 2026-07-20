import { describe, it, expect, vi } from 'vitest';
import { resolveCoachName, resolveCoachIdentity, buildCoachOpener } from '../coach-opener';

describe('resolveCoachName', () => {
  it('returns the chosen coach name for a valid preference', () => {
    // Arrange / Act
    const name = resolveCoachName('roberto');

    // Assert
    expect(name).toBe('Roberto');
  });

  it('falls back to the default coach (Melissa) when preference is undefined', () => {
    // Arrange / Act
    const name = resolveCoachName(undefined);

    // Assert
    expect(name).toBe('Melissa');
  });

  it('falls back to the default coach when preference is an unknown id', () => {
    // Arrange / Act
    const name = resolveCoachName('does-not-exist');

    // Assert
    expect(name).toBe('Melissa');
  });
});

describe('resolveCoachIdentity', () => {
  it('returns the chosen coach name and avatar for a valid preference', () => {
    // Arrange / Act
    const identity = resolveCoachIdentity('melissa');

    // Assert
    expect(identity.name).toBe('Melissa');
    expect(identity.avatar).toBe('/avatars/melissa.webp');
  });

  it('falls back to the default coach (Melissa) identity when preference is unknown', () => {
    // Arrange / Act
    const identity = resolveCoachIdentity('does-not-exist');

    // Assert
    expect(identity.name).toBe('Melissa');
    expect(identity.avatar).toBe('/avatars/melissa.webp');
  });
});

describe('buildCoachOpener', () => {
  const t = vi.fn(
    (key: string, values?: Record<string, string>) => `${key}|${JSON.stringify(values ?? {})}`,
  );

  it('uses the guided-questions general variant when the subject is unknown', () => {
    // Arrange / Act
    const opener = buildCoachOpener('chiara', undefined, t);

    // Assert
    expect(opener).toBe('coachOpener.general|{"coach":"Chiara"}');
  });

  it('uses the short withSubject variant when the subject is known', () => {
    // Arrange / Act
    const opener = buildCoachOpener('chiara', 'Matematica', t);

    // Assert
    expect(opener).toBe('coachOpener.withSubject|{"coach":"Chiara","subject":"Matematica"}');
  });

  it('resolves to the default coach name inside the opener when preference missing', () => {
    // Arrange / Act
    const opener = buildCoachOpener(null, undefined, t);

    // Assert
    expect(opener).toContain('"coach":"Melissa"');
  });
});
