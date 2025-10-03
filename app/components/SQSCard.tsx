'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useTestHistory } from '../hooks/useTestHistory';
import ParameterSelectorLink from './ParameterSelectorLink';
import TestResultCard from './TestResultCard';
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
  const { addTestResult } = useTestHistory('healthCheckHistory');

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
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 relative">
              <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                Configuración AWS SQS
              </span>
              <div className="absolute -bottom-1 left-0 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
            </h3>
          </div>
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 appearance-none"
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
    </div>
  );
}
