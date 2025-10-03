'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Terminal,
  Play,
  Square,
  Copy,
  Download,
  Trash2,
} from 'lucide-react';
import { useTestHistoryContext } from '../context/TestHistoryContext';
import ParameterSelectorLink from './ParameterSelectorLink';
import ClusterConnectionModal from './ClusterConnectionModal';
import { Parameter } from '../context/ParameterStoreContext';

export default function KernelKubernetesCard() {
  const [clusterName, setClusterName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [command, setCommand] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [selectedClusterParam, setSelectedClusterParam] =
    useState<Parameter | null>(null);
  const [selectedRegionParam, setSelectedRegionParam] =
    useState<Parameter | null>(null);
  const [selectedCommandParam, setSelectedCommandParam] =
    useState<Parameter | null>(null);
  const [selectedNamespaceParam, setSelectedNamespaceParam] =
    useState<Parameter | null>(null);
  const [isServerMode, setIsServerMode] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isClusterConnected, setIsClusterConnected] = useState(false);

  const { addTestResult } = useTestHistoryContext();

  const resetForm = () => {
    setClusterName('');
    setRegion('us-east-1');
    setCommand('');
    setNamespace('default');
    setResult(null);
    setSelectedClusterParam(null);
    setSelectedRegionParam(null);
    setSelectedCommandParam(null);
    setSelectedNamespaceParam(null);
    setIsServerMode(false);
    setIsLoading(false);
  };

  const executeCommand = async () => {
    if (!command) {
      alert('Por favor ingrese el comando');
      return;
    }

    if (!isServerMode && !clusterName) {
      alert('Por favor ingrese el nombre del cluster');
      return;
    }

    setIsLoading(true);
    setResult(null);

    // Agregar comando al historial
    setCommandHistory((prev) => [command, ...prev.slice(0, 9)]); // Mantener últimos 10

    try {
      const response = await fetch('/api/kubernetes-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterName: isServerMode ? null : clusterName,
          region: isServerMode ? null : region,
          command,
          namespace: isServerMode ? null : namespace,
          isServerMode,
        }),
      });

      const data = await response.json();
      setResult(data);

      addTestResult({
        type: 'Kubernetes',
        url: isServerMode ? 'Servidor' : `${clusterName}.${region}`,
        host: isServerMode ? 'Servidor' : clusterName,
        endpoint: isServerMode ? 'Servidor' : `${clusterName}.${region}`,
        method: isServerMode ? 'SHELL' : 'KUBECTL',
        success: data.success,
        message: data.message,
        duration: data.duration || 0,
        timestamp: new Date(),
        command: command, // Agregar el comando ejecutado
      });
    } catch (error: any) {
      const errorResult = {
        success: false,
        message: 'Error de conexión al cluster',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
      setResult(errorResult);

      addTestResult({
        type: 'Kubernetes',
        url: isServerMode ? 'Servidor' : `${clusterName}.${region}`,
        host: isServerMode ? 'Servidor' : clusterName,
        endpoint: isServerMode ? 'Servidor' : `${clusterName}.${region}`,
        method: isServerMode ? 'SHELL' : 'KUBECTL',
        success: false,
        message: errorResult.message,
        duration: 0,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnection = async () => {
    if (!clusterName) {
      alert('Por favor ingrese el nombre del cluster');
      return;
    }

    setIsCheckingConnection(true);

    try {
      const response = await fetch('/api/kubernetes-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterName,
          region,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: data.message,
          output: data.output,
          duration: data.duration,
          hasPermissions: data.hasPermissions,
          context: data.context,
        });
      } else {
        setResult({
          success: false,
          message: data.message,
          error: data.error,
          duration: data.duration,
        });
      }

      // Agregar resultado al historial
      addTestResult({
        type: 'Kubernetes',
        url: `${clusterName}.${region}`,
        host: clusterName,
        endpoint: `${clusterName}.${region}`,
        method: 'CONNECTION_TEST',
        success: data.success,
        message: data.message,
        duration: data.duration || 0,
        timestamp: new Date(),
        command: 'Verificar conexión',
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error de conexión: ${error.message}`,
        error: error.message,
        duration: 0,
      });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnectionEstablished = (
    connectedClusterName: string,
    connectedRegion: string
  ) => {
    setClusterName(connectedClusterName);
    setRegion(connectedRegion);
    setIsClusterConnected(true);
    setIsConnectionModalOpen(false);
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

  const quickCommands = isServerMode
    ? [
        'ls -la',
        'ps aux',
        'df -h',
        'free -m',
        'docker ps',
        'docker images',
        'netstat -tulpn',
        'systemctl status',
      ]
    : [
        'get pods',
        'get services',
        'get deployments',
        'get nodes',
        'top nodes',
        'top pods',
        'describe nodes',
        'get events',
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          Configuración del Cluster
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={resetForm}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Resetear
          </button>
        </div>
      </div>

      {/* Toggle Modo Servidor */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Modo Servidor
            </label>
            <button
              onClick={() => setIsServerMode(!isServerMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isServerMode ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isServerMode ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {isServerMode
              ? 'Ejecutar comandos directamente en el servidor'
              : 'Ejecutar comandos en el cluster Kubernetes'}
          </span>
        </div>
      </div>

      {/* Estado de Conexión del Cluster */}
      {!isServerMode && (
        <div className="space-y-4">
          {isClusterConnected ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="text-sm font-medium text-green-800">
                      Cluster Conectado
                    </h3>
                    <p className="text-sm text-green-700">
                      {clusterName} ({region})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConnectionModalOpen(true)}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Reconfigurar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">
                      Cluster No Conectado
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Configure la conexión al cluster para ejecutar comandos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConnectionModalOpen(true)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Configurar
                </button>
              </div>
            </div>
          )}

          {/* Namespace */}
          {isClusterConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ParameterSelectorLink
                category="general"
                placeholder="Namespace (ej: default)"
                value={namespace}
                onChange={setNamespace}
                onSelect={setSelectedNamespaceParam}
              />
            </div>
          )}
        </div>
      )}

      {/* Comando */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={
            isServerMode
              ? 'ls -la, ps aux, df -h, docker ps, export VAR="value"; echo $VAR...'
              : 'get pods, describe pod my-pod, logs deployment/my-app...'
          }
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
        />
        <button
          onClick={executeCommand}
          disabled={
            isLoading || !command || (!isServerMode && !isClusterConnected)
          }
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1.5"
        >
          {isLoading ? (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Ejecutando...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Ejecutar</span>
            </>
          )}
        </button>
        {!isServerMode && (
          <button
            onClick={checkConnection}
            disabled={isCheckingConnection || !clusterName}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1.5"
          >
            {isCheckingConnection ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verificar</span>
              </>
            )}
          </button>
        )}
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
        <div
          className={`p-4 rounded-lg border ${
            result.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">
                {result.success
                  ? 'Comando ejecutado exitosamente'
                  : 'Error en la ejecución'}
              </span>
              {result.duration && (
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
                </>
              )}
            </div>
          </div>

          {result.output && (
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-600 mb-2">
                Salida del comando:
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap font-mono">
                {result.output}
              </pre>
            </div>
          )}

          <p className="mt-3 text-sm">{result.message}</p>
        </div>
      )}

      {/* Modal de Configuración de Conexión */}
      <ClusterConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        onConnectionEstablished={handleConnectionEstablished}
      />
    </div>
  );
}
