'use client';

import { useState } from 'react';
import { Clock, Database } from 'lucide-react';
import { useTestHistory } from '../hooks/useTestHistory';
import ParameterSelectorLink from './ParameterSelectorLink';
import TestResultCard from './TestResultCard';
import { Parameter } from '../context/ParameterStoreContext';

export default function DB2Card() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('50000');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(false);
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
    setPort('50000');
    setDatabase('');
    setUsername('');
    setPassword('');
    setSsl(false);
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
          type: 'DB2',
          config: {
            host,
            port: parseInt(port),
            database,
            username,
            password,
            ssl,
          },
        }),
      });

      const data = await response.json();
      setResult(data);

      // Guardar en historial
      addTestResult({
        type: 'DB2',
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
        type: 'DB2',
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
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 relative">
            <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
              Configuración DB2
            </span>
            <div className="absolute -bottom-1 left-0 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
          </h3>
        </div>
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
          className="px-3 py-2 text-sm border border-gray-300 rounded"
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
      <label className="flex items-center text-xs">
        <input
          type="checkbox"
          checked={ssl}
          onChange={(e) => setSsl(e.target.checked)}
          className="mr-1"
        />
        Usar SSL
      </label>
      <div className="flex justify-end items-center space-x-2">
        <button
          onClick={testConnection}
          disabled={isLoading || !host || !database || !username || !password}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Probando...' : 'Probar Conexión'}
        </button>
        <button
          onClick={resetForm}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
        >
          Resetear
        </button>
      </div>
      {result && <TestResultCard result={result} showResponse={false} />}
    </div>
  );
}
