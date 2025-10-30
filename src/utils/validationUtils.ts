import { Customer } from '../types/customer';
import { D365Account, D365Contact, D365Opportunity } from '../types/dynamics365';
import { NAVCustomer, NAVItem, NAVSalesOrder } from '../types/nav2017';
import { CosmosProduct, CosmosInventory } from '../types/cosmosdb';

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone number validation (international format)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// GUID validation
export const isValidGuid = (guid: string): boolean => {
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return guidRegex.test(guid);
};

// Date validation
export const isValidDate = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

// Currency validation
export const isValidCurrency = (amount: number | string): boolean => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(numAmount) && isFinite(numAmount) && numAmount >= 0;
};

// Required field validation
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

// String length validation
export const isValidLength = (value: string, min: number, max?: number): boolean => {
  if (!value) return false;
  const length = value.trim().length;
  if (length < min) return false;
  if (max && length > max) return false;
  return true;
};

// Numeric range validation
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

// Customer validation
export const validateCustomer = (customer: Partial<Customer>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(customer.name)) {
    errors.push('Customer name is required');
  } else if (!isValidLength(customer.name!, 2, 100)) {
    errors.push('Customer name must be between 2 and 100 characters');
  }

  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Invalid email format');
  }

  if (customer.phone && !isValidPhoneNumber(customer.phone)) {
    errors.push('Invalid phone number format');
  }

  if (customer.website && !isValidUrl(customer.website)) {
    errors.push('Invalid website URL format');
  }

  if (customer.creditLimit && !isValidCurrency(customer.creditLimit)) {
    errors.push('Invalid credit limit amount');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Dynamics 365 Account validation
export const validateD365Account = (account: Partial<D365Account>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(account.name)) {
    errors.push('Account name is required');
  }

  if (account.emailaddress1 && !isValidEmail(account.emailaddress1)) {
    errors.push('Invalid primary email address');
  }

  if (account.telephone1 && !isValidPhoneNumber(account.telephone1)) {
    errors.push('Invalid primary phone number');
  }

  if (account.websiteurl && !isValidUrl(account.websiteurl)) {
    errors.push('Invalid website URL');
  }

  if (account.revenue && !isValidCurrency(account.revenue)) {
    errors.push('Invalid revenue amount');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Dynamics 365 Contact validation
export const validateD365Contact = (contact: Partial<D365Contact>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(contact.firstname) && !isRequired(contact.lastname)) {
    errors.push('Either first name or last name is required');
  }

  if (contact.emailaddress1 && !isValidEmail(contact.emailaddress1)) {
    errors.push('Invalid primary email address');
  }

  if (contact.telephone1 && !isValidPhoneNumber(contact.telephone1)) {
    errors.push('Invalid primary phone number');
  }

  if (contact.mobilephone && !isValidPhoneNumber(contact.mobilephone)) {
    errors.push('Invalid mobile phone number');
  }

  if (contact.birthdate && !isValidDate(contact.birthdate)) {
    errors.push('Invalid birth date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Opportunity validation
export const validateOpportunity = (opportunity: Partial<D365Opportunity>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(opportunity.name)) {
    errors.push('Opportunity name is required');
  }

  if (!isRequired(opportunity.customerid)) {
    errors.push('Customer is required');
  }

  if (opportunity.estimatedvalue && !isValidCurrency(opportunity.estimatedvalue)) {
    errors.push('Invalid estimated value');
  }

  if (opportunity.estimatedclosedate && !isValidDate(opportunity.estimatedclosedate)) {
    errors.push('Invalid estimated close date');
  }

  if (opportunity.closeprobability && !isInRange(opportunity.closeprobability, 0, 100)) {
    errors.push('Close probability must be between 0 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// NAV Customer validation
export const validateNAVCustomer = (customer: Partial<NAVCustomer>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(customer.No)) {
    errors.push('Customer number is required');
  }

  if (!isRequired(customer.Name)) {
    errors.push('Customer name is required');
  }

  if (customer.EMail && !isValidEmail(customer.EMail)) {
    errors.push('Invalid email address');
  }

  if (customer.PhoneNo && !isValidPhoneNumber(customer.PhoneNo)) {
    errors.push('Invalid phone number');
  }

  if (customer.CreditLimitLCY && !isValidCurrency(customer.CreditLimitLCY)) {
    errors.push('Invalid credit limit');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Product validation
export const validateProduct = (product: Partial<CosmosProduct>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(product.productNumber)) {
    errors.push('Product number is required');
  }

  if (!isRequired(product.name)) {
    errors.push('Product name is required');
  }

  if (product.unitPrice && !isValidCurrency(product.unitPrice)) {
    errors.push('Invalid unit price');
  }

  if (product.weight && product.weight < 0) {
    errors.push('Weight cannot be negative');
  }

  if (product.dimensions) {
    if (product.dimensions.length && product.dimensions.length < 0) {
      errors.push('Length cannot be negative');
    }
    if (product.dimensions.width && product.dimensions.width < 0) {
      errors.push('Width cannot be negative');
    }
    if (product.dimensions.height && product.dimensions.height < 0) {
      errors.push('Height cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Inventory validation
export const validateInventory = (inventory: Partial<CosmosInventory>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isRequired(inventory.productId)) {
    errors.push('Product ID is required');
  }

  if (!isRequired(inventory.location)) {
    errors.push('Location is required');
  }

  if (inventory.quantityOnHand !== undefined && inventory.quantityOnHand < 0) {
    errors.push('Quantity on hand cannot be negative');
  }

  if (inventory.quantityReserved !== undefined && inventory.quantityReserved < 0) {
    errors.push('Quantity reserved cannot be negative');
  }

  if (inventory.reorderPoint !== undefined && inventory.reorderPoint < 0) {
    errors.push('Reorder point cannot be negative');
  }

  if (inventory.maximumStock !== undefined && inventory.maximumStock < 0) {
    errors.push('Maximum stock cannot be negative');
  }

  if (inventory.lastUpdated && !isValidDate(inventory.lastUpdated)) {
    errors.push('Invalid last updated date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generic form validation
export const validateForm = (data: Record<string, any>, rules: Record<string, ValidationRule[]>): { isValid: boolean; errors: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};

  Object.keys(rules).forEach(field => {
    const fieldErrors: string[] = [];
    const value = data[field];
    const fieldRules = rules[field];

    fieldRules.forEach(rule => {
      if (!rule.validator(value)) {
        fieldErrors.push(rule.message);
      }
    });

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Validation rule interface
export interface ValidationRule {
  validator: (value: any) => boolean;
  message: string;
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validator: isRequired,
    message
  }),
  email: (message = 'Invalid email format'): ValidationRule => ({
    validator: isValidEmail,
    message
  }),
  phone: (message = 'Invalid phone number format'): ValidationRule => ({
    validator: isValidPhoneNumber,
    message
  }),
  url: (message = 'Invalid URL format'): ValidationRule => ({
    validator: isValidUrl,
    message
  }),
  minLength: (min: number, message?: string): ValidationRule => ({
    validator: (value: string) => isValidLength(value, min),
    message: message || `Minimum length is ${min} characters`
  }),
  maxLength: (max: number, message?: string): ValidationRule => ({
    validator: (value: string) => !value || value.length <= max,
    message: message || `Maximum length is ${max} characters`
  }),
  currency: (message = 'Invalid currency amount'): ValidationRule => ({
    validator: isValidCurrency,
    message
  }),
  range: (min: number, max: number, message?: string): ValidationRule => ({
    validator: (value: number) => isInRange(value, min, max),
    message: message || `Value must be between ${min} and ${max}`
  })
};