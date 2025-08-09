import React, { useState } from 'react';
import { Search, Filter, X, DollarSign } from 'lucide-react';
import { TruckStatus, MaintenanceType, PartCategory, SearchFilters } from '../../types';

interface SearchAndFilterProps {
  onSearch: (query: string) => void;
  onFilter: (filters: SearchFilters) => void;
  onClear: () => void;
  entityType: 'trucks' | 'maintenance' | 'parts';
  currentFilters?: SearchFilters;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearch,
  onFilter,
  onClear,
  entityType,
  currentFilters = {}
}) => {
  const [searchQuery, setSearchQuery] = useState(currentFilters.query || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    onFilter(updatedFilters);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({});
    onClear();
    setShowFilters(false);
  };

  const hasActiveFilters = () => {
    return Object.keys(filters).some(key => {
      const value = filters[key as keyof SearchFilters];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return value !== undefined && value !== '';
    });
  };

  const truckStatuses: TruckStatus[] = ['In Service', 'Out for Repair', 'Needs Attention', 'Retired'];
  const maintenanceTypes: MaintenanceType[] = [
    'Oil Change', 'Tire Replacement', 'Brake Inspection', 'Engine Service',
    'Transmission Service', 'DOT Inspection', 'General Repair', 'Preventive Maintenance',
    'Emergency Repair', 'Annual Inspection', 'Safety Check'
  ];
  const partCategories: PartCategory[] = [
    'Engine', 'Transmission', 'Brakes', 'Tires', 'Electrical',
    'Fluids', 'Filters', 'Body', 'Suspension', 'Other'
  ];

  return (
    <div className="search-and-filter">
      <div className="search-bar">
        <div className="search-input-container" style={{ marginLeft: 0 }}>
          <Search className="search-icon" size={20} style={{ left: 10 }} />
          <input
            type="text"
            placeholder={`Search ${entityType}...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
            style={{ paddingLeft: 36 }}
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery('');
                onSearch('');
              }}
              className="clear-search-btn"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle-btn ${hasActiveFilters() ? 'has-filters' : ''}`}
        >
          <Filter size={20} />
          Filters
          {hasActiveFilters() && <span className="filter-count">{Object.keys(filters).length}</span>}
        </button>

        {hasActiveFilters() && (
          <button onClick={handleClearFilters} className="clear-filters-btn">
            Clear All
          </button>
        )}
      </div>

      {showFilters && (
        <div className="filter-panel">
          {entityType === 'trucks' && (
            <>
              <div className="filter-group">
                <label>Status</label>
                <div className="checkbox-group">
                  {truckStatuses.map(status => (
                    <label key={status} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(status) || false}
                        onChange={(e) => {
                          const currentStatus = filters.status || [];
                          const updatedStatus = e.target.checked
                            ? [...currentStatus, status]
                            : currentStatus.filter(s => s !== status);
                          handleFilterChange('status', updatedStatus);
                        }}
                      />
                      <span className="checkmark"></span>
                      {status}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {entityType === 'maintenance' && (
            <>
              <div className="filter-group">
                <label>Maintenance Type</label>
                <select
                  multiple
                  value={filters.status || []}
                  onChange={(e) => {
                    const selectedTypes = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('status', selectedTypes);
                  }}
                  className="multi-select"
                >
                  {maintenanceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Date Range</label>
                <div className="date-range">
                  <input
                    type="date"
                    value={filters.dateRange?.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const start = e.target.value ? new Date(e.target.value) : undefined;
                      handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        start
                      });
                    }}
                    placeholder="Start date"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={filters.dateRange?.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const end = e.target.value ? new Date(e.target.value) : undefined;
                      handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        end
                      });
                    }}
                    placeholder="End date"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>Cost Range</label>
                <div className="cost-range">
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.costRange?.min || ''}
                      onChange={(e) => {
                        const min = e.target.value ? parseFloat(e.target.value) : undefined;
                        handleFilterChange('costRange', {
                          ...filters.costRange,
                          min
                        });
                      }}
                    />
                  </div>
                  <span>to</span>
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.costRange?.max || ''}
                      onChange={(e) => {
                        const max = e.target.value ? parseFloat(e.target.value) : undefined;
                        handleFilterChange('costRange', {
                          ...filters.costRange,
                          max
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {entityType === 'parts' && (
            <>
              <div className="filter-group">
                <label>Category</label>
                <div className="checkbox-group">
                  {partCategories.map(category => (
                    <label key={category} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(category) || false}
                        onChange={(e) => {
                          const currentCategories = filters.status || [];
                          const updatedCategories = e.target.checked
                            ? [...currentCategories, category]
                            : currentCategories.filter(c => c !== category);
                          handleFilterChange('status', updatedCategories);
                        }}
                      />
                      <span className="checkmark"></span>
                      {category}
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <label>Stock Status</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.tags?.includes('low-stock') || false}
                      onChange={(e) => {
                        const currentTags = filters.tags || [];
                        const updatedTags = e.target.checked
                          ? [...currentTags, 'low-stock']
                          : currentTags.filter(t => t !== 'low-stock');
                        handleFilterChange('tags', updatedTags);
                      }}
                    />
                    <span className="checkmark"></span>
                    Low Stock Only
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.tags?.includes('out-of-stock') || false}
                      onChange={(e) => {
                        const currentTags = filters.tags || [];
                        const updatedTags = e.target.checked
                          ? [...currentTags, 'out-of-stock']
                          : currentTags.filter(t => t !== 'out-of-stock');
                        handleFilterChange('tags', updatedTags);
                      }}
                    />
                    <span className="checkmark"></span>
                    Out of Stock
                  </label>
                </div>
              </div>

              <div className="filter-group">
                <label>Cost Range</label>
                <div className="cost-range">
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.costRange?.min || ''}
                      onChange={(e) => {
                        const min = e.target.value ? parseFloat(e.target.value) : undefined;
                        handleFilterChange('costRange', {
                          ...filters.costRange,
                          min
                        });
                      }}
                    />
                  </div>
                  <span>to</span>
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.costRange?.max || ''}
                      onChange={(e) => {
                        const max = e.target.value ? parseFloat(e.target.value) : undefined;
                        handleFilterChange('costRange', {
                          ...filters.costRange,
                          max
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
