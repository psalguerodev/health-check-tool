'use client';

import { useState, useEffect } from 'react';
import { X, Search, FileText, Lock, Unlock } from 'lucide-react';
import { useParameterStore, Parameter } from '../context/ParameterStoreContext';

interface ParameterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (parameter: Parameter) => void;
  category?: Parameter['category'] | 'all';
  title?: string;
}

export default function ParameterSelectorModal({
  isOpen,
  onClose,
  onSelect,
  category = 'all',
  title = 'Seleccionar Parámetro',
}: ParameterSelectorModalProps) {
  const { parameters } = useParameterStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const filteredParameters = parameters.filter(
    (param) =>
      param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (parameter: Parameter) => {
    onSelect(parameter);
    onClose();
  };

  const toggleValueVisibility = (paramId: string) => {
    setShowValues((prev) => ({ ...prev, [paramId]: !prev[paramId] }));
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <span className="text-sm text-gray-500">
              ({filteredParameters.length} variables locales)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar variables locales..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Lista de parámetros */}
        <div className="p-2 overflow-y-auto max-h-96">
          {filteredParameters.length === 0 ? (
            <div className="text-center text-gray-400 py-6">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No se encontraron variables locales</p>
              <p className="text-xs mb-3">
                {searchTerm
                  ? 'Intenta cambiar los términos de búsqueda'
                  : 'No hay variables locales guardadas'}
              </p>
              {!searchTerm && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Para agregar variables locales, ve al botón flotante
                    "Variables Locales"
                  </p>
                  <button
                    onClick={onClose}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Ir a Variables Locales
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredParameters.map((param) => (
                <div
                  key={param.id}
                  className="p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors group"
                  onClick={() => handleSelect(param)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 truncate">
                          {param.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
                          {param.category}
                        </span>
                        {param.type === 'secure' && (
                          <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                            🔒
                          </span>
                        )}
                        <span className="text-xs text-gray-400 group-hover:text-blue-600">
                          ← Click para seleccionar
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {param.type === 'secure' ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type={showValues[param.id] ? 'text' : 'password'}
                              value={param.value}
                              readOnly
                              className="text-xs bg-transparent border-none outline-none text-gray-600 truncate"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleValueVisibility(param.id);
                              }}
                              className="p-0.5 hover:bg-gray-200 rounded"
                            >
                              {showValues[param.id] ? (
                                <Unlock className="w-3 h-3 text-gray-400" />
                              ) : (
                                <Lock className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 truncate">
                            {param.value}
                          </span>
                        )}
                      </div>

                      {param.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {param.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Selecciona una variable local para usarla en tu configuración
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
