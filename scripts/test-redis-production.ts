/**
 * Test Redis connection using production environment variables
 */

import { Redis } from "@upstash/redis";

async function testRedis() {
  console.log("=== Testing Redis with Production Variables ===\n");

  // Simulate reading from Vercel (with potential whitespace)
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL || "";
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN || "";

  console.log("Raw URL:", JSON.stringify(rawUrl));
  console.log(
    "Raw Token (first 20):",
    JSON.stringify(rawToken.substring(0, 20)),
  );
  console.log("URL has whitespace:", /\s/.test(rawUrl));
  console.log("Token has whitespace:", /\s/.test(rawToken));

  console.log("\n--- Testing WITHOUT .trim() ---");
  try {
    const redisNoTrim = new Redis({
      url: rawUrl,
      token: rawToken,
    });
    const resultNoTrim = await redisNoTrim.ping();
    console.log("✅ Connection successful (no trim):", resultNoTrim);
  } catch (error) {
    console.log("❌ Connection failed (no trim):");
    if (error instanceof Error) {
      console.log("   Error:", error.name, "-", error.message);
    }
  }

  console.log("\n--- Testing WITH .trim() ---");
  try {
    const redisTrim = new Redis({
      url: rawUrl.trim(),
      token: rawToken.trim(),
    });
    const resultTrim = await redisTrim.ping();
    console.log("✅ Connection successful (with trim):", resultTrim);
  } catch (error) {
    console.log("❌ Connection failed (with trim):");
    if (error instanceof Error) {
      console.log("   Error:", error.name, "-", error.message);
    }
  }
}

testRedis();
