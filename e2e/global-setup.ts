/**
 * Global Setup for E2E Tests
 *
 * Creates a storageState with onboarding completed
 * so tests skip the welcome flow.
 */

import path from 'path';
import fs from 'fs';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'storage-state.json');

async function globalSetup() {
  // Ensure .auth directory exists
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Create storage state with onboarding completed
  const storageState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'mirrorbuddy-onboarding',
            value: JSON.stringify({
              state: {
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date().toISOString(),
                currentStep: 'ready',
                isReplayMode: false,
                data: {
                  name: 'Test User',
                  age: 12,
                  schoolLevel: 'media',
                  learningDifferences: [],
                  gender: 'other',
                },
              },
              version: 0,
            }),
          },
        ],
      },
    ],
  };

  // Write storage state file
  fs.writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));

  console.log('Global setup complete: onboarding state saved to', STORAGE_STATE_PATH);
}

export default globalSetup;
