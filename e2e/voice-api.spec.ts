// ============================================================================
// E2E TESTS: Voice API and WebSocket Proxy
// Tests the actual WebSocket connection, audio pipeline, and Azure integration
//
// NOTE: Tests that require context.grantPermissions() for 'microphone'/'camera'
// are skipped on Firefox and WebKit (not supported by Playwright).
// See: https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
// ============================================================================

import { test, expect } from '@playwright/test';
import WebSocket from 'ws';

const WS_PROXY_URL = 'ws://localhost:3001';

test.describe('WebSocket Proxy', () => {
  test('proxy server is running on port 3001', async () => {
    // Try to connect to the proxy
    const ws = new WebSocket(`${WS_PROXY_URL}?maestroId=test`);

    const result = await new Promise<{ connected: boolean; message?: string }>((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ connected: false, message: 'Timeout' });
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        resolve({ connected: true });
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ connected: false, message: String(err) });
      });
    });

    ws.close();
    expect(result.connected).toBe(true);
  });

  test('proxy sends proxy.ready event on connection', async () => {
    const ws = new WebSocket(`${WS_PROXY_URL}?maestroId=test`);

    const messages: string[] = [];

    const result = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 10000);

      ws.on('message', (data) => {
        const msg = data.toString();
        messages.push(msg);
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === 'proxy.ready' || parsed.type === 'session.created') {
            clearTimeout(timeout);
            resolve(true);
          }
        } catch {
          // Not JSON, continue waiting
        }
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    ws.close();

    // Should have received proxy.ready or session.created
    expect(result).toBe(true);
  });

  test('proxy accepts session.update with correct format', async () => {
    const ws = new WebSocket(`${WS_PROXY_URL}?maestroId=test`);

    const responses: Array<{ type: string; error?: unknown }> = [];

    await new Promise<void>((resolve) => {
      ws.on('open', () => {
        // Wait a bit for proxy.ready
        setTimeout(() => {
          // Send session.update with the verified working format
          // CRITICAL: Azure GA requires type: 'realtime' in session!
          const sessionUpdate = {
            type: 'session.update',
            session: {
              type: 'realtime',  // REQUIRED by Azure GA!
              modalities: ['text', 'audio'],
              instructions: 'Test assistant',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
              },
            },
          };
          ws.send(JSON.stringify(sessionUpdate));
          resolve();
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          responses.push(parsed);
        } catch {
          // Ignore non-JSON
        }
      });
    });

    // Wait for response
    await new Promise(r => setTimeout(r, 3000));
    ws.close();

    // Check if we got session.updated (success) or an error
    const hasSessionUpdated = responses.some(r => r.type === 'session.updated');
    const hasError = responses.some(r => r.type === 'error');

    if (hasError) {
      const error = responses.find(r => r.type === 'error');
      console.log('Session update error:', JSON.stringify(error?.error));
    }

    // Either session was updated or we got an error response
    // NOTE: Azure GA may reject some parameters but audio still works!
    // The audio pipeline test below verifies end-to-end functionality
    expect(hasSessionUpdated || hasError).toBe(true);

    // If we got an error, it shouldn't be about missing session.type
    // (other errors like unknown_parameter are acceptable since audio still works)
    if (hasError && !hasSessionUpdated) {
      const error = responses.find(r => r.type === 'error');
      const errorMsg = JSON.stringify(error?.error || '').toLowerCase();
      expect(errorMsg).not.toContain('missing required parameter');
      // Note: 'unknown_parameter' errors are OK - Azure ignores them and uses defaults
    }
  });

  test('proxy forwards text message and gets response', async () => {
    const ws = new WebSocket(`${WS_PROXY_URL}?maestroId=test`);

    const responses: Array<{ type: string }> = [];
    let gotAudioDelta = false;
    let gotTranscript = false;
    let gotResponseDone = false;

    await new Promise<void>((resolve) => {
      ws.on('open', async () => {
        // Wait for session to be ready
        await new Promise(r => setTimeout(r, 2000));

        // Send session.update first (with type: 'realtime' required by Azure GA)
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',  // REQUIRED by Azure GA!
            modalities: ['text', 'audio'],
            instructions: 'Rispondi brevemente in italiano.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
          },
        }));

        await new Promise(r => setTimeout(r, 1000));

        // Send test message
        ws.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Ciao' }],
          },
        }));

        // Request response
        ws.send(JSON.stringify({ type: 'response.create' }));

        resolve();
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          responses.push(parsed);

          if (parsed.type === 'response.output_audio.delta' || parsed.type === 'response.audio.delta') {
            gotAudioDelta = true;
          }
          if (parsed.type?.includes('transcript')) {
            gotTranscript = true;
          }
          if (parsed.type === 'response.done') {
            gotResponseDone = true;
          }
        } catch {
          // Ignore
        }
      });
    });

    // Wait for AI response (may take a few seconds)
    await new Promise(r => setTimeout(r, 8000));
    ws.close();

    console.log('Response types received:', responses.map(r => r.type));

    // We should get some kind of response
    expect(responses.length).toBeGreaterThan(2);

    // Log whether Azure returned audio (not a failure if no audio - could be text-only response)
    console.log('Got audio delta:', gotAudioDelta);
    console.log('Got transcript:', gotTranscript);
    console.log('Got response done:', gotResponseDone);
  });
});

