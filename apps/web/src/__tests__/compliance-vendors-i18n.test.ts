import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Guards the vendor/processor disclosure in the privacy content.
 *
 * This test used to require an Anthropic entry (added by ADR 0140, when
 * ClaudeProvider was still registered in the AI router). AI-Act tracker item
 * P2-4 removed that provider; P2-4b removed the disclosure it justified. The
 * test now guards the opposite property: only vendors that actually process
 * data may be declared, and Anthropic must not silently come back.
 */
describe('Compliance Vendors i18n (F-01)', () => {
  const locales = ['it', 'en', 'fr', 'de', 'es'];
  const requiredVendorKeys = ['name', 'dataProcessed', 'legalBasis', 'dpaStatus', 'dataLocation'];

  locales.forEach((locale) => {
    describe(`${locale} locale`, () => {
      let vendors: Record<string, Record<string, string>>;

      beforeAll(() => {
        const filePath = join(process.cwd(), `apps/web/messages/${locale}/compliance.json`);
        const content = readFileSync(filePath, 'utf-8');
        const compliance = JSON.parse(content).compliance;
        vendors = compliance.legal.privacy.vendorsAndProcessors?.vendors;
      });

      it('should have vendorsAndProcessors section under privacy', () => {
        expect(vendors).toBeDefined();
      });

      it('should declare the Azure Realtime Voice processor', () => {
        expect(vendors.azureRealtimeVoice).toBeDefined();
      });

      it('should have all required fields for every declared vendor', () => {
        Object.entries(vendors).forEach(([vendorKey, vendor]) => {
          requiredVendorKeys.forEach((key) => {
            expect(vendor[key], `${vendorKey}.${key}`).toBeDefined();
            expect(vendor[key], `${vendorKey}.${key}`).not.toBe('');
          });
        });
      });

      it('should cite a GDPR legal basis for every declared vendor', () => {
        Object.entries(vendors).forEach(([vendorKey, vendor]) => {
          expect(vendor.legalBasis, `${vendorKey}.legalBasis`).toMatch(
            /6\.1\.[abcdef]|6\(1\)\([abcdef]\)|Art\.?\s*6\s*Abs/i,
          );
        });
      });

      it('should state a data location for every declared vendor', () => {
        Object.entries(vendors).forEach(([vendorKey, vendor]) => {
          expect(vendor.dataLocation.length, `${vendorKey}.dataLocation`).toBeGreaterThan(0);
        });
      });

      it('should NOT declare Anthropic/Claude as a processor (AI-Act P2-4b)', () => {
        expect(vendors.anthropic).toBeUndefined();
        expect(vendors.claude).toBeUndefined();
        const serialised = JSON.stringify(vendors);
        expect(serialised).not.toMatch(/anthropic|claude/i);
      });
    });
  });
});
