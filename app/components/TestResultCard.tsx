'use client';

import { CheckCircle, XCircle, Download } from 'lucide-react';
import ResultActions from './ResultActions';

interface TestResultCardProps {
  result: {
    success: boolean;
    message: string;
    duration?: number;
    response?: any;
    error?: string;
    resolvedIP?: string;
  };
  showResponse?: boolean;
  responseTitle?: string;
}

export default function TestResultCard({
  result,
  showResponse = true,
  responseTitle = 'Respuesta',
}: TestResultCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border w-full max-w-full ${
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
            {result.success ? 'Conexión exitosa' : 'Error de conexión'}
          </span>
          {result.duration && (
            <span className="text-sm text-gray-500">({result.duration}ms)</span>
          )}
          {result.resolvedIP && (
            <span className="text-blue-600 text-xs">({result.resolvedIP})</span>
          )}
        </div>
        <ResultActions
          content={result.message}
          filename={`test_${result.success ? 'success' : 'error'}`}
        />
      </div>

      <p className="mt-3 text-sm">{result.message}</p>

      {result.success && result.response && showResponse && (
        <div className="mt-3">
          <div className="text-sm font-medium text-gray-600 mb-2">
            {responseTitle}:
          </div>
          {typeof result.response === 'object' ? (
            <div className="bg-gray-900 rounded max-h-64 overflow-auto border w-full">
              <pre
                className="text-gray-100 p-4 text-sm whitespace-pre font-mono block w-full overflow-x-auto"
                style={{ maxWidth: '100%', wordBreak: 'break-all' }}
              >
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-gray-100 rounded p-3 border">
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-600">
                  Respuesta disponible (no JSON)
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([String(result.response)], {
                      type: 'text/plain',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `response_${
                      new Date().toISOString().split('T')[0]
                    }.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors duration-200"
                  title="Descargar respuesta"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
