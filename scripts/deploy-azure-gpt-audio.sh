#!/bin/bash
# ============================================================================
# Deploy gpt-audio-1.5 in Azure Sweden Central (staging)
#
# Usage:
#   ./scripts/deploy-azure-gpt-audio.sh
#
# Required env vars: Azure CLI configured with proper authentication
# ============================================================================

set -euo pipefail

# Configuration
RESOURCE_GROUP="roberdan-3954-resource"
ACCOUNT_NAME="gpt-audio-staging"
DEPLOYMENT_NAME="gpt-audio-2026-02-23"
REGION="swedencentral"
MODEL_NAME="gpt-audio-1.5"
MODEL_VERSION="2026-02-23"
DEPLOYMENT_SKU="GlobalStandard"
SKU_CAPACITY=1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verify Azure CLI is available
if ! command -v az &> /dev/null; then
  echo -e "${RED}Error: Azure CLI not installed${NC}"
  exit 1
fi

# Verify authentication
if ! az account show &> /dev/null; then
  echo -e "${RED}Error: Not authenticated with Azure${NC}"
  exit 1
fi

echo -e "${BLUE}Deploying gpt-audio-1.5 to Azure Sweden Central${NC}"
echo "=========================================="

# Check if resource group exists
echo -e "${YELLOW}Checking resource group: ${RESOURCE_GROUP}${NC}"
if ! az group show --name "${RESOURCE_GROUP}" &> /dev/null; then
  echo -e "${YELLOW}Creating resource group: ${RESOURCE_GROUP}${NC}"
  az group create --name "${RESOURCE_GROUP}" --location "${REGION}"
fi

# Check if cognitive services account exists
echo -e "${YELLOW}Checking cognitive services account: ${ACCOUNT_NAME}${NC}"
if ! az cognitiveservices account show --name "${ACCOUNT_NAME}" --resource-group "${RESOURCE_GROUP}" &> /dev/null; then
  echo -e "${YELLOW}Creating cognitive services account: ${ACCOUNT_NAME}${NC}"
  az cognitiveservices account create \
    --name "${ACCOUNT_NAME}" \
    --resource-group "${RESOURCE_GROUP}" \
    --kind OpenAI \
    --sku S0 \
    --location "${REGION}"
else
  echo -e "${GREEN}Account already exists${NC}"
fi

# Create deployment
echo -e "${YELLOW}Creating deployment: ${DEPLOYMENT_NAME}${NC}"
az cognitiveservices account deployment create \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${ACCOUNT_NAME}" \
  --deployment-name "${DEPLOYMENT_NAME}" \
  --model-name "${MODEL_NAME}" \
  --model-version "${MODEL_VERSION}" \
  --model-format OpenAI \
  --sku-name "${DEPLOYMENT_SKU}" \
  --sku-capacity "${SKU_CAPACITY}"

# Verify deployment
echo -e "${YELLOW}Verifying deployment...${NC}"
DEPLOYMENT_INFO=$(az cognitiveservices account deployment show \
  --resource-group "${RESOURCE_GROUP}" \
  --name "${ACCOUNT_NAME}" \
  --deployment-name "${DEPLOYMENT_NAME}" || echo "")

if [ -n "$DEPLOYMENT_INFO" ]; then
  echo -e "${GREEN}✓ Deployment created successfully${NC}"
  echo "$DEPLOYMENT_INFO" | jq '.'
else
  echo -e "${RED}✗ Deployment verification failed${NC}"
  exit 1
fi

# Get account details
echo -e "${YELLOW}Getting account details...${NC}"
ACCOUNT_DETAILS=$(az cognitiveservices account show \
  --name "${ACCOUNT_NAME}" \
  --resource-group "${RESOURCE_GROUP}")

ENDPOINT=$(echo "$ACCOUNT_DETAILS" | jq -r '.properties.endpoint')
echo -e "${GREEN}✓ Endpoint: ${ENDPOINT}${NC}"

echo -e "${GREEN}=========================================="
echo "✓ Deployment complete"
echo "=========================================="
