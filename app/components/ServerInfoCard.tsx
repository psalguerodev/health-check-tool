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
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-blue-500" />
          <span className="text-xs text-gray-600">
            Cargando info del servidor...
          </span>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <Server className="w-4 h-4 text-blue-500" />
          <span className="text-xs text-gray-600">Info no disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 mr-6">
          <Server className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-gray-800">Servidor</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Wifi className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-gray-700 font-medium">
              {serverInfo.ip}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <HardDrive className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-gray-700 font-medium">
              {serverInfo.memory.used}/{serverInfo.memory.total}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-gray-700 font-medium">
              {serverInfo.cpu.usage}%
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-gray-700 font-medium">
              {serverInfo.uptime}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Server className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-gray-700 font-medium">
              {serverInfo.platform}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
