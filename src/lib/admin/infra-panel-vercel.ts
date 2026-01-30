/**
 * Vercel Metrics Provider
 * Fetches deployment and usage metrics from Vercel API
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
 * Get mock Vercel metrics for demo
 */
function getMockVercelMetrics(): VercelMetrics {
  return {
    deployments: [
      {
        id: "dpl_demo_001",
        state: "READY",
        createdAt: Date.now() - 3600000, // 1 hour ago
        url: "mirrorbuddy-prod.vercel.app",
      },
      {
        id: "dpl_demo_002",
        state: "READY",
        createdAt: Date.now() - 7200000, // 2 hours ago
        url: "mirrorbuddy-preview-abc123.vercel.app",
      },
    ],
    bandwidthUsed: 5_368_709_120, // 5 GB
    bandwidthLimit: 107_374_182_400, // 100 GB
    buildsUsed: 45,
    buildsLimit: 6000,
    functionsUsed: 1200,
    functionsLimit: 100000,
    status: "healthy",
  };
}

/**
 * Get Vercel metrics from API
 */
export async function getVercelMetrics(): Promise<VercelMetrics> {
  try {
    if (!isVercelConfigured()) {
      logger.warn("Vercel not configured, returning mock data");
      return getMockVercelMetrics();
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
      throw new Error("Failed to fetch Vercel deployments");
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

    // For now, return mock usage data until we implement usage API
    logger.info(
      "Vercel configured but usage API not implemented, using mock usage data",
    );

    return {
      deployments,
      bandwidthUsed: 5_368_709_120,
      bandwidthLimit: 107_374_182_400,
      buildsUsed: 45,
      buildsLimit: 6000,
      functionsUsed: 1200,
      functionsLimit: 100000,
      status: "healthy",
    };
  } catch (error) {
    logger.error("Error fetching Vercel metrics", { error: String(error) });
    return getMockVercelMetrics();
  }
}