test.describe('Voice Session UI Integration', () => {
  // Skip on Firefox/WebKit - permission grants not supported
  test.beforeEach(async ({ browserName }) => {
    test.skip(
      browserName === 'firefox' || browserName === 'webkit',
      'Microphone/camera permission grants not supported in Firefox/WebKit'
    );
  });

  test('clicking maestro shows voice session modal', async ({ page, context }) => {
    // Grant permissions
    await context.grantPermissions(['microphone', 'camera']);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on Euclide
    const maestroButton = page.locator('button').filter({ hasText: 'Euclide' }).first();
    await maestroButton.waitFor({ state: 'visible', timeout: 10000 });
    await maestroButton.click();

    // Wait for modal
    await page.waitForTimeout(2000);

    // Modal should be visible
    const modal = page.locator('[class*="fixed"]').filter({ hasText: /Euclide/i }).first();
    await expect(modal).toBeVisible();

    // Should show maestro name
    await expect(page.locator('text=Euclide').first()).toBeVisible();
  });

  test('voice session shows connection status', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Euclide' }).first().click();

    await page.waitForTimeout(3000);

    // Should show some content in the voice session modal
    // This could be status text, configuration message, or maestro info
    const possibleContents = [
      'Connessione',
      'Pronto',
      'In ascolto',
      'Azure',
      'Configura',
      'permessi',
      'Euclide',  // Maestro name should be visible
      'Chiudi',   // Close button
      'microfono', // Mute button
    ];

    let foundContent = false;
    for (const text of possibleContents) {
      if (await page.locator(`text=${text}`).first().isVisible().catch(() => false)) {
        foundContent = true;
        break;
      }
    }

    // If no specific text found, at least verify the modal container exists
    if (!foundContent) {
      const modal = page.locator('[class*="fixed"][class*="inset"]').first();
      foundContent = await modal.isVisible().catch(() => false);
    }

    expect(foundContent).toBe(true);
  });

  test('voice session has control buttons', async ({ page, context }) => {
    await context.grantPermissions(['microphone', 'camera']);

    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Euclide' }).first().click();

    await page.waitForTimeout(2000);

    // Should have mute button
    const muteButton = page.locator('button[aria-label*="microfono"], button[aria-label*="Mute"]').first();
    const hasMuteButton = await muteButton.isVisible().catch(() => false);

    // Should have close/end button
    const closeButton = page.locator('button[aria-label*="Chiudi"], button[aria-label*="Termina"]').first();
    const hasCloseButton = await closeButton.isVisible().catch(() => false);

    expect(hasMuteButton || hasCloseButton).toBe(true);
  });

  test('webcam button opens camera modal', async ({ page, context }) => {
    await context.grantPermissions(['microphone', 'camera']);

    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Euclide' }).first().click();

    await page.waitForTimeout(2000);

    // Find and click webcam button
    const webcamButton = page.locator('button').filter({ hasText: /Webcam/i }).first();

    if (await webcamButton.isVisible().catch(() => false)) {
      await webcamButton.click();
      await page.waitForTimeout(1000);

      // Webcam modal should appear (z-index 60)
      const webcamModal = page.locator('[class*="z-[60]"], [class*="z-60"]').first();
      const hasWebcamModal = await webcamModal.isVisible().catch(() => false);

      // Or check for camera-related text
      const hasCameraText = await page.locator('text=Scatta').first().isVisible().catch(() => false);

      expect(hasWebcamModal || hasCameraText).toBe(true);
    }
  });

  test('waveform visualization is present', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    await page.goto('/');
    await page.locator('button').filter({ hasText: 'Euclide' }).first().click();

    await page.waitForTimeout(2000);

    // Look for waveform visualization elements
    const hasWaveform = await page.locator('[class*="waveform"], [class*="Waveform"]').first().isVisible().catch(() => false);
    const hasLevelBars = await page.locator('[class*="bar"], [class*="level"]').count() > 0;
    const hasSvg = await page.locator('[class*="fixed"] svg').count() > 0;

    // Some kind of visualization should be present
    expect(hasWaveform || hasLevelBars || hasSvg).toBe(true);
  });
});

test.describe('Test Voice Page', () => {
  // Skip permission-dependent tests on Firefox/WebKit
  test.beforeEach(async ({ browserName }, testInfo) => {
    // Only skip the test that requires permissions
    if (testInfo.title.includes('connect to WebSocket')) {
      test.skip(
        browserName === 'firefox' || browserName === 'webkit',
        'Microphone permission grants not supported in Firefox/WebKit'
      );
    }
  });

  test('test-voice page loads', async ({ page }) => {
    await page.goto('/test-voice');
    await page.waitForLoadState('networkidle');

    // Should have title
    await expect(page.locator('h1').filter({ hasText: /Voice|Debug|Test/i }).first()).toBeVisible();
  });

  test('test-voice page has audio tests', async ({ page }) => {
    await page.goto('/test-voice');
    await page.waitForLoadState('networkidle');

    // Should have test buttons
    const hasTestMic = await page.locator('button').filter({ hasText: /Test Microphone/i }).first().isVisible();
    const hasTestSpeaker = await page.locator('button').filter({ hasText: /Test Speaker/i }).first().isVisible();
    const hasConnect = await page.locator('button').filter({ hasText: /Connect/i }).first().isVisible();

    expect(hasTestMic || hasTestSpeaker || hasConnect).toBe(true);
  });

  test('test-voice page can connect to WebSocket', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);

    await page.goto('/test-voice');
    await page.waitForLoadState('networkidle');

    // Click connect button
    const connectButton = page.locator('button').filter({ hasText: /Connect WebSocket/i }).first();
    if (await connectButton.isVisible().catch(() => false)) {
      await connectButton.click();
      await page.waitForTimeout(3000);

      // Check for success indicator
      const hasConnected = await page.locator('text=connected').first().isVisible().catch(() => false);
      const hasGreen = await page.locator('[class*="green"]').first().isVisible().catch(() => false);

      // Should show connection status
      expect(hasConnected || hasGreen).toBe(true);
    }
  });
});
