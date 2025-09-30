'use client';

import React, { createContext, useContext } from 'react';
import { useTestHistory, TestHistoryItem } from '../hooks/useTestHistory';

interface TestHistoryContextType {
  history: TestHistoryItem[];
  addTestResult: (testResult: Omit<TestHistoryItem, 'id'>) => void;
  clearHistory: () => void;
  exportToCSV: () => void;
}

const TestHistoryContext = createContext<TestHistoryContextType | undefined>(
  undefined
);

export function TestHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { history, addTestResult, clearHistory, exportToCSV } =
    useTestHistory();

  return (
    <TestHistoryContext.Provider
      value={{ history, addTestResult, clearHistory, exportToCSV }}
    >
      {children}
    </TestHistoryContext.Provider>
  );
}

export function useTestHistoryContext() {
  const context = useContext(TestHistoryContext);
  if (context === undefined) {
    throw new Error(
      'useTestHistoryContext must be used within a TestHistoryProvider'
    );
  }
  return context;
}
