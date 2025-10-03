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
      <div className="min-h-screen bg-white">
        {/* Contenido principal */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h1 className="text-xl font-semibold text-gray-900 relative">
                    <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                      Health Check Tool
                    </span>
                    <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-500 to-blue-300 rounded-full"></div>
                  </h1>
                  <div className="flex items-center">
                    <VersionInfo />
                  </div>
                </div>
                <p className="text-sm text-gray-600 max-w-xl">
                  Ingrese los datos de conexión y pruebe la conectividad
                  inmediatamente. Las pruebas se guardan en el historial.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href="/kernel"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Kernel</span>
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

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenido del Tab Activo */}
          <div className="bg-white border border-gray-300 rounded-lg">
            <div className="p-6">{ActiveComponent && <ActiveComponent />}</div>
          </div>
        </div>

        {/* Sidebar de Historial */}
        <HistorySidebar
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyKey="healthCheckHistory"
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
