import type { OnboardingData } from "./types";

interface OnboardingStateRecord {
  hasCompletedOnboarding: boolean;
  onboardingCompletedAt: Date | null;
  currentStep: string | null;
  isReplayMode: boolean | null;
}

interface ProfileRecord {
  name?: string | null;
  age?: number | null;
  schoolLevel?: string | null;
}

export function buildExistingData(
  onboardingJson: string | null | undefined,
  profile: ProfileRecord | null,
): OnboardingData {
  const existingData: OnboardingData = { name: "" };

  if (onboardingJson) {
    try {
      const onboardingData = JSON.parse(onboardingJson) as OnboardingData;
      if (onboardingData.name) existingData.name = onboardingData.name;
      if (onboardingData.age) existingData.age = onboardingData.age;
      if (onboardingData.schoolLevel)
        existingData.schoolLevel = onboardingData.schoolLevel;
      if (onboardingData.learningDifferences)
        existingData.learningDifferences = onboardingData.learningDifferences;
      if (onboardingData.gender) existingData.gender = onboardingData.gender;
    } catch {
      // Invalid JSON, ignore
    }
  }

  if (!existingData.name && profile?.name) existingData.name = profile.name;
  if (!existingData.age && profile?.age) existingData.age = profile.age;
  if (!existingData.schoolLevel && profile?.schoolLevel) {
    existingData.schoolLevel = profile.schoolLevel as
      | "elementare"
      | "media"
      | "superiore";
  }

  return existingData;
}

export function buildEffectiveState(
  onboarding: OnboardingStateRecord | null | undefined,
  isCredentialedUser: boolean,
) {
  if (onboarding) {
    return {
      hasCompletedOnboarding:
        onboarding.hasCompletedOnboarding || isCredentialedUser,
      onboardingCompletedAt: onboarding.onboardingCompletedAt,
      currentStep: onboarding.currentStep,
      isReplayMode: onboarding.isReplayMode,
    };
  }

  if (!isCredentialedUser) return null;

  return {
    hasCompletedOnboarding: true,
    onboardingCompletedAt: null,
    currentStep: "ready",
    isReplayMode: false,
  };
}
