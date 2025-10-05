'use client';

import React, { useState } from 'react';
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
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
} from 'lucide-react';
import PageHeader from '../PageHeader';
import Breadcrumbs from '../Breadcrumbs';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { BlueprintAnalyzerProps } from './types';
import {
  useBlueprintAnalysis,
  useXmlSearch,
  useClipboard,
  useSummary,
} from './hooks';
import { highlightXML } from './utils';
import { GraphService } from './graphService';
import { XmlOptimizer, XmlOptimizationOptions } from './xmlOptimizer';
import { TABS, PROPERTY_LABELS } from './constants';

export default function BlueprintAnalyzer({
  serviceName,
  onBack,
  onHistoryOpen,
  onChatOpen,
}: BlueprintAnalyzerProps) {
  const { analysis, loading, error } = useBlueprintAnalysis(serviceName);
  const [activeTab, setActiveTab] = useState('routes');
  const [rawXml, setRawXml] = useState<string>('');
  const [xmlLoading, setXmlLoading] = useState(false);
  const [configSearchTerm, setConfigSearchTerm] = useState('');
  const [isXmlFullscreen, setIsXmlFullscreen] = useState(false);
  const [showAdditionalInstructions, setShowAdditionalInstructions] =
    useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');

  // Estados para optimización XML
  const [xmlOptimizationMode, setXmlOptimizationMode] = useState<
    'default' | 'full' | 'minimal' | 'custom'
  >('default');
  const [xmlOptimizationOptions, setXmlOptimizationOptions] =
    useState<XmlOptimizationOptions>(XmlOptimizer.getDefaultOptions());
  const [showXmlOptimization, setShowXmlOptimization] = useState(false);

  const { copiedItem, copyToClipboardWithFeedback } = useClipboard();
  const {
    summary,
    summaryLoading,
    summaryError,
    summaryType,
    setSummaryType,
    generateSummary,
    clearSummaryError,
  } = useSummary(analysis);

  // Funciones para manejar optimización XML
  const handleXmlOptimizationModeChange = (
    mode: 'default' | 'full' | 'minimal' | 'custom'
  ) => {
    setXmlOptimizationMode(mode);

    switch (mode) {
      case 'default':
        setXmlOptimizationOptions(XmlOptimizer.getDefaultOptions());
        break;
      case 'full':
        setXmlOptimizationOptions(XmlOptimizer.getFullProcessingOptions());
        break;
      case 'minimal':
        setXmlOptimizationOptions(XmlOptimizer.getMinimalProcessingOptions());
        break;
      case 'custom':
        // Mantener las opciones actuales
        break;
    }
  };

  const handleCustomOptimizationChange = (
    option: keyof XmlOptimizationOptions,
    value: boolean | number
  ) => {
    setXmlOptimizationOptions((prev) => ({
      ...prev,
      [option]: value,
    }));
  };

  const handleGenerateSummaryWithOptimization = () => {
    const finalInstructions = selectedFormat
      ? selectedFormat
      : additionalInstructions;
    generateSummary(finalInstructions, xmlOptimizationOptions);
  };

  const {
    xmlSearchTerm,
    setXmlSearchTerm,
    currentMatchIndex,
    totalMatches,
    xmlContainerRef,
    goToNextMatch,
    goToPreviousMatch,
    handleKeyDown,
  } = useXmlSearch(rawXml);

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
              {TABS.map((tab) => {
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
                      <Globe className="w-12 h-12 text-blue-300 mb-4" />
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

            {activeTab === 'externalServices' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Servicios externos detectados
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Servicios Externos
                    </h2>
                  </div>
                  <span className="text-sm text-gray-600">
                    Cantidad: {analysis?.externalServices?.length || 0}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {analysis?.externalServices &&
                  analysis.externalServices.length > 0 ? (
                    <div className="space-y-3">
                      {analysis.externalServices.map((service, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-medium text-gray-900">
                                  {service.name}
                                </h3>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    service.type === 'SOAP Service'
                                      ? 'bg-blue-100 text-blue-800'
                                      : service.type === 'REST Client'
                                      ? 'bg-green-100 text-green-800'
                                      : service.type === 'Database'
                                      ? 'bg-purple-100 text-purple-800'
                                      : service.type === 'Message Queue'
                                      ? 'bg-orange-100 text-orange-800'
                                      : service.type === 'Cloud Service'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {service.type}
                                </span>
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                  {service.protocol}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {service.description}
                              </p>
                              <div className="space-y-2">
                                {/* Bean y Configuración para servicios SOAP */}
                                {service.type === 'SOAP Service' &&
                                  service.name && (
                                    <div className="space-y-2">
                                      {/* Bean */}
                                      <div className="flex items-center space-x-2">
                                        <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded flex-1">
                                          bean:{service.name}
                                        </div>
                                        <button
                                          onClick={() =>
                                            copyToClipboardWithFeedback(
                                              `bean:${service.name}`
                                            )
                                          }
                                          className="p-1 hover:bg-gray-200 rounded transition-colors relative group"
                                          title="Copiar bean"
                                        >
                                          <Copy className="w-3 h-3 text-gray-500" />
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                            Copiar
                                          </div>
                                        </button>
                                      </div>

                                      {/* Configuración Property si está disponible */}
                                      {service.configProperty && (
                                        <div className="flex items-center space-x-2">
                                          <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded flex-1">
                                            {service.configProperty}
                                          </div>
                                          <button
                                            onClick={() =>
                                              copyToClipboardWithFeedback(
                                                service.configProperty || ''
                                              )
                                            }
                                            className="p-1 hover:bg-gray-200 rounded transition-colors relative group"
                                            title="Copiar configuración"
                                          >
                                            <Copy className="w-3 h-3 text-gray-500" />
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                              Copiar
                                            </div>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                {/* Endpoint para otros tipos de servicios (no SOAP) */}
                                {service.type !== 'SOAP Service' && (
                                  <div className="flex items-center space-x-2">
                                    <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded flex-1">
                                      {service.endpoint}
                                    </div>
                                    <button
                                      onClick={() =>
                                        copyToClipboardWithFeedback(
                                          service.endpoint
                                        )
                                      }
                                      className="p-1 hover:bg-gray-200 rounded transition-colors relative group"
                                      title="Copiar endpoint"
                                    >
                                      <Copy className="w-3 h-3 text-gray-500" />
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                        Copiar
                                      </div>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Globe className="w-12 h-12 text-blue-300 mb-4" />
                      <p className="text-lg font-medium">
                        No hay servicios externos
                      </p>
                      <p className="text-sm">
                        Este servicio no invoca servicios externos
                      </p>
                    </div>
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
                      <Database className="w-12 h-12 text-blue-300 mb-4" />
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
                                onClick={() =>
                                  copyToClipboardWithFeedback(prop)
                                }
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
                      <Database className="w-12 h-12 text-blue-300 mb-4" />
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

                            return (
                              <div
                                key={propIndex}
                                className="flex items-center justify-between bg-gray-50 rounded-md p-2 border"
                              >
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {PROPERTY_LABELS[name] || name}:
                                  </span>
                                  <code className="ml-2 text-sm text-gray-800 bg-gray-100 px-2 py-1 rounded font-mono">
                                    {value}
                                  </code>
                                </div>
                                <button
                                  onClick={() =>
                                    copyToClipboardWithFeedback(value)
                                  }
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
                      nodes={GraphService.generateGraphData(analysis).nodes}
                      edges={GraphService.generateGraphData(analysis).edges}
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
                      <Settings className="w-12 h-12 text-blue-300 mb-4" />
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
                            <Search className="w-12 h-12 text-blue-300 mb-4" />
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
                              onClick={() =>
                                copyToClipboardWithFeedback(prop.value)
                              }
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
                        onClick={() => copyToClipboardWithFeedback(summary)}
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
                    {/* Toggle para instrucciones adicionales */}
                    <div className="mb-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showAdditionalInstructions}
                          onChange={(e) =>
                            setShowAdditionalInstructions(e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          Agregar instrucciones adicionales
                        </span>
                      </label>

                      {showAdditionalInstructions && (
                        <div className="mt-3 space-y-3">
                          {/* Selector de formato predefinido */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Formato predefinido (opcional):
                            </label>
                            <select
                              value={selectedFormat}
                              onChange={(e) => {
                                setSelectedFormat(e.target.value);
                                if (e.target.value) {
                                  setAdditionalInstructions(e.target.value);
                                }
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Seleccionar formato...</option>
                              <option value="Genera un análisis detallado de servicios externos que este servicio consume. Incluye una tabla con columnas: Servicio, Protocolo, Endpoint/Config, Propósito, Criticidad. Analiza servicios REST externos con método HTTP, path y operaciones. Analiza servicios SOAP externos con beans y propiedades de configuración. Extrae propiedades de endpoint sin brackets/braces. Valida solo servicios que salen fuera del sistema actual. Identifica puntos críticos: servicios con alta criticidad, dependencias críticas para el negocio, servicios sin redundancia, endpoints sin autenticación. Incluye consideraciones técnicas: verificar configuración de conexiones, validar propiedades de endpoint configuradas correctamente, revisar timeouts y retry policies, validar certificados SSL/TLS, verificar disponibilidad de servicios externos.">
                                🔍 Análisis de Servicios Externos
                              </option>
                              <option value="Analiza el servicio para migración con enfoque en funcionalidad y complejidad. Identifica operaciones expuestas: endpoints REST/SOAP, métodos HTTP, paths, parámetros y respuestas. Mapea integraciones: bases de datos (tipo, conexiones, queries), colas (JMS, AMQP, Kafka, SQS), almacenamiento (S3, FTP, local), servicios externos (REST/SOAP con endpoints y configuración). Evalúa complejidad: rutas más complejas con múltiples transformaciones, validaciones complejas, flujos asíncronos, procesamiento batch, manejo de errores avanzado. Identifica dependencias críticas y puntos de integración que requieren atención especial en la migración.">
                                🚀 Análisis para Migración
                              </option>
                              <option value="Genera un reporte de arquitectura de integración. Crea un mapa de dependencias externas incluyendo servicios REST con endpoints, métodos y autenticación. Incluye servicios SOAP con beans, WSDL y configuración. Identifica propiedades de configuración y variables de entorno. Lista protocolos utilizados: HTTP, HTTPS, JMS, AMQP. Analiza flujo de datos: fuentes externas, transformaciones, destinos y formatos de respuesta. Incluye estrategias de manejo de errores. Evalúa riesgos: puntos de falla, latencia, seguridad y escalabilidad.">
                                🏗️ Arquitectura de Integración
                              </option>
                            </select>
                          </div>

                          {/* Textarea personalizado */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-xs font-medium text-gray-700">
                                Instrucciones personalizadas:
                              </label>
                              {additionalInstructions && (
                                <button
                                  onClick={() => {
                                    setAdditionalInstructions('');
                                    setSelectedFormat('');
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                  Limpiar
                                </button>
                              )}
                            </div>
                            <textarea
                              value={additionalInstructions}
                              onChange={(e) => {
                                setAdditionalInstructions(e.target.value);
                                if (e.target.value !== selectedFormat) {
                                  setSelectedFormat('');
                                }
                              }}
                              placeholder="Ej: Genera una tabla de dependencias externas, crea una lista de endpoints con sus métodos, enfócate en aspectos de seguridad, analiza flujos de datos específicos..."
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Optimización XML */}
                    <div className="mb-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showXmlOptimization}
                          onChange={(e) =>
                            setShowXmlOptimization(e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-xs font-medium text-gray-700">
                          Optimizar procesamiento XML
                        </span>
                      </label>

                      {showXmlOptimization && (
                        <div className="mt-3 space-y-3">
                          {/* Modo de optimización */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Modo de procesamiento:
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  handleXmlOptimizationModeChange('default')
                                }
                                className={`px-3 py-2 text-xs rounded border ${
                                  xmlOptimizationMode === 'default'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                Por defecto
                              </button>
                              <button
                                onClick={() =>
                                  handleXmlOptimizationModeChange('minimal')
                                }
                                className={`px-3 py-2 text-xs rounded border ${
                                  xmlOptimizationMode === 'minimal'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                Mínimo
                              </button>
                              <button
                                onClick={() =>
                                  handleXmlOptimizationModeChange('full')
                                }
                                className={`px-3 py-2 text-xs rounded border ${
                                  xmlOptimizationMode === 'full'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                Completo
                              </button>
                              <button
                                onClick={() =>
                                  handleXmlOptimizationModeChange('custom')
                                }
                                className={`px-3 py-2 text-xs rounded border ${
                                  xmlOptimizationMode === 'custom'
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                Personalizado
                              </button>
                            </div>
                          </div>

                          {/* Opciones personalizadas */}
                          {xmlOptimizationMode === 'custom' && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-700 mb-2">
                                Incluir en el análisis:
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      xmlOptimizationOptions.includeRoutes
                                    }
                                    onChange={(e) =>
                                      handleCustomOptimizationChange(
                                        'includeRoutes',
                                        e.target.checked
                                      )
                                    }
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    Rutas
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      xmlOptimizationOptions.includeDataSources
                                    }
                                    onChange={(e) =>
                                      handleCustomOptimizationChange(
                                        'includeDataSources',
                                        e.target.checked
                                      )
                                    }
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    Data Sources
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      xmlOptimizationOptions.includeExternalServices
                                    }
                                    onChange={(e) =>
                                      handleCustomOptimizationChange(
                                        'includeExternalServices',
                                        e.target.checked
                                      )
                                    }
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    Servicios Externos
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      xmlOptimizationOptions.includeConfiguration
                                    }
                                    onChange={(e) =>
                                      handleCustomOptimizationChange(
                                        'includeConfiguration',
                                        e.target.checked
                                      )
                                    }
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    Configuración
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      xmlOptimizationOptions.includeDependencies
                                    }
                                    onChange={(e) =>
                                      handleCustomOptimizationChange(
                                        'includeDependencies',
                                        e.target.checked
                                      )
                                    }
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    Dependencias
                                  </span>
                                </label>
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={
                                      xmlOptimizationOptions.includeFullXml
                                    }
                                    onChange={(e) =>
                                      handleCustomOptimizationChange(
                                        'includeFullXml',
                                        e.target.checked
                                      )
                                    }
                                    className="w-3 h-3 text-blue-600"
                                  />
                                  <span className="text-xs text-gray-600">
                                    XML Completo
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Información de tokens */}
                          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {xmlOptimizationMode === 'minimal' &&
                              '~3,750 tokens (procesamiento rápido)'}
                            {xmlOptimizationMode === 'default' &&
                              '~7,500 tokens (equilibrado)'}
                            {xmlOptimizationMode === 'full' &&
                              '~12,500 tokens (análisis completo)'}
                            {xmlOptimizationMode === 'custom' &&
                              'Configuración personalizada'}
                          </div>
                        </div>
                      )}
                    </div>

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
                  {summaryError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-red-800 mb-2">
                            Error al generar el resumen
                          </h3>
                          <p className="text-sm text-red-700 mb-3">
                            {summaryError}
                          </p>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                clearSummaryError();
                                generateSummary();
                              }}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Reintentar
                            </button>
                            <button
                              onClick={clearSummaryError}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : summary ? (
                    <div className="bg-gray-25 rounded-lg p-4 border border-gray-200">
                      <div className="prose prose-xs max-w-none">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => (
                              <h1 className="text-lg font-semibold text-gray-800 mb-2 mt-3 first:mt-0">
                                {children}
                              </h1>
                            ),
                            h2: ({ children }) => (
                              <h2 className="text-base font-medium text-gray-800 mb-2 mt-2 first:mt-0">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="text-sm font-medium text-gray-800 mb-1 mt-2 first:mt-0">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="mb-2 text-sm text-gray-600 leading-snug">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-2 space-y-0.5 text-sm text-gray-600">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-2 space-y-0.5 text-sm text-gray-600">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="flex items-start leading-snug">
                                <span className="mr-2 text-gray-400">•</span>
                                <span className="flex-1">{children}</span>
                              </li>
                            ),
                            code: ({ children }) => (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-700">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-gray-100 p-2 rounded border overflow-x-auto text-xs font-mono text-gray-700 mb-2 whitespace-pre-wrap break-words">
                                {children}
                              </pre>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-medium text-gray-800">
                                {children}
                              </strong>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto mb-3">
                                <table className="min-w-full text-xs border-collapse border border-gray-200">
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-gray-50">{children}</thead>
                            ),
                            tbody: ({ children }) => (
                              <tbody className="bg-white">{children}</tbody>
                            ),
                            tr: ({ children }) => (
                              <tr className="border-b border-gray-200">
                                {children}
                              </tr>
                            ),
                            th: ({ children }) => (
                              <th className="px-2 py-1.5 text-left font-medium text-gray-700 border-r border-gray-200">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-2 py-1.5 text-gray-600 border-r border-gray-200">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {summary}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-start h-full text-gray-500 pt-8">
                      <Bot className="w-12 h-12 text-blue-300 mb-4" />
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
                          onClick={handleGenerateSummaryWithOptimization}
                          disabled={summaryLoading}
                          className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {summaryLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Bot className="w-4 h-4" />
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <Container className="w-5 h-5 text-blue-600" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Código fuente XML del blueprint
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-semibold text-gray-900">
                        XML Crudo
                      </h2>
                      <button
                        onClick={() => setIsXmlFullscreen(true)}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
                        title="Ver en pantalla completa"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Buscador */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar en XML (mín. 3 caracteres)..."
                        value={xmlSearchTerm}
                        onChange={(e) => setXmlSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {xmlSearchTerm && (
                        <button
                          onClick={() => setXmlSearchTerm('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Navegación de búsqueda */}
                    {totalMatches > 0 && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={goToPreviousMatch}
                          disabled={totalMatches === 0}
                          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Coincidencia anterior"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-500 px-2">
                          {currentMatchIndex + 1} de {totalMatches}
                        </span>
                        <button
                          onClick={goToNextMatch}
                          disabled={totalMatches === 0}
                          className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Siguiente coincidencia"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {xmlLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="flex flex-col items-center space-y-4">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm text-gray-600">Cargando XML...</p>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden flex-1 overflow-y-auto bg-gray-50 relative">
                    {/* Botón de copiar flotante - siempre visible */}
                    <div className="sticky top-3 right-3 float-right z-50">
                      <div className="relative group">
                        <button
                          onClick={() => copyToClipboardWithFeedback(rawXml)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg shadow-sm transition-all duration-200"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                          {copiedItem === rawXml ? 'Copiado' : 'Copiar'}
                        </div>
                      </div>
                    </div>
                    <div className="relative" ref={xmlContainerRef}>
                      {/* Números de línea */}
                      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-100 border-r border-gray-200 flex flex-col text-xs text-gray-500 font-mono">
                        {rawXml.split('\n').map((_, index) => (
                          <div
                            key={index}
                            className="h-5 flex items-center justify-center"
                          >
                            {index + 1}
                          </div>
                        ))}
                      </div>
                      {/* Contenido XML */}
                      <div className="ml-12 p-4">
                        <pre
                          className="text-sm font-mono leading-5 whitespace-pre-wrap break-words xml-highlight"
                          dangerouslySetInnerHTML={{
                            __html: highlightXML(
                              rawXml,
                              xmlSearchTerm,
                              currentMatchIndex
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de pantalla completa para XML */}
      {isXmlFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-2">
                <Container className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  XML Crudo - Pantalla Completa
                </h2>
              </div>

              {/* Buscador y botones en el lado opuesto */}
              <div className="flex items-center space-x-2">
                {/* Buscador */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar en XML (mín. 3 caracteres)..."
                    value={xmlSearchTerm}
                    onChange={(e) => setXmlSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {xmlSearchTerm && (
                    <button
                      onClick={() => setXmlSearchTerm('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Navegación de búsqueda */}
                {totalMatches > 0 && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={goToPreviousMatch}
                      disabled={totalMatches === 0}
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Coincidencia anterior"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500 px-2">
                      {currentMatchIndex + 1} de {totalMatches}
                    </span>
                    <button
                      onClick={goToNextMatch}
                      disabled={totalMatches === 0}
                      className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Siguiente coincidencia"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Botón de copiar */}
                <div className="relative group">
                  <button
                    onClick={() => copyToClipboardWithFeedback(rawXml)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    title="Copiar XML completo"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {copiedItem === rawXml ? 'Copiado' : 'Copiar'}
                  </div>
                </div>

                {/* Botón de cerrar */}
                <button
                  onClick={() => setIsXmlFullscreen(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Cerrar pantalla completa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del XML en pantalla completa */}
            <div className="flex-1 overflow-hidden bg-gray-50">
              <div className="h-full overflow-y-auto" ref={xmlContainerRef}>
                <div className="relative">
                  {/* Números de línea */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-100 border-r border-gray-200 flex flex-col text-xs text-gray-500 font-mono">
                    {rawXml.split('\n').map((_, index) => (
                      <div
                        key={index}
                        className="h-5 flex items-center justify-center"
                      >
                        {index + 1}
                      </div>
                    ))}
                  </div>
                  {/* Contenido XML */}
                  <div className="ml-12 p-4">
                    <pre
                      className="text-sm font-mono leading-5 whitespace-pre-wrap break-words xml-highlight"
                      dangerouslySetInnerHTML={{
                        __html: highlightXML(
                          rawXml,
                          xmlSearchTerm,
                          currentMatchIndex
                        ),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
