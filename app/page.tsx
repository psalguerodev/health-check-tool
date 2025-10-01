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
import ParameterStoreModule from './components/ParameterStoreModule';
import {
  Database,
  Server,
  Globe,
  MessageSquare,
  History,
  Terminal,
  Wifi,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('db2');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
    <div className="min-h-screen bg-white">
      {/* Contenido principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Health Check Tool
              </h1>
              <p className="text-sm text-gray-600">
                Ingrese los datos de conexión y pruebe la conectividad
                inmediatamente. Las pruebas se guardan en el historial.
              </p>
            </div>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <History className="w-4 h-4" />
              <span>Historial</span>
            </button>
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
      />

      {/* Módulo flotante de Parameter Store */}
      <ParameterStoreModule />
    </div>
  );
}
