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
import PageHeader from '../components/PageHeader';
import Breadcrumbs from '../components/Breadcrumbs';
import { TestHistoryProvider } from '../context/TestHistoryContext';

export default function KernelPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <TestHistoryProvider historyKey="kernelHistory">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <PageHeader
          icon={Terminal}
          iconColor="text-blue-600"
          title="Kernel - Terminal Web"
          description="Accede a un terminal web y administra recursos con kubectl, shell, etc."
          onHistoryOpen={() => setIsHistoryOpen(true)}
          onChatOpen={() => setIsChatOpen(true)}
          currentPage="kernel"
          showSectionFilter={true}
        />

        {/* Breadcrumbs y Server Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Breadcrumbs items={[{ label: 'Kernel', current: true }]} />
            <ServerInfoCard />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
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
          showSectionFilter={true}
        />

        {/* Sidebar de Chat IA */}
        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Módulo flotante de Parameter Store */}
        <ParameterStoreModule />
      </div>
    </TestHistoryProvider>
  );
}
