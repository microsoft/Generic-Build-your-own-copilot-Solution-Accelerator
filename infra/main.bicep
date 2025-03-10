// ========== main.bicep ========== //
targetScope = 'resourceGroup'

@minLength(3)
@maxLength(10)
@description('A unique prefix for all resources in this deployment. This should be 3-10 characters long:')
param environmentName string



@metadata({
  azd: {
    type: 'location'
  }
})


@minLength(1)
@description('Secondary location for databases creation(example:eastus2):')
param secondaryLocation string

@minLength(1)
@description('GPT model deployment type:')
@allowed([
  'Standard'
  'GlobalStandard'
])
param deploymentType string = 'GlobalStandard'

@minLength(1)
@description('Name of the GPT model to deploy:')
@allowed([
  'gpt-4o'
  'gpt-4'
])
param gptModelName string = 'gpt-4o'

var gptModelVersion = '2024-02-15-preview'

@minValue(10)
@description('Capacity of the GPT deployment:')
// You can increase this, but capacity is limited per model/region, so you will get errors if you go over
// https://learn.microsoft.com/en-us/azure/ai-services/openai/quotas-limits
param gptDeploymentCapacity int = 30

@minLength(1)
@description('Name of the Text Embedding model to deploy:')
@allowed([
  'text-embedding-ada-002'
])
param embeddingModel string = 'text-embedding-ada-002'


@minValue(10)
@description('Capacity of the Embedding Model deployment')
param embeddingDeploymentCapacity int = 80

param imageTag string = 'dev'

var uniqueId = toLower(uniqueString(subscription().id, environmentName, resourceGroup().location))
var solutionPrefix = 'dg${padLeft(take(uniqueId, 12), 12, '0')}'
var resourceGroupLocation = resourceGroup().location

var solutionLocation = resourceGroupLocation
// var baseUrl = 'https://raw.githubusercontent.com/microsoft/Generic-Build-your-own-copilot-Solution-Accelerator/main/'


@description('Name of App Service plan')
param HostingPlanName string = guid(resourceGroup().id)

@description('The pricing tier for the App Service plan')
@allowed([
  'F1'
  'D1'
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1'
  'P2'
  'P3'
  'P4'
])
param HostingPlanSku string = 'B3'

var ApplicationInsightsName = 'appins-${solutionPrefix}'
var WorkspaceName = 'worksp-${solutionPrefix}'


// ========== Managed Identity ========== //
module managedIdentityModule 'deploy_managed_identity.bicep' = {
  name: 'deploy_managed_identity'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
  }
  scope: resourceGroup(resourceGroup().name)
}

// ==========Key Vault Module ========== //
module kvault 'deploy_keyvault.bicep' = {
  name: 'deploy_keyvault'
  params: {
    solutionName: solutionPrefix
    solutionLocation: resourceGroupLocation
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
  }
  scope: resourceGroup(resourceGroup().name)
}

// ==========AI Foundry and related resources ========== //
module aifoundry 'deploy_ai_foundry.bicep' = {
  name: 'deploy_ai_foundry'
  params: {
    solutionName: solutionPrefix
    solutionLocation: resourceGroupLocation
    keyVaultName: kvault.outputs.keyvaultName
    deploymentType: deploymentType
    gptModelName: gptModelName
    gptModelVersion: gptModelVersion
    gptDeploymentCapacity: gptDeploymentCapacity
    embeddingModel: embeddingModel
    embeddingDeploymentCapacity: embeddingDeploymentCapacity
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
  }
  scope: resourceGroup(resourceGroup().name)
}

// ========== Storage account module ========== //
module storageAccount 'deploy_storage_account.bicep' = {
  name: 'deploy_storage_account'
  params: {
    solutionName: solutionPrefix
    solutionLocation: solutionLocation
    keyVaultName: kvault.outputs.keyvaultName
    managedIdentityObjectId:managedIdentityModule.outputs.managedIdentityOutput.objectId
  }
  scope: resourceGroup(resourceGroup().name)
}


