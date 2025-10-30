#!/bin/bash

# CRM Dynamics 365 Integration - Deployment Script
# This script automates the deployment of the React app and Azure Functions

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
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

build_react_app() {
    log_info "Building React application..."
    
    # Install dependencies
    npm install
    
    # Run tests
    log_info "Running tests..."
    npm test -- --coverage --watchAll=false
    
    # Build the application
    log_info "Building production bundle..."
    npm run build
    
    log_success "React application built successfully"
}

deploy_web_app() {
    log_info "Deploying web application..."
    
    # Create deployment package
    cd build
    zip -r ../webapp-deployment.zip .
    cd ..
    
    # Deploy to Azure Web App
    az webapp deployment source config-zip \
        --resource-group $RESOURCE_GROUP_NAME \
        --name $WEB_APP_NAME \
        --src webapp-deployment.zip
    
    # Configure app settings
    log_info "Configuring web app settings..."
    az webapp config appsettings set \
        --resource-group $RESOURCE_GROUP_NAME \
        --name $WEB_APP_NAME \
        --settings \
        REACT_APP_AZURE_CLIENT_ID=$REACT_APP_AZURE_CLIENT_ID \
        REACT_APP_AZURE_TENANT_ID=$REACT_APP_AZURE_TENANT_ID \
        REACT_APP_AZURE_REDIRECT_URI=https://$WEB_APP_NAME.azurewebsites.net \
        REACT_APP_AZURE_FUNCTION_URL=https://$FUNCTION_APP_NAME.azurewebsites.net \
        REACT_APP_DYNAMICS365_BASE_URL=$REACT_APP_DYNAMICS365_BASE_URL \
        REACT_APP_NAV2017_BASE_URL=$REACT_APP_NAV2017_BASE_URL \
        REACT_APP_COSMOS_DB_ENDPOINT=$REACT_APP_COSMOS_DB_ENDPOINT
    
    # Clean up
    rm webapp-deployment.zip
    
    log_success "Web application deployed successfully"
}

deploy_azure_functions() {
    log_info "Deploying Azure Functions..."
    
    # Navigate to Azure Functions directory
    cd azure-functions
    
    # Install dependencies
    npm install
    
    # Create deployment package
    zip -r ../functions-deployment.zip . -x "node_modules/.bin/*" "*.log"
    cd ..
    
    # Deploy Azure Functions
    az functionapp deployment source config-zip \
        --resource-group $RESOURCE_GROUP_NAME \
        --name $FUNCTION_APP_NAME \
        --src functions-deployment.zip
    
    # Configure function app settings
    log_info "Configuring function app settings..."
    az functionapp config appsettings set \
        --resource-group $RESOURCE_GROUP_NAME \
        --name $FUNCTION_APP_NAME \
        --settings \
        COSMOS_DB_ENDPOINT=$COSMOS_DB_ENDPOINT \
        COSMOS_DB_KEY=$COSMOS_DB_KEY \
        DYNAMICS365_BASE_URL=$DYNAMICS365_BASE_URL \
        DYNAMICS365_CLIENT_ID=$DYNAMICS365_CLIENT_ID \
        DYNAMICS365_CLIENT_SECRET=$DYNAMICS365_CLIENT_SECRET \
        DYNAMICS365_TENANT_ID=$DYNAMICS365_TENANT_ID \
        NAV2017_BASE_URL=$NAV2017_BASE_URL \
        NAV2017_USERNAME=$NAV2017_USERNAME \
        NAV2017_PASSWORD=$NAV2017_PASSWORD \
        WEBHOOK_SECRET=$WEBHOOK_SECRET
    
    # Clean up
    rm functions-deployment.zip
    
    log_success "Azure Functions deployed successfully"
}

configure_cors() {
    log_info "Configuring CORS settings..."
    
    # Configure CORS for Function App
    az functionapp cors add \
        --resource-group $RESOURCE_GROUP_NAME \
        --name $FUNCTION_APP_NAME \
        --allowed-origins "https://$WEB_APP_NAME.azurewebsites.net" "http://localhost:3000"
    
    log_success "CORS configured successfully"
}

run_post_deployment_tests() {
    log_info "Running post-deployment tests..."
    
    # Wait for deployments to be ready
    sleep 30
    
    # Test web app health
    WEB_APP_URL="https://$WEB_APP_NAME.azurewebsites.net"
    if curl -f -s "$WEB_APP_URL" > /dev/null; then
        log_success "Web app is responding"
    else
        log_warning "Web app health check failed"
    fi
    
    # Test function app health
    FUNCTION_APP_URL="https://$FUNCTION_APP_NAME.azurewebsites.net"
    if curl -f -s "$FUNCTION_APP_URL" > /dev/null; then
        log_success "Function app is responding"
    else
        log_warning "Function app health check failed"
    fi
    
    log_success "Post-deployment tests completed"
}

show_deployment_info() {
    log_info "Deployment Information:"
    echo "=================================="
    echo "Web App URL: https://$WEB_APP_NAME.azurewebsites.net"
    echo "Function App URL: https://$FUNCTION_APP_NAME.azurewebsites.net"
    echo "Resource Group: $RESOURCE_GROUP_NAME"
    echo "Location: $LOCATION"
    echo "=================================="
}

main() {
    log_info "Starting CRM Dynamics 365 Integration deployment..."
    
    # Load environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    check_prerequisites
    build_react_app
    deploy_web_app
    deploy_azure_functions
    configure_cors
    run_post_deployment_tests
    show_deployment_info
    
    log_success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --web-only)
        log_info "Deploying web application only..."
        check_prerequisites
        build_react_app
        deploy_web_app
        ;;
    --functions-only)
        log_info "Deploying Azure Functions only..."
        check_prerequisites
        deploy_azure_functions
        ;;
    --help)
        echo "Usage: $0 [--web-only|--functions-only|--help]"
        echo "  --web-only      Deploy only the web application"
        echo "  --functions-only Deploy only the Azure Functions"
        echo "  --help          Show this help message"
        exit 0
        ;;
    *)
        main
        ;;
esac