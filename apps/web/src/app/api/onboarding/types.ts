import { z } from "zod";

export const OnboardingDataSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().int().min(6).max(19).optional(),
  schoolLevel: z.enum(["elementare", "media", "superiore"]).optional(),
  learningDifferences: z.array(z.string()).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  parentEmail: z.string().email().optional(),
});

export const PostBodySchema = z.object({
  data: OnboardingDataSchema.optional(),
  hasCompletedOnboarding: z.boolean().optional(),
  currentStep: z.string().optional(),
  isReplayMode: z.boolean().optional(),
});

export interface OnboardingData {
  name: string;
  age?: number;
  schoolLevel?: "elementare" | "media" | "superiore";
  learningDifferences?: string[];
  gender?: "male" | "female" | "other";
  parentEmail?: string;
}

export const emptyResponse = {
  hasExistingData: false,
  data: null,
  onboardingState: null,
} as const;
