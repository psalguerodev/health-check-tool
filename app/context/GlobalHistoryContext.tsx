'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { TestHistoryItem } from '../hooks/useTestHistory';

interface GlobalHistoryContextType {
  healthHistory: TestHistoryItem[];
  kernelHistory: TestHistoryItem[];
  camelHistory: TestHistoryItem[];
  allHistory: TestHistoryItem[];
  refreshAllHistory: () => void;
  clearAllHistory: () => void;
  exportAllHistory: () => void;
}

const GlobalHistoryContext = createContext<
  GlobalHistoryContextType | undefined
>(undefined);

export function GlobalHistoryProvider({ children }: { children: ReactNode }) {
  const [healthHistory, setHealthHistory] = useState<TestHistoryItem[]>([]);
  const [kernelHistory, setKernelHistory] = useState<TestHistoryItem[]>([]);
  const [camelHistory, setCamelHistory] = useState<TestHistoryItem[]>([]);

  // Cargar historiales desde localStorage
  const loadHistory = (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error(`Error loading history for ${key}:`, error);
    }
    return [];
  };

  // Guardar historial en localStorage
  const saveHistory = (key: string, history: TestHistoryItem[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error(`Error saving history for ${key}:`, error);
    }
  };

  // Refrescar todos los historiales
  const refreshAllHistory = () => {
    setHealthHistory(loadHistory('healthCheckHistory'));
    setKernelHistory(loadHistory('kernelHistory'));
    setCamelHistory(loadHistory('camelHistory'));
  };

  // Limpiar todos los historiales
  const clearAllHistory = () => {
    setHealthHistory([]);
    setKernelHistory([]);
    setCamelHistory([]);
    localStorage.removeItem('healthCheckHistory');
    localStorage.removeItem('kernelHistory');
    localStorage.removeItem('camelHistory');
  };

  // Exportar todos los historiales
  const exportAllHistory = () => {
    const allData = [
      ...healthHistory.map((item) => ({ ...item, section: 'health' })),
      ...kernelHistory.map((item) => ({ ...item, section: 'kernel' })),
      ...camelHistory.map((item) => ({ ...item, section: 'camel' })),
    ];

    const csvContent = [
      ['Timestamp', 'Section', 'Type', 'Success', 'Message', 'Details'],
      ...allData.map((item) => [
        new Date(item.timestamp).toISOString(),
        item.section || 'health',
        item.type,
        item.success ? 'Yes' : 'No',
        item.message,
        item.message || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Combinar todos los historiales
  const allHistory = [
    ...healthHistory.map((item) => ({ ...item, section: 'health' })),
    ...kernelHistory.map((item) => ({ ...item, section: 'kernel' })),
    ...camelHistory.map((item) => ({ ...item, section: 'camel' })),
  ].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Cargar historiales al montar
  useEffect(() => {
    refreshAllHistory();
  }, []);

  // Escuchar cambios en localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      refreshAllHistory();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <GlobalHistoryContext.Provider
      value={{
        healthHistory,
        kernelHistory,
        camelHistory,
        allHistory,
        refreshAllHistory,
        clearAllHistory,
        exportAllHistory,
      }}
    >
      {children}
    </GlobalHistoryContext.Provider>
  );
}

export function useGlobalHistory() {
  const context = useContext(GlobalHistoryContext);
  if (context === undefined) {
    throw new Error(
      'useGlobalHistory must be used within a GlobalHistoryProvider'
    );
  }
  return context;
}
