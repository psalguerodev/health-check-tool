'use client';

import { useState } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { useParameterStore } from '../context/ParameterStoreContext';

interface ParameterSelectProps {
  category: 'database' | 'api' | 'aws' | 'general';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  showToggle?: boolean;
  useParameter?: boolean;
  onToggleParameter?: (useParameter: boolean) => void;
}

export default function ParameterSelect({
  category,
  placeholder = 'Seleccionar parámetro',
  value,
  onChange,
  className = '',
  showToggle = false,
  useParameter = false,
  onToggleParameter,
}: ParameterSelectProps) {
  const { getParametersByCategory } = useParameterStore();
  const [isOpen, setIsOpen] = useState(false);

  const parameters = getParametersByCategory(category);

  const handleSelect = (param: any) => {
    onChange(param.value);
    setIsOpen(false);
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Toggle para usar parámetros */}
      {showToggle && (
        <div className="flex items-center space-x-2 mb-2">
          <label className="flex items-center space-x-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={useParameter}
              onChange={(e) => onToggleParameter?.(e.target.checked)}
              className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span>Usar parámetro del Parameter Store</span>
          </label>
        </div>
      )}

      {useParameter ? (
        <div className="flex">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleManualInput}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-l"
            readOnly
          />
          {parameters.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="px-2 py-1 text-xs border border-l-0 border-gray-300 rounded-r hover:bg-gray-50"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleManualInput}
          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
        />
      )}

      {isOpen && parameters.length > 0 && useParameter && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto">
          <div className="p-2 border-b border-gray-200">
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <Settings className="w-3 h-3" />
              <span>
                Parámetros {category} ({parameters.length})
              </span>
            </div>
          </div>
          {parameters.map((param) => (
            <button
              key={param.id}
              onClick={() => handleSelect(param)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-800">{param.name}</span>
                {param.type === 'secure' && (
                  <span className="text-xs text-orange-600 bg-orange-100 px-1 rounded">
                    Seguro
                  </span>
                )}
              </div>
              <div className="text-gray-500 truncate mt-1">
                {param.type === 'secure' ? '••••••••' : param.value}
              </div>
              {param.description && (
                <div className="text-gray-400 text-xs mt-1">
                  {param.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
