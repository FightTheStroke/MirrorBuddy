/* eslint-disable security/detect-non-literal-fs-filename */
import { promises as fs } from "node:fs";
import path from "node:path";

const APP_DIR = path.join(process.cwd(), "src", "app");

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".")) {
        return;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await walk(fullPath)));
        return;
      }
      if (entry.isFile() && entry.name === "page.tsx") {
        files.push(fullPath);
      }
    }),
  );
  return files;
}

async function main() {
  const pages = await walk(APP_DIR);
  const offenders: string[] = [];

  for (const file of pages) {
    const content = await fs.readFile(file, "utf8");
    const hasRedirect = /\bredirect\s*\(/.test(content);
    const hasMetadata =
      /export\s+(const\s+metadata|async\s+function\s+generateMetadata)\b/.test(
        content,
      );
    const hasReturn = /\breturn\b/.test(content);

    if (hasRedirect && !hasMetadata && !hasReturn) {
      offenders.push(path.relative(process.cwd(), file));
    }
  }

  if (offenders.length > 0) {
    console.error(
      "Redirect-only pages missing `export const metadata`:\n" +
        offenders.join("\n"),
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Failed to lint redirect metadata", error);
  process.exit(1);
});
