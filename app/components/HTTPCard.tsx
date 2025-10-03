'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import ResultActions from './ResultActions';
import { useTestHistory } from '../hooks/useTestHistory';
import ParameterSelectorLink from './ParameterSelectorLink';
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
      // Limpiar el comando cURL - manejar mejor los saltos de línea con \
      const cleanCurl = curl
        .trim()
        .replace(/\\\s*\n\s*/g, ' ') // Reemplazar \ seguido de salto de línea
        .replace(/\s+/g, ' ') // Normalizar espacios múltiples
        .trim();

      console.log('cURL limpio:', cleanCurl); // Debug

      // Prueba con el ejemplo específico de Postman
      if (cleanCurl.includes('api.clickup.com')) {
        console.log(
          'Detectado comando de ClickUp - aplicando parsing especial'
        );
      }

      // Extraer URL - buscar la URL después de curl o al final
      const urlPatterns = [
        /curl\s+--location\s+['"]([^'"]+)['"]/,
        /curl\s+['"]([^'"]+)['"]/,
        /curl\s+([^\s]+)/,
        /['"](https?:\/\/[^'"]+)['"]/,
        /(https?:\/\/[^\s]+)/,
      ];

      let extractedUrl = '';
      for (const pattern of urlPatterns) {
        const match = cleanCurl.match(pattern);
        if (match) {
          extractedUrl = match[1];
          break;
        }
      }

      if (!extractedUrl)
        throw new Error('No se encontró URL en el comando cURL');
      setUrl(extractedUrl);

      // Extraer método HTTP
      const methodMatch = cleanCurl.match(/-X\s+['"]?(\w+)['"]?/i);
      const extractedMethod = methodMatch
        ? methodMatch[1].toUpperCase()
        : 'GET';
      setMethod(extractedMethod);

      // Extraer headers - mejorar el parsing para manejar múltiples headers
      const headerPatterns = [
        /-H\s+['"]([^'"]+)['"]/g,
        /--header\s+['"]([^'"]+)['"]/g,
      ];

      const allHeaders: string[] = [];
      headerPatterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(cleanCurl)) !== null) {
          const header = match[1];
          allHeaders.push(header);
        }
      });

      // Parsing adicional para casos complejos como el de Postman
      // Buscar patrones como: --header 'Authorization: token' --header 'Accept: application/json'
      const complexHeaderPattern = /--header\s+['"]([^'"]+)['"]/g;
      let complexMatch;
      while ((complexMatch = complexHeaderPattern.exec(cleanCurl)) !== null) {
        const header = complexMatch[1];
        if (!allHeaders.includes(header)) {
          allHeaders.push(header);
        }
      }

      console.log('Headers encontrados:', allHeaders); // Debug

      if (allHeaders.length > 0) {
        setHeaders(allHeaders.join('\n'));
      }

      // Extraer body/data - manejar -d, --data, --data-raw, --data-binary
      const dataPatterns = [
        /-d\s+['"]([^'"]+)['"]/,
        /--data\s+['"]([^'"]+)['"]/,
        /--data-raw\s+['"]([^'"]+)['"]/,
        /--data-binary\s+['"]([^'"]+)['"]/,
      ];

      let extractedBody = '';
      for (const pattern of dataPatterns) {
        const match = cleanCurl.match(pattern);
        if (match) {
          extractedBody = match[1];
          break;
        }
      }

      if (extractedBody) {
        setBody(extractedBody);
      }

      setShowCurlImport(false);
      setCurlCommand('');
    } catch (error) {
      alert(
        'Error al parsear el comando cURL: ' +
          (error instanceof Error ? error.message : 'Error desconocido')
      );
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      let parsedHeaders: Record<string, string> = {};
      if (headers.trim()) {
        const headerLines = headers.split('\n');
        headerLines.forEach((line) => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            parsedHeaders[key.trim()] = valueParts.join(':').trim();
          }
        });
      }

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'HTTP',
          config: { url, method, headers: parsedHeaders, body, timeout: 10000 },
        }),
      });

      const data = await response.json();
      setResult(data);

      // Guardar en historial
      addTestResult({
        type: 'HTTP',
        url: url,
        host: url,
        endpoint: url,
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
        endpoint: url,
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
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700">
          Configuración HTTP
        </span>
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
            placeholder="curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{&quot;key&quot;: &quot;value&quot;}'"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mb-2"
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
          className="px-2 py-1 text-xs border border-gray-300 rounded"
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
          multiline={true}
          rows={3}
        />
      )}

      <div className="flex justify-end items-center space-x-2">
        <button
          onClick={testConnection}
          disabled={isLoading || !url}
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
              filename={`http_${result.success ? 'success' : 'error'}`}
            />
          </div>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
