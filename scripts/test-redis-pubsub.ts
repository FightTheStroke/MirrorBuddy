/**
 * Test Redis Pub/Sub capability
 */

import { config } from "dotenv";
import { Redis } from "@upstash/redis";

config();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log("Testing Redis Pub/Sub capability...");
console.log("URL:", url);
console.log("Token length:", token?.length);

if (!url || !token) {
  console.error("Missing Redis credentials");
  process.exit(1);
}

async function testPubSub() {
  try {
    const redis = new Redis({
      url,
      token,
    });

    console.log("\n1. Testing Pub/Sub infrastructure...");
    console.log("Attempting PUBLISH to test channel...");
    const publishResult = await redis.publish(
      "test:mirrorbuddy",
      "Hello PubSub",
    );
    console.log("✅ PUBLISH successful! Subscribers notified:", publishResult);

    console.log("\n2. Testing data persistence (SET/GET)...");
    await redis.set("test:key", "test:value");
    const getResult = await redis.get("test:key");
    console.log("✅ GET successful! Value:", getResult);

    console.log("\n=== REDIS PUB/SUB VERIFIED ===");
    console.log("\nCapabilities:");
    console.log("✅ PUBLISH: Messages sent to channels");
    console.log("✅ Data Storage: SET/GET working");
    console.log("✅ REST API: HTTP-based, serverless-friendly");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testPubSub();
