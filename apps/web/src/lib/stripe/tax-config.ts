/**
 * Stripe Tax Configuration for EU
 * IT, FR, DE, ES, UK
 */

export const EU_TAX_RATES = {
  IT: { rate: 0.22, code: "txr_IT" }, // Italy 22%
  FR: { rate: 0.2, code: "txr_FR" }, // France 20%
  DE: { rate: 0.19, code: "txr_DE" }, // Germany 19%
  ES: { rate: 0.21, code: "txr_ES" }, // Spain 21%
  GB: { rate: 0.2, code: "txr_GB" }, // UK 20%
};

export interface TaxConfig {
  country: string;
  rate: number;
  reverseCharge: boolean;
  taxExempt: boolean;
}

export function getTaxRateForCountry(countryCode: string): number {
  const config = EU_TAX_RATES[countryCode as keyof typeof EU_TAX_RATES];
  return config?.rate || 0;
}

export function isReverseChargeApplicable(
  customerCountry: string,
  hasVatNumber: boolean,
): boolean {
  return (
    customerCountry !== "IT" && // Not domestic
    hasVatNumber && // Has valid VAT
    Object.keys(EU_TAX_RATES).includes(customerCountry) // EU country
  );
}
