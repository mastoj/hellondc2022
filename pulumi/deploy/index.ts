import { Config, getStack, Output, StackReference } from "@pulumi/pulumi";
import { Provider } from "@pulumi/azure-native";
import { Website } from "./Website";
import { RecordTypes, Provider as DNSimpleProvider } from "@pulumi/dnsimple";

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
    const environmentStack = new StackReference("tomasja/environments/dev");
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

const getDNSimpleProvider = () => {
    const config = new Config("dnsimple");
    const provider = new DNSimpleProvider("dnsimple", {
        account: config.requireSecret("account"),
        token: config.requireSecret("token"),
    });
    return provider;
};

const environment = getEnvironment();
const azureProvider = getAzureProvider(environment);
const dnsimpleProvider = getDNSimpleProvider();
const website = new Website(fullName, 
    { 
        resourceGroupName: environment.name,
        dnsArgs: {
            recordType: RecordTypes.A,
            hostOrIp: customHostname
        }
    },
    { providers: { "azure-native": azureProvider, dnsimple: dnsimpleProvider} });
export const hostname = website.staticEndpoint?.apply(endpoint => new URL(endpoint).hostname);

export const siteUrl = `https://${customHostname}`;
export const staticEndpoint = website.staticEndpoint;
