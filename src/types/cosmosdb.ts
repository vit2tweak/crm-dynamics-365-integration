// Cosmos DB Product Warehouse Types

export interface CosmosProduct {
  id: string;
  partitionKey: string;
  productNumber: string;
  name: string;
  description?: string;
  category: ProductCategory;
  subcategory?: string;
  brand?: string;
  manufacturer?: string;
  model?: string;
  sku: string;
  barcode?: string;
  pricing: ProductPricing;
  inventory: ProductInventory;
  specifications: ProductSpecifications;
  images: ProductImage[];
  documents: ProductDocument[];
  variants: ProductVariant[];
  relationships: ProductRelationship[];
  seo: ProductSEO;
  status: ProductStatus;
  tags: string[];
  customFields: Record<string, any>;
  audit: AuditInfo;
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  level: number;
  path: string;
  description?: string;
  isActive: boolean;
}

export interface ProductPricing {
  basePrice: number;
  currency: string;
  costPrice?: number;
  msrp?: number;
  salePrice?: number;
  priceRules: PriceRule[];
  taxInfo: TaxInfo;
  discounts: ProductDiscount[];
  priceHistory: PriceHistoryEntry[];
}

export interface PriceRule {
  id: string;
  name: string;
  type: 'volume' | 'customer_group' | 'date_range' | 'promotion';
  conditions: Record<string, any>;
  adjustment: {
    type: 'percentage' | 'fixed_amount';
    value: number;
  };
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
}

export interface TaxInfo {
  taxable: boolean;
  taxCode?: string;
  taxRate?: number;
  taxExemptions: string[];
}

export interface ProductDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  minQuantity?: number;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
}

export interface PriceHistoryEntry {
  price: number;
  effectiveDate: string;
  reason?: string;
  updatedBy: string;
}

export interface ProductInventory {
  trackInventory: boolean;
  stockLevel: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  maxStockLevel: number;
  locations: InventoryLocation[];
  suppliers: ProductSupplier[];
  leadTime: number;
  backorderAllowed: boolean;
  preorderAllowed: boolean;
  inventoryHistory: InventoryHistoryEntry[];
}

export interface InventoryLocation {
  locationId: string;
  locationName: string;
  warehouseCode?: string;
  binLocation?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
}

export interface ProductSupplier {
  supplierId: string;
  supplierName: string;
  supplierProductCode?: string;
  isPrimary: boolean;
  leadTime: number;
  minimumOrderQuantity: number;
  costPrice: number;
  currency: string;
  lastOrderDate?: string;
  isActive: boolean;
}

export interface InventoryHistoryEntry {
  date: string;
  type: 'adjustment' | 'sale' | 'purchase' | 'transfer' | 'return';
  quantity: number;
  newStockLevel: number;
  reason?: string;
  reference?: string;
  updatedBy: string;
}

export interface ProductSpecifications {
  weight?: Measurement;
  dimensions?: Dimensions;
  color?: string;
  material?: string;
  warranty?: WarrantyInfo;
  certifications: string[];
  technicalSpecs: Record<string, any>;
  features: string[];
  compatibility: string[];
  requirements: string[];
}

export interface Measurement {
  value: number;
  unit: string;
}

export interface Dimensions {
  length?: Measurement;
  width?: Measurement;
  height?: Measurement;
  volume?: Measurement;
}

export interface WarrantyInfo {
  duration: number;
  unit: 'days' | 'months' | 'years';
  type: 'manufacturer' | 'extended' | 'limited';
  description?: string;
  terms?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  title?: string;
  type: 'primary' | 'gallery' | 'thumbnail' | 'zoom';
  sortOrder: number;
  isActive: boolean;
}

export interface ProductDocument {
  id: string;
  name: string;
  type: 'manual' | 'datasheet' | 'certificate' | 'warranty' | 'other';
  url: string;
  fileSize?: number;
  mimeType?: string;
  language?: string;
  version?: string;
  uploadDate: string;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string