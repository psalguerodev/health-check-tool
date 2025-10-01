'use client';

import { useState, useEffect } from 'react';
import { Server, Cpu, HardDrive, Wifi, Clock } from 'lucide-react';

interface ServerInfo {
  ip: string;
  hostname: string;
  platform: string;
  uptime: string;
  memory: {
    total: string;
    free: string;
    used: string;
  };
  cpu: {
    usage: string;
    cores: number;
  };
}

export default function ServerInfoCard() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const response = await fetch('/api/server-info');
        const data = await response.json();
        setServerInfo(data);
      } catch (error) {
        console.error('Error fetching server info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServerInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">
            Cargando info del servidor...
          </span>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">Info no disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 mr-6">
          <Server className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-700">Servidor</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600 ">{serverInfo.ip}</span>
          </div>

          <div className="flex items-center space-x-1">
            <HardDrive className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">
              {serverInfo.memory.used}/{serverInfo.memory.total}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">
              {serverInfo.cpu.usage}%
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">{serverInfo.uptime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
