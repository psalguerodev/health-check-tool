'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Search,
  Filter,
  GitBranch,
  Activity,
  History,
  MessageCircle,
  Settings,
  Database,
  Server,
  Globe,
  Terminal,
  Wifi,
  MessageSquare,
} from 'lucide-react';
import CamelRepositoriesTable from '../components/CamelRepositoriesTable';
import HistorySidebar from '../components/HistorySidebar';
import ChatSidebar from '../components/ChatSidebar';
import BitbucketConfigModule from '../components/BitbucketConfigModule';
import PageHeader from '../components/PageHeader';
import Breadcrumbs from '../components/Breadcrumbs';
import { TestHistoryProvider } from '../context/TestHistoryContext';

export default function CamelPage() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <TestHistoryProvider historyKey="camelHistory">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <PageHeader
          icon={Container}
          iconColor="text-blue-600"
          title="Análisis de Dependencias Apache Camel"
          description="Gestión y análisis de repositorios con servicios Camel"
          onHistoryOpen={() => setIsHistoryOpen(true)}
          onChatOpen={() => setIsChatOpen(true)}
          currentPage="camel"
          showSectionFilter={true}
        />

        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: 'Camel', current: true }]} />
        </div>

        {/* Contenido principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white border border-gray-300 rounded-lg">
            <div className="p-6">
              <CamelRepositoriesTable />
            </div>
          </div>
        </div>

        {/* Sidebar de Historial */}
        <HistorySidebar
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyKey="camelHistory"
          showSectionFilter={true}
        />

        {/* Sidebar de Chat IA */}
        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Módulo flotante de configuración Bitbucket */}
        <BitbucketConfigModule />
      </div>
    </TestHistoryProvider>
  );
}
