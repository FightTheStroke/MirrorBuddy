import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://localhost:3100/it/welcome', { waitUntil: 'networkidle', timeout: 90000 });
// scroll through so lazy sections mount
for (let y = 0; y < 12; y++) { await p.mouse.wheel(0, 900); await p.waitForTimeout(400); }
await p.waitForTimeout(2000);
const sec = p.locator('section:has-text("Reachy")').first();
await sec.waitFor({ timeout: 30000 });
await sec.scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);
await sec.screenshot({ path: '/tmp/robot-section.png' });
await p.screenshot({ path: '/tmp/welcome-full.png', fullPage: true });
console.log('heading:', await sec.locator('h2').first().innerText());
await b.close();
