/**
 * Vercel Metrics Provider
 * Fetches deployment metrics from Vercel API
 */

import { logger } from "@/lib/logger";
import type { VercelMetrics, VercelDeployment } from "./infra-panel-types";

/**
 * Check if Vercel is configured
 */
function isVercelConfigured(): boolean {
  return !!process.env.VERCEL_TOKEN;
}

/**
 * Get Vercel metrics from API
 * Returns null if not configured or if API call fails
 */
export async function getVercelMetrics(): Promise<VercelMetrics | null> {
  try {
    if (!isVercelConfigured()) {
      logger.info("Vercel not configured (missing VERCEL_TOKEN)");
      return null;
    }

    const token = process.env.VERCEL_TOKEN!;
    const teamId = process.env.VERCEL_TEAM_ID || "";

    // Fetch recent deployments
    const deploymentsUrl = teamId
      ? `https://api.vercel.com/v6/deployments?teamId=${teamId}&limit=5`
      : "https://api.vercel.com/v6/deployments?limit=5";

    const deploymentsResponse = await fetch(deploymentsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!deploymentsResponse.ok) {
      logger.error("Failed to fetch Vercel deployments", {
        status: deploymentsResponse.status,
      });
      return null;
    }

    const deploymentsData = await deploymentsResponse.json();
    const deployments: VercelDeployment[] = deploymentsData.deployments.map(
      (dep: Record<string, unknown>) => ({
        id: dep.uid,
        state: dep.state,
        createdAt: dep.createdAt,
        url: dep.url,
      }),
    );

    // Return only deployment data (usage API not implemented)
    return {
      deployments,
      bandwidthUsed: 0,
      bandwidthLimit: 0,
      buildsUsed: 0,
      buildsLimit: 0,
      functionsUsed: 0,
      functionsLimit: 0,
      status: "healthy",
    };
  } catch (error) {
    logger.error("Error fetching Vercel metrics", { error: String(error) });
    return null;
  }
}
