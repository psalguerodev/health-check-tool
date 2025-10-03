'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import ResultActions from './ResultActions';
import { useTestHistory } from '../hooks/useTestHistory';
import ParameterSelectorLink from './ParameterSelectorLink';
import { Parameter } from '../context/ParameterStoreContext';

export default function SQLServerCard() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('1433');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedHostParam, setSelectedHostParam] = useState<Parameter | null>(
    null
  );
  const [selectedDatabaseParam, setSelectedDatabaseParam] =
    useState<Parameter | null>(null);
  const [selectedUsernameParam, setSelectedUsernameParam] =
    useState<Parameter | null>(null);
  const [selectedPasswordParam, setSelectedPasswordParam] =
    useState<Parameter | null>(null);
  const { addTestResult } = useTestHistory('healthCheckHistory');

  const resetForm = () => {
    setHost('');
    setPort('1433');
    setDatabase('');
    setUsername('');
    setPassword('');
    setResult(null);
    setSelectedHostParam(null);
    setSelectedDatabaseParam(null);
    setSelectedUsernameParam(null);
    setSelectedPasswordParam(null);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SQLServer',
          config: { host, port: parseInt(port), database, username, password },
        }),
      });

      const data = await response.json();
      setResult(data);

      // Guardar en historial
      addTestResult({
        type: 'SQL Server',
        url: host,
        host: host,
        port: parseInt(port),
        database: database,
        success: data.success,
        message: data.message,
        duration: data.duration || 0,
        timestamp: new Date(),
      });
    } catch (error) {
      const errorResult = {
        success: false,
        message: 'Error de conexión',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
      setResult(errorResult);

      // Guardar error en historial
      addTestResult({
        type: 'SQL Server',
        url: host,
        host: host,
        port: parseInt(port),
        database: database,
        success: false,
        message: errorResult.message,
        duration: 0,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700">
          Configuración SQL Server
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ParameterSelectorLink
          category="database"
          placeholder="Host"
          value={host}
          onChange={setHost}
          onSelect={setSelectedHostParam}
          className="flex-1"
        />
        <input
          type="number"
          placeholder="Puerto"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="px-2 py-1 text-xs border border-gray-300 rounded"
        />
      </div>
      <ParameterSelectorLink
        category="database"
        placeholder="Base de datos"
        value={database}
        onChange={setDatabase}
        onSelect={setSelectedDatabaseParam}
        className="w-full"
      />
      <div className="grid grid-cols-2 gap-2">
        <ParameterSelectorLink
          category="database"
          placeholder="Usuario"
          value={username}
          onChange={setUsername}
          onSelect={setSelectedUsernameParam}
          className="flex-1"
        />
        <ParameterSelectorLink
          category="database"
          placeholder="Contraseña"
          value={password}
          onChange={setPassword}
          onSelect={setSelectedPasswordParam}
          className="flex-1"
          isPassword={true}
        />
      </div>

      <div className="flex justify-end items-center space-x-2">
        <button
          onClick={testConnection}
          disabled={isLoading || !host || !database || !username || !password}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Probando...' : 'Probar'}
        </button>
        <button
          onClick={resetForm}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Resetear
        </button>
      </div>

      {result && (
        <div
          className={`p-2 rounded text-xs ${
            result.success
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1">
              {result.success ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              <span className="font-medium">
                {result.success ? 'Conexión exitosa' : 'Error de conexión'}
              </span>
              {result.duration && (
                <span className="text-gray-500">({result.duration}ms)</span>
              )}
            </div>
            <ResultActions
              content={result.message}
              filename={`sqlserver_${result.success ? 'success' : 'error'}`}
            />
          </div>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
