'use client';

import { useState } from 'react';
import { ConnectionTest, TestResult } from '../types';
import {
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
  Globe,
  MessageSquare,
  Wifi,
} from 'lucide-react';
import ResultActions from './ResultActions';

interface ConnectionCardProps {
  test: ConnectionTest;
  onResult: (testId: string, result: TestResult) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'DB2':
      return <Database className="w-5 h-5" />;
    case 'SQLServer':
      return <Server className="w-5 h-5" />;
    case 'PostgreSQL':
      return <Database className="w-5 h-5" />;
    case 'SQS':
      return <MessageSquare className="w-5 h-5" />;
    case 'HTTP':
      return <Globe className="w-5 h-5" />;
    default:
      return <Wifi className="w-5 h-5" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'pending':
      return <Clock className="w-5 h-5 text-orange-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

export default function ConnectionCard({
  test,
  onResult,
}: ConnectionCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    onResult(test.id, {
      success: false,
      message: 'Ejecutando prueba...',
      timestamp: new Date(),
    });

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: test.type,
          config: test.config,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TestResult = await response.json();
      onResult(test.id, result);
    } catch (error: any) {
      onResult(test.id, {
        success: false,
        message: `Error inesperado: ${error.message}`,
        error: error.message,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-gray-300 bg-white">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getIcon(test.type)}
            <span className="font-medium text-sm">{test.name}</span>
            <span className="text-xs text-gray-500">({test.type})</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(test.status)}
            <button
              onClick={runTest}
              disabled={isLoading}
              className="px-2 py-1 text-xs bg-wiki-blue text-white hover:bg-wiki-lightblue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Probando...' : 'Probar'}
            </button>
          </div>
        </div>
      </div>

      {test.result && (
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              {getStatusIcon(test.result.success ? 'success' : 'error')}
              <span
                className={`text-xs font-medium ${
                  test.result.success ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {test.result.success ? 'Éxito' : 'Error'}
              </span>
              {test.result.duration && (
                <span className="text-xs text-gray-500">
                  ({test.result.duration}ms)
                </span>
              )}
            </div>
            <ResultActions
              content={`${test.result.message}${
                test.result.error ? '\n\nDetalles:\n' + test.result.error : ''
              }`}
              filename={`${test.type}_${
                test.result.success ? 'success' : 'error'
              }`}
            />
          </div>
          <p className="text-xs text-gray-700 mb-1">{test.result.message}</p>
          {test.result.error && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                Ver detalles
              </summary>
              <pre className="mt-1 p-2 bg-gray-100 border rounded text-xs overflow-auto">
                {test.result.error}
              </pre>
            </details>
          )}
          <p className="text-xs text-gray-500">
            {test.result.timestamp.toLocaleString()}
          </p>
        </div>
      )}

      <div className="p-3">
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            Ver configuración
          </summary>
          <div className="mt-1 p-2 bg-gray-50 border rounded">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(test.config, null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </div>
  );
}
