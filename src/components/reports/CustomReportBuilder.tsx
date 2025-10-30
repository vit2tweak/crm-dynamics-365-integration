import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { useNav2017 } from '../../hooks/useNav2017';
import { useCosmosDB } from '../../hooks/useCosmosDB';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { formatDate, getDateRange, DateRangeType } from '../../utils/dateUtils';
import '../../styles/components.css';

interface DataSource {
  id: string;
  name: string;
  type: 'dynamics365' | 'nav2017' | 'cosmosdb';
  tables: DataTable[];
}

interface DataTable {
  id: string;
  name: string;
  displayName: string;
  fields: DataField[];
}

interface DataField {
  id: string;
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  aggregatable?: boolean;
}

interface ReportColumn {
  fieldId: string;
  displayName: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  format?: 'currency' | 'percentage' | 'date';
  sortOrder?: 'asc' | 'desc';
  width?: number;
}

interface ReportFilter {
  id: string;
  fieldId: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
  value2?: any; // For 'between' operator
}

interface ReportGrouping {
  fieldId: string;
  sortOrder?: 'asc' | 'desc';
}

interface ReportConfiguration {
  name: string;
  description?: string;
  dataSource: string;
  table: string;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGrouping[];
  sortBy: ReportColumn[];
  limit?: number;
  chartType?: 'table' | 'bar' | 'line' | 'pie' | 'area';
}

