/**
 * API Route: Onboarding State
 *
 * GET: Fetch existing onboarding state and profile data
 * POST: Save onboarding state and sync to profile
 *
 * Issue #73: Load existing user data for returning users
 */


export const revalidate = 0;
export { GET, POST } from "./handlers";
