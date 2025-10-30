import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { useNav2017 } from '../../hooks/useNav2017';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Customer, CustomerType, CustomerStatus } from '../../types/customer';
import { validateEmail, validatePhone, validateRequired } from '../../utils/validationUtils';
import '../../styles/customers.css';

interface CustomerFormProps {
  mode?: 'create' | 'edit';
  customerId?: string;
  onSave?: (customer: Customer) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  customerNumber: string;
  email: string;
  phone: string;
  website: string;
  type: CustomerType;
  status: CustomerStatus;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  notes: string;
  assignedTo: string;
  industry: string;
  annualRevenue: number;
  employeeCount: number;
}

interface FormErrors {
  [key: string]: string;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  mode = 'create',
  customerId: propCustomerId,
  onSave,
  onCancel
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = propCustomerId || id;
  
  const { customers, createCustomer, updateCustomer, loading: dataLoading } = useData();
  const { createAccount, updateAccount, loading: d365Loading } = useDynamics365();
  const { createCustomer: createNAVCustomer, updateCustomer: updateNAVCustomer, loading: navLoading } = useNav2017();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    customerNumber: '',
    email: '',
    phone: '',
    website: '',
    type: 'Business',
    status: 'Active',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'United States'
    },
    notes: '',
    assignedTo: '',
    industry: '',
    annualRevenue: 0,
    employeeCount: 0
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncWithD365, setSyncWithD365] = useState(true);
  const [syncWithNAV, setSyncWithNAV] = useState(true);

  useEffect(() => {
    if (mode === 'edit' && customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setFormData({
          name: customer.name,
          customerNumber: customer.customerNumber,
          email: customer.email || '',
          phone: customer.phone || '',
          website: customer.website || '',
          type: customer.type,
          status: customer.status,
          address: {
            street: customer.address?.street || '',
            city: customer.address?.city || '',
            state: customer.address?.state || '',
            postalCode: customer.address?.postalCode || '',
            country: customer.address?.country || 'United States'
          },
          notes: customer.notes || '',
          assignedTo: customer.assignedTo || '',
          industry: customer.industry || '',
          annualRevenue: customer.annualRevenue || 0,
          employeeCount: customer.employeeCount || 0
        });
      }
    }
  }, [mode, customerId, customers]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof FormData] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!validateRequired(formData.name)) {
      newErrors.name = 'Customer name is required';
    }

    if (!validateRequired(formData.customerNumber)) {
      newErrors.customerNumber = 'Customer number is required';
    }

    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Address validation
    if (!validateRequired(formData.address.street)) {
      newErrors['address.street'] = 'Street address is required';
    }

    if (!validateRequired(formData.address.city)) {
      newErrors['address.city'] = 'City is required';
    }

    if (!validateRequired(formData.address.state)) {
      newErrors['address.state'] = 'State is required';
    }

    if (!validateRequired(formData.address.postalCode)) {
      newErrors['address.postalCode'] = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const customerData: Partial<Customer> = {
        name: formData.name,
        customerNumber: formData.customerNumber,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        type: formData.type,
        status: formData.status,
        address: formData.address,
        notes: formData.notes || undefined,
        assignedTo: formData.assignedTo || undefined,
        industry: formData.industry || undefined,
        annualRevenue: formData.annualRevenue || undefined,
        employeeCount: formData.employeeCount || undefined
      };

      let savedCustomer: Customer;

      if (mode === 'create') {
        savedCustomer = await createCustomer(customerData as Omit<Customer, 'id' | 'createdDate' | 'lastModifiedDate'>);
      } else {
        savedCustomer = await updateCustomer(customerId!, customerData);
      }

      // Sync with external systems if enabled
      const syncPromises: Promise<any>[] = [];

      if (syncWithD365) {
        const d365Data = {
          name: formData.name,
          emailaddress1: formData.email,
          telephone1: formData.phone,
          websiteurl: formData.website,
          address1_line1: formData.address.street,
          address1_city: formData.address.city,
          address1_stateorprovince: formData.address.state,
          address1_postalcode: formData.address.postalCode,
          address1_country: formData.address.country,
          description: formData.notes,
          industrycode: formData.industry,
          revenue: formData.annualRevenue,
          numberofemployees: formData.employeeCount
        };

        if (mode === 'create') {
          syncPromises.push(createAccount(d365Data));
        } else if (savedCustomer.dynamics365?.accountId) {
          syncPromises.push(updateAccount(savedCustomer.dynamics365.accountId, d365Data));
        }
      }

      if (syncWithNAV) {
        const navData = {
          Name: formData.name,
          Address: formData.address.street,
          City: formData.address.city,
          County: formData.address.state,
          PostCode: formData.address.postalCode,
          CountryRegionCode: formData.address.country === 'United States' ? 'US' : formData.address.country,
          PhoneNo: formData.phone,
          EMail: formData.email,
          HomePage: formData.website
        };

        if (mode === 'create') {
          syncPromises.push(createNAVCustomer(navData));
        } else if (savedCustomer.nav2017?.customerNo) {
          syncPromises.push(updateNAVCustomer(savedCustomer.nav2017.customerNo, navData));
        }
      }

      // Wait for all sync operations to complete
      if (syncPromises.length > 0) {
        await Promise.allSettled(syncPromises);
      }

      if (onSave) {
        onSave(savedCustomer);
      } else {
        navigate(`/customers/${savedCustomer.id}`);
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      setErrors({ submit: 'Failed to save customer. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(mode === 'edit' ? `/customers/${customerId}` : '/customers');
    }
  };

  const loading = dataLoading || d365Loading || navLoading || isSubmitting;

  return (
    <div className="customer-form">
      <div className="form-header">
        <h2>{mode === 'create' ? 'Create New Customer' : 'Edit Customer'}</h2>
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="customer-form"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="small" /> : (mode === 'create' ? 'Create Customer' : 'Save Changes')}
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="error-message">
          {errors.submit}
        </div>
      )}

      <form id="customer-form" onSubmit={handleSubmit} className="form-content">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Customer Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'error' : ''}
                disabled={loading}
                required
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="customerNumber">Customer Number *</label>
              <input
                type="text"
                id="customerNumber"
                value={formData.customerNumber}
                onChange={(e) => handleInputChange('customerNumber', e.target.value)}
                className={errors.customerNumber ? 'error' : ''}
                disabled={loading}
                required
              />
              {errors.customerNumber && <span className="error-text">{errors.customerNumber}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="type">Customer Type</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as CustomerType)}
                disabled={loading}
              >
                <option value="Business">Business</option>
                <option value="Individual">Individual</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as CustomerStatus)}
                disabled={loading}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Prospect">Prospect</option>
                <option value="Lead">Lead</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Contact Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                disabled={loading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
                disabled={loading}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Address</h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="street">Street Address *</label>
              <input
                type="text"
                id="street"
                value={formData.address.street}