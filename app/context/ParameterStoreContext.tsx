'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Parameter {
  id: string;
  name: string;
  value: string;
  type: 'string' | 'secure' | 'list';
  description?: string;
  category: 'database' | 'api' | 'aws' | 'general';
}

interface ParameterStoreContextType {
  parameters: Parameter[];
  addParameter: (parameter: Omit<Parameter, 'id'>) => void;
  updateParameter: (id: string, parameter: Partial<Parameter>) => void;
  deleteParameter: (id: string) => void;
  getParameter: (name: string) => Parameter | undefined;
  getParametersByCategory: (category: Parameter['category']) => Parameter[];
}

const ParameterStoreContext = createContext<
  ParameterStoreContextType | undefined
>(undefined);

export function ParameterStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [parameters, setParameters] = useState<Parameter[]>([]);

  // Cargar parámetros desde localStorage
  useEffect(() => {
    const savedParameters = localStorage.getItem('awsParameterStore');
    if (savedParameters) {
      try {
        setParameters(JSON.parse(savedParameters));
      } catch (error) {
        console.error('Error al cargar parámetros:', error);
        setParameters([]);
      }
    }
  }, []);

  // Guardar parámetros en localStorage
  useEffect(() => {
    localStorage.setItem('awsParameterStore', JSON.stringify(parameters));
  }, [parameters]);

  const addParameter = (parameter: Omit<Parameter, 'id'>) => {
    const newParameter: Parameter = {
      ...parameter,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    setParameters((prev) => [...prev, newParameter]);
  };

  const updateParameter = (id: string, updates: Partial<Parameter>) => {
    setParameters((prev) =>
      prev.map((param) => (param.id === id ? { ...param, ...updates } : param))
    );
  };

  const deleteParameter = (id: string) => {
    setParameters((prev) => prev.filter((param) => param.id !== id));
  };

  const getParameter = (name: string) => {
    return parameters.find((param) => param.name === name);
  };

  const getParametersByCategory = (category: Parameter['category']) => {
    return parameters.filter((param) => param.category === category);
  };

  return (
    <ParameterStoreContext.Provider
      value={{
        parameters,
        addParameter,
        updateParameter,
        deleteParameter,
        getParameter,
        getParametersByCategory,
      }}
    >
      {children}
    </ParameterStoreContext.Provider>
  );
}

export function useParameterStore() {
  const context = useContext(ParameterStoreContext);
  if (context === undefined) {
    throw new Error(
      'useParameterStore must be used within a ParameterStoreProvider'
    );
  }
  return context;
}
