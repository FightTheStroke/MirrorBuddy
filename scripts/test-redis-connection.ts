/**
 * Test Redis connection to diagnose the issue
 */

import { config } from "dotenv";
import { Redis } from "@upstash/redis";

config();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log("Testing Redis connection...");
console.log("URL:", url);
console.log("Token length:", token?.length);

if (!url || !token) {
  console.error("Missing Redis credentials");
  process.exit(1);
}

async function testConnection() {
  try {
    const redis = new Redis({
      url,
      token,
    });

    console.log("\nAttempting ping...");
    const result = await redis.ping();
    console.log("✅ Connection successful! Ping result:", result);
  } catch (error) {
    console.error("❌ Connection failed:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

testConnection();
