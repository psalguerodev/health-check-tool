'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  ConnectionTest,
  DB2Config,
  SQLServerConfig,
  PostgreSQLConfig,
  SQSConfig,
  HTTPConfig,
} from '../types';

interface ConnectionFormProps {
  onAddTest: (test: ConnectionTest) => void;
  onClose?: () => void;
}

export default function ConnectionForm({
  onAddTest,
  onClose,
}: ConnectionFormProps) {
  const [connectionType, setConnectionType] = useState<string>('DB2');
  const [testName, setTestName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const testId = `test_${Date.now()}`;
    let config: any = {};

    // Configuración base común
    const host = (document.getElementById('host') as HTMLInputElement)?.value;
    const username = (document.getElementById('username') as HTMLInputElement)
      ?.value;
    const password = (document.getElementById('password') as HTMLInputElement)
      ?.value;

    switch (connectionType) {
      case 'DB2':
        config = {
          host,
          port: parseInt(
            (document.getElementById('port') as HTMLInputElement)?.value ||
              '50000'
          ),
          database: (document.getElementById('database') as HTMLInputElement)
            ?.value,
          username,
          password,
          schema: (document.getElementById('schema') as HTMLInputElement)
            ?.value,
        } as DB2Config;
        break;
      case 'SQLServer':
        config = {
          host,
          port: parseInt(
            (document.getElementById('port') as HTMLInputElement)?.value ||
              '1433'
          ),
          database: (document.getElementById('database') as HTMLInputElement)
            ?.value,
          username,
          password,
          instance: (document.getElementById('instance') as HTMLInputElement)
            ?.value,
          encrypt: (document.getElementById('encrypt') as HTMLInputElement)
            ?.checked,
        } as SQLServerConfig;
        break;
      case 'PostgreSQL':
        config = {
          host,
          port: parseInt(
            (document.getElementById('port') as HTMLInputElement)?.value ||
              '5432'
          ),
          database: (document.getElementById('database') as HTMLInputElement)
            ?.value,
          username,
          password,
          ssl: (document.getElementById('ssl') as HTMLInputElement)?.checked,
        } as PostgreSQLConfig;
        break;
      case 'SQS':
        config = {
          region: (document.getElementById('region') as HTMLInputElement)
            ?.value,
          accessKeyId: (
            document.getElementById('accessKeyId') as HTMLInputElement
          )?.value,
          secretAccessKey: (
            document.getElementById('secretAccessKey') as HTMLInputElement
          )?.value,
          queueUrl: (document.getElementById('queueUrl') as HTMLInputElement)
            ?.value,
        } as SQSConfig;
        break;
      case 'HTTP':
        config = {
          url: (document.getElementById('url') as HTMLInputElement)?.value,
          method: (document.getElementById('method') as HTMLSelectElement)
            ?.value as 'GET' | 'POST',
          headers: JSON.parse(
            (document.getElementById('headers') as HTMLTextAreaElement)
              ?.value || '{}'
          ),
          body: (document.getElementById('body') as HTMLTextAreaElement)?.value,
          timeout: parseInt(
            (document.getElementById('timeout') as HTMLInputElement)?.value ||
              '10000'
          ),
        } as HTTPConfig;
        break;
    }

    const newTest: ConnectionTest = {
      id: testId,
      name: testName,
      type: connectionType as any,
      status: 'pending',
      config,
    };

    onAddTest(newTest);
    setTestName('');
    if (onClose) onClose();
  };

  const renderFormFields = () => {
    switch (connectionType) {
      case 'DB2':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Puerto:</label>
              <input
                id="port"
                type="number"
                defaultValue="50000"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Base de datos:
              </label>
              <input
                id="database"
                type="text"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Esquema:</label>
              <input
                id="schema"
                type="text"
                className="w-full p-2 border rounded"
              />
            </div>
          </>
        );
      case 'SQLServer':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Puerto:</label>
              <input
                id="port"
                type="number"
                defaultValue="1433"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Base de datos:
              </label>
              <input
                id="database"
                type="text"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Instancia:
              </label>
              <input
                id="instance"
                type="text"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input id="encrypt" type="checkbox" className="mr-2" />
                Encriptar conexión
              </label>
            </div>
          </>
        );
      case 'PostgreSQL':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Puerto:</label>
              <input
                id="port"
                type="number"
                defaultValue="5432"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Base de datos:
              </label>
              <input
                id="database"
                type="text"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="flex items-center">
                <input id="ssl" type="checkbox" className="mr-2" />
                Usar SSL
              </label>
            </div>
          </>
        );
      case 'SQS':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Región:</label>
              <input
                id="region"
                type="text"
                placeholder="us-east-1"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Access Key ID:
              </label>
              <input
                id="accessKeyId"
                type="text"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Secret Access Key:
              </label>
              <input
                id="secretAccessKey"
                type="password"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                URL de Cola:
              </label>
              <input
                id="queueUrl"
                type="text"
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </>
        );
      case 'HTTP':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">URL:</label>
              <input
                id="url"
                type="url"
                placeholder="https://api.ejemplo.com/endpoint"
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Método:</label>
              <select
                id="method"
                className="w-full p-2 border rounded"
                required
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Headers (JSON):
              </label>
              <textarea
                id="headers"
                placeholder='{"Content-Type": "application/json"}'
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Body:</label>
              <textarea
                id="body"
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Timeout (ms):
              </label>
              <input
                id="timeout"
                type="number"
                defaultValue="10000"
                className="w-full p-2 border rounded"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 border-b border-gray-300 pb-3">
        <h3 className="text-lg font-bold text-wiki-blue">
          Nueva Prueba de Conexión
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre de la prueba:
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tipo de conexión:
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="DB2">DB2</option>
              <option value="SQLServer">SQL Server</option>
              <option value="PostgreSQL">PostgreSQL</option>
              <option value="SQS">AWS SQS</option>
              <option value="HTTP">HTTP Request</option>
            </select>
          </div>

          {connectionType !== 'SQS' && connectionType !== 'HTTP' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Host:</label>
                <input
                  id="host"
                  type="text"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Usuario:
                </label>
                <input
                  id="username"
                  type="text"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contraseña:
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </>
          )}

          {renderFormFields()}

          <div className="flex space-x-2 pt-2 border-t border-gray-200">
            <button
              type="submit"
              className="px-3 py-1 bg-wiki-blue text-white text-sm hover:bg-wiki-lightblue"
            >
              Agregar Prueba
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-gray-500 text-white text-sm hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
