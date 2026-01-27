/**
 * CSP Header Tests - Security Requirements F-10, F-11
 *
 * F-10: CSP connect-src MUST include Supabase/Grafana/Upstash domains
 * F-11: CSP MUST NOT allow ws://localhost in production
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Next.js server modules before importing proxy
vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => ({ headers: new Map() })),
    redirect: vi.fn(() => ({ headers: new Map() })),
  },
}));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: ["it", "en", "fr", "de", "es"],
    defaultLocale: "it",
  },
}));

vi.mock("@/lib/security/csp-nonce", () => ({
  generateNonce: vi.fn(() => "test-nonce"),
  CSP_NONCE_HEADER: "x-csp-nonce",
}));

vi.mock("@/lib/observability/metrics-store", () => ({
  metricsStore: {
    recordLatency: vi.fn(),
    recordError: vi.fn(),
  },
}));

vi.mock("@/lib/auth/cookie-constants", () => ({
  AUTH_COOKIE_NAME: "mirrorbuddy-user-id",
  VISITOR_COOKIE_NAME: "mirrorbuddy-visitor-id",
}));

// We'll need to export buildCSPHeader from proxy.ts for testing
import { buildCSPHeader } from "../proxy";

describe("CSP Header Security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("F-11: Production CSP excludes localhost", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("should NOT include ws://localhost in production", () => {
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      expect(csp).not.toContain("ws://localhost");
    });

    it("should NOT include wss://localhost in production", () => {
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      expect(csp).not.toContain("wss://localhost");
    });

    it("should NOT include http://localhost in production", () => {
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      expect(csp).not.toContain("http://localhost");
    });
  });

  describe("F-11: Development CSP includes localhost", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("should include ws://localhost:* in development", () => {
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain("ws://localhost:*");
    });

    it("should include wss://localhost:* in development", () => {
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain("wss://localhost:*");
    });

    it("should include http://localhost:11434 in development", () => {
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain("http://localhost:11434");
    });
  });

  describe("F-10: Required external domains", () => {
    it.each(["production", "development"])(
      "should include Supabase domains in %s",
      (env) => {
        vi.stubEnv("NODE_ENV", env);
        const nonce = "test-nonce-123";
        const csp = buildCSPHeader(nonce);

        expect(csp).toContain("https://*.supabase.co");
        expect(csp).toContain("wss://*.supabase.co");
      },
    );

    it.each(["production", "development"])(
      "should include Grafana domains in %s",
      (env) => {
        vi.stubEnv("NODE_ENV", env);
        const nonce = "test-nonce-123";
        const csp = buildCSPHeader(nonce);

        expect(csp).toContain("https://*.grafana.net");
      },
    );

    it.each(["production", "development"])(
      "should include Upstash domains in %s",
      (env) => {
        vi.stubEnv("NODE_ENV", env);
        const nonce = "test-nonce-123";
        const csp = buildCSPHeader(nonce);

        expect(csp).toContain("https://*.upstash.io");
      },
    );

    it.each(["production", "development"])(
      "should include Azure OpenAI domains in %s",
      (env) => {
        vi.stubEnv("NODE_ENV", env);
        const nonce = "test-nonce-123";
        const csp = buildCSPHeader(nonce);

        expect(csp).toContain("https://*.openai.azure.com");
        expect(csp).toContain("wss://*.openai.azure.com");
      },
    );

    it.each(["production", "development"])(
      "should include Vercel domains in %s",
      (env) => {
        vi.stubEnv("NODE_ENV", env);
        const nonce = "test-nonce-123";
        const csp = buildCSPHeader(nonce);

        expect(csp).toContain("https://va.vercel-scripts.com");
        expect(csp).toContain("https://vitals.vercel-insights.com");
      },
    );

    it.each(["production", "development"])(
      "should include Sentry domains in %s",
      (env) => {
        vi.stubEnv("NODE_ENV", env);
        const nonce = "test-nonce-123";
        const csp = buildCSPHeader(nonce);

        expect(csp).toContain("*.ingest.us.sentry.io");
        expect(csp).toContain("*.ingest.de.sentry.io");
      },
    );
  });

  describe("CSP structure", () => {
    it("should include nonce in script-src directive", () => {
      vi.stubEnv("NODE_ENV", "production");
      const nonce = "test-nonce-abc123";
      const csp = buildCSPHeader(nonce);

      expect(csp).toContain(`'nonce-${nonce}'`);
      expect(csp).toContain("script-src");
    });

    it("should include all required CSP directives", () => {
      vi.stubEnv("NODE_ENV", "production");
      const nonce = "test-nonce-123";
      const csp = buildCSPHeader(nonce);

      const requiredDirectives = [
        "default-src",
        "script-src",
        "style-src",
        "font-src",
        "img-src",
        "media-src",
        "connect-src",
        "worker-src",
        "frame-src",
        "object-src",
        "base-uri",
        "form-action",
        "frame-ancestors",
      ];

      requiredDirectives.forEach((directive) => {
        expect(csp).toContain(directive);
      });
    });
  });
});
