/**
 * Trial tools whitelist
 * Defines which tools are available in trial mode
 */

export const TRIAL_TOOLS_WHITELIST = ["mindmap", "summary"];

/**
 * Check if a tool is allowed in trial mode
 * @param toolName - The name of the tool to check
 * @returns True if tool is whitelisted for trial, false otherwise
 */
export function isToolAllowedInTrial(toolName: string): boolean {
  return TRIAL_TOOLS_WHITELIST.includes(toolName);
}

/**
 * Get the blocked message for a tool not available in trial
 * @param toolName - The name of the blocked tool
 * @returns Localized message indicating tool availability in beta
 */
export function getTrialBlockedMessage(toolName: string): string {
  return `La funzione ${toolName} è disponibile nella versione beta`;
}
