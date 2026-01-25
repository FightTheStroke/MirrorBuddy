import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const TEST_BACKUP_DIR = path.join(process.cwd(), '.test-i18n-backup');

describe('i18n-check script', () => {
  beforeAll(() => {
    // Backup original message files
    if (!fs.existsSync(TEST_BACKUP_DIR)) {
      fs.mkdirSync(TEST_BACKUP_DIR);
    }

    ['en', 'it', 'de', 'es', 'fr'].forEach(lang => {
      const src = path.join(MESSAGES_DIR, `${lang}.json`);
      const dst = path.join(TEST_BACKUP_DIR, `${lang}.json`);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    });
  });

  afterAll(() => {
    // Restore original message files
    ['en', 'it', 'de', 'es', 'fr'].forEach(lang => {
      const src = path.join(TEST_BACKUP_DIR, `${lang}.json`);
      const dst = path.join(MESSAGES_DIR, `${lang}.json`);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        fs.unlinkSync(src);
      }
    });

    // Remove backup directory
    if (fs.existsSync(TEST_BACKUP_DIR)) {
      fs.rmdirSync(TEST_BACKUP_DIR);
    }
  });

  it('should pass when all language files have consistent keys', () => {
    const result = execSync('npm run i18n:check', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    expect(result).toContain('Result: PASS');
  });

  it('should detect missing keys in a language file', () => {
    // Remove a key from German (reference is Italian, so test against it)
    const dePath = path.join(MESSAGES_DIR, 'de.json');
    const deContent = JSON.parse(fs.readFileSync(dePath, 'utf-8'));

    // Remove a common key
    if (deContent.common && deContent.common.loading) {
      delete deContent.common.loading;
    }

    fs.writeFileSync(dePath, JSON.stringify(deContent, null, 2));

    let errorThrown = false;
    try {
      execSync('npm run i18n:check', {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error: any) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);

    // Restore from backup
    fs.copyFileSync(path.join(TEST_BACKUP_DIR, 'de.json'), dePath);
  });

  it('should detect extra keys in a language file (and report but not fail)', () => {
    // Add an extra key to English (comparing against Italian reference)
    const enPath = path.join(MESSAGES_DIR, 'en.json');
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

    // Add an extra top-level key
    enContent.extraTestKey = 'should not exist';

    fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));

    const result = execSync('npm run i18n:check', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // The script reports extra keys but doesn't fail on them
    expect(result).toContain('Extra: extraTestKey');

    // Restore from backup
    fs.copyFileSync(path.join(TEST_BACKUP_DIR, 'en.json'), enPath);
  });

  it('should detect invalid JSON syntax', () => {
    // Create invalid JSON in Spanish
    const esPath = path.join(MESSAGES_DIR, 'es.json');
    fs.writeFileSync(esPath, '{ invalid json }');

    let errorThrown = false;
    try {
      execSync('npm run i18n:check', {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error: any) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);

    // Restore from backup
    fs.copyFileSync(path.join(TEST_BACKUP_DIR, 'es.json'), esPath);
  });

  it('should execute quickly (< 2 seconds)', () => {
    const start = Date.now();

    try {
      execSync('npm run i18n:check', {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // Ignore errors for timing test
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
