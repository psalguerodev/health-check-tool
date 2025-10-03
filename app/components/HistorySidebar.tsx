'use client';

import { useState } from 'react';
import {
  History,
  Download,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
  Globe,
  MessageSquare,
  Activity,
  Terminal,
  Container,
  Filter,
} from 'lucide-react';
import { useTestHistoryContext } from '../context/TestHistoryContext';
import { useGlobalHistory } from '../context/GlobalHistoryContext';
import { TestHistoryItem } from '../hooks/useTestHistory';
import { useEffect } from 'react';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  historyKey?: string;
  showSectionFilter?: boolean;
}

export default function HistorySidebar({
  isOpen,
  onClose,
  historyKey = 'healthCheckHistory',
  showSectionFilter = false,
}: HistorySidebarProps) {
  const { history, clearHistory, exportToCSV, refreshHistory } =
    useTestHistoryContext();
  const { allHistory, refreshAllHistory, clearAllHistory, exportAllHistory } =
    useGlobalHistory();
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all');
  const [sectionFilter, setSectionFilter] = useState<
    'all' | 'health' | 'kernel' | 'camel'
  >('all');

  // Refrescar historial cuando se abra el sidebar
  useEffect(() => {
    if (isOpen) {
      refreshHistory();
      refreshAllHistory();
    }
  }, [isOpen]); // Removido refreshHistory de las dependencias

  const getIcon = (type: string) => {
    switch (type) {
      case 'DB2':
      case 'PostgreSQL':
        return <Database className="w-4 h-4" />;
      case 'SQL Server':
        return <Server className="w-4 h-4" />;
      case 'AWS SQS':
        return <MessageSquare className="w-4 h-4" />;
      case 'HTTP':
        return <Globe className="w-4 h-4" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  // Usar historial global si showSectionFilter está activado, sino usar historial local
  const currentHistory = showSectionFilter ? allHistory : history;

  const filteredHistory = currentHistory.filter((item) => {
    // Filtro por estado (success/error)
    if (filter === 'success' && !item.success) return false;
    if (filter === 'error' && item.success) return false;

    // Filtro por sección
    if (showSectionFilter && sectionFilter !== 'all') {
      const itemSection = item.section || 'health'; // Por defecto health si no tiene sección
      if (sectionFilter !== itemSection) return false;
    }

    return true;
  });

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Historial de Pruebas
              </h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs rounded ${
                  filter === 'all'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Todas ({currentHistory.length})
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`px-3 py-1 text-xs rounded ${
                  filter === 'success'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <CheckCircle className="w-3 h-3 inline mr-1" />
                Éxito ({currentHistory.filter((h) => h.success).length})
              </button>
              <button
                onClick={() => setFilter('error')}
                className={`px-3 py-1 text-xs rounded ${
                  filter === 'error'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <XCircle className="w-3 h-3 inline mr-1" />
                Error ({currentHistory.filter((h) => !h.success).length})
              </button>
            </div>

            {/* Filtro por sección */}
            {showSectionFilter && (
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSectionFilter('all')}
                    className={`flex items-center space-x-1 px-3 py-1 text-xs rounded ${
                      sectionFilter === 'all'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>Todos</span>
                  </button>
                  <button
                    onClick={() => setSectionFilter('health')}
                    className={`flex items-center space-x-1 px-3 py-1 text-xs rounded ${
                      sectionFilter === 'health'
                        ? 'bg-green-200 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    <span>Health</span>
                  </button>
                  <button
                    onClick={() => setSectionFilter('kernel')}
                    className={`flex items-center space-x-1 px-3 py-1 text-xs rounded ${
                      sectionFilter === 'kernel'
                        ? 'bg-purple-200 text-purple-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Kernel</span>
                  </button>
                  <button
                    onClick={() => setSectionFilter('camel')}
                    className={`flex items-center space-x-1 px-3 py-1 text-xs rounded ${
                      sectionFilter === 'camel'
                        ? 'bg-orange-200 text-orange-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Container className="w-3 h-3" />
                    <span>Camel</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={showSectionFilter ? exportAllHistory : exportToCSV}
                disabled={currentHistory.length === 0}
                className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3 h-3" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={showSectionFilter ? clearAllHistory : clearHistory}
                disabled={currentHistory.length === 0}
                className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay pruebas registradas</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded border text-xs ${
                      item.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getIcon(item.type)}
                        <span className="font-medium text-gray-900">
                          {item.type}
                        </span>
                        {item.success ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{item.duration}ms</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-gray-600">
                      <div>
                        <strong>Host/URL:</strong> {item.url || item.host}
                        {item.port && `:${item.port}`}
                      </div>
                      {item.database && (
                        <div>
                          <strong>Base de datos:</strong> {item.database}
                        </div>
                      )}
                      {item.region && (
                        <div>
                          <strong>Región:</strong> {item.region}
                        </div>
                      )}
                      {item.queueUrl && (
                        <div>
                          <strong>Cola:</strong> {item.queueUrl}
                        </div>
                      )}
                      {item.endpoint && (
                        <div>
                          <strong>Endpoint:</strong> {item.endpoint}
                        </div>
                      )}
                      {item.method && (
                        <div>
                          <strong>Método:</strong> {item.method}
                        </div>
                      )}
                      {item.command && (
                        <div>
                          <strong>Comando:</strong>{' '}
                          <code className="bg-gray-100 px-1 rounded text-xs">
                            {item.command}
                          </code>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 p-2 bg-white rounded border">
                      <p className="text-xs text-gray-700">{item.message}</p>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      {item.timestamp.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
