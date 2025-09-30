'use client';

import React, { useState } from 'react';
import {
  Cloud,
  Download,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react';

interface AWSParameter {
  name: string;
  value: string;
  type: string;
  description?: string;
  version?: number;
  lastModifiedDate?: Date;
}

interface AWSParameterStoreConfigProps {
  onParametersLoaded: (parameters: AWSParameter[]) => void;
}

export default function AWSParameterStoreConfig({
  onParametersLoaded,
}: AWSParameterStoreConfigProps) {
  const [credentials, setCredentials] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    region: 'us-east-1',
  });
  const [path, setPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [parameters, setParameters] = useState<AWSParameter[]>([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<any>(null);

  // Cargar credenciales guardadas al inicio
  React.useEffect(() => {
    const saved = localStorage.getItem('awsCredentials');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedCredentials(parsed);
      setCredentials(parsed);
    }
  }, []);

  // Guardar credenciales si está marcado
  React.useEffect(() => {
    if (
      saveCredentials &&
      credentials.accessKeyId &&
      credentials.secretAccessKey
    ) {
      localStorage.setItem('awsCredentials', JSON.stringify(credentials));
      setSavedCredentials(credentials);
    }
  }, [saveCredentials, credentials]);

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/aws-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          credentials,
          path,
        }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setParameters(data.parameters);
        onParametersLoaded(data.parameters);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Error de conexión',
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedCredentials = () => {
    if (savedCredentials) {
      setCredentials(savedCredentials);
    }
  };

  const clearCredentials = () => {
    setCredentials({
      accessKeyId: '',
      secretAccessKey: '',
      region: 'us-east-1',
    });
    setPath('/');
    localStorage.removeItem('awsCredentials');
    setSavedCredentials(null);
  };

  const getParameterValue = async (parameterName: string) => {
    try {
      const response = await fetch('/api/aws-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get',
          credentials,
          parameterName,
        }),
      });

      const data = await response.json();
      return data.success ? data.parameter : null;
    } catch (error) {
      console.error('Error al obtener parámetro:', error);
      return null;
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Cloud className="w-5 h-5 text-orange-600" />
          <h3 className="text-sm font-medium text-gray-900">
            AWS Parameter Store
          </h3>
        </div>
        <button
          onClick={() => setShowCredentials(!showCredentials)}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          <Settings className="w-3 h-3" />
          <span>{showCredentials ? 'Ocultar' : 'Configurar'}</span>
        </button>
      </div>

      {/* Configuración de credenciales */}
      {showCredentials && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <h4 className="text-xs font-medium mb-2 text-gray-700">
            Credenciales AWS
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Access Key ID"
              value={credentials.accessKeyId}
              onChange={(e) =>
                setCredentials({ ...credentials, accessKeyId: e.target.value })
              }
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <input
              type="password"
              placeholder="Secret Access Key"
              value={credentials.secretAccessKey}
              onChange={(e) =>
                setCredentials({
                  ...credentials,
                  secretAccessKey: e.target.value,
                })
              }
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Región"
                value={credentials.region}
                onChange={(e) =>
                  setCredentials({ ...credentials, region: e.target.value })
                }
                className="px-2 py-1 text-xs border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="Path (ej: /app/prod)"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded"
              />
            </div>

            {/* Opciones de credenciales */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <label className="flex items-center space-x-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span>Guardar credenciales</span>
              </label>

              {savedCredentials && (
                <div className="flex space-x-1">
                  <button
                    onClick={loadSavedCredentials}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    title="Cargar credenciales guardadas"
                  >
                    Recargar
                  </button>
                  <button
                    onClick={clearCredentials}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Limpiar credenciales"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botón de conexión */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={testConnection}
          disabled={
            isLoading ||
            !credentials.accessKeyId ||
            !credentials.secretAccessKey
          }
          className="flex items-center space-x-1 px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          <span>{isLoading ? 'Conectando...' : 'Listar Parámetros'}</span>
        </button>
      </div>

      {/* Resultado de la conexión */}
      {result && (
        <div
          className={`p-3 rounded text-xs mb-4 ${
            result.success
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center space-x-1 mb-1">
            {result.success ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <XCircle className="w-3 h-3" />
            )}
            <span className="font-medium">
              {result.success ? 'Conexión exitosa' : 'Error de conexión'}
            </span>
          </div>
          <p>{result.message}</p>
          {result.parameters && (
            <p className="mt-1 text-gray-600">
              {result.parameters.length} parámetros encontrados
            </p>
          )}
        </div>
      )}

      {/* Lista de parámetros */}
      {parameters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">
            Parámetros encontrados ({parameters.length})
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {parameters.map((param, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 rounded border text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {param.name}
                    </div>
                    <div className="text-gray-600 mt-1">
                      {param.type === 'SecureString' ? '••••••••' : param.value}
                    </div>
                    {param.description && (
                      <div className="text-gray-500 mt-1">
                        {param.description}
                      </div>
                    )}
                    <div className="text-gray-400 mt-1">
                      Tipo: {param.type} | Versión: {param.version}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
