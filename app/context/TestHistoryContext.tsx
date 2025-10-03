'use client';

import React, { createContext, useContext } from 'react';
import { useTestHistory, TestHistoryItem } from '../hooks/useTestHistory';

interface TestHistoryContextType {
  history: TestHistoryItem[];
  addTestResult: (testResult: Omit<TestHistoryItem, 'id'>) => void;
  clearHistory: () => void;
  exportToCSV: () => void;
  refreshHistory: () => void;
}

const TestHistoryContext = createContext<TestHistoryContextType | undefined>(
  undefined
);

export function TestHistoryProvider({
  children,
  historyKey = 'healthCheckHistory',
}: {
  children: React.ReactNode;
  historyKey?: string;
}) {
  const { history, addTestResult, clearHistory, exportToCSV, refreshHistory } =
    useTestHistory(historyKey);

  return (
    <TestHistoryContext.Provider
      value={{
        history,
        addTestResult,
        clearHistory,
        exportToCSV,
        refreshHistory,
      }}
    >
      {children}
    </TestHistoryContext.Provider>
  );
}

export function useTestHistoryContext(historyKey?: string) {
  const context = useContext(TestHistoryContext);
  if (context === undefined) {
    throw new Error(
      'useTestHistoryContext must be used within a TestHistoryProvider'
    );
  }
  return context;
}
