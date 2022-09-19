import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import { ComponentResource, Output, ProviderResource } from "@pulumi/pulumi";
import { Application, ServicePrincipal, ServicePrincipalPassword } from "@pulumi/azuread";
import { Provider } from "@pulumi/azure-native";
import { RandomUuid } from "@pulumi/random";
import { RoleAssignment } from "@pulumi/azure-native/authorization";

type ResourceGroupWithSPArgs = {
    subscriptionId: string;
}

class ResourceGroupWithSP extends ComponentResource {
    resourceGroupName: Output<string>;
    clientId: Output<string>;
    clientSecret: Output<string>;
    subscriptionId: Output<string>;
    tenantId: Output<string>;

    constructor(name: string, args: ResourceGroupWithSPArgs, opts?: pulumi.ComponentResourceOptions) {
        super("2mas:ResourceGroupWithSP", name);
        const options = { ...opts,  parent: this };
        const resourceGroup = new resources.ResourceGroup("resourceGroup", {
            resourceGroupName: name
        }, options);
        const adApp = new Application(
            `${name}-app`,
            { displayName: `${name}-app` },
            options,
        );
        const adSp = new ServicePrincipal(
            `${name}-sp`,
            { applicationId: adApp.applicationId },
            options,
        );
        const adSpPassword = new ServicePrincipalPassword(
            `${name}-sp-password`,
            {
                servicePrincipalId: adSp.id,
            },
            options,
        );
        
        const subscriptionId = args.subscriptionId;
        const resourceGroupNameUrn = resourceGroup.name.apply((name) => {
            return `/subscriptions/${subscriptionId}/resourcegroups/${name}`;
        });

        const contributorRoleDefinitionId = `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c`;
        const spRoleAssignmentId = new RandomUuid(
            `${name}-spRoleAssignmentId`,
            undefined,
            options,
        );
        const spRoleAssignment = new RoleAssignment(
            `${name}-spRoleAssignment`,
            {
                principalType: "ServicePrincipal",
                roleAssignmentName: spRoleAssignmentId.result,
                principalId: adSp.id,
                roleDefinitionId: contributorRoleDefinitionId,
                scope: resourceGroupNameUrn,
            },
            { ...options, dependsOn: [adSp] },
        );
        this.resourceGroupName = resourceGroup.name;

    }
}

// Create an Azure Resource Group

// export const result = resourceGroup.name.apply(name => ({[name]: name}))


// export {
//     ...result
// }

// // Create an Azure resource (Storage Account)
// const storageAccount = new storage.StorageAccount("sa", {
//     resourceGroupName: resourceGroup.name,
//     sku: {
//         name: storage.SkuName.Standard_LRS,
//     },
//     kind: storage.Kind.StorageV2,
// });

// // Export the primary key of the Storage Account
// const storageAccountKeys = storage.listStorageAccountKeysOutput({
//     resourceGroupName: resourceGroup.name,
//     accountName: storageAccount.name
// });

// export const primaryStorageKey = storageAccountKeys.keys[0].value;
