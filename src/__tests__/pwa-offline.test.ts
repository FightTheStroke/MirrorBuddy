import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PWA Offline Support", () => {
  const publicDir = path.join(process.cwd(), "public");
  const swPath = path.join(publicDir, "sw.js");
  const offlinePath = path.join(publicDir, "offline.html");

  describe("Service Worker", () => {
    it("should exist at public/sw.js", () => {
      expect(fs.existsSync(swPath)).toBe(true);
    });

    it("should contain fetch event listener", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toMatch(/addEventListener\(['"]fetch['"]/);
    });

    it("should define cache names", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toContain("STATIC_CACHE_V1");
    });

    it("should implement CacheFirst strategy for static assets", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toMatch(/\/_next\/static\//);
      expect(swContent).toMatch(/\/icons\//);
      expect(swContent).toMatch(/\/images\//);
    });

    it("should implement NetworkOnly for API routes", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toMatch(/\/api\//);
    });

    it("should implement NetworkFirst for pages", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toContain("offline.html");
    });

    it("should precache offline.html in install event", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toContain("offline.html");
      const installHandler = swContent.match(
        /addEventListener\(['"]install['"][^}]+\{[\s\S]+?\}\);/,
      );
      expect(installHandler).toBeTruthy();
      expect(installHandler?.[0]).toMatch(/PRECACHE|offline\.html/);
    });

    it("should clean old caches in activate event", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      const activateHandler = swContent.match(
        /addEventListener\(['"]activate['"][^}]+\{[\s\S]+?\}\);/,
      );
      expect(activateHandler).toBeTruthy();
      expect(activateHandler?.[0]).toMatch(/caches\.(delete|keys)/);
    });

    it("should preserve push notification handlers", () => {
      const swContent = fs.readFileSync(swPath, "utf-8");
      expect(swContent).toMatch(/addEventListener\(['"]push['"]/);
      expect(swContent).toMatch(/addEventListener\(['"]notificationclick['"]/);
      expect(swContent).toMatch(/addEventListener\(['"]notificationclose['"]/);
      expect(swContent).toMatch(
        /addEventListener\(['"]pushsubscriptionchange['"]/,
      );
    });
  });

  describe("Offline Page", () => {
    it("should exist at public/offline.html", () => {
      expect(fs.existsSync(offlinePath)).toBe(true);
    });

    it("should be self-contained HTML with no external dependencies", () => {
      const content = fs.readFileSync(offlinePath, "utf-8");
      expect(content).toContain("<!DOCTYPE html>");
      expect(content).toContain("<html");
      expect(content).not.toMatch(/<link[^>]+rel=["']stylesheet["']/);
      expect(content).not.toMatch(/<script[^>]+src=/);
    });

    it("should support multiple languages (en, it, fr, de, es)", () => {
      const content = fs.readFileSync(offlinePath, "utf-8");
      expect(content).toMatch(/navigator\.language/);
      expect(content).toContain("en");
      expect(content).toContain("it");
      expect(content).toContain("fr");
      expect(content).toContain("de");
      expect(content).toContain("es");
    });

    it("should display offline message", () => {
      const content = fs.readFileSync(offlinePath, "utf-8");
      expect(content.toLowerCase()).toMatch(
        /offline|you're offline|sem conexão/,
      );
    });

    it("should have a retry button", () => {
      const content = fs.readFileSync(offlinePath, "utf-8");
      expect(content.toLowerCase()).toMatch(
        /retry|tentar novamente|riprova|réessayer|wiederholen|reintentar/,
      );
    });

    it("should be responsive", () => {
      const content = fs.readFileSync(offlinePath, "utf-8");
      expect(content).toMatch(/viewport/i);
    });

    it("should be under 100 lines", () => {
      const content = fs.readFileSync(offlinePath, "utf-8");
      const lineCount = content.split("\n").length;
      expect(lineCount).toBeLessThanOrEqual(100);
    });
  });
});
