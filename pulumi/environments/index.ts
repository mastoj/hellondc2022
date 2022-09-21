import * as pulumi from "@pulumi/pulumi";
import { Provider as AzureProvider } from "@pulumi/azure-native";
import { Provider as AzureAdProvider } from "@pulumi/azuread";
import { ResourceGroupWithSP } from "./ResourceGroupWithSP";

const tenantId = process.env.ARM_TENANT_ID!;
const subscriptionId = process.env.ARM_SUBSCRIPTION_ID!;
const location = "WestEurope";
const azureProvider = new AzureProvider("azure-provider");
const azureAdProvider = new AzureAdProvider("azure-ad-provider");


const resourceGroupNames = ["hello-ndc", "team2"];
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
