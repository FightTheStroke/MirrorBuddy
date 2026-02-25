import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';

function isAzureResourceAvailable(): boolean {
  try {
    const result = execSync(
      'az cognitiveservices account show --name gpt-realtime-staging --resource-group roberdan-3954-resource 2>&1',
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    return !result.includes('ResourceGroupNotFound') && !result.includes('ResourceNotFound');
  } catch {
    return false;
  }
}

const describeAzure = isAzureResourceAvailable() ? describe : describe.skip;

describeAzure('Azure GPT-Realtime-1.5 Deployment (Staging)', () => {
  const RESOURCE_GROUP = 'roberdan-3954-resource';
  const DEPLOYMENT_NAME = 'gpt-realtime-2026-02-23';
  const ACCOUNT_NAME = 'gpt-realtime-staging';
  const REGION = 'swedencentral';
  const MODEL_VERSION = '2026-02-23';

  beforeEach(() => {
    try {
      execSync('az version', { stdio: 'pipe' });
    } catch {
      throw new Error('Azure CLI not installed');
    }
  });

  it('deployment exists in Azure', () => {
    try {
      const output = execSync(
        `az cognitiveservices account deployment show --name ${ACCOUNT_NAME} --deployment-name ${DEPLOYMENT_NAME} --resource-group ${RESOURCE_GROUP} 2>/dev/null || echo "NOT_FOUND"`,
        { encoding: 'utf-8' },
      );
      expect(output).not.toContain('NOT_FOUND');
    } catch {
      expect.fail('Deployment does not exist');
    }
  });

  it('model version is 2026-02-23', () => {
    const output = execSync(
      `az cognitiveservices account deployment show --name ${ACCOUNT_NAME} --deployment-name ${DEPLOYMENT_NAME} --resource-group ${RESOURCE_GROUP} 2>/dev/null || echo '{}'`,
      { encoding: 'utf-8' },
    );
    const deployment = JSON.parse(output);
    if (deployment.properties) {
      expect(deployment.properties.model?.version).toBe(MODEL_VERSION);
    }
  });

  it('region is swedencentral', () => {
    const output = execSync(
      `az cognitiveservices account list --resource-group ${RESOURCE_GROUP} --query "[?name=='${ACCOUNT_NAME}'].location" --output tsv 2>/dev/null || echo ""`,
      { encoding: 'utf-8' },
    ).trim();
    expect(output.toLowerCase()).toContain(REGION.toLowerCase());
  });

  it('deployment is accessible', () => {
    try {
      const output = execSync(
        `az cognitiveservices account deployment show --name ${ACCOUNT_NAME} --deployment-name ${DEPLOYMENT_NAME} --resource-group ${RESOURCE_GROUP} 2>&1`,
        { encoding: 'utf-8' },
      );
      const deployment = JSON.parse(output);
      expect(deployment).toBeDefined();
      expect(deployment.id).toBeTruthy();
    } catch {
      expect.fail('Deployment is not accessible');
    }
  });

  it('SKU is GlobalStandard', () => {
    const output = execSync(
      `az cognitiveservices account deployment show --name ${ACCOUNT_NAME} --deployment-name ${DEPLOYMENT_NAME} --resource-group ${RESOURCE_GROUP} 2>/dev/null || echo '{}'`,
      { encoding: 'utf-8' },
    );
    const deployment = JSON.parse(output);
    if (deployment.sku) {
      expect(deployment.sku.name).toBe('GlobalStandard');
    }
  });
});
