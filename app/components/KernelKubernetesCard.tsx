'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Terminal,
  Play,
  Square,
  Copy,
  Download,
  Trash2,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { useTestHistoryContext } from '../context/TestHistoryContext';
import AWSCredentialsConfig from './AWSCredentialsConfig';
import TerminalComponent from './Terminal';

export default function KernelKubernetesCard() {
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [exportAwsVars, setExportAwsVars] = useState(false);
  const [awsCredentialsExport, setAwsCredentialsExport] = useState<
    string | null
  >(null);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [commandStartTime, setCommandStartTime] = useState<number | null>(null);
  const [showCursor, setShowCursor] = useState(true);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isOutputMaximized, setIsOutputMaximized] = useState(false);

  const { addTestResult } = useTestHistoryContext();

  // Funciones para manejar el historial de la terminal
  const addToTerminalHistory = (cmd: string) => {
    if (cmd.trim() && !terminalHistory.includes(cmd.trim())) {
      setTerminalHistory((prev) => [cmd.trim(), ...prev.slice(0, 49)]); // Mantener últimos 50
    }
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (terminalHistory.length === 0) return;

    let newIndex = historyIndex;
    if (direction === 'up') {
      newIndex =
        historyIndex === -1
          ? 0
          : Math.min(historyIndex + 1, terminalHistory.length - 1);
    } else {
      newIndex = historyIndex === -1 ? -1 : Math.max(historyIndex - 1, -1);
    }

    setHistoryIndex(newIndex);
    if (newIndex === -1) {
      setCommand('');
    } else {
      setCommand(terminalHistory[newIndex]);
    }
  };

  const stopCommand = async () => {
    if (!currentProcessId) {
      return;
    }

    setIsStopping(true);

    // Calcular duración desde el inicio del comando hasta ahora
    const stopTime = Date.now();
    const actualDuration = commandStartTime ? stopTime - commandStartTime : 0;

    try {
      const response = await fetch('/api/kubernetes-execute/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: currentProcessId }),
      });

      const data = await response.json();

      setIsLoading(false);
      setCurrentProcessId(null);

      setResult({
        success: true,
        message: 'Comando procesado',
        output: data.output || 'Sin output disponible',
        duration: actualDuration,
      });
    } catch (error) {
      console.error('Error al detener comando:', error);
      setIsLoading(false);
      setCurrentProcessId(null);

      setResult({
        success: true,
        message: 'Comando procesado',
        output: 'Sin output disponible',
        duration: actualDuration,
      });
    } finally {
      setIsStopping(false);
    }
  };

  // Cargar credenciales AWS al montar el componente
  React.useEffect(() => {
    loadAwsCredentials();
  }, []);

  // Animación del cursor parpadeante cuando está cargando
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setShowCursor((prev) => !prev);
      }, 500); // Parpadea cada 500ms
    } else {
      setShowCursor(true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  // Debug: Monitorear cambios en isLoading
  React.useEffect(() => {
    console.log('isLoading state changed:', isLoading);
  }, [isLoading]);

  // Cargar variables de entorno AWS desde localStorage/memoria
  const loadAwsCredentials = () => {
    try {
      // Intentar cargar desde localStorage primero
      const stored = localStorage.getItem('aws-credentials-export');
      if (stored) {
        setAwsCredentialsExport(stored);
        console.log('AWS export variables loaded from localStorage:', stored);
        return;
      }

      // Si no hay en localStorage, intentar desde memoria global
      const globalCredentials = (window as any).awsCredentialsExport;
      if (globalCredentials) {
        setAwsCredentialsExport(globalCredentials);
        console.log(
          'AWS export variables loaded from memory:',
          globalCredentials
        );
        return;
      }

      // Si no hay credenciales disponibles
      setAwsCredentialsExport(null);
      console.log('No AWS export variables found');
    } catch (error) {
      console.error('Error loading AWS export variables:', error);
      setAwsCredentialsExport(null);
    }
  };

  const resetForm = () => {
    setCommand('');
    setResult(null);
    setExportAwsVars(false);
    setIsLoading(false);
    setIsStopping(false);
  };

  const executeCommand = async (cmd?: string) => {
    const commandToExecute = cmd || command;
    if (!commandToExecute) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    // Guardar tiempo de inicio del comando
    const startTime = Date.now();
    setCommandStartTime(startTime);

    // Generar ID único para el proceso
    const processId = `process_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setCurrentProcessId(processId);

    // Agregar comando al historial
    setCommandHistory((prev) => [commandToExecute, ...prev.slice(0, 9)]); // Mantener últimos 10
    addToTerminalHistory(commandToExecute); // Agregar al historial de terminal

    try {
      const response = await fetch('/api/kubernetes-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterName: null,
          region: null,
          command: commandToExecute,
          namespace: null,
          isServerMode: true,
          exportAwsVars: exportAwsVars,
          awsCredentialsExport: exportAwsVars ? awsCredentialsExport : null,
          processId,
        }),
      });

      const data = await response.json();

      setResult(data);
      setCurrentProcessId(null); // Limpiar el ID del proceso
      setCommandStartTime(null); // Limpiar el tiempo de inicio

      addTestResult({
        type: 'Kubernetes',
        url: 'Servidor',
        host: 'Servidor',
        endpoint: 'Servidor',
        method: 'SHELL',
        success: data.success,
        message: data.message,
        duration: data.duration || 0,
        timestamp: new Date(),
        command: commandToExecute,
      });
    } catch (error: any) {
      setCurrentProcessId(null); // Limpiar el ID del proceso en caso de error
      setCommandStartTime(null); // Limpiar el tiempo de inicio

      const errorResult = {
        success: true,
        message: 'Comando procesado',
        output: 'Sin output disponible',
        duration: 0,
      };
      setResult(errorResult);

      addTestResult({
        type: 'Kubernetes',
        url: 'Servidor',
        host: 'Servidor',
        endpoint: 'Servidor',
        method: 'SHELL',
        success: false,
        message: errorResult.message,
        duration: 0,
        timestamp: new Date(),
      });
    } finally {
      console.log('Resetting isLoading to false');
      setIsLoading(false);
      // Asegurar que el estado se resetee
      setTimeout(() => {
        if (isLoading) {
          console.log('Force resetting isLoading state');
          setIsLoading(false);
        }
      }, 100);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadOutput = () => {
    if (result?.output) {
      const blob = new Blob([result.output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kubectl-output-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const quickCommands = [
    'ls -la',
    'ps aux',
    'df -h',
    'free -m',
    'docker ps',
    'docker images',
    'netstat -tulpn',
    'systemctl status',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            Terminal del Servidor
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetForm}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Resetear
          </button>
        </div>
      </div>

      {/* AWS Export Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setExportAwsVars(!exportAwsVars)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                exportAwsVars ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  exportAwsVars ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Variables de Entorno
            </span>
          </div>
          {exportAwsVars && !awsCredentialsExport && (
            <span className="text-xs text-red-600">
              ⚠️ No hay variables de entorno configuradas
            </span>
          )}
          {exportAwsVars && awsCredentialsExport && (
            <span className="text-xs text-green-600">
              ✅ Variables de entorno disponibles
            </span>
          )}
        </div>
        <AWSCredentialsConfig onCredentialsUpdated={loadAwsCredentials} />
      </div>

      {/* Terminal */}
      <div className="space-y-4">
        <TerminalComponent
          onCommand={executeCommand}
          isLoading={isLoading}
          currentCommand={command}
          result={result}
          onStop={stopCommand}
          isStopping={isStopping}
        />
      </div>

      {/* Comandos Rápidos */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Comandos Rápidos:
        </label>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd, index) => (
            <button
              key={index}
              onClick={() => setCommand(cmd)}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Historial de Comandos */}
      {commandHistory.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Historial de Comandos:
          </label>
          <div className="flex flex-wrap gap-2">
            {commandHistory.slice(0, 5).map((cmd, index) => (
              <button
                key={index}
                onClick={() => setCommand(cmd)}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 max-w-32 truncate"
                title={cmd}
              >
                {cmd.length > 20 ? `${cmd.substring(0, 17)}...` : cmd}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="p-4 rounded-lg border bg-gray-50 border-gray-200 text-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <span className="font-medium">
                {result.output ? 'Output del Servidor' : 'Sin output'}
              </span>
              {result.duration && result.duration > 0 && (
                <span className="text-sm text-gray-500">
                  ({result.duration}ms)
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              {result.output && (
                <>
                  <button
                    onClick={() => copyToClipboard(result.output)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Copiar salida"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={downloadOutput}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Descargar salida"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOutputMaximized(!isOutputMaximized)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title={isOutputMaximized ? 'Minimizar' : 'Maximizar'}
                  >
                    {isOutputMaximized ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {result.output && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-600 mb-2">
                Salida del comando:
              </div>
              <div
                className={`bg-gray-900 rounded border border-gray-700 ${
                  isOutputMaximized ? 'fixed inset-4 z-50 flex flex-col' : ''
                }`}
              >
                {isOutputMaximized && (
                  <div className="flex items-center justify-between p-3 border-b border-gray-700">
                    <div className="text-sm font-medium text-gray-300">
                      Salida del comando (Pantalla completa)
                    </div>
                    <button
                      onClick={() => setIsOutputMaximized(false)}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                      title="Cerrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <pre
                  className={`text-gray-100 p-4 text-sm whitespace-pre-wrap font-mono overflow-y-auto overflow-x-auto ${
                    isOutputMaximized ? 'flex-1' : 'max-h-64'
                  }`}
                >
                  {result.output}
                </pre>
              </div>
            </div>
          )}

          <p className="mt-3 text-sm">{result.message}</p>
        </div>
      )}
    </div>
  );
}
