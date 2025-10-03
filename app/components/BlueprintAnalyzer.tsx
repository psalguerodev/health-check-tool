'use client';

import React, { useState, useEffect } from 'react';
import { Container, Globe, Database, Settings, ArrowLeft } from 'lucide-react';
import PageHeader from './PageHeader';
import Breadcrumbs from './Breadcrumbs';

interface Route {
  id: string;
  address: string;
  protocol: string;
  type: string;
  description?: string;
}

interface Dependency {
  name: string;
  type: string;
  description: string;
  properties: string[];
}

interface DataSource {
  name: string;
  type: string;
  properties: string[];
}

interface Property {
  name: string;
  value: string;
  description?: string;
}

interface BlueprintAnalysis {
  serviceName: string;
  routes: Route[];
  dependencies: Dependency[];
  dataSources: DataSource[];
  properties: Property[];
}

interface BlueprintAnalyzerProps {
  serviceName: string;
  onBack: () => void;
  onHistoryOpen?: () => void;
  onChatOpen?: () => void;
}

export default function BlueprintAnalyzer({
  serviceName,
  onBack,
  onHistoryOpen,
  onChatOpen,
}: BlueprintAnalyzerProps) {
  const [analysis, setAnalysis] = useState<BlueprintAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('routes');

  const tabs = [
    { id: 'routes', label: 'Rutas', icon: Globe },
    { id: 'dependencies', label: 'Dependencias', icon: Database },
    { id: 'datasources', label: 'Data Sources', icon: Database },
    { id: 'properties', label: 'Configuración', icon: Settings },
  ];

  useEffect(() => {
    const analyzeBlueprint = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simular análisis del blueprint
        const mockAnalysis: BlueprintAnalysis = {
          serviceName: serviceName,
          routes: [
            {
              id: 'user-service',
              address: '/api/users',
              protocol: 'HTTP',
              type: 'REST',
              description: 'Servicio de gestión de usuarios',
            },
            {
              id: 'notification-service',
              address: '/api/notifications',
              protocol: 'HTTP',
              type: 'REST',
              description: 'Servicio de notificaciones',
            },
          ],
          dependencies: [
            {
              name: 'PostgreSQL',
              type: 'Database',
              description: 'Base de datos principal',
              properties: ['host: localhost', 'port: 5432', 'database: myapp'],
            },
            {
              name: 'Redis',
              type: 'Cache',
              description: 'Cache de sesiones',
              properties: ['host: localhost', 'port: 6379'],
            },
          ],
          dataSources: [
            {
              name: 'user-db',
              type: 'PostgreSQL',
              properties: [
                'jdbc:postgresql://localhost:5432/users',
                'username: admin',
                'password: secret',
              ],
            },
            {
              name: 'cache-db',
              type: 'Redis',
              properties: ['redis://localhost:6379', 'timeout: 5000ms'],
            },
          ],
          properties: [
            {
              name: 'server.port',
              value: '8080',
              description: 'Puerto del servidor',
            },
            {
              name: 'spring.datasource.url',
              value: 'jdbc:postgresql://localhost:5432/myapp',
              description: 'URL de conexión a la base de datos',
            },
            {
              name: 'logging.level',
              value: 'INFO',
              description: 'Nivel de logging',
            },
          ],
        };

        setAnalysis(mockAnalysis);
      } catch (err) {
        setError('Error al analizar el blueprint');
        console.error('Error analyzing blueprint:', err);
      } finally {
        setLoading(false);
      }
    };

    analyzeBlueprint();
  }, [serviceName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          icon={Container}
          iconColor="text-blue-600"
          title={`Análisis: ${serviceName}`}
          description="Análisis detallado del Blueprint XML del servicio"
          onHistoryOpen={onHistoryOpen}
          onChatOpen={onChatOpen}
          currentPage="camel"
          showSectionFilter={true}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: 'Camel', href: '/camel' },
              { label: serviceName, current: true },
            ]}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analizando blueprint...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageHeader
          icon={Container}
          iconColor="text-blue-600"
          title={`Análisis: ${serviceName}`}
          description="Análisis detallado del Blueprint XML del servicio"
          onHistoryOpen={onHistoryOpen}
          onChatOpen={onChatOpen}
          currentPage="camel"
          showSectionFilter={true}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: 'Camel', href: '/camel' },
              { label: serviceName, current: true },
            ]}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
            </div>
            <p className="text-red-700 mt-2">
              {error || 'No se pudo cargar el análisis'}
            </p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        icon={Container}
        iconColor="text-blue-600"
        title={`Análisis: ${analysis?.serviceName || serviceName}`}
        description="Análisis detallado del Blueprint XML del servicio"
        onHistoryOpen={onHistoryOpen}
        onChatOpen={onChatOpen}
        currentPage="camel"
        showSectionFilter={true}
      />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs
          items={[
            { label: 'Camel', href: '/camel' },
            { label: analysis?.serviceName || serviceName, current: true },
          ]}
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar con tabs verticales */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-3 ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenido del tab activo */}
          <div className="flex-1">
            {activeTab === 'routes' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Rutas Expuestas
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.routes.map((route, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {route.id}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            route.type === 'REST'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {route.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Endpoint:</strong> {route.address}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Protocolo:</strong> {route.protocol}
                      </p>
                      {route.description && (
                        <p className="text-sm text-gray-500">
                          {route.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dependencies' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Dependencias
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.dependencies.map((dep, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Database className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          {dep.name}
                        </span>
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          {dep.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {dep.description}
                      </p>
                      <div className="space-y-1">
                        {dep.properties.map((prop, propIndex) => (
                          <p key={propIndex} className="text-xs text-gray-500">
                            {prop}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'datasources' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Data Sources
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.dataSources.map((ds, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Database className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-gray-900">
                          {ds.name}
                        </span>
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                          {ds.type}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {ds.properties.map((prop, propIndex) => (
                          <p key={propIndex} className="text-xs text-gray-500">
                            {prop}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Configuración
                  </h2>
                </div>
                <div className="space-y-3">
                  {analysis.properties.map((prop, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Settings className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-gray-900">
                          {prop.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Valor:</strong> {prop.value}
                      </p>
                      {prop.description && (
                        <p className="text-xs text-gray-500">
                          {prop.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
