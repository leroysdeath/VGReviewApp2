import React from 'react';
import { X } from 'lucide-react';

interface ActiveFiltersProps {
  filters: string[];
  onRemoveFilter: (filter: string) => void;
  onClearAll: () => void;
  className?: string;
}

export const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
  className = ''
}) => {
  if (filters.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Active Filters</h3>
        <button
          onClick={onClearAll}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          aria-label="Clear all filters"
        >
          Clear All
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.map((filter, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 rounded-full text-sm text-white group"
          >
            <span>{filter}</span>
            <button
              onClick={() => onRemoveFilter(filter)}
              className="p-0.5 rounded-full text-gray-400 group-hover:text-white transition-colors"
              aria-label={`Remove filter: ${filter}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};