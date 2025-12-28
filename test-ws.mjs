import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console logs
page.on('console', msg => {
  console.log('LOG:', msg.text());
});

console.log('Opening test page...');
await page.goto('http://localhost:3000/test-voice');
await page.waitForTimeout(1000);

console.log('Clicking Test Connection...');
await page.click('button');

// Wait for WebSocket response
await page.waitForTimeout(5000);

console.log('\n=== PAGE OUTPUT ===');
const content = await page.locator('.bg-gray-900').textContent();
console.log(content);

await browser.close();
