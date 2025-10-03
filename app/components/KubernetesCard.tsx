'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Terminal, Play, Square } from 'lucide-react';
import { useTestHistoryContext } from '../context/TestHistoryContext';
import ParameterSelectorLink from './ParameterSelectorLink';
import { Parameter } from '../context/ParameterStoreContext';

export default function KubernetesCard() {
  const [clusterName, setClusterName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [command, setCommand] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedClusterParam, setSelectedClusterParam] =
    useState<Parameter | null>(null);
  const [selectedRegionParam, setSelectedRegionParam] =
    useState<Parameter | null>(null);
  const [selectedCommandParam, setSelectedCommandParam] =
    useState<Parameter | null>(null);
  const [selectedNamespaceParam, setSelectedNamespaceParam] =
    useState<Parameter | null>(null);

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
    setIsLoading(false);
  };

  const executeCommand = async () => {
    if (!clusterName || !command) {
      alert('Por favor ingrese el nombre del cluster y el comando');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/kubernetes-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusterName,
          region,
          command,
          namespace,
        }),
      });

      const data = await response.json();
      setResult(data);

      addTestResult({
        type: 'Kubernetes',
        url: `${clusterName}.${region}`,
        host: clusterName,
        endpoint: `${clusterName}.${region}`,
        method: 'KUBECTL',
        success: data.success,
        message: data.message,
        duration: data.duration || 0,
        timestamp: new Date(),
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
        url: `${clusterName}.${region}`,
        host: clusterName,
        endpoint: `${clusterName}.${region}`,
        method: 'KUBECTL',
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
          Configuración Kubernetes
        </span>
      </div>

      <ParameterSelectorLink
        category="aws"
        placeholder="Nombre del Cluster (ej: my-cluster)"
        value={clusterName}
        onChange={setClusterName}
        onSelect={setSelectedClusterParam}
        className="w-full"
      />

      <div className="grid grid-cols-2 gap-2">
        <ParameterSelectorLink
          category="aws"
          placeholder="Región (ej: us-east-1)"
          value={region}
          onChange={setRegion}
          onSelect={setSelectedRegionParam}
        />
        <ParameterSelectorLink
          category="general"
          placeholder="Namespace (ej: default)"
          value={namespace}
          onChange={setNamespace}
          onSelect={setSelectedNamespaceParam}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Comando kubectl:
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="get pods, describe pod my-pod, logs deployment/my-app..."
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="flex justify-end items-center space-x-2">
        <button
          onClick={executeCommand}
          disabled={isLoading || !clusterName || !command}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Square className="w-3 h-3 inline mr-1" />
              Ejecutando...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 inline mr-1" />
              Ejecutar
            </>
          )}
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
          className={`p-3 rounded text-xs ${
            result.success
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center space-x-1 mb-2">
            {result.success ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span className="font-medium">
              {result.success ? 'Comando ejecutado' : 'Error de ejecución'}
            </span>
            {result.duration && (
              <span className="text-gray-500">({result.duration}ms)</span>
            )}
          </div>

          {result.output && (
            <div className="mt-2">
              <div className="text-xs font-medium text-gray-600 mb-1">
                Salida:
              </div>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                {result.output}
              </pre>
            </div>
          )}

          <p className="mt-2">{result.message}</p>
        </div>
      )}
    </div>
  );
}
