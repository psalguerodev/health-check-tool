'use client';

import { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';

interface VersionInfo {
  version: string;
  buildDate: string;
  description: string;
}

export default function VersionInfo() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('/api/version');
        const data = await response.json();
        setVersionInfo(data);
      } catch (error) {
        console.error('Error fetching version info:', error);
        // Fallback version
        setVersionInfo({
          version: '0.1.1',
          buildDate: '2024-01-15',
          description: 'Health Check Tool',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersion();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-1 text-xs text-gray-400">
        <Tag className="w-3 h-3" />
        <span>Cargando versión...</span>
      </div>
    );
  }

  if (!versionInfo) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-400">
      <Tag className="w-3 h-3" />
      <span>v{versionInfo.version}</span>
    </div>
  );
}
