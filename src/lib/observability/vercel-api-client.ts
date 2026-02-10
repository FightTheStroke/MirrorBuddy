/**
 * Vercel API Client
 *
 * Low-level client for querying Vercel API endpoints.
 */

const VERCEL_API_BASE = 'https://api.vercel.com';

/**
 * Query project-level usage from Vercel API
 */
export async function queryProjectUsage(
  token: string,
  projectId: string | undefined,
  teamId: string | undefined,
): Promise<{
  bandwidth: { used: number };
  builds: { used: number };
  functions: { used: number };
}> {
  if (!projectId) {
    return {
      bandwidth: { used: 0 },
      builds: { used: 0 },
      functions: { used: 0 },
    };
  }

  const url = teamId
    ? `${VERCEL_API_BASE}/v9/projects/${projectId}?teamId=${teamId}`
    : `${VERCEL_API_BASE}/v9/projects/${projectId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract usage from project analytics
  return {
    bandwidth: {
      used: data.analytics?.bandwidth?.current || 0,
    },
    builds: {
      used: data.analytics?.builds?.current || 0,
    },
    functions: {
      used: data.analytics?.functions?.current || 0,
    },
  };
}

/**
 * Query team-level limits from Vercel API
 */
export async function queryTeamLimits(
  token: string,
  teamId: string,
): Promise<{
  bandwidth: number;
  builds: number;
  functions: number;
}> {
  const url = `${VERCEL_API_BASE}/v2/teams/${teamId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract limits from team plan
  return {
    bandwidth: data.limits?.bandwidth || getDefaultLimits().bandwidth,
    builds: data.limits?.builds || getDefaultLimits().builds,
    functions: data.limits?.functions || getDefaultLimits().functions,
  };
}

/**
 * Get default limits for Hobby plan (fallback)
 */
export function getDefaultLimits(): {
  bandwidth: number;
  builds: number;
  functions: number;
} {
  return {
    bandwidth: 100 * 1024 * 1024 * 1024, // 100 GB
    builds: 6000, // 6000 minutes/month
    functions: 1000000, // 1M invocations/month
  };
}