// resource AzureOpenAIResource_resource 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
//   name: AzureOpenAIResource
//   location: resourceGroup().location
//   kind: 'OpenAI'
//   sku: {
//     name: 'S0'
//   }
//   properties: {
//     customSubDomainName: AzureOpenAIResource
//     publicNetworkAccess: 'Enabled'
//   }
// }

// resource AzureOpenAIResource_AzureOpenAIModel 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
//   parent: AzureOpenAIResource_resource
//   name: AzureOpenAIModelName
//   properties: {
//     model: {
//       name: AzureOpenAIModel
//       version: '2024-05-13'
//       format: 'OpenAI'
//     }
//   }
//   sku: {
//     name: 'Standard'
//     capacity: 20
//   }
// }

// resource AzureOpenAIResource_AzureOpenAIEmbedding 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
//   parent: AzureOpenAIResource_resource
//   name: AzureOpenAIEmbeddingName
//   properties: {
//     model: {
//       name: AzureOpenAIEmbeddingModel
//       version: '2'
//       format: 'OpenAI'
//     }
//   }
//   sku: {
//     name: 'Standard'
//     capacity: 20
//   }
//   dependsOn: [
//     AzureOpenAIResource_AzureOpenAIModel
//   ]
// }

// resource AzureSearchService_resource 'Microsoft.Search/searchServices@2021-04-01-preview' = {
//   name: AzureSearchService
//   location: resourceGroup().location
//   sku: {
//     name: 'standard'
//   }
//   properties: {
//     hostingMode: 'default'
//   }
// }

//========== Updates to Key Vault ========== //
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' existing = {
  name: aifoundry.outputs.keyvaultName
  scope: resourceGroup(resourceGroup().name)
}


resource HostingPlan 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: HostingPlanName
  location: resourceGroup().location
  sku: {
    name: HostingPlanSku
  }
  properties: {
    reserved: true
  }
  kind: 'linux'
}

