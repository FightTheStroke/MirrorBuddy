/**
 * Screenshot Script: Welcome Page
 *
 * Captures a full-page screenshot of the welcome landing page
 * for use in README and documentation.
 *
 * Usage: npm run script -- scripts/screenshot-welcome.ts
 */

import { chromium } from '@playwright/test';
import path from 'path';

async function captureWelcomeScreenshot() {
  console.log('🚀 Starting screenshot capture...');

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // Retina display for crisp screenshots
  });
  const page = await context.newPage();

  try {
    // Navigate to welcome page
    console.log('📍 Navigating to /welcome...');
    await page.goto('http://localhost:3000/welcome', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for hero section to be visible
    console.log('⏳ Waiting for page to load...');
    await page.waitForSelector('img[alt*="MirrorBuddy"]', { timeout: 10000 });

    // Wait a bit for animations to complete
    await page.waitForTimeout(2000);

    // Capture full-page screenshot
    console.log('📸 Capturing screenshot...');
    const screenshotPath = path.join(__dirname, '..', 'public', 'screenshots', 'welcome.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    console.log('✅ Screenshot saved to:', screenshotPath);
  } catch (error) {
    console.error('❌ Error capturing screenshot:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureWelcomeScreenshot()
  .then(() => {
    console.log('✨ Screenshot capture complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Screenshot capture failed:', error);
    process.exit(1);
  });
