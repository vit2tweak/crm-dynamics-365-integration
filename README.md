# CRM Dynamics 365 Integration

A comprehensive CRM system integrating Microsoft Dynamics 365 Sales with NAV 2017 ERP, Cosmos DB product warehouse, and customer portal. Built with React and Azure cloud services for real-time data synchronization and 360-degree customer insights.

## 🚀 Features

- **Real-time Data Synchronization** across Dynamics 365, NAV 2017, and Cosmos DB
- **360° Customer View** with unified data from all systems
- **Customer Self-Service Portal** for orders, invoices, and product catalogs
- **Automated Workflows** for lead conversion and order processing
- **Advanced Analytics** with interactive dashboards and reports
- **Seamless Integration** with existing business systems

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 React Frontend                          │
│  ┌─────────────────┐  ┌─────────────────────────────┐   │
│  │  Admin Portal   │  │    Customer Portal          │   │
│  └─────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │ Azure Functions │
                    │  (Integration)  │
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────────────┐    ┌─────────────────┐    ┌─────────────┐
│ Dynamics 365  │    │   NAV 2017 ERP  │    │  Cosmos DB  │
│   (Sales)     │    │   (Financial)   │    │ (Products)  │
└───────────────┘    └─────────────────┘    └─────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI** for components
- **React Query** for data management
- **Chart.js** for visualizations
- **React Router** for navigation

### Backend & Integration
- **Azure Functions** (Node.js)
- **Azure Service Bus** for messaging
- **Azure Key Vault** for secrets
- **Microsoft Graph API** for Dynamics 365
- **OData** for NAV 2017 integration

### Database & Storage
- **Azure Cosmos DB** for products
- **Azure SQL Database** for application data
- **Azure Blob Storage** for files

## 🚦 Prerequisites

- Node.js 18+ and npm
- Azure subscription
- Microsoft Dynamics 365 Sales license
- NAV 2017 with web services enabled
- Azure Cosmos DB account

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd crm-dynamics365-integration
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration values
```

### 4. Set Up Azure Resources
```bash
# Run the Azure setup script
./scripts/setup-azure.sh
```

### 5. Deploy Azure Functions
```bash
cd azure-functions
npm install
func azure functionapp publish <your-function-app-name>
```

### 6. Start Development Server
```bash
npm start
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Azure Configuration
REACT_APP_AZURE_CLIENT_ID=your-client-id
REACT_APP_AZURE_TENANT_ID=your-tenant-id
REACT_APP_AZURE_FUNCTION_URL=your-function-url

# Dynamics 365 Configuration
REACT_APP_DYNAMICS_URL=your-dynamics-url
REACT_APP_DYNAMICS_API_VERSION=9.2

# NAV 2017 Configuration
REACT_APP_NAV_BASE_URL=your-nav-url
REACT_APP_NAV_COMPANY=your-company

# Cosmos DB Configuration
REACT_APP_COSMOSDB_ENDPOINT=your-cosmos-endpoint
```

### Azure Function Configuration

Configure the following in Azure:

1. **Application Settings** for Azure Functions
2. **Connection Strings** for databases
3. **Key Vault References** for secrets
4. **CORS Settings** for frontend access

## 📊 Key Components

### Customer 360° View
- Unified customer profile
- Sales history and opportunities
- Financial transactions
- Product interactions
- Support tickets

### Real-time Synchronization
- Bi-directional data sync
- Conflict resolution
- Error handling and retry logic
- Sync status monitoring

### Customer Portal
- Account management
- Order history and tracking
- Product catalog
- Invoice downloads
- Support requests

### Admin Dashboard
- Sales analytics
- Customer insights
- System health monitoring
- Integration status

## 🔄 Data Synchronization

### Sync Rules
- **Customers**: Dynamics 365 → NAV 2017, Cosmos DB
- **Products**: Cosmos DB → Dynamics 365, NAV 2017
- **Orders**: NAV 2017 → Dynamics 365, Cosmos DB
- **Inventory**: Cosmos DB → All systems

### Conflict Resolution
- Last-write-wins with timestamp comparison
- Manual resolution for critical conflicts
- Audit trail for all changes
- Rollback capabilities

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment
```bash
# Build the application
npm run build

# Deploy to Azure Static Web Apps
./scripts/deploy.sh production
```

### Staging Deployment
```bash
./scripts/deploy.sh staging
```

## 📈 Monitoring

### Application Insights
- Performance monitoring
- Error tracking
- User analytics
- Custom telemetry

### Health Checks
- System availability
- Integration status
- Data sync health
- Performance metrics

## 🔒 Security

- **Authentication**: Azure AD B2C for customers, Azure AD for employees
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encryption at rest and in transit
- **API Security**: OAuth 2.0 and JWT tokens
- **Network Security**: Private endpoints and VNet integration

## 📚 Documentation

- [API Documentation](docs/api-documentation.md)
- [Integration Guide](docs/integration-guide.md)
- [Deployment Guide](docs/deployment-guide.md)
- [User Manual](docs/user-manual.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🗺️ Roadmap

- [ ] AI-powered customer insights
- [ ] Mobile application
- [ ] Advanced workflow automation
- [ ] Third-party integrations
- [ ] Enhanced reporting capabilities