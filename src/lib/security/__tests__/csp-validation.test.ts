/**
 * CSP Validation Tests
 *
 * These tests validate the Content Security Policy configuration
 * to prevent common mistakes like:
 * - Missing protocols (https://) for domains
 * - Invalid directive syntax
 * - Third-party providers missing nonce props
 *
 * Run these tests before deploying to catch CSP issues early.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildCSPHeader } from '@/proxy';
import { _resetForTesting, setFlagStatus } from '@/lib/feature-flags/feature-flags-service';

describe('CSP Configuration Validation', () => {
  let proxyContent: string;

  beforeAll(() => {
    const proxyPath = path.join(process.cwd(), 'src/proxy.ts');
    proxyContent = fs.readFileSync(proxyPath, 'utf-8');
  });

  describe('Domain Protocol Validation', () => {
    it('connect-src domains should have explicit protocols', () => {
      // Extract connect-src line
      const connectMatch = proxyContent.match(/connect-src[^"`,]+/);
      expect(connectMatch).toBeDefined();

      const connectSrc = connectMatch![0];

      // All wildcard domains should have protocol
      const wildcardDomains = connectSrc.match(/\*\.[a-z.-]+/gi) || [];
      for (const domain of wildcardDomains) {
        // Check that this domain is preceded by a protocol in the original string
        const hasProtocol =
          connectSrc.includes(`https://${domain}`) ||
          connectSrc.includes(`http://${domain}`) ||
          connectSrc.includes(`wss://${domain}`) ||
          connectSrc.includes(`ws://${domain}`);

        expect(hasProtocol, `Domain "${domain}" should have protocol prefix`).toBe(true);
      }
    });

    it('should not have adjacent domains without protocols', () => {
      // Bug pattern: "https://*.domain1 *.domain2" - second domain missing https
      const badPattern = /https?:\/\/\*\.[a-z.-]+\s+\*\.[a-z.-]+(?!\s*https)/i;
      expect(proxyContent).not.toMatch(badPattern);
    });
  });

  describe('Required CSP Directives', () => {
    it('should have default-src self', () => {
      expect(proxyContent).toMatch(/default-src\s+'self'/);
    });

    it('should have script-src with nonce', () => {
      expect(proxyContent).toMatch(/script-src[^;]*'nonce-\$\{nonce\}'/);
    });

    it('should have strict-dynamic for dynamic script loading', () => {
      expect(proxyContent).toMatch(/script-src[^;]*'strict-dynamic'/);
    });

    it('should have object-src none', () => {
      expect(proxyContent).toMatch(/object-src\s+'none'/);
    });

    it('should have frame-ancestors self', () => {
      expect(proxyContent).toMatch(/frame-ancestors\s+'self'/);
    });

    it('should have base-uri self', () => {
      expect(proxyContent).toMatch(/base-uri\s+'self'/);
    });
  });

  describe('No Variable Interpolation Bugs', () => {
    it('should not interpolate variables that create malformed CSP', () => {
      // Previously had: const sentryDomains = "*.a.io *.b.io"
      // Then: https://${sentryDomains} → "https://*.a.io *.b.io" (second missing https)
      expect(proxyContent).not.toContain('${sentryDomains}');
    });

    it('Sentry domains should each have their own https:// prefix', () => {
      // Each Sentry domain should be explicitly prefixed
      expect(proxyContent).toMatch(/https:\/\/\*\.ingest\.us\.sentry\.io/);
      expect(proxyContent).toMatch(/https:\/\/\*\.ingest\.de\.sentry\.io/);
    });
  });

  describe('Voice GA Protocol Feature Flag', () => {
    it('should conditionally include preview realtime domains based on voice_ga_protocol flag', () => {
      // Verify the code checks the voice_ga_protocol feature flag
      expect(proxyContent).toMatch(/isFeatureEnabled\(['"]voice_ga_protocol['"]\)/);

      // Verify preview domains are present in code (for fallback when flag is disabled)
      expect(proxyContent).toContain('realtimeapi-preview.ai.azure.com');

      // Verify the conditional logic exists (spread operator for conditional inclusion)
      expect(proxyContent).toMatch(/useGAProtocol\.enabled/);
    });

    it('should always include GA Azure OpenAI domains', () => {
      // GA domains should be present unconditionally
      expect(proxyContent).toMatch(/https:\/\/\*\.openai\.azure\.com/);
      expect(proxyContent).toMatch(/wss:\/\/\*\.openai\.azure\.com/);
    });
  });
});

describe('Third-Party Provider CSP Compliance', () => {
  let providersContent: string;

  beforeAll(() => {
    const providersPath = path.join(process.cwd(), 'src/components/providers.tsx');
    providersContent = fs.readFileSync(providersPath, 'utf-8');
  });

  it('ThemeProvider should receive nonce prop', () => {
    // ThemeProvider from next-themes injects an inline script for theme detection
    // It MUST receive the nonce prop to comply with CSP
    expect(providersContent).toMatch(/ThemeProvider[\s\S]*?nonce=\{nonce\}/);
  });

  it('Providers component should destructure nonce (not _nonce)', () => {
    // _nonce would indicate the prop is ignored
    expect(providersContent).not.toMatch(/nonce:\s*_nonce/);

    // Should have proper destructuring
    expect(providersContent).toMatch(/\{\s*children,\s*nonce\s*\}/);
  });

  it('should document nonce usage in ProvidersProps', () => {
    // Interface should have nonce prop documented
    expect(providersContent).toMatch(/interface ProvidersProps[\s\S]*?nonce\?/);
  });
});

describe('Dynamic Script Loading Patterns', () => {
  it('code-runner.tsx uses document.createElement for Pyodide (strict-dynamic required)', () => {
    // This test documents that code-runner.tsx relies on strict-dynamic
    const codeRunnerPath = path.join(process.cwd(), 'src/components/tools/code-runner.tsx');
    const content = fs.readFileSync(codeRunnerPath, 'utf-8');

    // Verify it uses document.createElement for script loading
    expect(content).toMatch(/document\.createElement\(['"]script['"]\)/);

    // Verify the proxy.ts has strict-dynamic to support this
    const proxyPath = path.join(process.cwd(), 'src/proxy.ts');
    const proxyContent = fs.readFileSync(proxyPath, 'utf-8');
    expect(proxyContent).toMatch(/'strict-dynamic'/);
  });

  it('use-google-picker.ts uses document.createElement for Google API (strict-dynamic required)', () => {
    const pickerPath = path.join(process.cwd(), 'src/components/google-drive/use-google-picker.ts');
    const content = fs.readFileSync(pickerPath, 'utf-8');

    // Verify it uses document.createElement for script loading
    expect(content).toMatch(/document\.createElement\(['"]script['"]\)/);
  });
});

describe('buildCSPHeader Runtime Behavior', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it('should include preview domains when voice_ga_protocol is disabled', async () => {
    await setFlagStatus('voice_ga_protocol', 'disabled');
    const csp = buildCSPHeader('test-nonce');

    // Should include preview domains
    expect(csp).toContain('realtimeapi-preview.ai.azure.com');
    expect(csp).toContain('https://*.realtimeapi-preview.ai.azure.com');
    expect(csp).toContain('wss://*.realtimeapi-preview.ai.azure.com');

    // Should also include GA domains
    expect(csp).toContain('https://*.openai.azure.com');
    expect(csp).toContain('wss://*.openai.azure.com');
  });

  it('should exclude preview domains when voice_ga_protocol is enabled', async () => {
    await setFlagStatus('voice_ga_protocol', 'enabled');
    const csp = buildCSPHeader('test-nonce');

    // Should NOT include preview domains
    expect(csp).not.toContain('realtimeapi-preview.ai.azure.com');

    // Should include GA domains
    expect(csp).toContain('https://*.openai.azure.com');
    expect(csp).toContain('wss://*.openai.azure.com');
  });

  it('should always include other required domains regardless of flag', async () => {
    await setFlagStatus('voice_ga_protocol', 'enabled');
    const csp = buildCSPHeader('test-nonce');

    // Verify other critical domains are present
    expect(csp).toContain('*.supabase.co');
    expect(csp).toContain('*.grafana.net');
    expect(csp).toContain('*.upstash.io');
    expect(csp).toContain('*.ingest.us.sentry.io');
    expect(csp).toContain('*.ingest.de.sentry.io');
  });
});
