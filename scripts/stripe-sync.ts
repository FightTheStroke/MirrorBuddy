/**
 * Stripe Product/Price Sync Script
 *
 * Sync Trial/Base/Pro tiers to Stripe as products with prices.
 * Idempotent - can be run multiple times safely.
 *
 * Usage:
 *   npm run script -- scripts/stripe-sync.ts
 *
 * Environment:
 *   STRIPE_SECRET_KEY required
 */

import { stripeService } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { TierCode } from "@/lib/tier/types";

interface TierConfig {
  code: TierCode;
  name: string;
  description: string;
  monthlyPriceEur: number;
  taxCode: string;
}

const TIER_CONFIGS: TierConfig[] = [
  {
    code: TierCode.TRIAL,
    name: "Trial",
    description: "Free trial tier with limited features",
    monthlyPriceEur: 0,
    taxCode: "txcd_10000000", // General digital services
  },
  {
    code: TierCode.BASE,
    name: "Base",
    description: "Free registered user tier with standard features",
    monthlyPriceEur: 0,
    taxCode: "txcd_10000000",
  },
  {
    code: TierCode.PRO,
    name: "Pro",
    description: "Premium tier with unlimited features and priority support",
    monthlyPriceEur: 9.99,
    taxCode: "txcd_10000000",
  },
];

async function syncTiersToStripe(): Promise<void> {
  console.log("🔄 Starting Stripe tier sync...\n");

  for (const config of TIER_CONFIGS) {
    console.log(`📦 Syncing ${config.name} (${config.code})...`);

    try {
      const product = await stripeService.syncProduct({
        name: config.name,
        description: config.description,
        metadata: {
          tierCode: config.code,
          taxCode: config.taxCode,
        },
      });

      console.log(`  ✓ Product: ${product.id}`);

      if (config.monthlyPriceEur > 0) {
        const price = await stripeService.syncPrice({
          productId: product.id,
          amount: Math.round(config.monthlyPriceEur * 100),
          currency: "eur",
          interval: "month",
          metadata: {
            tierCode: config.code,
          },
        });

        console.log(
          `  ✓ Price: ${price.id} (€${config.monthlyPriceEur}/month)`,
        );

        const tierDefinition = await prisma.tierDefinition.findUnique({
          where: { code: config.code },
        });

        if (tierDefinition) {
          await prisma.tierDefinition.update({
            where: { code: config.code },
            data: {
              stripePriceId: price.id,
              monthlyPriceEur: config.monthlyPriceEur,
            },
          });
          console.log(`  ✓ Updated TierDefinition with Stripe price ID`);
        } else {
          console.log(
            `  ⚠ TierDefinition ${config.code} not found in DB, skipped update`,
          );
        }
      } else {
        console.log(`  ✓ Free tier, no price created`);
      }

      console.log("");
    } catch (error) {
      console.error(`  ✗ Error syncing ${config.name}:`, error);
      throw error;
    }
  }

  console.log("✅ Stripe tier sync completed successfully\n");
}

syncTiersToStripe()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
