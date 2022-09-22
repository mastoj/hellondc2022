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

echo "==> Add permission for directory"
# https://blogs.aaddevsup.xyz/2018/06/guid-table-for-windows-azure-active-directory-permissions/
# https://learn.microsoft.com/en-us/graph/permissions-reference
# Role assignment graph
# 06b708a9-e830-4db3-a914-8e69da51d44f

# Application Graph
az ad app permission add --id $ARM_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 1bfefb4e-e0b5-418b-a88f-73c46d2cc8e9=Role
# Directory Graph
az ad app permission add --id $ARM_CLIENT_ID --api 00000003-0000-0000-c000-000000000000 --api-permissions 19dbc75e-c2e2-444c-a770-ec69d8559fc7=Role
# Directory AD
az ad app permission add --id $ARM_CLIENT_ID --api 00000002-0000-0000-c000-000000000000 --api-permissions 78c8a3c8-a07e-4b9e-af1b-b5ccab50a175=Role
# Application Ad
az ad app permission add --id $ARM_CLIENT_ID --api 00000002-0000-0000-c000-000000000000 --api-permissions 1cda74f2-2616-4834-b122-5cb1b07f8a59=Role


sleep 10
az ad app permission admin-consent --id $ARM_CLIENT_ID
#az ad app permission grant --scope Directory.ReadWrite.All --id $ARM_CLIENT_ID --api 00000003-0000-0000-c000-000000000000
az role assignment create --assignee $ARM_CLIENT_ID --role 18d7d88d-d35e-4fb5-a5c3-7773c20a72d9 --scope subscriptions/6d43a0fc-56b4-448e-9148-5a10ddeb74fb