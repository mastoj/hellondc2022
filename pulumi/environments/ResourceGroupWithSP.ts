import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import { ComponentResource, Output, ProviderResource } from "@pulumi/pulumi";
import { Application, ServicePrincipal, ServicePrincipalPassword } from "@pulumi/azuread";
import { RandomUuid } from "@pulumi/random";
import { RoleAssignment } from "@pulumi/azure-native/authorization";

export type ResourceGroupWithSPArgs = {
    subscriptionId: string;
    location: string;
}

export class ResourceGroupWithSP extends ComponentResource {
    resourceGroupName: Output<string>;
    clientId: Output<string>;
    clientSecret: Output<string>;

    constructor(name: string, args: ResourceGroupWithSPArgs, opts?: pulumi.ComponentResourceOptions) {
        super(`2mas:ResourceGroupWithSP:${name}`, name);
        const azureOptions = { provider: (opts?.providers as Record<string, ProviderResource>)["azure-native"], parent: this };
        const azureAdOptions = { provider: (opts?.providers as Record<string, ProviderResource>)["azuread"], parent: this };
        const resourceGroup = new resources.ResourceGroup("resourceGroup", {
            resourceGroupName: name,
            location: args.location,
        }, azureOptions);
        const adApp = new Application(
            `${name}-app`,
            { displayName: `${name}-app` },
            azureAdOptions
        );
        const adSp = new ServicePrincipal(
            `${name}-sp`,
            { applicationId: adApp.applicationId },
            azureAdOptions
        );
        const adSpPassword = new ServicePrincipalPassword(
            `${name}-sp-password`,
            {
                servicePrincipalId: adSp.id,
            },
            azureAdOptions
        );

        const subscriptionId = args.subscriptionId;
        const resourceGroupNameUrn = resourceGroup.name.apply((name) => {
            return `/subscriptions/${subscriptionId}/resourcegroups/${name}`;
        });

        const contributorRoleDefinitionId = `/subscriptions/${subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c`;
        const spRoleAssignmentId = new RandomUuid(
            `${name}-spRoleAssignmentId`,
            undefined,
            { parent: this }
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
            { ...azureOptions, dependsOn: [adSp] }
        );
        this.resourceGroupName = resourceGroup.name;
        this.clientId = adSp.applicationId;
        this.clientSecret = pulumi.secret(adSpPassword.value);
    }
}
