/**
 * Demo HTML Builder Tests
 *
 * Tests for building complete HTML for demo tools.
 */

import { describe, it, expect } from 'vitest';
import {
  buildDemoHTML,
  getDemoSandboxPermissions,
  getDemoAllowPermissions,
  type DemoData,
} from '../demo-html-builder';

describe('Demo HTML Builder', () => {
  describe('buildDemoHTML', () => {
    it('should build HTML from html/css/js parts', () => {
      const data: DemoData = {
        html: '<div>Hello</div>',
        css: '.test { color: red; }',
        js: 'console.log("test");',
      };

      const result = buildDemoHTML(data);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<div>Hello</div>');
      expect(result).toContain('.test { color: red; }');
      expect(result).toContain('console.log("test");');
    });

    it('should include viewport meta tag', () => {
      const data: DemoData = {
        html: '<div>Test</div>',
      };

      const result = buildDemoHTML(data);

      expect(result).toContain('name="viewport"');
      expect(result).toContain('width=device-width');
    });

    it('should include responsive CSS', () => {
      const data: DemoData = {
        html: '<div>Test</div>',
      };

      const result = buildDemoHTML(data);

      expect(result).toContain('box-sizing: border-box');
      expect(result).toContain('@media (max-width: 768px)');
      expect(result).toContain('@media (min-width: 1920px)');
    });

    it('should wrap script in error handler', () => {
      const data: DemoData = {
        html: '<div>Test</div>',
        js: 'doSomething();',
      };

      const result = buildDemoHTML(data);

      expect(result).toContain('try {');
      expect(result).toContain('catch (error)');
      expect(result).toContain('Demo script error:');
    });

    it('should handle empty parts', () => {
      const data: DemoData = {
        html: '',
      };

      const result = buildDemoHTML(data);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<body>');
    });

    it('should not include script tag when js is empty', () => {
      const data: DemoData = {
        html: '<div>No JS</div>',
      };

      const result = buildDemoHTML(data);

      expect(result).not.toContain('executeDemoScript');
    });

    describe('with code property', () => {
      it('should use code directly when it has DOCTYPE', () => {
        const fullCode = '<!DOCTYPE html><html><head></head><body>Hello</body></html>';
        const data: DemoData = {
          html: '',
          code: fullCode,
        };

        const result = buildDemoHTML(data);

        expect(result).toContain('Hello');
      });

      it('should add viewport meta if missing in code', () => {
        const codeWithoutViewport = '<!DOCTYPE html><html><head></head><body>Test</body></html>';
        const data: DemoData = {
          html: '',
          code: codeWithoutViewport,
        };

        const result = buildDemoHTML(data);

        expect(result).toContain('viewport');
      });

      it('should not add viewport if already present', () => {
        const codeWithViewport = '<!DOCTYPE html><html><head><meta name="viewport" content="test"></head><body>Test</body></html>';
        const data: DemoData = {
          html: '',
          code: codeWithViewport,
        };

        const result = buildDemoHTML(data);

        // Should only have one viewport reference
        const viewportMatches = result.match(/viewport/g);
        expect(viewportMatches?.length).toBe(1);
      });

      it('should add responsive CSS if missing in code', () => {
        const codeWithoutCSS = '<!DOCTYPE html><html><head></head><body>Test</body></html>';
        const data: DemoData = {
          html: '',
          code: codeWithoutCSS,
        };

        const result = buildDemoHTML(data);

        expect(result).toContain('box-sizing: border-box');
      });

      it('should not add responsive CSS if already present', () => {
        const codeWithCSS = '<!DOCTYPE html><html><head><style>* { box-sizing: border-box; }</style></head><body>Test</body></html>';
        const data: DemoData = {
          html: '',
          code: codeWithCSS,
        };

        const result = buildDemoHTML(data);

        // The original style should be preserved
        expect(result).toContain('box-sizing: border-box');
      });

      it('should wrap code without structure in full HTML', () => {
        const bareCode = '<div>Just content</div>';
        const data: DemoData = {
          html: '',
          code: bareCode,
        };

        const result = buildDemoHTML(data);

        expect(result).toContain('<!DOCTYPE html>');
        expect(result).toContain('Just content');
      });

      it('should handle code with <html> but no DOCTYPE', () => {
        const codeWithHtml = '<html><head></head><body>Content</body></html>';
        const data: DemoData = {
          html: '',
          code: codeWithHtml,
        };

        const result = buildDemoHTML(data);

        expect(result).toContain('Content');
        expect(result).toContain('viewport');
      });

      it('should inject CSS into head tag', () => {
        const codeWithHead = '<!DOCTYPE html><html><head></head><body>Test</body></html>';
        const data: DemoData = {
          html: '',
          code: codeWithHead,
        };

        const result = buildDemoHTML(data);

        expect(result).toContain('<style>');
        expect(result).toContain('</head>');
      });

      it('should inject CSS after opening head tag when no closing head tag', () => {
        // Edge case: <head> without </head> (malformed HTML)
        const malformedCode = '<!DOCTYPE html><html><head><body>Test</body></html>';
        const data: DemoData = {
          html: '',
          code: malformedCode,
        };

        const result = buildDemoHTML(data);

        // CSS should be injected after <head>
        expect(result).toContain('<head><style>');
        expect(result).toContain('box-sizing: border-box');
      });
    });
  });

  describe('getDemoSandboxPermissions', () => {
    it('should return sandbox permissions string', () => {
      const permissions = getDemoSandboxPermissions();

      expect(permissions).toContain('allow-scripts');
      expect(permissions).toContain('allow-same-origin');
      expect(permissions).toContain('allow-forms');
      expect(permissions).toContain('allow-popups');
    });

    it('should not include allow-top-navigation', () => {
      const permissions = getDemoSandboxPermissions();

      expect(permissions).not.toContain('allow-top-navigation');
    });
  });

  describe('getDemoAllowPermissions', () => {
    it('should return allow permissions string', () => {
      const permissions = getDemoAllowPermissions();

      expect(permissions).toContain('accelerometer');
      expect(permissions).toContain('autoplay');
      expect(permissions).toContain('clipboard-write');
      expect(permissions).toContain('microphone');
      expect(permissions).toContain('camera');
      expect(permissions).toContain('geolocation');
    });
  });
});
