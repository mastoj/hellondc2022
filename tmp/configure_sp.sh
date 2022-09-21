#!/bin/bash

echo "==> Clean up existing SP"
EXISTING_SP=$(az ad sp list --filter "displayname eq 'ndc2022god'" --query "[].{displayName:displayName, appId:appId}" | jq -r ".[0].appId")
az ad sp delete --id $EXISTING_SP
az ad app delete --id $EXISTING_SP

echo "==> Create SP"
export NDC_SUBSCRIPTION_ID=6d43a0fc-56b4-448e-9148-5a10ddeb74fb
SP_RESULT=$(az ad sp create-for-rbac --name ndc2022god --role contributor --scopes /subscriptions/$NDC_SUBSCRIPTION_ID)

echo "==> Export azure config"
export ARM_CLIENT_ID=$(echo $SP_RESULT | jq -r '.appId')
export ARM_CLIENT_SECRET=$(echo $SP_RESULT | jq -r '.password')
export ARM_SUBSCRIPTION_ID=$NDC_SUBSCRIPTION_ID
export ARM_TENANT_ID=$(echo $SP_RESULT | jq -r '.tenant')

echo "==> Grand directory consent"
#az ad app permission add --id $ARM_CLIENT_ID --api 00000002-0000-0000-c000-000000000000 --api-permissions Directory.ReadWrite.All=Scope
#az ad app permission add --id $ARM_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions c5366453-9fb0-48a5-a156-24f0c49a4b84=Scope
az ad app permission add --id $ARM_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 19dbc75e-c2e2-444c-a770-ec69d8559fc7=Scope
az ad app permission grant --scope Directory.ReadWrite.All --id $ARM_CLIENT_ID --api 00000003-0000-0000-c000-000000000000
