'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Database,
  Globe,
  Cloud,
  FileText,
  X,
} from 'lucide-react';
import { useParameterStore, Parameter } from '../context/ParameterStoreContext';
import AWSParameterStoreConfig from './AWSParameterStoreConfig';

export default function ParameterStoreModule() {
  const {
    parameters,
    addParameter,
    updateParameter,
    deleteParameter,
    getParametersByCategory,
  } = useParameterStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingParam, setEditingParam] = useState<Parameter | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [showAWSConfig, setShowAWSConfig] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: 'string' as Parameter['type'],
    description: '',
    category: 'general' as Parameter['category'],
  });

  // Escuchar evento para abrir el modal desde otros componentes
  useEffect(() => {
    const handleOpenParameterStore = () => {
      setIsOpen(true);
      setShowForm(true); // Abrir directamente el formulario de nueva variable
    };

    window.addEventListener('openParameterStore', handleOpenParameterStore);

    return () => {
      window.removeEventListener(
        'openParameterStore',
        handleOpenParameterStore
      );
    };
  }, []);

  const getCategoryIcon = (category: Parameter['category']) => {
    switch (category) {
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'api':
        return <Globe className="w-4 h-4" />;
      case 'aws':
        return <Cloud className="w-4 h-4" />;
      case 'general':
        return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: Parameter['category']) => {
    switch (category) {
      case 'database':
        return 'bg-blue-100 text-blue-700';
      case 'api':
        return 'bg-green-100 text-green-700';
      case 'aws':
        return 'bg-orange-100 text-orange-700';
      case 'general':
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingParam) {
      updateParameter(editingParam.id, formData);
      setEditingParam(null);
    } else {
      addParameter(formData);
    }
    setFormData({
      name: '',
      value: '',
      type: 'string',
      description: '',
      category: 'general',
    });
    setShowForm(false);
  };

  const handleEdit = (param: Parameter) => {
    setEditingParam(param);
    setFormData({
      name: param.name,
      value: param.value,
      type: param.type,
      description: param.description || '',
      category: param.category,
    });
    setShowForm(true);
  };

  const toggleValueVisibility = (paramId: string) => {
    setShowValues((prev) => ({ ...prev, [paramId]: !prev[paramId] }));
  };

  const categories: Parameter['category'][] = [
    'database',
    'api',
    'aws',
    'general',
  ];

  return (
    <>
      {/* Botón flotante para abrir modal */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Variables Locales</span>
          <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full">
            {parameters.length}
          </span>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-16">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Variables Locales
                </h2>
                <span className="text-sm text-gray-500">
                  ({parameters.length} parámetros locales)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAWSConfig(!showAWSConfig)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  <Cloud className="w-3 h-3" />
                  <span>AWS</span>
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar Local</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Configuración AWS Parameter Store */}
              {showAWSConfig && (
                <div className="mb-6">
                  <AWSParameterStoreConfig
                    onParametersLoaded={(awsParams) => {
                      // Convertir parámetros de AWS a formato local
                      awsParams.forEach((param) => {
                        const paramName =
                          param.name.split('/').pop() || param.name;
                        const existingParam = parameters.find(
                          (p) => p.name === paramName
                        );

                        if (existingParam) {
                          // Actualizar parámetro existente
                          updateParameter(existingParam.id, {
                            value: param.value,
                            type:
                              param.type === 'SecureString'
                                ? 'secure'
                                : 'string',
                            description:
                              param.description ||
                              `AWS Parameter: ${param.name}`,
                          });
                        } else {
                          // Crear nuevo parámetro solo si no existe
                          addParameter({
                            name: paramName,
                            value: param.value,
                            type:
                              param.type === 'SecureString'
                                ? 'secure'
                                : 'string',
                            description:
                              param.description ||
                              `AWS Parameter: ${param.name}`,
                            category: 'general',
                          });
                        }
                      });
                    }}
                  />
                </div>
              )}

              {/* Formulario */}
              {showForm && (
                <div className="bg-gray-50 p-4 rounded border mb-6">
                  <h3 className="text-sm font-medium mb-3">
                    {editingParam
                      ? 'Editar Variable Local'
                      : 'Nueva Variable Local'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre del parámetro"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                        required
                      />
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category: e.target.value as Parameter['category'],
                          })
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        <option value="general">General</option>
                        <option value="database">Base de Datos</option>
                        <option value="api">API</option>
                        <option value="aws">AWS</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Valor"
                        value={formData.value}
                        onChange={(e) =>
                          setFormData({ ...formData, value: e.target.value })
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                        required
                      />
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as Parameter['type'],
                          })
                        }
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        <option value="string">Texto</option>
                        <option value="secure">Seguro</option>
                        <option value="list">Lista</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Descripción (opcional)"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                    />

                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {editingParam ? 'Actualizar Local' : 'Agregar Local'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForm(false);
                          setEditingParam(null);
                          setFormData({
                            name: '',
                            value: '',
                            type: 'string',
                            description: '',
                            category: 'general',
                          });
                        }}
                        className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Lista de parámetros por categoría */}
              {categories.map((category) => {
                const categoryParams = getParametersByCategory(category);
                if (categoryParams.length === 0) return null;

                return (
                  <div key={category} className="bg-white rounded border mb-4">
                    <div className="flex items-center space-x-2 p-3 border-b border-gray-200">
                      {getCategoryIcon(category)}
                      <h4 className="text-sm font-medium capitalize">
                        {category}
                      </h4>
                      <span className="text-xs text-gray-500">
                        ({categoryParams.length})
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      {categoryParams.map((param) => (
                        <div
                          key={param.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-medium">
                                {param.name}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded ${getCategoryColor(
                                  param.category
                                )}`}
                              >
                                {param.type}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              {param.type === 'secure' ? (
                                <div className="flex items-center space-x-1">
                                  <input
                                    type={
                                      showValues[param.id] ? 'text' : 'password'
                                    }
                                    value={param.value}
                                    readOnly
                                    className="text-xs bg-transparent border-none outline-none"
                                  />
                                  <button
                                    onClick={() =>
                                      toggleValueVisibility(param.id)
                                    }
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    {showValues[param.id] ? (
                                      <EyeOff className="w-3 h-3" />
                                    ) : (
                                      <Eye className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600">
                                  {param.value}
                                </span>
                              )}
                            </div>
                            {param.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {param.description}
                              </p>
                            )}
                          </div>

                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleEdit(param)}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteParameter(param.id)}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
