'use client';

import { useState, useEffect } from 'react';

export interface TestHistoryItem {
  id: string;
  type: string;
  url: string;
  host: string;
  port?: number;
  database?: string;
  region?: string;
  queueUrl?: string;
  endpoint?: string;
  method?: string;
  command?: string;
  success: boolean;
  message: string;
  duration: number;
  timestamp: Date;
}

export function useTestHistory(historyKey: string = 'healthCheckHistory') {
  const [history, setHistory] = useState<TestHistoryItem[]>([]);

  // Función para cargar historial desde localStorage
  const loadHistoryFromStorage = () => {
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // Convertir timestamps de string a Date
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setHistory(historyWithDates);
        return historyWithDates;
      } catch (error) {
        console.error('Error al cargar historial:', error);
        setHistory([]);
        return [];
      }
    } else {
      setHistory([]);
      return [];
    }
  };

  // Cargar historial desde localStorage al montar el componente
  useEffect(() => {
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const historyWithDates = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setHistory(historyWithDates);
      } catch (error) {
        console.error('Error al cargar historial:', error);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [historyKey]);

  // Guardar historial en localStorage cuando cambie
  useEffect(() => {
    // Solo guardar si el historial no está vacío
    if (history.length > 0) {
      localStorage.setItem(historyKey, JSON.stringify(history));
    }
  }, [history, historyKey]);

  const addTestResult = (testResult: Omit<TestHistoryItem, 'id'>) => {
    const newItem: TestHistoryItem = {
      ...testResult,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    setHistory((prev) => [newItem, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(historyKey);
  };

  const refreshHistory = () => {
    loadHistoryFromStorage();
  };

  const exportToCSV = () => {
    if (history.length === 0) return;

    const headers = [
      'Tipo',
      'URL/Host',
      'Puerto',
      'Base de Datos',
      'Región',
      'Cola/Endpoint',
      'Método',
      'Estado',
      'Mensaje',
      'Duración (ms)',
      'Fecha y Hora',
    ];

    const csvContent = [
      headers.join(','),
      ...history.map((item) =>
        [
          item.type,
          `"${item.url || item.host}"`,
          item.port || '',
          item.database || '',
          item.region || '',
          item.queueUrl || item.endpoint || '',
          item.method || '',
          item.success ? 'Éxito' : 'Error',
          `"${item.message.replace(/"/g, '""')}"`,
          item.duration,
          item.timestamp.toLocaleString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `health-check-report-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    history,
    addTestResult,
    clearHistory,
    exportToCSV,
    refreshHistory,
  };
}
