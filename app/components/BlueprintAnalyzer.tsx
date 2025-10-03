'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Container,
  Globe,
  Database,
  Settings,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Copy,
  Search,
  BarChart3,
  Bot,
  FileText,
  Zap,
} from 'lucide-react';
import PageHeader from './PageHeader';
import Breadcrumbs from './Breadcrumbs';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface Route {
  id: string;
  address: string;
  protocol: string;
  type: string;
  path?: string;
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

interface ExternalService {
  name: string;
  url: string;
  type: string;
  description: string;
  method?: string;
  properties?: string[];
}

interface BlueprintAnalysis {
  serviceName: string;
  routes: Route[];
  dependencies: Dependency[];
  dataSources: DataSource[];
  properties: Property[];
  externalServices: ExternalService[];
}

interface BlueprintAnalyzerProps {
  serviceName: string;
  onBack: () => void;
  onHistoryOpen: () => void;
  onChatOpen: () => void;
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
  const [rawXml, setRawXml] = useState<string>('');
  const [xmlLoading, setXmlLoading] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [configSearchTerm, setConfigSearchTerm] = useState('');
  const [summaryType, setSummaryType] = useState<'detailed' | 'compact'>(
    'detailed'
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');

  // Función para generar nodos y edges del gráfico
  const generateGraphData = (analysis: BlueprintAnalysis) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Nodo central del servicio
    nodes.push({
      id: 'service',
      type: 'default',
      position: { x: 400, y: 200 },
      data: {
        label: (
          <div className="text-center w-full relative group">
            <div
              className="font-bold text-blue-600 truncate"
              title={analysis.serviceName}
            >
              {analysis.serviceName}
            </div>
            <div className="text-xs text-gray-500">Servicio Principal</div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              <div className="font-semibold">{analysis.serviceName}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        ),
      },
      style: {
        background: '#dbeafe',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '160px',
        maxWidth: '200px',
        textAlign: 'center',
        fontSize: '14px',
        lineHeight: '1.4',
      },
    });

    // Nodos de Data Sources
    analysis.dataSources.forEach((ds, index) => {
      const nodeId = `datasource-${index}`;
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: 100,
          y: 100 + index * 160,
        },
        data: {
          label: (
            <div className="text-center w-full relative group">
              <div
                className="font-bold text-purple-600 truncate"
                title={ds.name}
              >
                {ds.name}
              </div>
              <div className="text-xs text-gray-500 truncate" title={ds.type}>
                {ds.type}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="font-semibold">{ds.name}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          ),
        },
        style: {
          background: '#f3e8ff',
          border: '2px solid #8b5cf6',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '160px',
          maxWidth: '200px',
          textAlign: 'center',
          fontSize: '14px',
          lineHeight: '1.4',
        },
      });

      // Edge del servicio a la data source
      edges.push({
        id: `service-to-${nodeId}`,
        source: 'service',
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        label: 'Usa',
      });
    });

    // Nodos de Servicios Externos
    analysis.externalServices.forEach((service, index) => {
      const nodeId = `external-${index}`;
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: 700,
          y: 100 + index * 160,
        },
        data: {
          label: (
            <div className="text-center w-full relative group">
              <div
                className="font-bold text-orange-600 truncate"
                title={service.name}
              >
                {service.name}
              </div>
              <div
                className="text-xs text-gray-500 truncate"
                title={service.type}
              >
                {service.type}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="font-semibold">{service.name}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          ),
        },
        style: {
          background: '#fed7aa',
          border: '2px solid #f97316',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '160px',
          maxWidth: '200px',
          textAlign: 'center',
          fontSize: '14px',
          lineHeight: '1.4',
        },
      });

      // Edge del servicio a servicios externos
      edges.push({
        id: `service-to-${nodeId}`,
        source: 'service',
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: '#f97316', strokeWidth: 2 },
        label: 'Invoca',
      });
    });

    return { nodes, edges };
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(text);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const generateSummary = async () => {
    if (!analysis) return;

    setSummaryLoading(true);
    try {
      // Obtener las credenciales del localStorage (mismo que usa el chat)
      const apiKey = localStorage.getItem('openai_api_key');
      const systemPrompt =
        localStorage.getItem('openai_system_prompt') ||
        'Eres un asistente útil especializado en análisis de arquitecturas de software.';

      if (!apiKey) {
        setSummary(
          'Error: No se encontraron credenciales de OpenAI. Configúralas en el sidebar del Chat.'
        );
        return;
      }

      // Obtener el XML del blueprint
      const xmlResponse = await fetch(`/api/blueprint-xml/${serviceName}`);
      if (!xmlResponse.ok) {
        throw new Error('No se pudo obtener el blueprint XML');
      }
      const blueprintXml = await xmlResponse.text();

      // Prompts específicos para cada tipo de resumen
      const prompts = {
        detailed: `Analiza este blueprint.xml de Apache Camel del servicio "${analysis.serviceName}" y genera un resumen detallado que incluya:

1. **Arquitectura del Servicio**: Descripción general de la funcionalidad
2. **Rutas Expuestas**: Lista de endpoints, protocolos y paths
3. **Dependencias**: Beans, servicios internos y componentes
4. **Data Sources**: Bases de datos y conexiones configuradas
5. **Servicios Externos**: APIs y servicios que invoca
6. **Configuración**: Propiedades y parámetros importantes
7. **Flujo de Datos**: Cómo fluyen los datos a través del servicio
8. **Consideraciones Técnicas**: Aspectos importantes para desarrollo/mantenimiento

Blueprint XML:
\`\`\`xml
${blueprintXml}
\`\`\``,

        compact: `Analiza este blueprint.xml de Apache Camel del servicio "${analysis.serviceName}" y genera un resumen compacto que incluya:

1. **Propósito**: ¿Qué hace este servicio?
2. **Endpoints**: Principales rutas expuestas
3. **Dependencias**: Bases de datos y servicios externos clave
4. **Configuración**: Parámetros más importantes

Blueprint XML:
\`\`\`xml
${blueprintXml}
\`\`\``,
      };

      const prompt = prompts[summaryType];

      // Llamar directamente a la API de OpenAI con las credenciales del localStorage
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 2000,
            temperature: 0.7,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSummary(
          data.choices[0]?.message?.content || 'No se pudo generar el resumen'
        );
      } else {
        const errorData = await response.json();
        setSummary(
          `Error al generar el resumen: ${
            errorData.error?.message || 'Error desconocido'
          }`
        );
      }
    } catch (error) {
      console.error('Error al generar resumen:', error);
      setSummary(
        `Error al generar el resumen: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);

    // Si es el tab de XML y no tenemos el contenido aún, cargarlo
    if (tabId === 'rawxml' && !rawXml) {
      setXmlLoading(true);
      try {
        // Pequeño delay para mostrar el estado de carga
        await new Promise((resolve) => setTimeout(resolve, 500));

        const response = await fetch(`/api/blueprint-xml/${serviceName}`);
        if (response.ok) {
          const xmlContent = await response.text();
          setRawXml(xmlContent);
        }
      } catch (error) {
        console.error('Error loading XML:', error);
      } finally {
        setXmlLoading(false);
      }
    }
  };

  const tabs = [
    { id: 'routes', label: 'Rutas', icon: Globe },
    { id: 'dependencies', label: 'Dependencias', icon: Database },
    { id: 'datasources', label: 'Data Sources', icon: Database },
    { id: 'external', label: 'Servicios Externos', icon: ExternalLink },
    { id: 'graph', label: 'Gráfico', icon: BarChart3 },
    { id: 'properties', label: 'Configuración', icon: Settings },
    { id: 'summary', label: 'Resumir con IA', icon: Bot },
    { id: 'rawxml', label: 'XML Crudo', icon: Container },
  ];

  useEffect(() => {
    const analyzeBlueprint = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener el XML del blueprint real
        const response = await fetch(`/api/blueprint-xml/${serviceName}`);
        if (!response.ok) {
          throw new Error('No se pudo obtener el blueprint XML');
        }
        const xmlContent = await response.text();
        // No almacenar XML aquí, se cargará cuando se acceda al tab

        // Parsear el XML para extraer información
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        // Extraer rutas
        const routes: Route[] = [];
        const routeElements = xmlDoc.querySelectorAll('route');
        routeElements.forEach((routeEl) => {
          const id = routeEl.getAttribute('id') || '';
          const fromEl = routeEl.querySelector('from');
          const address = fromEl?.getAttribute('uri') || '';

          // Detectar protocolo y tipo
          let protocol = 'Other';
          let type = 'Other';
          let path = '';

          if (address.startsWith('rest:')) {
            protocol = 'HTTP';
            type = 'REST';
            // Extraer path del URI REST
            const pathMatch = address.match(/rest:([^?]+)/);
            path = pathMatch ? pathMatch[1] : address;
          } else if (address.startsWith('cxfrs:')) {
            protocol = 'HTTP';
            type = 'REST';
            // Extraer path del URI CXF REST
            const pathMatch = address.match(/cxfrs:([^?]+)/);
            path = pathMatch ? pathMatch[1] : address;
          } else if (address.startsWith('cxf:')) {
            protocol = 'SOAP';
            type = 'SOAP';
            path = address;
          } else if (address.startsWith('http:')) {
            protocol = 'HTTP';
            type = 'HTTP';
            path = address;
          } else if (address.startsWith('https:')) {
            protocol = 'HTTPS';
            type = 'HTTP';
            path = address;
          } else if (address.startsWith('direct:')) {
            protocol = 'Direct';
            type = 'Internal';
            path = address;
          } else if (address.startsWith('vm:')) {
            protocol = 'VM';
            type = 'Internal';
            path = address;
          } else if (address.startsWith('timer:')) {
            protocol = 'Timer';
            type = 'Scheduled';
            path = address;
          } else if (address.startsWith('file:')) {
            protocol = 'File';
            type = 'File System';
            path = address;
          } else if (address.startsWith('ftp:')) {
            protocol = 'FTP';
            type = 'File Transfer';
            path = address;
          } else if (address.startsWith('jms:')) {
            protocol = 'JMS';
            type = 'Message Queue';
            path = address;
          } else if (address.startsWith('amqp:')) {
            protocol = 'AMQP';
            type = 'Message Queue';
            path = address;
          } else if (address.startsWith('kafka:')) {
            protocol = 'Kafka';
            type = 'Message Queue';
            path = address;
          } else if (address.startsWith('sql:')) {
            protocol = 'SQL';
            type = 'Database';
            path = address;
          } else if (address.startsWith('jdbc:')) {
            protocol = 'JDBC';
            type = 'Database';
            path = address;
          }

          routes.push({
            id,
            address,
            protocol,
            type,
            path: path || address,
            description: `Ruta ${id}`,
          });
        });

        // Extraer dependencias
        const dependencies: Dependency[] = [];
        const beanElements = xmlDoc.querySelectorAll('bean');
        beanElements.forEach((beanEl) => {
          const id = beanEl.getAttribute('id') || '';
          const className = beanEl.getAttribute('class') || '';
          const type = className.includes('DataSource')
            ? 'Database'
            : 'Service';

          dependencies.push({
            name: id,
            type,
            description: `Bean ${id}`,
            properties: [],
          });
        });

        // Extraer data sources
        const dataSources: DataSource[] = [];
        const dataSourceElements = xmlDoc.querySelectorAll(
          'bean[class*="DataSource"]'
        );
        dataSourceElements.forEach((dsEl) => {
          const id = dsEl.getAttribute('id') || '';
          const className = dsEl.getAttribute('class') || '';

          // Detectar tipo de base de datos
          let dbType = 'Unknown';
          if (className.includes('HikariDataSource')) {
            dbType = 'HikariCP';
          } else if (className.includes('BasicDataSource')) {
            dbType = 'Apache Commons DBCP';
          } else if (className.includes('DriverManagerDataSource')) {
            dbType = 'DriverManager';
          } else if (className.includes('SingleConnectionDataSource')) {
            dbType = 'Single Connection';
          } else if (className.includes('DataSource')) {
            dbType = 'Generic DataSource';
          }

          // Detectar tipo de base de datos por URL o driver
          const properties: string[] = [];
          const propElements = dsEl.querySelectorAll('property');
          let detectedDb = '';

          propElements.forEach((propEl) => {
            const name = propEl.getAttribute('name') || '';
            const value = propEl.getAttribute('value') || '';

            // Solo incluir propiedades importantes para Data Sources
            const importantProps = [
              'url',
              'jdbcUrl',
              'username',
              'password',
              'driverClassName',
            ];
            if (importantProps.includes(name) && value) {
              properties.push(`${name}: ${value}`);
            }

            // Detectar tipo de DB por URL
            if (name === 'url' && value) {
              if (value.includes('mysql://')) {
                detectedDb = 'MySQL';
              } else if (value.includes('postgresql://')) {
                detectedDb = 'PostgreSQL';
              } else if (value.includes('oracle:')) {
                detectedDb = 'Oracle';
              } else if (value.includes('sqlserver://')) {
                detectedDb = 'SQL Server';
              } else if (value.includes('h2:')) {
                detectedDb = 'H2';
              } else if (value.includes('derby:')) {
                detectedDb = 'Apache Derby';
              } else if (value.includes('db2:')) {
                detectedDb = 'DB2';
              }
            }

            // Detectar tipo de DB por driver
            if (name === 'driverClassName' && value) {
              if (value.includes('mysql')) {
                detectedDb = 'MySQL';
              } else if (value.includes('postgresql')) {
                detectedDb = 'PostgreSQL';
              } else if (value.includes('oracle')) {
                detectedDb = 'Oracle';
              } else if (value.includes('sqlserver')) {
                detectedDb = 'SQL Server';
              } else if (value.includes('h2')) {
                detectedDb = 'H2';
              } else if (value.includes('derby')) {
                detectedDb = 'Apache Derby';
              } else if (value.includes('db2')) {
                detectedDb = 'DB2';
              }
            }
          });

          // Usar el tipo detectado o el tipo de conexión
          const finalType = detectedDb || dbType;

          dataSources.push({
            name: id,
            type: finalType,
            properties,
          });
        });

        // Extraer servicios externos
        const externalServices: ExternalService[] = [];
        const toElements = xmlDoc.querySelectorAll('to');
        toElements.forEach((toEl) => {
          const uri = toEl.getAttribute('uri') || '';

          // Detectar servicios externos (HTTP, REST, etc.)
          if (
            uri.startsWith('http://') ||
            uri.startsWith('https://') ||
            uri.startsWith('rest:') ||
            uri.startsWith('cxf:')
          ) {
            const method = uri.includes('rest:') ? 'REST' : 'HTTP';
            const serviceName =
              uri.split('/').pop() ||
              uri.split(':').pop() ||
              'Servicio Externo';

            // Buscar propiedades de configuración relacionadas con la URL del servicio
            const serviceProperties: string[] = [];
            const propertyElements = xmlDoc.querySelectorAll('property');
            propertyElements.forEach((propEl) => {
              const name = propEl.getAttribute('name') || '';
              const value = propEl.getAttribute('value') || '';

              // Buscar propiedades que contengan la URL específica o patrones de URL
              if (
                value.includes(uri) ||
                (value.includes('http') &&
                  (name.toLowerCase().includes('url') ||
                    name.toLowerCase().includes('endpoint') ||
                    name.toLowerCase().includes('host') ||
                    name.toLowerCase().includes('base') ||
                    name.toLowerCase().includes('api')))
              ) {
                serviceProperties.push(`${name}: ${value}`);
              }
            });

            externalServices.push({
              name: serviceName,
              url: uri,
              type: method,
              description: `Servicio externo ${serviceName}`,
              method: method,
              properties: serviceProperties,
            });
          }
        });

        // Extraer propiedades
        const properties: Property[] = [];
        const propertyElements = xmlDoc.querySelectorAll('property');
        propertyElements.forEach((propEl) => {
          const name = propEl.getAttribute('name') || '';
          const value = propEl.getAttribute('value') || '';

          if (name && value) {
            properties.push({
              name,
              value,
              description: `Propiedad ${name}`,
            });
          }
        });

        const analysis: BlueprintAnalysis = {
          serviceName: serviceName,
          routes,
          dependencies,
          dataSources,
          externalServices,
          properties,
        };

        setAnalysis(analysis);
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
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Analizando blueprint...</p>
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
                    onClick={() => handleTabChange(tab.id)}
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
          <div className="flex-1 w-full max-w-4xl">
            {activeTab === 'routes' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Endpoints REST y servicios expuestos
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Rutas Expuestas
                    </h2>
                  </div>

                  {/* Contador de rutas internas */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Internas:{' '}
                      {
                        analysis.routes.filter(
                          (route) =>
                            route.protocol === 'Internal' ||
                            route.address.startsWith('direct:') ||
                            route.address.startsWith('vm:')
                        ).length
                      }
                    </span>
                    <span className="text-sm text-gray-500">
                      Total: {analysis.routes.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1">
                  {analysis.routes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Globe className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">
                        No hay rutas expuestas
                      </p>
                      <p className="text-sm">
                        Este servicio no expone ninguna ruta REST
                      </p>
                    </div>
                  ) : (
                    analysis.routes.map((route, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">
                            {route.id}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              route.type === 'REST'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {route.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Path:</strong> {route.path || route.address}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Protocolo:</strong> {route.protocol}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Tipo:</strong> {route.type}
                        </p>
                        {route.description && (
                          <p className="text-sm text-gray-500">
                            {route.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dependencies' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative group">
                    <Database className="w-5 h-5 text-blue-600" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Beans y servicios internos del sistema
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Dependencias
                  </h2>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1">
                  {analysis.dependencies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Database className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No hay dependencias</p>
                      <p className="text-sm">
                        Este servicio no tiene dependencias internas
                      </p>
                    </div>
                  ) : (
                    analysis.dependencies.map((dep, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            {dep.name}
                          </span>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {dep.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {dep.description}
                        </p>
                        <div className="space-y-2">
                          {dep.properties.map((prop, propIndex) => (
                            <div
                              key={propIndex}
                              className="flex items-center justify-between bg-gray-50 rounded-md p-2 border"
                            >
                              <div className="flex-1">
                                <code className="text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono">
                                  {prop}
                                </code>
                              </div>
                              <button
                                onClick={() => copyToClipboard(prop)}
                                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors relative group"
                                title={
                                  copiedItem === prop
                                    ? '¡Copiado!'
                                    : 'Copiar valor'
                                }
                              >
                                <Copy
                                  className={`w-4 h-4 transition-colors ${
                                    copiedItem === prop
                                      ? 'text-blue-600'
                                      : 'text-gray-500 hover:text-blue-600'
                                  }`}
                                />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                  {copiedItem === prop
                                    ? '¡Copiado!'
                                    : 'Copiar valor'}
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'datasources' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative group">
                    <Database className="w-5 h-5 text-blue-600" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Configuración de bases de datos
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Data Sources
                  </h2>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1">
                  {analysis.dataSources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Database className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No hay data sources</p>
                      <p className="text-sm">
                        Este servicio no tiene fuentes de datos configuradas
                      </p>
                    </div>
                  ) : (
                    analysis.dataSources.map((ds, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Database className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            {ds.name}
                          </span>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {ds.type}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {ds.properties.map((prop, propIndex) => {
                            const [name, value] = prop.split(': ');

                            // Mapear nombres de propiedades a etiquetas más amigables
                            const propertyLabels: { [key: string]: string } = {
                              url: 'URL',
                              jdbcUrl: 'URL',
                              username: 'Usuario',
                              password: 'Contraseña',
                              driverClassName: 'Driver',
                            };

                            return (
                              <div
                                key={propIndex}
                                className="flex items-center justify-between bg-gray-50 rounded-md p-2 border"
                              >
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {propertyLabels[name] || name}:
                                  </span>
                                  <code className="ml-2 text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono">
                                    {value}
                                  </code>
                                </div>
                                <button
                                  onClick={() => copyToClipboard(value)}
                                  className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors relative group"
                                  title={
                                    copiedItem === value
                                      ? '¡Copiado!'
                                      : 'Copiar valor'
                                  }
                                >
                                  <Copy
                                    className={`w-4 h-4 transition-colors ${
                                      copiedItem === value
                                        ? 'text-blue-600'
                                        : 'text-gray-500 hover:text-blue-600'
                                    }`}
                                  />
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                    {copiedItem === value
                                      ? '¡Copiado!'
                                      : 'Copiar valor'}
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'external' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative group">
                    <ExternalLink className="w-5 h-5 text-blue-600" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Servicios HTTP, REST y SOAP externos
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Servicios Externos
                  </h2>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1">
                  {analysis.externalServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <ExternalLink className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">
                        No hay servicios externos
                      </p>
                      <p className="text-sm">
                        Este servicio no invoca servicios externos
                      </p>
                    </div>
                  ) : (
                    analysis.externalServices.map((service, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            {service.name}
                          </span>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {service.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>URL:</strong> {service.url}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Método:</strong> {service.method || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {service.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'graph' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative group">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Diagrama de dependencias del servicio
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Gráfico de Dependencias
                  </h2>
                </div>
                <div className="flex-1 border rounded-lg overflow-hidden">
                  {analysis && (
                    <ReactFlow
                      nodes={generateGraphData(analysis).nodes}
                      edges={generateGraphData(analysis).edges}
                      fitView
                      fitViewOptions={{
                        padding: 0.2,
                        minZoom: 0.3,
                        maxZoom: 1.5,
                      }}
                      defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
                      attributionPosition="bottom-left"
                    >
                      <Background />
                      <Controls />
                      <MiniMap
                        nodeColor="#e5e7eb"
                        maskColor="rgba(0, 0, 0, 0.1)"
                        style={{
                          width: 120,
                          height: 80,
                        }}
                      />
                    </ReactFlow>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <Settings className="w-5 h-5 text-blue-600" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Propiedades y configuración del sistema
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Configuración
                    </h2>
                  </div>

                  {/* Barra de búsqueda */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
                    <input
                      type="text"
                      placeholder="Buscar configuración..."
                      value={configSearchTerm}
                      onChange={(e) => setConfigSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                    />
                  </div>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1">
                  {analysis.properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Settings className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">
                        No hay configuración
                      </p>
                      <p className="text-sm">
                        Este servicio no tiene propiedades de configuración
                      </p>
                    </div>
                  ) : (
                    (() => {
                      // Filtrar propiedades basado en la búsqueda
                      const filteredProperties = analysis.properties.filter(
                        (prop) =>
                          prop.name
                            .toLowerCase()
                            .includes(configSearchTerm.toLowerCase()) ||
                          prop.value
                            .toLowerCase()
                            .includes(configSearchTerm.toLowerCase()) ||
                          (prop.description &&
                            prop.description
                              .toLowerCase()
                              .includes(configSearchTerm.toLowerCase()))
                      );

                      if (filteredProperties.length === 0 && configSearchTerm) {
                        return (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Search className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium">
                              No se encontraron resultados
                            </p>
                            <p className="text-sm">
                              No hay propiedades que coincidan con "
                              {configSearchTerm}"
                            </p>
                          </div>
                        );
                      }

                      return filteredProperties.map((prop, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Settings className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">
                              {prop.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 rounded-md p-2 border">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-700">
                                Valor:
                              </span>
                              <code className="ml-2 text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono">
                                {prop.value}
                              </code>
                            </div>
                            <button
                              onClick={() => copyToClipboard(prop.value)}
                              className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors relative group"
                              title={
                                copiedItem === prop.value
                                  ? '¡Copiado!'
                                  : 'Copiar valor'
                              }
                            >
                              <Copy
                                className={`w-4 h-4 transition-colors ${
                                  copiedItem === prop.value
                                    ? 'text-blue-600'
                                    : 'text-gray-500 hover:text-blue-600'
                                }`}
                              />
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                {copiedItem === prop.value
                                  ? '¡Copiado!'
                                  : 'Copiar valor'}
                              </div>
                            </button>
                          </div>
                          {prop.description && (
                            <p className="text-xs text-gray-500">
                              {prop.description}
                            </p>
                          )}
                        </div>
                      ));
                    })()
                  )}
                </div>
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[700px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Resumen inteligente del análisis del blueprint
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Resumir con IA
                    </h2>
                  </div>
                  {summary && (
                    <div className="relative group">
                      <button
                        onClick={() => copyToClipboard(summary)}
                        className="flex items-center justify-center w-6 h-6 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Copiar resumen
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles de resumen */}
                {!summary && (
                  <div className="mb-6">
                    <div className="flex space-x-3 mb-4">
                      <label className="cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="summaryType"
                          value="compact"
                          checked={summaryType === 'compact'}
                          onChange={(e) =>
                            setSummaryType(
                              e.target.value as 'detailed' | 'compact'
                            )
                          }
                          className="sr-only"
                        />
                        <div
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            summaryType === 'compact'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col h-12">
                            <span className="text-sm font-medium text-gray-700 mb-0.5">
                              Compacto
                            </span>
                            <span className="text-xs text-gray-500 leading-tight">
                              Resumen ejecutivo con propósito, endpoints
                              principales y dependencias clave
                            </span>
                          </div>
                        </div>
                      </label>
                      <label className="cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="summaryType"
                          value="detailed"
                          checked={summaryType === 'detailed'}
                          onChange={(e) =>
                            setSummaryType(
                              e.target.value as 'detailed' | 'compact'
                            )
                          }
                          className="sr-only"
                        />
                        <div
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            summaryType === 'detailed'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col h-12">
                            <span className="text-sm font-medium text-gray-700 mb-0.5">
                              Detallado
                            </span>
                            <span className="text-xs text-gray-500 leading-tight">
                              Resumen exhaustivo con arquitectura, dependencias,
                              configuración y flujos de datos
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Contenido del resumen */}
                <div className="flex-1 overflow-y-auto">
                  {summary ? (
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-xl font-bold text-gray-900 mb-3 mt-4 first:mt-0">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-lg font-semibold text-gray-900 mb-2 mt-3 first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-base font-semibold text-gray-900 mb-2 mt-2 first:mt-0">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="mb-3 text-gray-700 leading-relaxed">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal list-outside mb-3 space-y-1 pl-4 text-gray-700">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed">{children}</li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-gray-200 p-3 rounded-lg overflow-x-auto text-sm font-mono text-gray-800 mb-3">
                                {children}
                              </pre>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-gray-900">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-start h-full text-gray-500 pt-8">
                      <Bot className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium mb-2">
                        Genera un resumen inteligente
                      </p>
                      <p className="text-sm text-center max-w-md mb-4">
                        Selecciona el tipo de resumen y haz clic en "Generar
                        Resumen" para obtener un análisis inteligente del
                        blueprint.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mb-4">
                        <p className="text-xs text-blue-800 text-center">
                          <strong>Nota:</strong> Asegúrate de configurar tus
                          credenciales de OpenAI en el sidebar del Chat para
                          usar esta funcionalidad.
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={generateSummary}
                          disabled={summaryLoading}
                          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {summaryLoading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Bot className="w-5 h-5" />
                          )}
                          <span className="font-medium">
                            {summaryLoading
                              ? 'Generando...'
                              : 'Generar Resumen'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rawxml' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative group">
                    <Container className="w-5 h-5 text-blue-600" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                      Código fuente XML del blueprint
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    XML Crudo
                  </h2>
                </div>
                {xmlLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="flex flex-col items-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm text-gray-600">Cargando XML...</p>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden flex-1 overflow-y-auto">
                    <SyntaxHighlighter
                      language="xml"
                      style={oneLight}
                      showLineNumbers={true}
                      wrapLines={true}
                      wrapLongLines={true}
                      customStyle={{
                        margin: 0,
                        fontSize: '14px',
                        lineHeight: '1.5',
                        height: '100%',
                      }}
                    >
                      {rawXml}
                    </SyntaxHighlighter>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
