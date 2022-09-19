import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { ComponentResource, Output, ProviderResource } from "@pulumi/pulumi";
import { Application, ServicePrincipal, ServicePrincipalPassword } from "@pulumi/azuread";
import { Provider as AzureProvider } from "@pulumi/azure-native";
import { Provider as AzureAdProvider } from "@pulumi/azuread";
import { RandomUuid } from "@pulumi/random";
import { RoleAssignment } from "@pulumi/azure-native/authorization";

type ResourceGroupWithSPArgs = {
    subscriptionId: string;
    location: string;
}

class ResourceGroupWithSP extends ComponentResource {
    resourceGroupName: Output<string>;
    clientId: Output<string>;
    clientSecret: Output<string>;

    constructor(name: string, args: ResourceGroupWithSPArgs, opts?: pulumi.ComponentResourceOptions) {
        super(`2mas:ResourceGroupWithSP:${name}`, name);
        const azureOptions = { provider: (opts?.providers as Record<string, ProviderResource>)["azure-native"],  parent: this };
        const azureAdOptions = { provider: (opts?.providers as Record<string, ProviderResource>)["azuread"],  parent: this };
        const resourceGroup = new resources.ResourceGroup("resourceGroup", {
            resourceGroupName: name,
            location: args.location,
        }, azureOptions);
        const adApp = new Application(
            `${name}-app`,
            { displayName: `${name}-app` },
            azureAdOptions,
        );
        const adSp = new ServicePrincipal(
            `${name}-sp`,
            { applicationId: adApp.applicationId },
            azureAdOptions,
        );
        const adSpPassword = new ServicePrincipalPassword(
            `${name}-sp-password`,
            {
                servicePrincipalId: adSp.id,
            },
            azureAdOptions,
        );
        
        const subscriptionId = args.subscriptionId;
        const resourceGroupNameUrn = resourceGroup.name.apply((name) => {
            return `/subscriptions/${subscriptionId}/resourcegroups/${name}`;
        });

        const contributorRoleDefinitionId = `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c`;
        const spRoleAssignmentId = new RandomUuid(
            `${name}-spRoleAssignmentId`,
            undefined,
            { parent: this },
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
            { ...azureOptions, dependsOn: [adSp] },
        );
        this.resourceGroupName = resourceGroup.name;
        this.clientId = adSp.applicationId;
        this.clientSecret = pulumi.secret(adSpPassword.value);
    }
}

const resourceGroupNames = ["hello-ndc", "team2"];
const azureConfig = new pulumi.Config("azure-native");
const tenantId = azureConfig.require("tenantId");
const subscriptionId = azureConfig.require("subscriptionId");
const location = azureConfig.require("location");
const azureProvider = new AzureProvider("azure-provider");
const azureAdProvider = new AzureAdProvider("azure-ad-provider");

export const resourceGroups = resourceGroupNames.map((name) => {
    const rg = new ResourceGroupWithSP(name, 
        { subscriptionId: subscriptionId, location: location },
        { providers: { "azure-native": azureProvider, azuread: azureAdProvider } });
    return {
        name: name,
        clientId: rg.clientId,
        clientSecret: rg.clientSecret,
        subscriptionId: subscriptionId,
        tenantId: tenantId
    }}).reduce((acc, cur) => ({...acc, [cur.name]: cur}), {});