// resource Website 'Microsoft.Web/sites@2020-06-01' = {
//   name: WebsiteName
//   location: resourceGroup().location
//   identity: {
//     type: 'SystemAssigned'
//   }
//   properties: {
//     serverFarmId: HostingPlanName
//     siteConfig: {
//       appSettings: [
//         {
//           name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
//           value: reference(ApplicationInsights.id, '2015-05-01').InstrumentationKey
//         }
//         {
//           name: 'AZURE_SEARCH_SERVICE'
//           value: aifoundry.outputs.aiSearchService
//         }
//         {
//           name: 'AZURE_SEARCH_INDEX'
//           value: AzureSearchIndex
//         }
//         {
//           name: 'AZURE_SEARCH_KEY'
//           value:aifoundry.outputs.keyvaultName.
//         }
//         {
//           name: 'AZURE_SEARCH_USE_SEMANTIC_SEARCH'
//           value: AzureSearchUseSemanticSearch
//         }
//         {
//           name: 'AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG'
//           value: AzureSearchSemanticSearchConfig
//         }
//         {
//           name: 'AZURE_SEARCH_INDEX_IS_PRECHUNKED'
//           value: AzureSearchIndexIsPrechunked
//         }
//         {
//           name: 'AZURE_SEARCH_TOP_K'
//           value: AzureSearchTopK
//         }
//         {
//           name: 'AZURE_SEARCH_ENABLE_IN_DOMAIN'
//           value: AzureSearchEnableInDomain
//         }
//         {
//           name: 'AZURE_SEARCH_CONTENT_COLUMNS'
//           value: AzureSearchContentColumns
//         }
//         {
//           name: 'AZURE_SEARCH_FILENAME_COLUMN'
//           value: AzureSearchFilenameColumn
//         }
//         {
//           name: 'AZURE_SEARCH_TITLE_COLUMN'
//           value: AzureSearchTitleColumn
//         }
//         {
//           name: 'AZURE_SEARCH_URL_COLUMN'
//           value: AzureSearchUrlColumn
//         }
//         {
//           name: 'AZURE_OPENAI_GENERATE_SECTION_CONTENT_PROMPT'
//           value: azureOpenAiGenerateSectionContentPrompt
//         }
//         {
//           name: 'AZURE_OPENAI_TEMPLATE_SYSTEM_MESSAGE'
//           value: azureOpenAiTemplateSystemMessage
//         }
//         {
//           name: 'AZURE_OPENAI_TITLE_PROMPT'
//           value: azureOpenAiTitlePrompt
//         }
//         {
//           name: 'AZURE_OPENAI_RESOURCE'
//           value: AzureOpenAIResource
//         }
//         {
//           name: 'AZURE_OPENAI_MODEL'
//           value: AzureOpenAIModel
//         }
//         {
//           name: 'AZURE_OPENAI_KEY'
//           value: listKeys(
//             resourceId(
//               subscription().subscriptionId,
//               resourceGroup().name,
//               'Microsoft.CognitiveServices/accounts',
//               AzureOpenAIResource
//             ),
//             '2023-05-01'
//           ).key1
//         }
//         {
//           name: 'AZURE_OPENAI_MODEL_NAME'
//           value: AzureOpenAIModelName
//         }
//         {
//           name: 'AZURE_OPENAI_TEMPERATURE'
//           value: AzureOpenAITemperature
//         }
//         {
//           name: 'AZURE_OPENAI_TOP_P'
//           value: AzureOpenAITopP
//         }
//         {
//           name: 'AZURE_OPENAI_MAX_TOKENS'
//           value: AzureOpenAIMaxTokens
//         }
//         {
//           name: 'AZURE_OPENAI_STOP_SEQUENCE'
//           value: AzureOpenAIStopSequence
//         }
//         {
//           name: 'AZURE_OPENAI_SYSTEM_MESSAGE'
//           value: azureOpenAISystemMessage
//         }
//         {
//           name: 'AZURE_OPENAI_STREAM'
//           value: AzureOpenAIStream
//         }
//         {
//           name: 'AZURE_SEARCH_QUERY_TYPE'
//           value: AzureSearchQueryType
//         }
//         {
//           name: 'AZURE_SEARCH_VECTOR_COLUMNS'
//           value: AzureSearchVectorFields
//         }
//         {
//           name: 'AZURE_SEARCH_PERMITTED_GROUPS_COLUMN'
//           value: AzureSearchPermittedGroupsField
//         }
//         {
//           name: 'AZURE_SEARCH_STRICTNESS'
//           value: AzureSearchStrictness
//         }
//         {
//           name: 'AZURE_OPENAI_EMBEDDING_NAME'
//           value: AzureOpenAIEmbeddingName
//         }
//         {
//           name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
//           value: 'true'
//         }
//         {
//           name: 'AZURE_COSMOSDB_ACCOUNT'
//           value: CosmosDBName
//         }
//         {
//           name: 'AZURE_COSMOSDB_DATABASE'
//           value: cosmosdb_database_name
//         }
//         {
//           name: 'AZURE_COSMOSDB_CONVERSATIONS_CONTAINER'
//           value: cosmosdb_container_name
//         }
//         {
//           name: 'UWSGI_PROCESSES'
//           value: '2'
//         }
//         {
//           name: 'UWSGI_THREADS'
//           value: '2'
//         }
//       ]
//       linuxFxVersion: WebAppImageName
//     }
//   }
//   dependsOn: [
//     HostingPlan
//     AzureOpenAIResource_resource
//     AzureSearchService_resource
//     [keyVault]
//   ]
// }

