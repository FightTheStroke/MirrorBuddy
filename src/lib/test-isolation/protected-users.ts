/**
 * Protected Users Helper
 * Manages the whitelist of emails that should not be deleted during test data cleanup.
 *
 * Environment Variable: PROTECTED_USERS
 * Format: comma-separated list of email addresses
 * Example: PROTECTED_USERS=admin@example.com,tester@example.com
 *
 * @module lib/test-isolation/protected-users
 */

/**
 * Parses the PROTECTED_USERS environment variable and returns a whitelist of email addresses.
 *
 * The environment variable should contain comma-separated email addresses.
 * Whitespace is automatically trimmed from each email.
 * If the environment variable is not set or empty, returns an empty array.
 *
 * @returns Array of protected email addresses (lowercase)
 * @example
 * // With PROTECTED_USERS="admin@example.com,tester@example.com"
 * getProtectedUsers() // => ['admin@example.com', 'tester@example.com']
 *
 * // Without PROTECTED_USERS env var
 * getProtectedUsers() // => []
 */
export function getProtectedUsers(): string[] {
  const protectedUsersEnv = process.env.PROTECTED_USERS;

  // Return empty array if env var is not set or empty
  if (!protectedUsersEnv) {
    return [];
  }

  // Split by comma, trim whitespace, convert to lowercase, filter empty strings
  return protectedUsersEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Checks if a given email address is in the protected users whitelist.
 *
 * @param email - Email address to check (case-insensitive)
 * @returns true if the email is protected, false otherwise
 * @example
 * isProtectedUser('admin@example.com') // => true (if in PROTECTED_USERS)
 * isProtectedUser('test@example.com') // => false (if not in PROTECTED_USERS)
 */
export function isProtectedUser(email: string): boolean {
  const protectedUsers = getProtectedUsers();
  return protectedUsers.includes(email.toLowerCase());
}
