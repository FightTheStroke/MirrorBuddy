/**
 * Git utility functions for capturing repository state
 */

/**
 * Get current git branch and commit
 */
export async function getGitInfo(): Promise<{
  branch: string;
  commit: string;
}> {
  try {
    const { execSync } = await import("child_process");
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
    }).trim();
    return { branch, commit };
  } catch (error) {
    console.warn("Could not get git info:", error);
    return { branch: "unknown", commit: "unknown" };
  }
}
