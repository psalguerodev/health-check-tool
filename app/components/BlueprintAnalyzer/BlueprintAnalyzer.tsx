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
  X,
  ChevronUp,
  ChevronDown,
  Maximize2,
  GitBranch,
  Calendar,
  HardDrive,
  Lock,
  Unlock,
  Code,
  Check,
  Route,
  Package,
  Server,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
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

interface RepositoryInfo {
  workspace: string;
  project_key: string;
  repo_slug: string;
  repo_name: string;
  is_private: boolean;
  main_branch: string;
  language: string;
  created_on: string;
  updated_on: string;
  size_bytes: number;
  html_url: string;
  https_url: string;
  ssh_url: string;
}

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
  const [repositoryInfo, setRepositoryInfo] = useState<RepositoryInfo | null>(
    null
  );
  const [repoLoading, setRepoLoading] = useState(false);
  const [bitbucketAccounts, setBitbucketAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [lastCommit, setLastCommit] = useState<any>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [customRepoSlug, setCustomRepoSlug] = useState<string>('');
  const [isBitbucketConfigOpen, setIsBitbucketConfigOpen] = useState(false);

  // Estados para el modal de configuración de Bitbucket
  const [currentBitbucketAccount, setCurrentBitbucketAccount] = useState({
    id: '',
    name: '',
    workspace: '',
    email: '',
    apiToken: '',
  });
  const [showToken, setShowToken] = useState(false);
  const [saveToLocalStorage, setSaveToLocalStorage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // Estados para estimación de tokens
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);

  // Estados para modal de ampliación
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);

  // Estados para mensajes de progreso interactivos
  const [loadingMessage, setLoadingMessage] = useState('');

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

  const handleGenerateSummaryWithOptimization = () => {
    const finalInstructions = selectedFormat
      ? selectedFormat
      : additionalInstructions;

    // Usar opciones específicas para cada modo
    const optionsToUse =
      summaryType === 'detailed'
        ? XmlOptimizer.getFullProcessingOptions()
        : XmlOptimizer.getCompactOptions();

    // Iniciar mensajes de progreso interactivos
    startLoadingProgress();

    generateSummary(finalInstructions, optionsToUse);
  };

  const startLoadingProgress = () => {
    const messages = [
      'Analizando blueprint XML...',
      'Extrayendo rutas y dependencias...',
      'Identificando servicios externos...',
      'Procesando configuración...',
      'Generando análisis con IA...',
      'Finalizando resumen...',
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 2000); // Cambiar mensaje cada 2 segundos de forma cíclica

    // Limpiar cuando termine la carga
    const cleanup = () => {
      clearInterval(interval);
      setLoadingMessage('');
    };

    // Limpiar después de 15 segundos como máximo
    setTimeout(cleanup, 15000);

    return cleanup;
  };

  // Calcular tokens estimados cuando cambien las opciones
  useEffect(() => {
    const calculateEstimatedTokens = async () => {
      if (!analysis) {
        setEstimatedTokens(null);
        return;
      }

      try {
        // Obtener el XML del blueprint
        const xmlResponse = await fetch(`/api/blueprint-xml/${serviceName}`);
        if (!xmlResponse.ok) {
          setEstimatedTokens(null);
          return;
        }
        const fullBlueprintXml = await xmlResponse.text();

        // Determinar qué opciones usar - simplificado
        const optionsToUse =
          summaryType === 'detailed'
            ? XmlOptimizer.getFullProcessingOptions()
            : XmlOptimizer.getCompactOptions();

        // Extraer XML optimizado
        const blueprintXml = XmlOptimizer.extractImportantData(
          fullBlueprintXml,
          analysis,
          optionsToUse
        );

        // Extraer datos estructurados
        const structuredData = XmlOptimizer.extractStructuredData(
          analysis,
          optionsToUse
        );

        // Calcular tokens
        let tokens = XmlOptimizer.estimateTokenCount(blueprintXml);
        tokens += XmlOptimizer.estimateTokenCount(structuredData);
        tokens += 2000; // Prompt y system message
        tokens += 2500; // Tokens de respuesta

        setEstimatedTokens(tokens);
      } catch (error) {
        console.error('Error calculando tokens:', error);
        setEstimatedTokens(null);
      }
    };

    calculateEstimatedTokens();
  }, [analysis, serviceName, summaryType]);

  // Limpiar mensajes de progreso cuando termine la carga
  useEffect(() => {
    if (!summaryLoading && loadingMessage) {
      setLoadingMessage('');
    }
  }, [summaryLoading, loadingMessage]);

  // Funciones para el modal de configuración de Bitbucket
  const handleSaveBitbucketAccount = () => {
    if (
      !currentBitbucketAccount.name ||
      !currentBitbucketAccount.workspace ||
      !currentBitbucketAccount.email ||
      !currentBitbucketAccount.apiToken
    ) {
      alert('Por favor completa todos los campos');
      return;
    }

    let updatedAccounts: any[];

    if (editingId) {
      // Actualizar cuenta existente
      updatedAccounts = bitbucketAccounts.map((acc) =>
        acc.id === editingId
          ? { ...currentBitbucketAccount, id: editingId }
          : acc
      );
    } else {
      // Agregar nueva cuenta
      const newAccount = {
        ...currentBitbucketAccount,
        id: Date.now().toString(),
      };
      updatedAccounts = [...bitbucketAccounts, newAccount];
    }

    setBitbucketAccounts(updatedAccounts);

    if (saveToLocalStorage) {
      localStorage.setItem(
        'bitbucket_accounts',
        JSON.stringify(updatedAccounts)
      );
    }

    // Mostrar notificación
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 2000);

    // Limpiar formulario
    setCurrentBitbucketAccount({
      id: '',
      name: '',
      workspace: '',
      email: '',
      apiToken: '',
    });
    setEditingId(null);
  };

  const handleEditBitbucketAccount = (account: any) => {
    setCurrentBitbucketAccount(account);
    setEditingId(account.id);
  };

  const handleDeleteBitbucketAccount = (id: string) => {
    const updatedAccounts = bitbucketAccounts.filter((acc) => acc.id !== id);
    setBitbucketAccounts(updatedAccounts);

    if (saveToLocalStorage) {
      localStorage.setItem(
        'bitbucket_accounts',
        JSON.stringify(updatedAccounts)
      );
    }
  };

  const handleClearBitbucketForm = () => {
    setCurrentBitbucketAccount({
      id: '',
      name: '',
      workspace: '',
      email: '',
      apiToken: '',
    });
    setEditingId(null);
  };

  const handleClearAllBitbucketAccounts = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todas las cuentas?')) {
      setBitbucketAccounts([]);
      localStorage.removeItem('bitbucket_accounts');
      setSaveToLocalStorage(false);
    }
  };

  const handleSaveToLocalStorageChange = (checked: boolean) => {
    setSaveToLocalStorage(checked);
    if (checked && bitbucketAccounts.length > 0) {
      localStorage.setItem(
        'bitbucket_accounts',
        JSON.stringify(bitbucketAccounts)
      );
    } else if (!checked) {
      localStorage.removeItem('bitbucket_accounts');
    }
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

  // Cargar cuentas de Bitbucket desde localStorage
  useEffect(() => {
    const savedAccounts = localStorage.getItem('bitbucket_accounts');
    if (savedAccounts) {
      try {
        const parsedAccounts = JSON.parse(savedAccounts);
        setBitbucketAccounts(parsedAccounts);
        if (parsedAccounts.length > 0) {
          setSelectedAccountId(parsedAccounts[0].id);
        }
      } catch (error) {
        console.error('Error al cargar cuentas de Bitbucket:', error);
      }
    }
  }, []);

  // Cargar información del repositorio desde el CSV
  useEffect(() => {
    const loadRepositoryInfo = async () => {
      setRepoLoading(true);
      try {
        const response = await fetch('/data/bitbucket-repositorios.csv');
        const text = await response.text();
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.replace(/"/g, ''));

        // Buscar el repositorio por slug
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.replace(/"/g, ''));
          if (values[2] === serviceName) {
            // values[2] es repo_slug
            setRepositoryInfo({
              workspace: values[0],
              project_key: values[1],
              repo_slug: values[2],
              repo_name: values[3],
              is_private: values[4] === 'true',
              main_branch: values[5],
              language: values[6],
              created_on: values[7],
              updated_on: values[8],
              size_bytes: parseInt(values[9]) || 0,
              html_url: values[10],
              https_url: values[11],
              ssh_url: values[12],
            });
            break;
          }
        }
      } catch (error) {
        console.error('Error al cargar información del repositorio:', error);
      } finally {
        setRepoLoading(false);
      }
    };

    loadRepositoryInfo();
  }, [serviceName]);

  // Cargar branches cuando se selecciona una cuenta
  useEffect(() => {
    const loadBranches = async () => {
      if (!selectedAccountId || !repositoryInfo) return;

      const account = bitbucketAccounts.find(
        (acc) => acc.id === selectedAccountId
      );
      if (!account) return;

      // Si no es ARKHO y no hay customRepoSlug, no cargar branches aún
      if (
        account.workspace.toUpperCase() !== 'ARKHO' &&
        !customRepoSlug.trim()
      ) {
        setBranches([]);
        setBranchesError(null);
        return;
      }

      setBranchesLoading(true);
      setBranchesError(null);

      try {
        const auth = btoa(`${account.email}:${account.apiToken}`);
        // Usar customRepoSlug si está disponible, sino usar el del CSV
        const repoSlug =
          account.workspace.toUpperCase() !== 'ARKHO' && customRepoSlug.trim()
            ? customRepoSlug.trim()
            : repositoryInfo.repo_slug;
        const url = `https://api.bitbucket.org/2.0/repositories/${account.workspace}/${repoSlug}/refs/branches`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const branchesData = data.values || [];
        setBranches(branchesData);

        // Seleccionar automáticamente la rama principal si existe
        if (branchesData.length > 0 && repositoryInfo.main_branch) {
          const mainBranch = branchesData.find(
            (b: any) => b.name === repositoryInfo.main_branch
          );
          if (mainBranch) {
            setSelectedBranch(mainBranch.name);
          } else {
            setSelectedBranch(branchesData[0].name);
          }
        }
      } catch (error: any) {
        console.error('Error al cargar branches:', error);
        setBranchesError(error.message || 'Error al cargar las ramas');
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    };

    loadBranches();
  }, [selectedAccountId, repositoryInfo, bitbucketAccounts, customRepoSlug]);

  // Cargar último commit cuando se selecciona una rama
  useEffect(() => {
    const loadLastCommit = async () => {
      if (!selectedBranch || !selectedAccountId || !repositoryInfo) return;

      const account = bitbucketAccounts.find(
        (acc) => acc.id === selectedAccountId
      );
      if (!account) return;

      // Si no es ARKHO y no hay customRepoSlug, no cargar commit
      if (
        account.workspace.toUpperCase() !== 'ARKHO' &&
        !customRepoSlug.trim()
      ) {
        setLastCommit(null);
        setCommitError(null);
        return;
      }

      setCommitLoading(true);
      setCommitError(null);

      try {
        const auth = btoa(`${account.email}:${account.apiToken}`);
        // Usar customRepoSlug si está disponible, sino usar el del CSV
        const repoSlug =
          account.workspace.toUpperCase() !== 'ARKHO' && customRepoSlug.trim()
            ? customRepoSlug.trim()
            : repositoryInfo.repo_slug;
        const url = `https://api.bitbucket.org/2.0/repositories/${account.workspace}/${repoSlug}/commits/${selectedBranch}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // El API devuelve una lista de commits, tomamos el primero (más reciente)
        if (data.values && data.values.length > 0) {
          setLastCommit(data.values[0]);
        } else {
          setLastCommit(null);
        }
      } catch (error: any) {
        console.error('Error al cargar último commit:', error);
        setCommitError(error.message || 'Error al cargar el commit');
        setLastCommit(null);
      } finally {
        setCommitLoading(false);
      }
    };

    loadLastCommit();
  }, [
    selectedBranch,
    selectedAccountId,
    repositoryInfo,
    bitbucketAccounts,
    customRepoSlug,
  ]);

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
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-3 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 !text-white shadow-md shadow-blue-200 scale-[1.02]'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:scale-[1.01]'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        activeTab === tab.id ? 'animate-pulse !text-white' : ''
                      }`}
                    />
                    <span className={activeTab === tab.id ? '!text-white' : ''}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenido del tab activo */}
          <div className="flex-1 w-full max-w-4xl">
            {activeTab === 'repository' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <GitBranch className="w-5 h-5 text-blue-600" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        Información del repositorio de Bitbucket
                      </div>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Información del Repositorio
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBitbucketConfigOpen(true)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Configurar cuentas de Bitbucket"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Config</span>
                    </button>
                    <button
                      onClick={() => {
                        // Recargar cuentas desde localStorage
                        const savedAccounts =
                          localStorage.getItem('bitbucket_accounts');
                        if (savedAccounts) {
                          try {
                            const parsedAccounts = JSON.parse(savedAccounts);
                            setBitbucketAccounts(parsedAccounts);
                            if (parsedAccounts.length > 0) {
                              // Seleccionar la primera cuenta o mantener la actual si existe
                              const currentAccountExists = parsedAccounts.find(
                                (acc: any) => acc.id === selectedAccountId
                              );
                              if (!currentAccountExists) {
                                setSelectedAccountId(parsedAccounts[0].id);
                              }
                            } else {
                              // No hay cuentas, limpiar todo
                              setSelectedAccountId('');
                              setBranches([]);
                              setSelectedBranch('');
                              setLastCommit(null);
                            }
                          } catch (error) {
                            console.error('Error al recargar cuentas:', error);
                          }
                        } else {
                          // No hay cuentas guardadas, limpiar todo
                          setBitbucketAccounts([]);
                          setSelectedAccountId('');
                          setBranches([]);
                          setSelectedBranch('');
                          setLastCommit(null);
                        }

                        // Limpiar y forzar recarga de información
                        setCustomRepoSlug('');
                        setBranches([]);
                        setSelectedBranch('');
                        setLastCommit(null);
                        setBranchesError(null);
                        setCommitError(null);
                      }}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Recargar credenciales y actualizar"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {repositoryInfo && (
                      <a
                        href={repositoryInfo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <span>Ver en Bitbucket</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {repoLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  ) : repositoryInfo ? (
                    <div className="space-y-2">
                      {/* Card principal ultra compacto - inline */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                              {repositoryInfo.repo_name}
                            </h3>
                            {repositoryInfo.is_private ? (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex-shrink-0">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Privado</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex-shrink-0">
                                <Unlock className="w-2.5 h-2.5" />
                                <span>Público</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Información general - Grid compacto inline 2x2 */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Database className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600">WS:</span>
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {repositoryInfo.workspace}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Container className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600">Proy:</span>
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {repositoryInfo.project_key}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <div className="flex items-center gap-1">
                            <GitBranch className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600">Rama:</span>
                            <p className="text-xs font-medium text-gray-900 font-mono truncate">
                              {repositoryInfo.main_branch}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1">
                          <div className="flex items-center gap-1">
                            <HardDrive className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600">
                              Tamaño:
                            </span>
                            <p className="text-xs font-medium text-gray-900">
                              {(
                                repositoryInfo.size_bytes /
                                1024 /
                                1024
                              ).toFixed(1)}{' '}
                              MB
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Secciones de información en línea */}
                      <div className="border-t border-gray-200 pt-2 space-y-2">
                        {/* Selector de cuenta de Bitbucket */}
                        {bitbucketAccounts.length > 0 ? (
                          <>
                            <div className="bg-gray-50 border border-gray-200 rounded p-2">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Cuenta Bitbucket
                              </label>
                              <select
                                value={selectedAccountId}
                                onChange={(e) => {
                                  setSelectedAccountId(e.target.value);
                                  setCustomRepoSlug('');
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {bitbucketAccounts.map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.name} ({account.workspace})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Campo para nombre del repositorio (solo si no es ARKHO) */}
                            {selectedAccountId &&
                              bitbucketAccounts
                                .find((acc) => acc.id === selectedAccountId)
                                ?.workspace.toUpperCase() !== 'ARKHO' && (
                                <div className="bg-blue-50 border border-blue-300 rounded p-2">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Repo Slug
                                  </label>
                                  <input
                                    type="text"
                                    value={customRepoSlug}
                                    onChange={(e) =>
                                      setCustomRepoSlug(e.target.value)
                                    }
                                    placeholder="mi-repositorio"
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <p className="text-xs text-gray-600 mt-1">
                                    Workspace no-ARKHO: ingresar slug del repo
                                  </p>
                                </div>
                              )}
                          </>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                            <p className="text-xs text-yellow-800">
                              Configura cuenta Bitbucket para ver info en línea
                            </p>
                          </div>
                        )}

                        {/* Sección de branches - Compacta */}
                        {bitbucketAccounts.length > 0 && (
                          <div className="bg-white border border-gray-200 rounded p-2">
                            <div className="flex items-center gap-1.5 mb-2">
                              <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                              <h4 className="text-xs font-semibold text-gray-900">
                                Ramas
                              </h4>
                              {branchesLoading && (
                                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                              )}
                            </div>

                            {branchesLoading ? (
                              <div className="text-center py-2">
                                <p className="text-xs text-gray-600">
                                  Cargando...
                                </p>
                              </div>
                            ) : branchesError ? (
                              <div className="bg-red-50 border border-red-200 rounded p-1.5">
                                <p className="text-xs text-red-700">
                                  {branchesError}
                                </p>
                              </div>
                            ) : branches.length > 0 ? (
                              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                                {branches.map((branch) => (
                                  <button
                                    key={branch.name}
                                    onClick={() =>
                                      setSelectedBranch(branch.name)
                                    }
                                    className={`w-full flex items-center justify-between px-2 py-1 rounded border transition-all ${
                                      selectedBranch === branch.name
                                        ? 'bg-blue-50 border-blue-300'
                                        : 'bg-white border-gray-100 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                      <GitBranch
                                        className={`w-2.5 h-2.5 flex-shrink-0 ${
                                          selectedBranch === branch.name
                                            ? 'text-blue-600'
                                            : 'text-gray-400'
                                        }`}
                                      />
                                      <span
                                        className={`text-xs font-medium truncate ${
                                          selectedBranch === branch.name
                                            ? 'text-blue-900'
                                            : 'text-gray-900'
                                        }`}
                                      >
                                        {branch.name}
                                      </span>
                                      {branch.name ===
                                        repositoryInfo?.main_branch && (
                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex-shrink-0">
                                          Main
                                        </span>
                                      )}
                                    </div>
                                    {selectedBranch === branch.name && (
                                      <Check className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600">
                                No hay ramas
                              </p>
                            )}
                          </div>
                        )}

                        {/* Sección de último commit - Compacta */}
                        {bitbucketAccounts.length > 0 && selectedBranch && (
                          <div className="bg-white border border-gray-200 rounded p-2">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <h4 className="text-xs font-semibold text-gray-900">
                                Último Commit
                              </h4>
                              {commitLoading && (
                                <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                              )}
                            </div>

                            {commitLoading ? (
                              <div className="text-center py-2">
                                <p className="text-xs text-gray-600">
                                  Cargando...
                                </p>
                              </div>
                            ) : commitError ? (
                              <div className="bg-red-50 border border-red-200 rounded p-1.5">
                                <p className="text-xs text-red-700">
                                  {commitError}
                                </p>
                              </div>
                            ) : lastCommit ? (
                              <div className="space-y-1.5">
                                {/* Hash y link */}
                                <div className="flex items-center gap-1.5">
                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">
                                    {lastCommit.hash?.substring(0, 7)}
                                  </code>
                                  <a
                                    href={lastCommit.links?.html?.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                </div>

                                {/* Mensaje del commit */}
                                <div className="bg-gray-50 border border-gray-200 rounded p-1.5">
                                  <p className="text-xs text-gray-900 font-medium line-clamp-2">
                                    {lastCommit.message?.split('\n')[0]}
                                  </p>
                                </div>

                                {/* Autor y fecha - inline */}
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span className="truncate">
                                    {lastCommit.author?.user?.display_name ||
                                      lastCommit.author?.raw
                                        ?.split('<')[0]
                                        .trim()}
                                  </span>
                                  <span className="text-xs flex-shrink-0 ml-2">
                                    {lastCommit.date
                                      ? new Date(
                                          lastCommit.date
                                        ).toLocaleDateString('es-ES', {
                                          day: 'numeric',
                                          month: 'short',
                                        })
                                      : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600">
                                No hay información
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">
                        No se encontró información
                      </p>
                      <p className="text-sm">
                        No se pudo cargar la información del repositorio desde
                        el CSV.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'routes' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 w-full h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative group">
                      <Route className="w-5 h-5 text-blue-600" />
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
                      <Route className="w-12 h-12 text-blue-300 mb-4" />
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
                    <Package className="w-5 h-5 text-blue-600" />
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
                      <Package className="w-12 h-12 text-blue-300 mb-4" />
                      <p className="text-lg font-medium">No hay dependencias</p>
                      <p className="text-sm">
                        Este servicio no tiene dependencias internas
                      </p>
                    </div>
                  ) : (
                    analysis.dependencies.map((dep, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Package className="w-4 h-4 text-blue-600" />
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
                    <Server className="w-5 h-5 text-blue-600" />
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
                      <Server className="w-12 h-12 text-blue-300 mb-4" />
                      <p className="text-lg font-medium">No hay data sources</p>
                      <p className="text-sm">
                        Este servicio no tiene fuentes de datos configuradas
                      </p>
                    </div>
                  ) : (
                    analysis.dataSources.map((ds, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Server className="w-4 h-4 text-blue-600" />
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
                  {estimatedTokens !== null && (
                    <div className="text-xs text-gray-500">
                      ~{estimatedTokens.toLocaleString()} / 10,000 tokens
                    </div>
                  )}
                  {summary && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // Resetear el resumen y volver al estado inicial
                          clearSummaryError();
                          setSummaryType('detailed');
                          setAdditionalInstructions('');
                          setSelectedFormat('');
                          setShowAdditionalInstructions(false);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="font-medium">Nuevo Análisis</span>
                      </button>
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
                    </div>
                  )}
                </div>

                {/* Controles de resumen */}
                {!summary && (
                  <div className="mb-4 space-y-3">
                    {/* Card con instrucciones y CTA principal - Compacto */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <Bot className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                              Análisis Inteligente con IA
                            </h3>
                            <p className="text-xs text-gray-600">
                              Blueprint completo: rutas, dependencias e
                              integraciones
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleGenerateSummaryWithOptimization}
                          disabled={summaryLoading}
                          className="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                        >
                          {summaryLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {summaryLoading ? 'Analizando...' : 'Analizar'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Toggle para instrucciones adicionales */}
                    <div>
                      <button
                        onClick={() =>
                          setShowAdditionalInstructions(
                            !showAdditionalInstructions
                          )
                        }
                        className="flex items-center space-x-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            showAdditionalInstructions ? 'rotate-180' : ''
                          }`}
                        />
                        <span>Opciones avanzadas</span>
                      </button>

                      {showAdditionalInstructions && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2.5">
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
                  {summaryLoading ? (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                      {/* Header del estado de carga */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <div className="relative">
                            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <Bot className="w-3 h-3 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Generando Análisis
                          </h3>
                        </div>
                        <div className="text-xs text-gray-500">
                          {summaryType === 'detailed'
                            ? 'Análisis Detallado'
                            : 'Resumen Compacto'}
                        </div>
                      </div>

                      {/* Contenido del estado de carga */}
                      <div className="p-6">
                        <div className="flex flex-col items-center space-y-4">
                          {/* Icono principal de carga */}
                          <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full">
                            <Bot className="w-8 h-8 text-blue-600 animate-pulse" />
                          </div>

                          {/* Mensaje dinámico */}
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-700">
                              {loadingMessage}
                            </p>
                          </div>

                          {/* Información de tokens */}
                          {estimatedTokens && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">
                                Procesando ~{estimatedTokens.toLocaleString()}{' '}
                                tokens
                              </p>
                            </div>
                          )}

                          {/* Indicador de progreso visual */}
                          <div className="flex justify-center space-x-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: '0.1s' }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                              style={{ animationDelay: '0.2s' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : summaryError ? (
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
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                      {/* Header del resumen con botón de ampliar */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-5 h-5 text-blue-600" />
                          <h3 className="text-sm font-semibold text-gray-900">
                            Resumen Generado
                          </h3>
                        </div>
                        <button
                          onClick={() => setIsSummaryModalOpen(true)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                          title="Ampliar resumen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Ampliar</span>
                        </button>
                      </div>

                      {/* Contenido del resumen con mejor estilo */}
                      <div className="p-4">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-xl font-bold text-gray-900 mb-3 mt-4 first:mt-0 border-b border-gray-200 pb-2">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-lg font-semibold text-gray-800 mb-2 mt-4 first:mt-0">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-base font-medium text-gray-800 mb-2 mt-3 first:mt-0">
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className="mb-3 text-sm text-gray-700 leading-relaxed">
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul
                                  className="mb-3 space-y-1 text-sm text-gray-700"
                                  style={{
                                    listStylePosition: 'outside',
                                    paddingLeft: '1.25rem',
                                  }}
                                >
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol
                                  className="mb-3 space-y-1 text-sm text-gray-700"
                                  style={{
                                    listStylePosition: 'outside',
                                    paddingLeft: '1.25rem',
                                  }}
                                >
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li
                                  className="flex items-start leading-relaxed"
                                  style={{ paddingLeft: '0.25rem' }}
                                >
                                  <span className="flex-1">{children}</span>
                                </li>
                              ),
                              code: ({ children }) => {
                                const inlineCodeText =
                                  typeof children === 'string'
                                    ? children
                                    : Array.isArray(children)
                                    ? children.join('')
                                    : String(children);

                                return (
                                  <code
                                    className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[13px] font-mono break-all whitespace-pre-wrap cursor-pointer hover:bg-blue-100 inline-block border border-blue-200"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      copyToClipboardWithFeedback(
                                        inlineCodeText
                                      );
                                    }}
                                    title="Copiar"
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              pre: ({ children }) => (
                                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg border overflow-x-auto text-sm font-mono mb-3 whitespace-pre-wrap break-words shadow-sm">
                                  {children}
                                </pre>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-bold text-gray-900">
                                  {children}
                                </strong>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto mb-4 shadow-sm rounded-lg border border-gray-200">
                                  <table className="min-w-full text-sm border-collapse">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-gray-50">{children}</thead>
                              ),
                              tbody: ({ children }) => (
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {children}
                                </tbody>
                              ),
                              tr: ({ children }) => (
                                <tr className="hover:bg-gray-50 transition-colors">
                                  {children}
                                </tr>
                              ),
                              th: ({ children }) => (
                                <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r border-gray-200">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td
                                  className="px-4 py-3 text-gray-700 border-r border-gray-200"
                                  style={{ verticalAlign: 'top' }}
                                >
                                  <div
                                    style={{
                                      whiteSpace: 'normal',
                                      wordWrap: 'break-word',
                                      overflowWrap: 'break-word',
                                    }}
                                  >
                                    {children}
                                  </div>
                                </td>
                              ),
                            }}
                          >
                            {summary}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Bot className="w-16 h-16 text-blue-300 mb-4" />
                      <p className="text-base font-medium mb-2">
                        Esperando análisis
                      </p>
                      <p className="text-sm text-center max-w-md text-gray-500">
                        Haz clic en <strong>"Analizar"</strong> para generar un
                        resumen inteligente del blueprint
                      </p>
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

      {/* Modal de configuración de Bitbucket */}
      {isBitbucketConfigOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuración Bitbucket Cloud
                </h3>
              </div>
              <button
                onClick={() => setIsBitbucketConfigOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    {editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Cuenta
                    </label>
                    <input
                      type="text"
                      value={currentBitbucketAccount.name}
                      onChange={(e) =>
                        setCurrentBitbucketAccount({
                          ...currentBitbucketAccount,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ej: Cuenta Principal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace
                    </label>
                    <input
                      type="text"
                      value={currentBitbucketAccount.workspace}
                      onChange={(e) =>
                        setCurrentBitbucketAccount({
                          ...currentBitbucketAccount,
                          workspace: e.target.value,
                        })
                      }
                      placeholder="arkho"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={currentBitbucketAccount.email}
                      onChange={(e) =>
                        setCurrentBitbucketAccount({
                          ...currentBitbucketAccount,
                          email: e.target.value,
                        })
                      }
                      placeholder="tu-email@ejemplo.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={currentBitbucketAccount.apiToken}
                        onChange={(e) =>
                          setCurrentBitbucketAccount({
                            ...currentBitbucketAccount,
                            apiToken: e.target.value,
                          })
                        }
                        placeholder="tu-api-token"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showToken ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Nota:</strong> Necesitas crear un API Token en
                      Bitbucket con permisos de lectura para repositorios.
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveBitbucketAccount}
                      className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingId ? 'Actualizar' : 'Agregar'}</span>
                    </button>
                    {(editingId || currentBitbucketAccount.name) && (
                      <button
                        onClick={handleClearBitbucketForm}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de cuentas guardadas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Cuentas Guardadas ({bitbucketAccounts.length})
                    </h4>
                    {bitbucketAccounts.length > 0 && (
                      <button
                        onClick={handleClearAllBitbucketAccounts}
                        className="text-xs text-red-600 hover:text-red-700 transition-colors"
                      >
                        Eliminar todas
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {bitbucketAccounts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No hay cuentas guardadas</p>
                      </div>
                    ) : (
                      bitbucketAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {account.name}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {account.workspace} • {account.email}
                              </p>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() =>
                                  handleEditBitbucketAccount(account)
                                }
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteBitbucketAccount(account.id)
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLocalStorage}
                  onChange={(e) =>
                    handleSaveToLocalStorageChange(e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Guardar en navegador (localStorage)
                </span>
              </label>
            </div>

            {/* Notificación de guardado */}
            {showSaveNotification && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Guardado correctamente
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de ampliación del resumen */}
      {isSummaryModalOpen && summary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Bot className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Resumen Completo - {serviceName}
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboardWithFeedback(summary)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                  title="Copiar resumen"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
                <button
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 first:mt-0 border-b border-gray-200 pb-3">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5 first:mt-0">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4 first:mt-0">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="mb-4 text-base text-gray-700 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul
                        className="mb-4 space-y-2 text-base text-gray-700"
                        style={{
                          listStylePosition: 'outside',
                          paddingLeft: '1.5rem',
                        }}
                      >
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol
                        className="mb-4 space-y-2 text-base text-gray-700"
                        style={{
                          listStylePosition: 'outside',
                          paddingLeft: '1.5rem',
                        }}
                      >
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li
                        className="flex items-start leading-relaxed"
                        style={{ paddingLeft: '0.5rem' }}
                      >
                        <span className="flex-1">{children}</span>
                      </li>
                    ),
                    code: ({ children }) => {
                      const inlineCodeText =
                        typeof children === 'string'
                          ? children
                          : Array.isArray(children)
                          ? children.join('')
                          : String(children);

                      return (
                        <code
                          className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[13px] font-mono break-all whitespace-pre-wrap cursor-pointer hover:bg-blue-100 inline-block border border-blue-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyToClipboardWithFeedback(inlineCodeText);
                          }}
                          title="Copiar"
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg border overflow-x-auto text-base font-mono mb-4 whitespace-pre-wrap break-words shadow-sm">
                        {children}
                      </pre>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-gray-900">
                        {children}
                      </strong>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-6 shadow-sm rounded-lg border border-gray-200">
                        <table className="min-w-full text-base border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="bg-white divide-y divide-gray-200">
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-gray-50 transition-colors">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-6 py-4 text-left font-semibold text-gray-900 border-r border-gray-200">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td
                        className="px-6 py-4 text-gray-700 border-r border-gray-200"
                        style={{ verticalAlign: 'top' }}
                      >
                        <div
                          style={{
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {children}
                        </div>
                      </td>
                    ),
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Resumen generado con IA -{' '}
                {summaryType === 'detailed'
                  ? 'Análisis Detallado'
                  : 'Resumen Compacto'}
              </div>
              <button
                onClick={() => setIsSummaryModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
