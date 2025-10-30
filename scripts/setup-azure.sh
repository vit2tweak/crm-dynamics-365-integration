#!/bin/bash

# CRM Dynamics 365 Integration - Azure Infrastructure Setup Script
# This script creates all necessary Azure resources for the CRM integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP_NAME=${RESOURCE_GROUP_NAME:-"crm-dynamics365-rg"}
LOCATION=${LOCATION:-"East US"}
APP_SERVICE_PLAN=${APP_SERVICE_PLAN:-"crm-dynamics365-plan"}
WEB_APP_NAME=${WEB_APP_NAME:-"crm-dynamics365-web"}
FUNCTION_APP_NAME=${FUNCTION_APP_NAME:-"crm-dynamics365-functions"}
STORAGE_ACCOUNT=${STORAGE_ACCOUNT:-"crmdynamics365storage"}
COSMOS_DB_ACCOUNT=${COSMOS_DB_ACCOUNT:-"crm-dynamics365-cosmos"}
KEY_VAULT_NAME=${KEY_VAULT_NAME:-"crm-dynamics365-kv"}
APP_INSIGHTS_NAME=${APP_INSIGHTS_NAME:-"crm-dynamics365-insights"}
LOG_ANALYTICS_WORKSPACE=${LOG_ANALYTICS_WORKSPACE:-"crm-dynamics365-logs"}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    # Check if required extensions are installed
    az extension add --name application-insights --yes 2>/dev/null || true
    
    log_success "Prerequisites check passed"
}

create_resource_group() {
    log_info "Creating resource group: $RESOURCE_GROUP_NAME"
    
    az group create \
        --name $RESOURCE_GROUP_NAME \
        --location "$LOCATION" \
        --tags project="CRM-Dynamics365" environment="production"
    
    log_success "Resource group created successfully"
}

create_storage_account() {
    log_info "Creating storage account: $STORAGE_ACCOUNT"
    
    az storage account create \
        --name $STORAGE_ACCOUNT \
        --resource-group $RESOURCE_GROUP_NAME \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --access-tier Hot \
        --tags project="CRM-Dynamics365"
    
    log_success "Storage account created successfully"
}

create_cosmos_db() {
    log_info "Creating Cosmos DB account: $COSMOS_DB_ACCOUNT"
    
    az cosmosdb create \
        --name $COSMOS_DB_ACCOUNT \
        --resource-group $RESOURCE_GROUP_NAME \
        --locations regionName="$LOCATION" failoverPriority=0 isZoneRedundant=False \
        --default-consistency-level Session \
        --enable-automatic-failover true \
        --enable-multiple-write-locations false \
        --tags project="CRM-Dynamics365"
    
    # Create databases and containers
    log_info "Creating Cosmos DB databases and containers..."
    
    # Create CRM database
    az cosmosdb sql database create \
        --account-name $COSMOS_DB_ACCOUNT \
        --resource-group $RESOURCE_GROUP_NAME \
        --name "CRMData" \
        --throughput 400
    
    # Create containers
    containers=("customers" "products" "inventory" "categories" "suppliers" "sync-logs" "error-logs")
    
    for container in "${containers[@]}"; do
        log_info "Creating container: $container"
        az cosmosdb sql container create \
            --account-name $COSMOS_DB_ACCOUNT \
            --resource-group $RESOURCE_GROUP_NAME \
            --database-name "CRMData" \
            --name $container \
            --partition-key-path "/partitionKey" \
            --throughput 400
    done
    
    log_success "Cosmos DB created successfully"
}

create_key_vault() {
    log_info "Creating Key Vault: $KEY_VAULT_NAME"
    
    az keyvault create \
        --name $KEY_VAULT_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --location "$LOCATION" \
        --sku standard \
        --enabled-for-deployment true \
        --enabled-for-template-deployment true \
        --tags project="CRM-Dynamics365"
    
    log_success "Key Vault created successfully"
}

create_log_analytics() {
    log_info "Creating Log Analytics workspace: $LOG_ANALYTICS_WORKSPACE"
    
    az monitor log-analytics workspace create \
        --resource-group $RESOURCE_GROUP_NAME \
        --workspace-name $LOG_ANALYTICS_WORKSPACE \
        --location "$LOCATION" \
        --sku PerGB2018 \
        --tags project="CRM-Dynamics365"
    
    log_success "Log Analytics workspace created successfully"
}

