'use client';

import { useState } from 'react';
import { Terminal, CheckCircle, XCircle } from 'lucide-react';
import { useTestHistory } from '../hooks/useTestHistory';
import ParameterSelectorLink from './ParameterSelectorLink';
import TestResultCard from './TestResultCard';
import { Parameter } from '../context/ParameterStoreContext';

export default function TelnetCard() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('23');
  const [timeout, setTimeout] = useState('5000');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedHostParam, setSelectedHostParam] = useState<Parameter | null>(
    null
  );
  const [selectedPortParam, setSelectedPortParam] = useState<Parameter | null>(
    null
  );
  const [selectedTimeoutParam, setSelectedTimeoutParam] =
    useState<Parameter | null>(null);

  // Estados para modo bulk
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkHosts, setBulkHosts] = useState('');
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const { addTestResult } = useTestHistory('healthCheckHistory');

  const resetForm = () => {
    // Cancelar proceso en curso si existe
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

    setHost('');
    setPort('23');
    setTimeout('5000');
    setResult(null);
    setSelectedHostParam(null);
    setSelectedPortParam(null);
    setSelectedTimeoutParam(null);
    setBulkHosts('');
    setBulkResults([]);
    setBulkProgress({ current: 0, total: 0 });
    setIsLoading(false);
  };

  const testBulkTelnet = async () => {
    const connections = bulkHosts
      .split('\n')
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
      .map((line) => {
        const parts = line.split(':');
        return {
          host: parts[0] || '',
          port: parts[1] || '23',
        };
      });

    if (connections.length === 0) {
      alert('Por favor ingrese al menos una conexión');
      return;
    }

    // Crear AbortController para cancelar el proceso
    const controller = new AbortController();
    setAbortController(controller);

    setIsLoading(true);
    setBulkResults([]);
    setBulkProgress({ current: 0, total: connections.length });

    try {
      for (let i = 0; i < connections.length; i++) {
        // Verificar si el proceso fue cancelado
        if (controller.signal.aborted) {
          break;
        }

        const connection = connections[i];
        setBulkProgress({ current: i + 1, total: connections.length });

        try {
          const response = await fetch('/api/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Telnet',
              config: {
                host: connection.host,
                port: parseInt(connection.port),
                timeout: parseInt(timeout),
              },
            }),
            signal: controller.signal, // Agregar señal de aborto
          });

          const data = await response.json();

          // Agregar resultado al array de resultados
          const result = {
            host: connection.host,
            port: connection.port,
            success: data.success,
            message: data.message,
            duration: data.duration || 0,
            timestamp: new Date(),
          };

          setBulkResults((prev) => [...prev, result]);

          // Guardar en historial individual
          addTestResult({
            type: 'Telnet',
            url: `${connection.host}:${connection.port}`,
            host: connection.host,
            endpoint: `${connection.host}:${connection.port}`,
            method: 'TELNET',
            success: data.success,
            message: data.message,
            duration: data.duration || 0,
            timestamp: new Date(),
          });
        } catch (error) {
          const errorResult = {
            host: connection.host,
            port: connection.port,
            success: false,
            message: 'Error de conexión',
            duration: 0,
            timestamp: new Date(),
          };

          setBulkResults((prev) => [...prev, errorResult]);

          addTestResult({
            type: 'Telnet',
            url: `${connection.host}:${connection.port}`,
            host: connection.host,
            endpoint: `${connection.host}:${connection.port}`,
            method: 'TELNET',
            success: false,
            message: 'Error de conexión',
            duration: 0,
            timestamp: new Date(),
          });
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Proceso de telnet cancelado');
      } else {
        console.error('Error en testBulkTelnet:', error);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const testConnection = async () => {
    // Crear AbortController para cancelar el proceso
    const controller = new AbortController();
    setAbortController(controller);

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Telnet',
          config: {
            host,
            port: parseInt(port),
            timeout: parseInt(timeout),
          },
        }),
        signal: controller.signal, // Agregar señal de aborto
      });

      const data = await response.json();
      setResult(data);

      // Guardar en historial
      addTestResult({
        type: 'Telnet',
        url: `${host}:${port}`,
        host: host,
        endpoint: `${host}:${port}`,
        method: 'TELNET',
        success: data.success,
        message: data.message,
        duration: data.duration || 0,
        timestamp: new Date(),
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Proceso de telnet cancelado');
        return;
      }

      const errorResult = {
        success: false,
        message: 'Error de conexión',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
      setResult(errorResult);

      // Guardar error en historial
      addTestResult({
        type: 'Telnet',
        url: `${host}:${port}`,
        host: host,
        endpoint: `${host}:${port}`,
        method: 'TELNET',
        success: false,
        message: errorResult.message,
        duration: 0,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Terminal className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 relative">
              <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                Configuración Telnet
              </span>
              <div className="absolute -bottom-1 left-0 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600">Bulk Mode</label>
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                // Limpiar formulario cuando se activa bulk mode
                if (!isBulkMode) {
                  setHost('');
                  setPort('23');
                  setTimeout('5000');
                  setResult(null);
                  setSelectedHostParam(null);
                  setSelectedPortParam(null);
                  setSelectedTimeoutParam(null);
                }
              }}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                isBulkMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  isBulkMode ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {!isBulkMode ? (
          <>
            <ParameterSelectorLink
              category="general"
              placeholder="Host (ej: 192.168.1.1)"
              value={host}
              onChange={setHost}
              onSelect={setSelectedHostParam}
              className="w-full"
            />

            <div className="grid grid-cols-2 gap-2">
              <ParameterSelectorLink
                category="general"
                placeholder="Puerto (ej: 23)"
                value={port}
                onChange={setPort}
                onSelect={setSelectedPortParam}
              />
              <ParameterSelectorLink
                category="general"
                placeholder="Timeout (ms)"
                value={timeout}
                onChange={setTimeout}
                onSelect={setSelectedTimeoutParam}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Conexiones (host:puerto, uno por línea):
              </label>
              <textarea
                value={bulkHosts}
                onChange={(e) => setBulkHosts(e.target.value)}
                placeholder="192.168.1.1:23&#10;google.com:80&#10;github.com:443&#10;localhost:22"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              <ParameterSelectorLink
                category="general"
                placeholder="Timeout (ms)"
                value={timeout}
                onChange={setTimeout}
                onSelect={setSelectedTimeoutParam}
              />
            </div>
          </>
        )}

        <div className="flex justify-end items-center space-x-2">
          <button
            onClick={isBulkMode ? testBulkTelnet : testConnection}
            disabled={
              isLoading ||
              (!isBulkMode && (!host || !port)) ||
              (isBulkMode && !bulkHosts.trim())
            }
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading
              ? isBulkMode
                ? `Probando... (${bulkProgress.current}/${bulkProgress.total})`
                : 'Probando...'
              : isBulkMode
              ? 'Probar Todos'
              : 'Probar Conexión'}
          </button>
          <button
            onClick={resetForm}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
          >
            Resetear
          </button>
        </div>

        {/* Resultados individuales */}
        {!isBulkMode && result && (
          <TestResultCard result={result} showResponse={false} />
        )}

        {/* Resultados del modo bulk */}
        {isBulkMode && bulkResults.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              Resultados ({bulkResults.length} conexiones):
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {bulkResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs ${
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
                      {result.host}:{result.port}
                    </span>
                    {result.duration && (
                      <span className="text-gray-500">
                        ({result.duration}ms)
                      </span>
                    )}
                  </div>
                  <p className="text-xs">{result.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
