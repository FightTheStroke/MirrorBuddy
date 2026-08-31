import { describe, it, expect, vi } from 'vitest';
import type { MetadataRoute } from 'next';
import robots from '../robots';

describe('robots.ts - Multilingual SEO configuration', () => {
  // Helper to normalize rules to array
  const getRulesArray = (config: MetadataRoute.Robots) => {
    const rules = config.rules;
    return Array.isArray(rules) ? rules : [rules];
  };

  it('should export a robots function', () => {
    expect(typeof robots).toBe('function');
  });

  it('should return a robot config object', () => {
    const config = robots();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('should allow crawling of all public pages', () => {
    const config = robots();
    expect(config.rules).toBeDefined();

    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');
    expect(publicRule).toBeDefined();
    expect(publicRule?.allow).toBeDefined();
  });

  it('should allow crawling of localized paths', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');

    const allowPatterns = Array.isArray(publicRule?.allow) ? publicRule.allow : [publicRule?.allow];

    const allowString = allowPatterns.join(' ');
    expect(allowString).toMatch(/\//); // Should allow root
  });

  it('should block /api/ paths from crawling', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');

    const disallowPatterns = Array.isArray(publicRule?.disallow)
      ? publicRule.disallow
      : [publicRule?.disallow];

    const disallowString = disallowPatterns.join(' ');
    expect(disallowString).toContain('/api');
  });

  it('should block /admin/ paths from crawling', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');

    const disallowPatterns = Array.isArray(publicRule?.disallow)
      ? publicRule.disallow
      : [publicRule?.disallow];

    const disallowString = disallowPatterns.join(' ');
    expect(disallowString).toContain('/admin');
  });

  it('should reference sitemap location', () => {
    const config = robots();
    expect(config.sitemap).toBeDefined();
    expect(config.sitemap).toContain('/sitemap.xml');
  });

  it('should point the sitemap at the canonical domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.mirrorbuddy.org');
    const config = robots();
    expect(config.sitemap).toContain('https://www.mirrorbuddy.org');
    vi.unstubAllEnvs();
  });

  it('never references a domain that does not resolve', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.mirrorbuddy.org');
    const config = robots();
    expect(JSON.stringify(config)).not.toMatch(/mirrorbuddy\.(app|it|com|eu)/);
    vi.unstubAllEnvs();
  });

  it('should allow crawling of public paths', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');

    const allowPatterns = Array.isArray(publicRule?.allow) ? publicRule.allow : [publicRule?.allow];

    // Public paths should be allowed
    expect(allowPatterns.join(' ')).toMatch(/privacy|terms|ai-transparency/);
  });

  it('should set crawl-delay', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');
    expect(publicRule?.crawlDelay).toBeDefined();
    expect(typeof publicRule?.crawlDelay).toBe('number');
    expect(publicRule?.crawlDelay).toBeGreaterThan(0);
  });

  it('should support multilingual paths (all locales)', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const publicRule = rules.find((r: any) => r.userAgent === '*');
    const allowPatterns = Array.isArray(publicRule?.allow) ? publicRule.allow : [publicRule?.allow];

    // Should allow root path
    expect(allowPatterns).toContain('/');
  });

  it('should block AI bots (GPTBot, ChatGPT-User, etc)', () => {
    const config = robots();
    const rules = getRulesArray(config);
    const botRules = rules.filter((r: any) =>
      ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web'].includes(r.userAgent),
    );
    expect(botRules.length).toBeGreaterThan(0);
    botRules.forEach((rule: any) => {
      expect(rule.disallow).toBe('/');
    });
  });
});