create_app_insights() {
    log_info "Creating Application Insights: $APP_INSIGHTS_NAME"
    
    # Get Log Analytics workspace ID
    WORKSPACE_ID=$(az monitor log-analytics workspace show \
        --resource-group $RESOURCE_GROUP_NAME \
        --workspace-name $LOG_ANALYTICS_WORKSPACE \
        --query id -o tsv)
    
    az monitor app-insights component create \
        --app $APP_INSIGHTS_NAME \
        --location "$LOCATION" \
        --resource-group $RESOURCE_GROUP_NAME \
        --workspace $WORKSPACE_ID \
        --tags project="CRM-Dynamics365"
    
    log_success "Application Insights created successfully"
}

create_app_service_plan() {
    log_info "Creating App Service Plan: $APP_SERVICE_PLAN"
    
    az appservice plan create \
        --name $APP_SERVICE_PLAN \
        --resource-group $RESOURCE_GROUP_NAME \
        --location "$LOCATION" \
        --sku B1 \
        --is-linux \
        --tags project="CRM-Dynamics365"
    
    log_success "App Service Plan created successfully"
}

create_web_app() {
    log_info "Creating Web App: $WEB_APP_NAME"
    
    az webapp create \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --plan $APP_SERVICE_PLAN \
        --runtime "NODE|18-lts" \
        --tags project="CRM-Dynamics365"
    
    # Configure web app settings
    log_info "Configuring web app settings..."
    
    az webapp config set \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --startup-file "serve -s build -l 8080"
    
    # Enable HTTPS only
    az webapp update \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --https-only true
    
    log_success "Web App created successfully"
}

create_function_app() {
    log_info "Creating Function App: $FUNCTION_APP_NAME"
    
    # Get Application Insights instrumentation key
    APPINSIGHTS_KEY=$(az monitor app-insights component show \
        --app $APP_INSIGHTS_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --query instrumentationKey -o tsv)
    
    az functionapp create \
        --name $FUNCTION_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --storage-account $STORAGE_ACCOUNT \
        --plan $APP_SERVICE_PLAN \
        --runtime node \
        --runtime-version 18 \
        --functions-version 4 \
        --app-insights $APP_INSIGHTS_NAME \
        --app-insights-key $APPINSIGHTS_KEY \
        --tags project="CRM-Dynamics365"
    
    log_success "Function App created successfully"
}

configure_managed_identity() {
    log_info "Configuring managed identities..."
    
    # Enable system-assigned managed identity for Web App
    az webapp identity assign \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME
    
    # Enable system-assigned managed identity for Function App
    az functionapp identity assign \
        --name $FUNCTION_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME
    
    # Get principal IDs
    WEB_APP_PRINCIPAL_ID=$(az webapp identity show \
        --name $WEB_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --query principalId -o tsv)
    
    FUNCTION_APP_PRINCIPAL_ID=$(az functionapp identity show \
        --name $FUNCTION_APP_NAME \
        --resource-group $RESOURCE_GROUP_NAME \
        --query principalId -o tsv)
    
    # Grant Key Vault access
    az keyvault set-policy \
        --name $KEY_VAULT_NAME \
        --object-id $WEB_APP_PRINCIPAL_ID \
        --secret-permissions get list
    
    az keyvault set-policy \
        --name $KEY_VAULT_NAME \
        --object-id $FUNCTION_APP_PRINCIPAL_ID \
        --secret-permissions get list set
    
    log_success "Managed identities configured successfully"
}

