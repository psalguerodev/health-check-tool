'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface AWSCredentialsConfigProps {
  onCredentialsUpdated?: (credentials: string | null) => void;
}

export default function AWSCredentialsConfig({
  onCredentialsUpdated,
}: AWSCredentialsConfigProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [credentialsContent, setCredentialsContent] = useState('');
  const [useLocalStorage, setUseLocalStorage] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Cargar credenciales al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadCredentials();
    }
  }, [isOpen]);

  const loadCredentials = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      if (useLocalStorage) {
        // Cargar desde localStorage
        const stored = localStorage.getItem('aws-credentials-export');
        if (stored) {
          setCredentialsContent(stored);
          setMessage({
            type: 'info',
            text: 'Variables de entorno cargadas desde localStorage',
          });
        } else {
          setCredentialsContent('');
          setMessage({
            type: 'info',
            text: 'No hay variables de entorno guardadas',
          });
        }
      } else {
        // Cargar desde memoria global
        const globalCredentials = (window as any).awsCredentialsExport;
        if (globalCredentials) {
          setCredentialsContent(globalCredentials);
          setMessage({
            type: 'info',
            text: 'Variables de entorno cargadas desde memoria',
          });
        } else {
          setCredentialsContent('');
          setMessage({
            type: 'info',
            text: 'No hay variables de entorno en memoria',
          });
        }
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al cargar variables de entorno',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      if (useLocalStorage) {
        // Guardar en localStorage
        localStorage.setItem('aws-credentials-export', credentialsContent);
        setMessage({
          type: 'success',
          text: 'Variables de entorno guardadas en localStorage',
        });
      } else {
        // Guardar en memoria global
        (window as any).awsCredentialsExport = credentialsContent;
        setMessage({
          type: 'success',
          text: 'Variables de entorno guardadas en memoria',
        });
      }

      // Notificar que las credenciales se actualizaron
      if (onCredentialsUpdated) {
        onCredentialsUpdated(
          credentialsContent.trim() ? credentialsContent : null
        );
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error al guardar variables de entorno',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Botón para abrir configuración */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center space-x-1.5"
        title="Configurar variables de entorno"
      >
        <Settings className="w-3.5 h-3.5" />
        <span>Variables</span>
      </button>

      {/* Modal de configuración */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Variables de Entorno
                  </h2>
                  <p className="text-sm text-gray-500">
                    Configura las variables de entorno para exportar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Mensaje de estado */}
              {message && (
                <div
                  className={`p-4 rounded-lg border flex items-center space-x-3 ${
                    message.type === 'success'
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : message.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}
                >
                  {message.type === 'success' && (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  {message.type === 'error' && <XCircle className="w-5 h-5" />}
                  {message.type === 'info' && (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </div>
              )}

              {/* Opción de almacenamiento */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Almacenamiento
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {useLocalStorage
                        ? 'Persistente en el navegador'
                        : 'Temporal en memoria'}
                    </p>
                  </div>
                  <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                    <button
                      onClick={() => setUseLocalStorage(true)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        useLocalStorage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Persistente
                    </button>
                    <button
                      onClick={() => setUseLocalStorage(false)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        !useLocalStorage
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Temporal
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor de variables de entorno */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variables de Entorno
                  </label>
                  <textarea
                    value={credentialsContent}
                    onChange={(e) => setCredentialsContent(e.target.value)}
                    placeholder={`AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_SESSION_TOKEN="FwoGZXIvYXdzEB8a..."`}
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    spellCheck={false}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pega aquí las variables de entorno que quieres exportar.
                    Deben estar en formato: <code>VARIABLE="valor"</code> (el
                    export se agrega automáticamente)
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end pt-4 border-t border-gray-200 space-x-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCredentials}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
