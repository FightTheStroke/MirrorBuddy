import { getUserIdFromCookie } from "@/lib/auth/client-auth";

// Get userId from cookie
export function getUserId(): string | null {
  return getUserIdFromCookie();
}

// Format elapsed time as MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
