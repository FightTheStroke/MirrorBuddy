import { describe, it, expect } from 'vitest';

import { classifyClient, normalizeRequestRoute, type ClientProvenance } from '../client-provenance';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const HEADLESS_CHROME =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36';
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0';
const EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';

describe('classifyClient', () => {
  describe('real browsers', () => {
    it('recognises desktop Chrome as a human browser', () => {
      const result = classifyClient(CHROME_DESKTOP);

      expect(result.clientKind).toBe('browser');
      expect(result.uaFamily).toBe('chrome');
    });

    it('distinguishes Edge from Chrome even though Edge claims to be Chrome', () => {
      expect(classifyClient(EDGE).uaFamily).toBe('edge');
    });

    it('recognises iOS Safari separately from desktop Safari', () => {
      const result = classifyClient(IOS_SAFARI);

      expect(result.clientKind).toBe('browser');
      expect(result.uaFamily).toBe('safari-ios');
    });

    it('recognises Firefox', () => {
      expect(classifyClient(FIREFOX).uaFamily).toBe('firefox');
    });
  });

  describe('automation', () => {
    it('flags headless Chrome as automation', () => {
      const result = classifyClient(HEADLESS_CHROME);

      expect(result.clientKind).toBe('automation');
      expect(result.uaFamily).toBe('headless-chrome');
    });

    it('flags a driven browser via navigator.webdriver even when the agent string looks human', () => {
      const result = classifyClient(CHROME_DESKTOP, { webdriver: true });

      expect(result.clientKind).toBe('automation');
      expect(result.automationMarker).toBe('webdriver');
    });

    it.each([
      ['Playwright/1.47.0', 'playwright'],
      ['Mozilla/5.0 Puppeteer', 'puppeteer'],
      ['Selenium/4.0', 'selenium'],
      ['Chrome-Lighthouse', 'lighthouse'],
    ])('flags %s as automation', (ua, marker) => {
      const result = classifyClient(ua);

      expect(result.clientKind).toBe('automation');
      expect(result.automationMarker).toBe(marker);
    });
  });

  describe('non-browser clients', () => {
    it.each(['curl/8.4.0', 'python-requests/2.32.3', 'Go-http-client/1.1', 'node-fetch/3.3.2'])(
      'classifies %s as a plain http client',
      (ua) => {
        const result = classifyClient(ua);

        expect(result.clientKind).toBe('http-client');
      },
    );

    it.each([
      ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'googlebot'],
      ['Mozilla/5.0 (compatible; bingbot/2.0)', 'bingbot'],
      ['UptimeRobot/2.0', 'uptimerobot'],
    ])('classifies %s as a bot and names it', (ua, family) => {
      const result = classifyClient(ua);

      expect(result.clientKind).toBe('bot');
      expect(result.uaFamily).toBe(family);
    });
  });

  describe('defensive behaviour', () => {
    it.each([undefined, null, '', '   '])('returns unknown for %s without throwing', (ua) => {
      const result = classifyClient(ua as string | undefined);

      expect(result.clientKind).toBe('unknown');
      expect(result.uaFamily).toBe('unknown');
    });

    it('never leaks the raw agent string into the tag values', () => {
      const nasty = `${CHROME_DESKTOP} token=secret-value-do-not-leak`;
      const result: ClientProvenance = classifyClient(nasty);

      expect(JSON.stringify(result)).not.toContain('secret-value-do-not-leak');
    });

    it('keeps tag cardinality bounded: every family is a short slug', () => {
      const agents = [CHROME_DESKTOP, HEADLESS_CHROME, IOS_SAFARI, FIREFOX, EDGE, 'curl/8.4.0'];

      for (const ua of agents) {
        const { uaFamily } = classifyClient(ua);
        expect(uaFamily.length).toBeLessThanOrEqual(24);
        expect(uaFamily).toMatch(/^[a-z0-9-]+$/);
      }
    });
  });
});

describe('normalizeRequestRoute', () => {
  it('keeps the pathname and drops the query string', () => {
    expect(normalizeRequestRoute('https://www.mirrorbuddy.org/api/chat?token=abc&id=42')).toBe(
      '/api/chat',
    );
  });

  it('drops the fragment as well', () => {
    expect(normalizeRequestRoute('https://www.mirrorbuddy.org/it/welcome#section')).toBe(
      '/it/welcome',
    );
  });

  it('replaces identifier-shaped segments so routes group together', () => {
    expect(
      normalizeRequestRoute(
        'https://www.mirrorbuddy.org/api/materials/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      ),
    ).toBe('/api/materials/:id');
    expect(normalizeRequestRoute('https://www.mirrorbuddy.org/api/tiers/12345')).toBe(
      '/api/tiers/:id',
    );
  });

  it('accepts a bare path as well as an absolute URL', () => {
    expect(normalizeRequestRoute('/api/chat?x=1')).toBe('/api/chat');
  });

  it.each([undefined, '', 'not a url at all ::::'])(
    'returns undefined for unusable input %s',
    (url) => {
      expect(normalizeRequestRoute(url as string | undefined)).toBeUndefined();
    },
  );
});
