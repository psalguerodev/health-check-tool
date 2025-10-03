'use client';

import { useState } from 'react';
import {
  Container,
  Terminal,
  Play,
  Square,
  History,
  Settings,
  Activity,
  MessageCircle,
} from 'lucide-react';
import KernelKubernetesCard from '../components/KernelKubernetesCard';
import HistorySidebar from '../components/HistorySidebar';
import ChatSidebar from '../components/ChatSidebar';
import ParameterStoreModule from '../components/ParameterStoreModule';
import ServerInfoCard from '../components/ServerInfoCard';
import VersionInfo from '../components/VersionInfo';
import { TestHistoryProvider } from '../context/TestHistoryContext';

export default function KernelPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <TestHistoryProvider historyKey="kernelHistory">
      <div className="min-h-screen bg-white">
        {/* Contenido principal */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h1 className="text-xl font-semibold text-gray-900 relative">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                      Kernel - Kubernetes Management
                    </span>
                    <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full"></div>
                  </h1>
                  <div className="flex items-center">
                    <VersionInfo />
                  </div>
                </div>
                <p className="text-sm text-gray-600 max-w-xl">
                  Conecta y administra clusters de Kubernetes de AWS. Ejecuta
                  comandos kubectl directamente en tus clusters.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href="/"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Health Check</span>
                </a>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Historial</span>
                </button>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  title="Chat IA"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>

            {/* Información del servidor */}
            <div className="flex justify-center">
              <ServerInfoCard />
            </div>
          </div>

          {/* Contenido principal */}
          <div className="bg-white border border-gray-300 rounded-lg">
            <div className="p-6">
              <KernelKubernetesCard />
            </div>
          </div>
        </div>

        {/* Sidebar de Historial */}
        <HistorySidebar
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyKey="kernelHistory"
        />

        {/* Sidebar de Chat IA */}
        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Módulo flotante de Parameter Store */}
        <ParameterStoreModule />
      </div>
    </TestHistoryProvider>
  );
}
