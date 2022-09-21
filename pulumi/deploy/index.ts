import { getStack, Output, StackReference } from "@pulumi/pulumi";
import { Provider } from "@pulumi/azure-native";
import { Website } from "./Website";
import { RecordTypes } from "@pulumi/dnsimple";

interface Environment {
    name: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
    tenantId: string;
}

const stack = getStack();
const name = "hello-ndc";
const fullName = `${name}-${stack}`;
const customHostname = `${fullName}.2mas.xyz`


const getEnvironment = () => {
    const environmentStack = new StackReference("tomasja/hellondc2022.environments/dev");
    const environment = environmentStack
        .requireOutput("resourceGroups")
        .apply(json => json[name] as Environment);
    return environment;
}

const getAzureProvider = (environment: Output<Environment>) => {
    const azureProvider = new Provider("azure-provider", {
        subscriptionId: environment.subscriptionId,
        tenantId: environment.tenantId,
        clientId: environment.clientId,
        clientSecret: environment.clientSecret
    });
    return azureProvider;
}

const environment = getEnvironment();
const azureProvider = getAzureProvider(environment);
const website = new Website(fullName, 
    { 
        resourceGroupName: environment.name,
        dnsArgs: {
            recordType: RecordTypes.A,
            hostOrIp: customHostname
        }
    },
    { providers: { "azure-native": azureProvider } });
export const hostname = website.staticEndpoint?.apply(endpoint => new URL(endpoint).hostname);

export const siteUrl = `https://${customHostname}`;
export const staticEndpoint = website.staticEndpoint;
