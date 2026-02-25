import { execSync } from 'child_process';

const RESOURCE_GROUP = 'roberdan-3954-resource';
const ACCOUNT_NAME = 'gpt-realtime-staging';
const DEPLOYMENT_NAME = 'gpt-realtime-2026-02-23';
const REGION = 'swedencentral';

export interface AzureDeploymentInfo {
  id: string;
  name: string;
  status: string;
  endpoint: string;
  location: string;
  model: {
    name: string;
    version: string;
  };
  sku: {
    name: string;
    capacity: number;
  };
}

/**
 * Verify Azure GPT-Realtime-1.5 deployment exists and is accessible.
 * @returns Deployment info if accessible, null if not found
 */
export function getDeploymentStatus(): AzureDeploymentInfo | null {
  try {
    const deploymentOutput = execSync(
      `az cognitiveservices account deployment show --name ${ACCOUNT_NAME} --deployment-name ${DEPLOYMENT_NAME} --resource-group ${RESOURCE_GROUP} 2>&1`,
      { encoding: 'utf-8' },
    );

    const deployment = JSON.parse(deploymentOutput);

    const accountOutput = execSync(
      `az cognitiveservices account show --name ${ACCOUNT_NAME} --resource-group ${RESOURCE_GROUP} 2>&1`,
      { encoding: 'utf-8' },
    );

    const account = JSON.parse(accountOutput);

    return {
      id: deployment.id,
      name: deployment.name,
      status: deployment.properties?.provisioningState || 'unknown',
      endpoint: account.properties?.endpoint || '',
      location: account.location || REGION,
      model: {
        name: deployment.properties?.model?.name || 'gpt-realtime-1.5',
        version: deployment.properties?.model?.version || '',
      },
      sku: {
        name: deployment.sku?.name || 'GlobalStandard',
        capacity: deployment.sku?.capacity || 1,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Verify all deployment requirements are met.
 * @returns Array of unmet requirements, empty if all met
 */
export function verifyDeploymentRequirements(): string[] {
  const unmet: string[] = [];
  const deployment = getDeploymentStatus();

  if (!deployment) {
    unmet.push('Deployment does not exist or is not accessible');
    return unmet;
  }

  if (deployment.location.toLowerCase() !== REGION.toLowerCase()) {
    unmet.push(`Region mismatch: expected ${REGION}, got ${deployment.location}`);
  }

  if (deployment.model.version !== '2026-02-23') {
    unmet.push(`Model version mismatch: expected 2026-02-23, got ${deployment.model.version}`);
  }

  if (deployment.sku.name !== 'GlobalStandard') {
    unmet.push(`SKU mismatch: expected GlobalStandard, got ${deployment.sku.name}`);
  }

  if (!deployment.endpoint) {
    unmet.push('Endpoint not configured');
  }

  return unmet;
}

/**
 * Get endpoint for the deployment (used for API calls).
 * @returns Endpoint URL or null if not available
 */
export function getEndpoint(): string | null {
  const deployment = getDeploymentStatus();
  return deployment?.endpoint || null;
}
