'use client';

import { useState } from 'react';
import DB2Card from './components/DB2Card';
import SQLServerCard from './components/SQLServerCard';
import PostgreSQLCard from './components/PostgreSQLCard';
import SQSCard from './components/SQSCard';
import HTTPCard from './components/HTTPCard';
import TelnetCard from './components/TelnetCard';
import PingCard from './components/PingCard';
import HistorySidebar from './components/HistorySidebar';
import ChatSidebar from './components/ChatSidebar';
import ParameterStoreModule from './components/ParameterStoreModule';
import ServerInfoCard from './components/ServerInfoCard';
import VersionInfo from './components/VersionInfo';
import PageHeader from './components/PageHeader';
import Breadcrumbs from './components/Breadcrumbs';
// import LocalStorageDebug from './components/LocalStorageDebug';
import { TestHistoryProvider } from './context/TestHistoryContext';
import {
  Database,
  Server,
  Globe,
  MessageSquare,
  History,
  Terminal,
  Wifi,
  MessageCircle,
  Container,
  Activity,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('db2');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const tabs = [
    { id: 'db2', name: 'DB2', icon: Database, component: DB2Card },
    {
      id: 'sqlserver',
      name: 'SQL Server',
      icon: Server,
      component: SQLServerCard,
    },
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      icon: Database,
      component: PostgreSQLCard,
    },
    { id: 'sqs', name: 'AWS SQS', icon: MessageSquare, component: SQSCard },
    { id: 'http', name: 'HTTP', icon: Globe, component: HTTPCard },
    { id: 'telnet', name: 'Telnet', icon: Terminal, component: TelnetCard },
    { id: 'ping', name: 'Ping', icon: Wifi, component: PingCard },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component;

  return (
    <TestHistoryProvider historyKey="healthCheckHistory">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <PageHeader
          icon={Activity}
          iconColor="text-blue-600"
          title="Health Check Tool"
          description="Pruebas de conectividad y monitoreo de servicios"
          onHistoryOpen={() => setIsHistoryOpen(true)}
          onChatOpen={() => setIsChatOpen(true)}
          currentPage="health"
          showSectionFilter={true}
        />

        {/* Breadcrumbs y Server Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Breadcrumbs items={[{ label: 'Health Check', current: true }]} />
            <ServerInfoCard />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {/* Layout con tabs verticales */}
          <div className="flex gap-6">
            {/* Tabs verticales */}
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
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Contenido */}
            <div className="flex-1">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </div>
        </div>

        {/* Sidebar de Historial */}
        <HistorySidebar
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyKey="healthCheckHistory"
          showSectionFilter={true}
        />

        {/* Sidebar de Chat IA */}
        <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

        {/* Módulo flotante de Parameter Store */}
        <ParameterStoreModule />

        {/* Debug LocalStorage - Temporal */}
        {/* <LocalStorageDebug /> */}
      </div>
    </TestHistoryProvider>
  );
}
