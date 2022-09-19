import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import { StackReference } from "@pulumi/pulumi";
import { Provider } from "@pulumi/azure-native";

interface Environment {
    name: string;
    clientId: string;
    clientSecret: string;
    subscriptionId: string;
    tenantId: string;
}

const getEnvironment = () => {
    const environmentStack = new StackReference("tomasja/environments/dev");
    const environment = environmentStack
        .requireOutput("resourceGroups")
        .apply(json => json["hello-ndc"] as Environment);
    return environment;
}

const getAzureProvider = (environment: pulumi.Output<Environment>) => {
    const azureProvider = new Provider("azure-provider", {
        subscriptionId: environment.subscriptionId,
        tenantId: environment.tenantId,
        clientId: environment.clientId,
        clientSecret: environment.clientSecret
    });
    return azureProvider;
}

interface WebsiteArgs {
    resourceGroupName: pulumi.Input<string>
}

class Website extends pulumi.ComponentResource
{
    staticEndpoint?: pulumi.Output<string>;

    constructor(name: string, args: WebsiteArgs, opts?: pulumi.ComponentResourceOptions) {
        super(`2mas:website:${name}`, name);

        const options = { parent: this };

        const storageAccount = new storage.StorageAccount(`${name}-storageaccount`, {
            enableHttpsTrafficOnly: true,
            accountName: name.replace("-", ""),
            kind: storage.Kind.StorageV2,
            resourceGroupName: args.resourceGroupName,
            sku: {
                name: storage.SkuName.Standard_LRS,
            },
        }, options);

        // Enable static website support
        const staticWebsite = new storage.StorageAccountStaticWebsite("staticWebsite", {
            accountName: storageAccount.name,
            resourceGroupName: args.resourceGroupName,
            indexDocument: "index.html",
            error404Document: "index.html",
        }, options);

        // Upload files
        const indexFile = "index.html";
        const files = new storage.Blob(indexFile, {
            resourceGroupName: args.resourceGroupName,
            accountName: storageAccount.name,
            containerName: staticWebsite.containerName,
            source: new pulumi.asset.FileAsset(`../../${indexFile}`),
            contentType: "text/html",
        }, options);

        this.staticEndpoint = storageAccount.primaryEndpoints.web;
    }
}

const environment = getEnvironment();
const azureProvider = getAzureProvider(environment);
const website = new Website("hello-ndc", { resourceGroupName: environment.name }, { provider: azureProvider });

export const staticEndpoint = website.staticEndpoint;