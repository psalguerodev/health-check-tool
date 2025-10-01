'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useTestHistoryContext } from '../context/TestHistoryContext';
import ParameterSelectorLink from './ParameterSelectorLink';
import { Parameter } from '../context/ParameterStoreContext';

export default function SQSCard() {
  const [region, setRegion] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [queueUrl, setQueueUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedAccessKeyParam, setSelectedAccessKeyParam] =
    useState<Parameter | null>(null);
  const [selectedSecretKeyParam, setSelectedSecretKeyParam] =
    useState<Parameter | null>(null);
  const [selectedQueueUrlParam, setSelectedQueueUrlParam] =
    useState<Parameter | null>(null);
  const { addTestResult } = useTestHistoryContext();

  const resetForm = () => {
    setRegion('');
    setAccessKeyId('');
    setSecretAccessKey('');
    setQueueUrl('');
    setResult(null);
    setSelectedAccessKeyParam(null);
    setSelectedSecretKeyParam(null);
    setSelectedQueueUrlParam(null);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SQS',
          config: { region, accessKeyId, secretAccessKey, queueUrl },
        }),
      });

      const data = await response.json();
      setResult(data);

      // Guardar en historial
      addTestResult({
        type: 'AWS SQS',
        url: queueUrl,
        host: region,
        region: region,
        queueUrl: queueUrl,
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
        type: 'AWS SQS',
        url: queueUrl,
        host: region,
        region: region,
        queueUrl: queueUrl,
        success: false,
        message: errorResult.message,
        duration: 0,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const awsRegions = [
    { value: 'us-east-1', label: 'US East (N. Virginia) - us-east-1' },
    { value: 'us-west-2', label: 'US West (Oregon) - us-west-2' },
    { value: 'eu-west-1', label: 'Europe (Ireland) - eu-west-1' },
    {
      value: 'ap-southeast-1',
      label: 'Asia Pacific (Singapore) - ap-southeast-1',
    },
    { value: 'sa-east-1', label: 'South America (São Paulo) - sa-east-1' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700">
          Configuración AWS SQS
        </span>
      </div>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
      >
        <option value="">Seleccionar región AWS</option>
        {awsRegions.map((reg) => (
          <option key={reg.value} value={reg.value}>
            {reg.label}
          </option>
        ))}
      </select>
      <ParameterSelectorLink
        category="aws"
        placeholder="Access Key ID"
        value={accessKeyId}
        onChange={setAccessKeyId}
        onSelect={setSelectedAccessKeyParam}
        className="w-full"
      />
      <ParameterSelectorLink
        category="aws"
        placeholder="Secret Access Key"
        value={secretAccessKey}
        onChange={setSecretAccessKey}
        onSelect={setSelectedSecretKeyParam}
        className="w-full"
        isPassword={true}
      />
      <ParameterSelectorLink
        category="aws"
        placeholder="URL de la cola"
        value={queueUrl}
        onChange={setQueueUrl}
        onSelect={setSelectedQueueUrlParam}
        className="w-full"
      />

      <div className="flex justify-end items-center space-x-2">
        <button
          onClick={testConnection}
          disabled={
            isLoading ||
            !region ||
            !accessKeyId ||
            !secretAccessKey ||
            !queueUrl
          }
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
          <div className="flex items-center space-x-1 mb-1">
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
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
