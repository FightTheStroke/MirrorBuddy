import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Mobile Build Configuration', () => {
  // apps/web/src/__tests__ → apps/web (next.config.mobile.ts lives here)
  const webRoot = join(__dirname, '../..');
  // apps/web/src/__tests__ → repo root (root package.json holds build:mobile scripts)
  const repoRoot = join(__dirname, '../../../..');

  it('should have next.config.mobile.ts with export output', () => {
    const mobileConfigPath = join(webRoot, 'next.config.mobile.ts');
    expect(existsSync(mobileConfigPath)).toBe(true);

    const mobileConfigContent = readFileSync(mobileConfigPath, 'utf-8');
    expect(mobileConfigContent).toMatch(/output:\s*['"]export['"]/);
  });

  it('should have build:mobile:web script in package.json', () => {
    const packageJsonPath = join(repoRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts['build:mobile:web']).toBeDefined();
    expect(packageJson.scripts['build:mobile:web']).toContain('MOBILE_BUILD');
  });

  it('should have build:mobile script using build:mobile:web', () => {
    const packageJsonPath = join(repoRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts['build:mobile']).toBeDefined();
    expect(packageJson.scripts['build:mobile']).toContain('build:mobile:web');
  });
});
