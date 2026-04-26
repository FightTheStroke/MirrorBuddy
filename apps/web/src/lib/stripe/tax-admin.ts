/**
 * Tax Administration - VAT config management
 */

export interface TaxAdminConfig {
  country: string;
  vatRate: number;
  reverseChargeEnabled: boolean;
  taxExempt: boolean;
  stripeTaxId: string;
}

export const DEFAULT_TAX_CONFIGS: TaxAdminConfig[] = [
  {
    country: "IT",
    vatRate: 22,
    reverseChargeEnabled: true,
    taxExempt: false,
    stripeTaxId: "txr_IT",
  },
  {
    country: "FR",
    vatRate: 20,
    reverseChargeEnabled: true,
    taxExempt: false,
    stripeTaxId: "txr_FR",
  },
  {
    country: "DE",
    vatRate: 19,
    reverseChargeEnabled: true,
    taxExempt: false,
    stripeTaxId: "txr_DE",
  },
  {
    country: "ES",
    vatRate: 21,
    reverseChargeEnabled: true,
    taxExempt: false,
    stripeTaxId: "txr_ES",
  },
  {
    country: "GB",
    vatRate: 20,
    reverseChargeEnabled: false,
    taxExempt: false,
    stripeTaxId: "txr_GB",
  },
];
