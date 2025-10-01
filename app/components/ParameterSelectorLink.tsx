'use client';

import { useState } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { useParameterStore, Parameter } from '../context/ParameterStoreContext';
import ParameterSelectorModal from './ParameterSelectorModal';

interface ParameterSelectorLinkProps {
  category: Parameter['category'] | 'all';
  onSelect: (parameter: Parameter) => void;
  className?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  isPassword?: boolean;
}

export default function ParameterSelectorLink({
  category,
  onSelect,
  className = '',
  placeholder = 'Escribir valor manualmente',
  value,
  onChange,
  multiline = false,
  rows = 3,
  isPassword = false,
}: ParameterSelectorLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { getParametersByCategory } = useParameterStore();

  const parameters =
    category === 'all' ? [] : getParametersByCategory(category);
  const hasParameters = parameters.length > 0;

  const handleParameterSelect = (parameter: Parameter) => {
    onChange(parameter.value);
    onSelect(parameter);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input principal con icono */}
      <div className="relative">
        {multiline ? (
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full px-2 py-1 pr-8 text-xs border border-gray-300 rounded resize-none"
          />
        ) : (
          <input
            type={isPassword && !showPassword ? 'password' : 'text'}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 pr-16 text-xs border border-gray-300 rounded"
          />
        )}

        {/* Botones de acción */}
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
          {/* Botón de mostrar/ocultar contraseña */}
          {isPassword && (
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Botón de Parameter Store */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title={
              hasParameters
                ? `Elegir desde Parameter Store (${parameters.length})`
                : 'Ver Parameter Store (vacío)'
            }
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Modal */}
      <ParameterSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleParameterSelect}
        category={category}
        title={`Seleccionar Parámetro - ${
          category === 'all' ? 'Todos' : category
        }`}
      />
    </div>
  );
}