export const CustomReportBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');

  const [config, setConfig] = useState<ReportConfiguration>({
    name: '',
    dataSource: '',
    table: '',
    columns: [],
    filters: [],
    groupBy: [],
    sortBy: []
  });

  const [activeStep, setActiveStep] = useState<'datasource' | 'columns' | 'filters' | 'grouping' | 'preview'>('datasource');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Data sources configuration
  const dataSources: DataSource[] = [
    {
      id: 'dynamics365',
      name: 'Dynamics 365 Sales',
      type: 'dynamics365',
      tables: [
        {
          id: 'accounts',
          name: 'accounts',
          displayName: 'Accounts',
          fields: [
            { id: 'name', name: 'name', displayName: 'Account Name', type: 'string' },
            { id: 'accountnumber', name: 'accountnumber', displayName: 'Account Number', type: 'string' },
            { id: 'revenue', name: 'revenue', displayName: 'Annual Revenue', type: 'currency', aggregatable: true },
            { id: 'createdon', name: 'createdon', displayName: 'Created On', type: 'date' },
            { id: 'industrycode', name: 'industrycode', displayName: 'Industry', type: 'string' }
          ]
        },
        {
          id: 'opportunities',
          name: 'opportunities',
          displayName: 'Opportunities',
          fields: [
            { id: 'name', name: 'name', displayName: 'Opportunity Name', type: 'string' },
            { id: 'estimatedvalue', name: 'estimatedvalue', displayName: 'Estimated Value', type: 'currency', aggregatable: true },
            { id: 'closeprobability', name: 'closeprobability', displayName: 'Close Probability', type: 'number' },
            { id: 'estimatedclosedate', name: 'estimatedclosedate', displayName: 'Est. Close Date', type: 'date' },
            { id: 'statecode', name: 'statecode', displayName: 'Status', type: 'string' }
          ]
        },
        {
          id: 'contacts',
          name: 'contacts',
          displayName: 'Contacts',
          fields: [
            { id: 'fullname', name: 'fullname', displayName: 'Full Name', type: 'string' },
            { id: 'emailaddress1', name: 'emailaddress1', displayName: 'Email', type: 'string' },
            { id: 'telephone1', name: 'telephone1', displayName: 'Phone', type: 'string' },
            { id: 'createdon', name: 'createdon', displayName: 'Created On', type: 'date' },
            { id: 'jobtitle', name: 'jobtitle', displayName: 'Job Title', type: 'string' }
          ]
        }
      ]
    },
    {
      id: 'nav2017',
      name: 'NAV 2017 ERP',
      type: 'nav2017',
      tables: [
        {
          id: 'customers',
          name: 'Customer',
          displayName: 'Customers',
          fields: [
            { id: 'No', name: 'No', displayName: 'Customer No.', type: 'string' },
            { id: 'Name', name: 'Name', displayName: 'Customer Name', type: 'string' },
            { id: 'CreditLimit', name: 'Credit_Limit_LCY', displayName: 'Credit Limit', type: 'currency', aggregatable: true },
            { id: 'Balance', name: 'Balance_LCY', displayName: 'Balance', type: 'currency', aggregatable: true },
            { id: 'SalesLCY', name: 'Sales_LCY', displayName: 'Sales (LCY)', type: 'currency', aggregatable: true }
          ]
        },
        {
          id: 'salesorders',
          name: 'Sales_Header',
          displayName: 'Sales Orders',
          fields: [
            { id: 'No', name: 'No', displayName: 'Order No.', type: 'string' },
            { id: 'SelltoCustomerNo', name: 'Sell_to_Customer_No', displayName: 'Customer No.', type: 'string' },
            { id: 'OrderDate', name: 'Order_Date', displayName: 'Order Date', type: 'date' },
            { id: 'Amount', name: 'Amount', displayName: 'Amount', type: 'currency', aggregatable: true },
            { id: 'Status', name: 'Status', displayName: 'Status', type: 'string' }
          ]
        },
        {
          id: 'items',
          name: 'Item',
          displayName: 'Items',
          fields: [
            { id: 'No', name: 'No', displayName: 'Item No.', type: 'string' },
            { id: 'Description', name: 'Description', displayName: 'Description', type: 'string' },
            { id: 'UnitPrice', name: 'Unit_Price', displayName: 'Unit Price', type: 'currency', aggregatable: true },
            { id: 'Inventory', name: 'Inventory', displayName: 'Inventory', type: 'number', aggregatable: true },
            { id: 'ItemCategoryCode', name: 'Item_Category_Code', displayName: 'Category', type: 'string' }
          ]
        }
      ]
    },
    {
      id: 'cosmosdb',
      name: 'Product Warehouse',
      type: 'cosmosdb',
      tables: [
        {
          id: 'products',
          name: 'products',
          displayName: 'Products',
          fields: [
            { id: 'productNumber', name: 'productNumber', displayName: 'Product Number', type: 'string' },
            { id: 'name', name: 'name', displayName: 'Product Name', type: 'string' },
            { id: 'listPrice', name: 'listPrice', displayName: 'List Price', type: 'currency', aggregatable: true },
            { id: 'standardCost', name: 'standardCost', displayName: 'Standard Cost', type: 'currency', aggregatable: true },
            { id: 'category', name: 'category', displayName: 'Category', type: 'string' }
          ]
        },
        {
          id: 'inventory',
          name: 'inventory',
          displayName: 'Inventory',
          fields: [
            { id: 'productId', name: 'productId', displayName: 'Product ID', type: 'string' },
            { id: 'location', name: 'location', displayName: 'Location', type: 'string' },
            { id: 'quantityOnHand', name: 'quantityOnHand', displayName: 'Qty on Hand', type: 'number', aggregatable: true },
            { id: 'quantityReserved', name: 'quantityReserved', displayName: 'Qty Reserved', type: 'number', aggregatable: true },
            { id: 'lastUpdated', name: 'lastUpdated', displayName: 'Last Updated', type: 'date' }
          ]
        }
      ]
    }
  ];

  const selectedDataSource = dataSources.find(ds => ds.id === config.dataSource);
  const selectedTable = selectedDataSource?.tables.find(t => t.id === config.table);

  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId]);

  const loadTemplate = async (templateId: string) => {
    try {
      setLoading(true);
      // Load predefined template configuration
      const templates: Record<string, Partial<ReportConfiguration>> = {
        'sales-performance': {
          name: 'Sales Performance Report',
          dataSource: 'dynamics365',
          table: 'opportunities',
          columns: [
            { fieldId: 'name', displayName: 'Opportunity Name' },
            { fieldId: 'estimatedvalue', displayName: 'Value', aggregation: 'sum', format: 'currency' },
            { fieldId: 'closeprobability', displayName: 'Probability' },
            { fieldId: 'estimatedclosedate', displayName: 'Close Date', format: 'date' }
          ],
          chartType: 'table'
        },
        'customer-analysis': {
          name: 'Customer Analysis Report',
          dataSource: 'nav2017',
          table: 'customers',
          columns: [
            { fieldId: 'Name', displayName: 'Customer Name' },
            { fieldId: 'SalesLCY', displayName: 'Total Sales', aggregation: 'sum', format: 'currency' },
            { fieldId: 'Balance', displayName: 'Balance', format: 'currency' },
            { fieldId: 'CreditLimit', displayName: 'Credit Limit', format: 'currency' }
          ],
          chartType: 'table'
        }
      };

      const template = templates[templateId];
      if (template) {
        setConfig(prev => ({ ...prev, ...template }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof ReportConfiguration, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addColumn = (field: DataField) => {
    const newColumn: ReportColumn = {
      fieldId: field.id,
      displayName: field.displayName
    };
    
    setConfig(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));
  };