store_secrets() {
    log_info "Storing secrets in Key Vault..."
    
    # Store Cosmos DB connection string
    COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
        --name $COSMOS_DB_ACCOUNT \
        --resource-group $RESOURCE_GROUP_NAME \
        --type connection-strings \
        --query 'connectionStrings[0].connectionString' -o tsv)
    
    az keyvault secret set \
        --vault-name $KEY_VAULT_NAME \
        --name "CosmosDBConnectionString" \
        --value "$COSMOS_CONNECTION_STRING"
    
    # Store Cosmos DB key
    COSMOS_KEY=$(az cosmosdb keys list \
        --name $COSMOS_DB_ACCOUNT \
        --resource-group $RESOURCE_GROUP_NAME \
        --query 'primaryMasterKey' -o tsv)
    
    az keyvault secret set \
        --vault-name $KEY_VAULT_NAME \
        --name "CosmosDBKey" \
        --value "$COSMOS_KEY"
    
    # Store Cosmos DB endpoint
    COSMOS_ENDPOINT=$(az cosmosdb show \
        --name $COSMOS_DB_ACCOUNT \
        --resource-group $RESOURCE_GROUP_NAME \
        --query 'documentEndpoint' -o tsv)
    
    az keyvault secret set \
        --vault-name $KEY_VAULT_NAME \
        --name "CosmosDBEndpoint" \
        --value "$COSMOS_ENDPOINT"
    
    log_success "Secrets stored successfully"
}

configure_monitoring() {
    log_info "Configuring monitoring and alerts..."
    
    # Create action group for alerts
    az monitor action-group create \
        --name "CRM-Alerts" \
        --resource-group $RESOURCE_GROUP_NAME \
        --short-name "CRMAlerts"
    
    # Create metric alerts
    az monitor metrics alert create \
        --name "High-CPU-WebApp" \
        --resource-group $RESOURCE_GROUP_NAME \
        --scopes "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP_NAME/providers/Microsoft.Web/sites/$WEB_APP_NAME" \
        --condition "avg Percentage CPU > 80" \
        --description "Alert when web app CPU usage is high" \
        --evaluation-frequency 5m \
        --window-size 15m \
        --severity 2 \
        --action "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP_NAME/providers/microsoft.insights/actionGroups/CRM-Alerts"
    
    log_success "Monitoring configured successfully"
}

show_resource_info() {
    log_info "Azure Resources Information:"
    echo "=============================================="
    echo "Resource Group: $RESOURCE_GROUP_NAME"
    echo "Location: $LOCATION"
    echo "Web App: https://$WEB_APP_NAME.azurewebsites.net"
    echo "Function App: https://$FUNCTION_APP_NAME.azurewebsites.net"
    echo "Cosmos DB: $COSMOS_DB_ACCOUNT"
    echo "Storage Account: $STORAGE_ACCOUNT"
    echo "Key Vault: $KEY_VAULT_NAME"
    echo "Application Insights: $APP_INSIGHTS_NAME"
    echo "=============================================="
    
    # Output environment variables for .env file
    echo ""
    log_info "Environment variables for .env file:"
    echo "REACT_APP_COSMOS_DB_ENDPOINT=$(az cosmosdb show --name $COSMOS_DB_ACCOUNT --resource-group $RESOURCE_GROUP_NAME --query 'documentEndpoint' -o tsv)"
    echo "REACT_APP_AZURE_FUNCTION_URL=https://$FUNCTION_APP_NAME.azurewebsites.net"
    echo "REACT_APP_KEY_VAULT_URL=https://$KEY_VAULT_NAME.vault.azure.net/"
}

main() {
    log_info "Starting Azure infrastructure setup for CRM Dynamics 365 Integration..."
    
    check_prerequisites
    create_resource_group
    create_storage_account
    create_cosmos_db
    create_key_vault
    create_log_analytics
    create_app_insights
    create_app_service_plan
    create_web_app
    create_function_app
    configure_managed_identity
    store_secrets
    configure_monitoring
    show_resource_info
    
    log_success "Azure infrastructure setup completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --help)
        echo "Usage: $0 [--help]"
        echo "This script creates all necessary Azure resources for the CRM Dynamics 365 Integration."
        echo ""
        echo "Environment variables (optional):"
        echo "  RESOURCE_GROUP_NAME    - Name of the resource group (default: crm-dynamics365-rg)"
        echo "  LOCATION              - Azure region (default: East US)"
        echo "  WEB_APP_NAME          - Name of the web app (default: crm-dynamics365-web)"
        echo "  FUNCTION_APP_NAME     - Name of the function app (default: crm-dynamics365-functions)"
        exit 0
        ;;
    *)
        main
        ;;
esac