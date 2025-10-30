import React, { useState, useEffect, useMemo } from 'react';
import { useCosmosDB } from '../../hooks/useCosmosDB';
import { useNav2017 } from '../../hooks/useNav2017';
import { CosmosInventory, CosmosProduct } from '../../types/cosmosdb';
import { NAVItem } from '../../types/nav2017';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/components.css';

interface InventoryStatusProps {
  productId?: string;
  showFilters?: boolean;
  maxItems?: number;
}

interface InventoryItem {
  id: string;
  productNumber: string;
  productName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  reorderLevel: number;
  maxStock: number;
  location: string;
  lastUpdated: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock';
  navData?: NAVItem;
}

export const InventoryStatus: React.FC<InventoryStatusProps> = ({
  productId,
  showFilters = true,
  maxItems = 100
}) => {
  const { inventory, products, loading: cosmosLoading, error: cosmosError, getInventoryByProduct, getAllInventory } = useCosmosDB();
  const { items: navItems, loading: navLoading, error: navError, getItems } = useNav2017();
  
  const [filter, setFilter] = useState<{
    status: string;
    location: string;
    search: string;
  }>({
    status: 'all',
    location: 'all',
    search: ''
  });
  
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'status' | 'location'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadInventoryData = async () => {
      try {
        if (productId) {
          await getInventoryByProduct(productId);
        } else {
          await getAllInventory();
        }
        await getItems();
      } catch (error) {
        console.error('Error loading inventory data:', error);
      }
    };

    loadInventoryData();
  }, [productId, getInventoryByProduct, getAllInventory, getItems]);

  const inventoryItems = useMemo(() => {
    const items: InventoryItem[] = [];
    
    inventory.forEach((inv: CosmosInventory) => {
      const product = products.find((p: CosmosProduct) => p.id === inv.productId);
      const navItem = navItems.find((item: NAVItem) => item.No === inv.productNumber);
      
      if (product) {
        const availableStock = inv.currentStock - inv.reservedStock;
        let status: InventoryItem['status'] = 'in-stock';
        
        if (availableStock <= 0) {
          status = 'out-of-stock';
        } else if (availableStock <= inv.reorderLevel) {
          status = 'low-stock';
        } else if (availableStock > inv.maxStock) {
          status = 'overstock';
        }

        items.push({
          id: inv.id,
          productNumber: inv.productNumber,
          productName: product.name,
          currentStock: inv.currentStock,
          reservedStock: inv.reservedStock,
          availableStock,
          reorderLevel: inv.reorderLevel,
          maxStock: inv.maxStock,
          location: inv.location,
          lastUpdated: new Date(inv.lastUpdated),
          status,
          navData: navItem
        });
      }
    });

    return items;
  }, [inventory, products, navItems]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = inventoryItems;

    // Apply filters
    if (filter.status !== 'all') {
      filtered = filtered.filter(item => item.status === filter.status);
    }

    if (filter.location !== 'all') {
      filtered = filtered.filter(item => item.location === filter.location);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(searchLower) ||
        item.productNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.productName;
          bValue = b.productName;
          break;
        case 'stock':
          aValue = a.availableStock;
          bValue = b.availableStock;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'location':
          aValue = a.location;
          bValue = b.location;
          break;
        default:
          aValue = a.productName;
          bValue = b.productName;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered.slice(0, maxItems);
  }, [inventoryItems, filter, sortBy, sortOrder, maxItems]);

  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(inventoryItems.map(item => item.location))];
    return uniqueLocations.sort();
  }, [inventoryItems]);

  const statusCounts = useMemo(() => {
    return inventoryItems.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [inventoryItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (productId) {
        await getInventoryByProduct(productId);
      } else {
        await getAllInventory();
      }
      await getItems();
    } catch (error) {
      console.error('Error refreshing inventory:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return '#28a745';
      case 'low-stock': return '#ffc107';
      case 'out-of-stock': return '#dc3545';
      case 'overstock': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: InventoryItem['status']) => {
    switch (status) {
      case 'in-stock': return '✓';
      case 'low-stock': return '⚠';
      case 'out-of-stock': return '✗';
      case 'overstock': return '↑';
      default: return '?';
    }
  };

  if (cosmosLoading || navLoading) {
    return <LoadingSpinner text="Loading inventory data..." />;
  }

  if (cosmosError || navError) {
    return (
      <div className="error-container">
        <h3>Error Loading Inventory</h3>
        <p>{cosmosError || navError}</p>
        <button onClick={handleRefresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="inventory-status">
      <div className="inventory-header">
        <div className="header-content">
          <h2>Inventory Status</h2>
          <div className="header-actions">
            <button 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="btn btn-secondary"
            >
              {refreshing ? <LoadingSpinner size="small" /> : '↻'} Refresh
            </button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="status-summary">
          <div className="status-card">
            <span className="status-label">In Stock</span>
            <span className="status-count" style={{ color: getStatusColor('in-stock') }}>
              {statusCounts['in-stock'] || 0}
            </span>
          </div>
          <div className="status-card">
            <span className="status-label">Low Stock</span>
            <span className="status-count" style={{ color: getStatusColor('low-stock') }}>
              {statusCounts['low-stock'] || 0}
            </span>
          </div>
          <div className="status-card">
            <span className="status-label">Out of Stock</span>
            <span className="status-count" style={{ color: getStatusColor('out-of-stock') }}>
              {statusCounts['out-of-stock'] || 0}
            </span>
          </div>
          <div className="status-card">
            <span className="status-label">Overstock</span>
            <span className="status-count" style={{ color: getStatusColor('overstock') }}>
              {statusCounts['overstock'] || 0}
            </span>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="inventory-filters">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              placeholder="Search products..."
              className="form-control"
            />
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="form-control"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Location:</label>
            <select
              value={filter.location}
              onChange={(e) => setFilter({ ...filter, location: e.target.value })}
              className="form-control"
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="sortable">
                Product {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('location')} className="sortable">
                Location {sortBy === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('stock')} className="sortable">
                Available {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Reserved</th>
              <th>Total</th>
              <th>Reorder Level</th>
              <th onClick={() => handleSort('status')} className="sortable">
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedItems.map((item) => (
              <tr key={item.id} className={`status-${item.status}`}>
                <td>
                  <div className="product-info">
                    <div className="product-name">{item.productName}</div>
                    <div className="product-number">{item.productNumber}</div>
                  </div>
                </td>
                <td>{item.location}</td>
                <td className="stock-cell">
                  <span className={`stock-value ${item.availableStock <= item.reorderLevel ? 'low' : ''}`}>
                    {item.availableStock.toLocaleString()}
                  </span>
                </td>
                <td>{item.reservedStock.toLocaleString()}</td>
                <td>{item.currentStock.toLocaleString()}</td>
                <td>{item.reorderLevel.toLocaleString()}</td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: getStatusColor(item.status),
                      color: 'white'
                    }}
                  >
                    {getStatusIcon(item.status)} {item.status.replace('-', ' ')}
                  </span>
                </td>
                <td>{item.lastUpdated.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedItems.length === 0 && (
          <div className="no-data">
            <p>No inventory items found matching your criteria.</p>
          </div>
        )}
      </div>

      {filteredAndSortedItems.length >= maxItems && (
        <div className="pagination-info">
          Showing first {maxItems} items. Use filters to narrow results.
        </div>
      )}
    </div>
  );
};