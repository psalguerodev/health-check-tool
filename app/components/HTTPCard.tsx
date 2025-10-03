'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useTestHistory } from '../hooks/useTestHistory';
import ParameterSelectorLink from './ParameterSelectorLink';
import TestResultCard from './TestResultCard';
import { Parameter } from '../context/ParameterStoreContext';

export default function HTTPCard() {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');
  const [selectedUrlParam, setSelectedUrlParam] = useState<Parameter | null>(
    null
  );
  const [selectedHeadersParam, setSelectedHeadersParam] =
    useState<Parameter | null>(null);
  const [selectedBodyParam, setSelectedBodyParam] = useState<Parameter | null>(
    null
  );
  const { addTestResult } = useTestHistory('healthCheckHistory');

  const parseHeaders = (headersString: string): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (!headersString.trim()) return headers;

    const lines = headersString.split('\n').filter((line) => line.trim());

    lines.forEach((line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    });

    return headers;
  };

  const resetForm = () => {
    setUrl('');
    setMethod('GET');
    setHeaders('');
    setBody('');
    setResult(null);
    setSelectedUrlParam(null);
    setSelectedHeadersParam(null);
    setSelectedBodyParam(null);
  };

  const parseCurlCommand = (curl: string) => {
    try {
      // Limpiar el comando cURL
      const cleanCurl = curl.trim();

      // Extraer método HTTP
      const methodMatch = cleanCurl.match(/-X\s+(\w+)/i);
      if (methodMatch && methodMatch[1]) {
        setMethod(methodMatch[1].toUpperCase());
      }

      // Extraer URL - buscar diferentes patrones
      let urlMatch = cleanCurl.match(/curl\s+--location\s+['"]([^'"]+)['"]/);
      if (!urlMatch) {
        urlMatch = cleanCurl.match(/curl\s+['"]([^'"]+)['"]/);
      }
      if (!urlMatch) {
        // Buscar URL después de -X METHOD
        urlMatch = cleanCurl.match(/-X\s+\w+\s+['"]([^'"]+)['"]/);
      }
      if (!urlMatch) {
        // Buscar URL después de -X METHOD sin comillas
        urlMatch = cleanCurl.match(/-X\s+\w+\s+([^\s]+)/);
      }
      if (!urlMatch) {
        // Buscar URL simple al final
        urlMatch = cleanCurl.match(/curl\s+([^\s]+)/);
      }

      if (urlMatch && urlMatch[1]) {
        setUrl(urlMatch[1]);
      }

      // Extraer headers - buscar diferentes patrones
      const headerMatches =
        cleanCurl.match(/--header\s+['"]([^'"]+)['"]/g) ||
        cleanCurl.match(/-H\s+['"]([^'"]+)['"]/g);

      if (headerMatches && headerMatches.length > 0) {
        const headerPairs = headerMatches
          .map((header) => {
            // Remover --header o -H del inicio
            const cleanHeader = header.replace(/^(--header\s+|-H\s+)/, '');
            // Remover comillas
            const unquotedHeader = cleanHeader.replace(/^['"]|['"]$/g, '');
            return unquotedHeader;
          })
          .filter(Boolean);

        if (headerPairs.length > 0) {
          setHeaders(headerPairs.join('\n'));
        }
      }

      // Extraer body si existe
      const bodyMatch =
        cleanCurl.match(/--data\s+['"]([^'"]+)['"]/) ||
        cleanCurl.match(/-d\s+['"]([^'"]+)['"]/);
      if (bodyMatch && bodyMatch[1]) {
        setBody(bodyMatch[1]);
        // Si hay body, asegurar que el método sea POST
        if (!methodMatch) {
          setMethod('POST');
        }
      }

      setShowCurlImport(false);
      setCurlCommand('');
    } catch (error) {
      console.error('Error parsing cURL command:', error);
      // Mostrar un mensaje de error al usuario
      setResult({
        success: false,
        message: 'Error al parsear el comando cURL. Verifica el formato.',
        duration: 0,
      });
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'HTTP',
          config: {
            url,
            method,
            headers: headers ? parseHeaders(headers) : {},
            body: body || undefined,
          },
        }),
      });

      const data = await response.json();
      setResult(data);

      // Guardar en historial
      addTestResult({
        type: 'HTTP',
        url: url,
        host: url,
        method: method,
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
        type: 'HTTP',
        url: url,
        host: url,
        method: method,
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
      {/* Botón para importar cURL */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 relative">
            <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
              Configuración HTTP
            </span>
            <div className="absolute -bottom-1 left-0 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCurlImport(!showCurlImport)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {showCurlImport ? 'Ocultar' : 'Importar cURL'}
          </button>
          <button
            onClick={() => {
              const testCurl = `curl --location 'https://api.clickup.com/api/v2/list/901108308144/task' \\
--header 'Authorization: pk_75423518_Q07Z5P9KCN7G9HCKKR3SUV2D4PH8NBMD' \\
--header 'Accept: application/json'`;
              parseCurlCommand(testCurl);
            }}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Probar Parser
          </button>
        </div>
      </div>

      {/* Panel de importación cURL */}
      {showCurlImport && (
        <div className="p-3 bg-gray-50 rounded border">
          <label className="block text-xs font-medium mb-2 text-gray-700">
            Pegar comando cURL:
          </label>
          <textarea
            value={curlCommand}
            onChange={(e) => setCurlCommand(e.target.value)}
            placeholder="curl -X POST https://api.example.com/data -H Content-Type: application/json -d {key: value}"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-2"
            rows={3}
          />
          <div className="flex space-x-2">
            <button
              onClick={() => parseCurlCommand(curlCommand)}
              disabled={!curlCommand.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Importar
            </button>
            <button
              onClick={() => {
                setCurlCommand('');
                setShowCurlImport(false);
              }}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ParameterSelectorLink
        category="api"
        placeholder="URL (ej: https://api.ejemplo.com/endpoint)"
        value={url}
        onChange={setUrl}
        onSelect={setSelectedUrlParam}
        className="w-full"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
        <ParameterSelectorLink
          category="api"
          placeholder="Headers (ej: Content-Type: application/json)"
          value={headers}
          onChange={setHeaders}
          onSelect={setSelectedHeadersParam}
        />
      </div>
      {/* Body solo para POST */}
      {method === 'POST' && (
        <ParameterSelectorLink
          category="api"
          placeholder="Body (JSON, XML, etc.)"
          value={body}
          onChange={setBody}
          onSelect={setSelectedBodyParam}
          className="w-full"
          multiline
          rows={3}
        />
      )}
      <div className="flex justify-end items-center space-x-2">
        <button
          onClick={testConnection}
          disabled={isLoading || !url}
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
      {result && (
        <TestResultCard
          result={result}
          showResponse={true}
          responseTitle="Respuesta HTTP"
        />
      )}
    </div>
  );
}
