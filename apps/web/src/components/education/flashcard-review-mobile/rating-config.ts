/**
 * Rating button configurations for FSRS-5 system
 * Extracted for reusability across mobile and desktop components
 */

import type { Rating } from "@/types";

export interface RatingButtonConfig {
  rating: Rating;
  label: string;
  color: string;
  iconType: "again" | "hard" | "good" | "easy";
}

export const RATING_CONFIG: RatingButtonConfig[] = [
  {
    rating: "again",
    label: "Ripeti",
    color: "bg-red-500 hover:bg-red-600",
    iconType: "again",
  },
  {
    rating: "hard",
    label: "Difficile",
    color: "bg-orange-500 hover:bg-orange-600",
    iconType: "hard",
  },
  {
    rating: "good",
    label: "Bene",
    color: "bg-green-500 hover:bg-green-600",
    iconType: "good",
  },
  {
    rating: "easy",
    label: "Facile",
    color: "bg-blue-500 hover:bg-blue-600",
    iconType: "easy",
  },
];
