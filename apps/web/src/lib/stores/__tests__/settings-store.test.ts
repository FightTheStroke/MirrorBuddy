/**
 * Unit tests for settings store
 * Tests Zustand store state management for user preferences
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSettingsStore } from '../settings-store';
import { csrfFetch } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { ProfileUpdateSchema, SettingsUpdateSchema } from '@/lib/validation/schemas/user';

vi.mock('@/lib/auth', () => ({ csrfFetch: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(csrfFetch).mockResolvedValue(new Response(null, { status: 200 }));
    // Reset store to initial state before each test
    const state = useSettingsStore.getState();
    state.updateStudentProfile({
      name: '',
      age: 14,
      schoolYear: 1,
      schoolLevel: 'superiore',
      gradeLevel: '',
      learningGoals: [],
      teachingStyle: 'balanced',
      fontSize: 'medium',
      highContrast: false,
      dyslexiaFont: false,
      voiceEnabled: true,
      simplifiedLanguage: false,
      adhdMode: false,
      learningDifferences: [],
      preferredCoach: undefined,
      preferredBuddy: undefined,
      crossMaestroEnabled: true,
    });
    useSettingsStore.setState({ pendingSync: false, lastSyncedAt: null });
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('Server synchronization', () => {
    it.each([{ preferredCoach: 'laura' }, { preferredBuddy: 'marta' }] as const)(
      'accepts the supported character preference %j',
      async (preference) => {
        useSettingsStore.getState().updateStudentProfile(preference);
        await useSettingsStore.getState().syncToServer();
        const request = vi
          .mocked(csrfFetch)
          .mock.calls.find(([url]) => url === '/api/user/profile');
        const payload = JSON.parse(String(request?.[1]?.body));
        expect(ProfileUpdateSchema.safeParse(payload).success).toBe(true);
        expect(payload).toMatchObject(preference);
      },
    );

    it('sends declared profile inputs and accessibility to their strict API contracts', async () => {
      useSettingsStore.getState().updateStudentProfile({ age: 12, dyslexiaFont: true });

      await useSettingsStore.getState().syncToServer();

      const payloads = vi.mocked(csrfFetch).mock.calls.map(([url, options]) => ({
        url,
        body: JSON.parse(String(options?.body)),
      }));
      const profile = payloads.find(({ url }) => url === '/api/user/profile')?.body;
      const settings = payloads.find(({ url }) => url === '/api/user/settings')?.body;
      expect(ProfileUpdateSchema.safeParse(profile).success).toBe(true);
      expect(profile).toMatchObject({ age: 12 });
      expect(profile).not.toHaveProperty('accessibility');
      expect(profile).not.toHaveProperty('crossMaestroEnabled');
      expect(SettingsUpdateSchema.safeParse(settings).success).toBe(true);
      expect(settings).toMatchObject({ dyslexiaFont: true, fontSize: 'medium' });
      expect(useSettingsStore.getState().pendingSync).toBe(false);
      expect(useSettingsStore.getState().lastSyncedAt).toBeInstanceOf(Date);
    });

    it.each([
      ['/api/user/settings', 412, 1],
      ['/api/user/profile', 400, 2],
    ])('keeps unsaved changes when %s returns %i', async (url, status, calls) => {
      useSettingsStore.getState().updateStudentProfile({ age: 15 });
      vi.mocked(csrfFetch).mockImplementation(
        async (input) => new Response(null, { status: input === url ? status : 200 }),
      );

      await useSettingsStore.getState().syncToServer();

      expect(useSettingsStore.getState().pendingSync).toBe(true);
      expect(useSettingsStore.getState().lastSyncedAt).toBeNull();
      expect(csrfFetch).toHaveBeenCalledTimes(calls);
      expect(logger.error).toHaveBeenCalledWith(
        'Settings sync failed',
        expect.objectContaining({ error: expect.stringContaining(String(status)) }),
      );
    });

    it('does not save an invented age for an unknown student', async () => {
      const initialProfile = useSettingsStore.getInitialState().studentProfile;
      useSettingsStore.setState({ studentProfile: initialProfile, pendingSync: true });

      await useSettingsStore.getState().syncToServer();

      const profileRequest = vi
        .mocked(csrfFetch)
        .mock.calls.find(([url]) => url === '/api/user/profile');
      expect(JSON.parse(String(profileRequest?.[1]?.body))).not.toHaveProperty('age');
    });

    it('loads accessibility from settings without fabricating a missing profile age', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url) =>
          Response.json(
            url === '/api/user/settings'
              ? { dyslexiaFont: true, fontSize: 'large' }
              : { name: 'Student', age: null },
          ),
        ),
      );

      await useSettingsStore.getState().loadFromServer();

      expect(useSettingsStore.getState().studentProfile).toMatchObject({
        dyslexiaFont: true,
        fontSize: 'large',
        age: undefined,
      });
    });

    it('does not acknowledge a failed load as a successful sync', async () => {
      useSettingsStore.setState({ pendingSync: true });
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(null, { status: 500 })),
      );

      await useSettingsStore.getState().loadFromServer();

      expect(useSettingsStore.getState().pendingSync).toBe(true);
      expect(useSettingsStore.getState().lastSyncedAt).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Cross-Maestro Memory Setting', () => {
    it('has crossMaestroEnabled enabled by default', () => {
      const state = useSettingsStore.getState();
      expect(state.studentProfile.crossMaestroEnabled).toBe(true);
    });

    it('can disable cross-maestro memory', () => {
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      expect(useSettingsStore.getState().studentProfile.crossMaestroEnabled).toBe(false);
    });

    it('can re-enable cross-maestro memory', () => {
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: true,
      });
      expect(useSettingsStore.getState().studentProfile.crossMaestroEnabled).toBe(true);
    });

    it('sets pendingSync flag when toggling cross-maestro setting', () => {
      useSettingsStore.setState({ pendingSync: false });
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      expect(useSettingsStore.getState().pendingSync).toBe(true);
    });

    it('toggles cross-maestro setting without affecting other profile settings', () => {
      const initialProfile = useSettingsStore.getState().studentProfile;
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      const updatedProfile = useSettingsStore.getState().studentProfile;

      // Check that only crossMaestroEnabled changed
      expect(updatedProfile.name).toBe(initialProfile.name);
      expect(updatedProfile.age).toBe(initialProfile.age);
      expect(updatedProfile.crossMaestroEnabled).toBe(false);
    });
  });

  describe('Student Profile Updates', () => {
    it('updates student profile partially', () => {
      useSettingsStore.getState().updateStudentProfile({ name: 'John' });
      expect(useSettingsStore.getState().studentProfile.name).toBe('John');
    });

    it('marks pending sync on profile update', () => {
      useSettingsStore.setState({ pendingSync: false });
      useSettingsStore.getState().updateStudentProfile({ name: 'Jane' });
      expect(useSettingsStore.getState().pendingSync).toBe(true);
    });
  });
});
