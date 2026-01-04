// Helper to get userId from cookie or sessionStorage
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  // Try cookie first (server-compatible)
  const cookieMatch = document.cookie.match(/mirrorbuddy-user-id=([^;]+)/);
  if (cookieMatch) return cookieMatch[1];
  // Fallback to sessionStorage
  return sessionStorage.getItem('mirrorbuddy-user-id');
}

// Format elapsed time as MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
