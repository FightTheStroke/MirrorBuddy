/**
 * Verify that the minimal set of environment variables required to run
 * `npm run dev` from Cursor Web is present.
 *
 * This script is intentionally strict: missing variables cause a non-zero exit.
 */

type Check = {
  name: string;
  required: boolean;
};

const checks: Check[] = [
  // Database
  { name: "DATABASE_URL", required: true },
  { name: "DIRECT_URL", required: true },
  // Core security
  { name: "SESSION_SECRET", required: true },
  { name: "CRON_SECRET", required: true },
  // Admin seed (dev only, but very useful)
  { name: "ADMIN_EMAIL", required: true },
  { name: "ADMIN_PASSWORD", required: true },
  // Azure OpenAI chat (dev resource)
  { name: "AZURE_OPENAI_ENDPOINT", required: true },
  { name: "AZURE_OPENAI_API_KEY", required: true },
  { name: "AZURE_OPENAI_CHAT_DEPLOYMENT", required: true },
  { name: "AZURE_OPENAI_API_VERSION", required: true },
];

const missing: string[] = [];

for (const check of checks) {
  const value = process.env[check.name];
  if (check.required && (!value || value.trim() === "")) {
    missing.push(check.name);
  }
}

if (missing.length === 0) {
  console.log(
    "✅ Cursor Web env check passed. All required variables are set.",
  );
  process.exit(0);
}

console.error("❌ Cursor Web env check failed.");
console.error("Missing required environment variables:");
for (const name of missing) {
  console.error(`- ${name}`);
}

process.exit(1);
