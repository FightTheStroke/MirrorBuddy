/**
 * Debug script to check Redis env vars for whitespace
 */

import { config } from "dotenv";
config();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

console.log("URL value:");
console.log(JSON.stringify(url));
console.log("URL bytes:", Buffer.from(url || "").toString("hex"));
console.log("URL has whitespace:", /\s/.test(url || ""));

console.log("\nToken value:");
console.log(JSON.stringify(token));
console.log("Token bytes:", Buffer.from(token || "").toString("hex"));
console.log("Token has whitespace:", /\s/.test(token || ""));