//========== App service module ========== //
module appserviceModule 'deploy_app_service.bicep' = {
  name: 'deploy_app_service'
  params: {
    imageTag: imageTag
    applicationInsightsId: aifoundry.outputs.applicationInsightsId
    // identity:managedIdentityModule.outputs.managedIdentityOutput.id
    solutionName: solutionPrefix
    // solutionLocation: solutionLocation
    AzureOpenAIEndpoint:aifoundry.outputs.aiServicesTarget
    AzureOpenAIModel: gptModelName //'gpt-4o-mini'
    AzureOpenAIKey:keyVault.getSecret('AZURE-OPENAI-KEY')
    azureOpenAIApiVersion: gptModelVersion //'2024-02-15-preview'
    AZURE_OPENAI_RESOURCE:aifoundry.outputs.aiServicesName
    USE_CHAT_HISTORY_ENABLED:'True'
    AZURE_COSMOSDB_ACCOUNT: cosmosDBModule.outputs.cosmosAccountName
    // AZURE_COSMOSDB_ACCOUNT_KEY: keyVault.getSecret('AZURE-COSMOSDB-ACCOUNT-KEY')
    AZURE_COSMOSDB_CONVERSATIONS_CONTAINER: cosmosDBModule.outputs.cosmosContainerName
    AZURE_COSMOSDB_DATABASE: cosmosDBModule.outputs.cosmosDatabaseName
    AZURE_COSMOSDB_ENABLE_FEEDBACK:'True'
  }
  scope: resourceGroup(resourceGroup().name)
  // dependsOn:[sqlDBModule]
}

output WEB_APP_URL string = appserviceModule.outputs.webAppUrl

resource Workspace 'Microsoft.OperationalInsights/workspaces@2020-08-01' = {
  name: WorkspaceName
  location: resourceGroup().location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource ApplicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: ApplicationInsightsName
  location: resourceGroup().location
  tags: {
    'hidden-link:${resourceId('Microsoft.Web/sites',ApplicationInsightsName)}': 'Resource'
  }
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: Workspace.id
  }
  kind: 'web'
}

// ========== Cosmos DB module ========== //
module cosmosDBModule 'deploy_cosmos_db.bicep' = {
  name: 'deploy_cosmos_db'
  params: {
    solutionName: solutionPrefix
    solutionLocation: secondaryLocation
    keyVaultName: kvault.outputs.keyvaultName
  }
  scope: resourceGroup(resourceGroup().name)
}

// resource CosmosDB 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
//   name: CosmosDBName
//   location: CosmosDBRegion
//   kind: 'GlobalDocumentDB'
//   properties: {
//     consistencyPolicy: {
//       defaultConsistencyLevel: 'Session'
//     }
//     locations: [
//       {
//         locationName: CosmosDBRegion
//         failoverPriority: 0
//         isZoneRedundant: false
//       }
//     ]
//     databaseAccountOfferType: 'Standard'
//     capabilities: [
//       {
//         name: 'EnableServerless'
//       }
//     ]
//   }
// }

// resource CosmosDBName_cosmosdb_database_name 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
//   parent: CosmosDB
//   name: '${cosmosdb_database_name}'
//   properties: {
//     resource: {
//       id: cosmosdb_database_name
//     }
//   }
// }

// resource CosmosDBName_cosmosdb_database_name_conversations 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
//   parent: CosmosDBName_cosmosdb_database_name
//   name: 'conversations'
//   properties: {
//     resource: {
//       id: 'conversations'
//       indexingPolicy: {
//         indexingMode: 'consistent'
//         automatic: true
//         includedPaths: [
//           {
//             path: '/*'
//           }
//         ]
//         excludedPaths: [
//           {
//             path: '/"_etag"/?'
//           }
//         ]
//       }
//       partitionKey: {
//         paths: [
//           '/userId'
//         ]
//         kind: 'Hash'
//       }
//     }
//   }
// }

// resource CosmosDBName_roleAssignmentId 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2021-04-15' = {
//   parent: CosmosDB
//   name: '${roleAssignmentId}'
//   properties: {
//     roleDefinitionId: resourceId(
//       'Microsoft.DocumentDB/databaseAccounts/sqlRoleDefinitions',
//       split('${CosmosDBName}/${roleDefinitionId}', '/')[0],
//       split('${CosmosDBName}/${roleDefinitionId}', '/')[1]
//     )
//     // principalId: reference(Website.id, '2021-02-01', 'Full').identity.principalId
//     scope: CosmosDB.id
//   }
// }
