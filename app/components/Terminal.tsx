'use client';

import React, { useState, useEffect } from 'react';

interface TerminalProps {
  onCommand: (command: string) => void;
  isLoading: boolean;
  currentCommand: string;
  result?: any;
  onStop?: () => void;
  isStopping?: boolean;
}

export default function TerminalComponent({
  onCommand,
  isLoading,
  currentCommand,
  result,
  onStop,
  isStopping,
}: TerminalProps) {
  const [input, setInput] = useState('');

  // Efecto para manejar comandos externos (como comandos rápidos)
  useEffect(() => {
    if (currentCommand && currentCommand !== input) {
      setInput(currentCommand);
      // Enfocar el input después de establecer el comando
      setTimeout(() => {
        const inputElement = document.querySelector(
          'input[type="text"]'
        ) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          // Posicionar el cursor al final del texto
          inputElement.setSelectionRange(
            inputElement.value.length,
            inputElement.value.length
          );
        }
      }, 10);
    }
  }, [currentCommand]);

  // Efecto para asegurar que el input esté habilitado cuando no esté cargando
  useEffect(() => {
    if (!isLoading) {
      // Asegurar que el input esté habilitado para edición
      const inputElement = document.querySelector(
        'input[type="text"]'
      ) as HTMLInputElement;
      if (inputElement) {
        inputElement.disabled = false;
        inputElement.focus();
      }
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand(input.trim());
      // No limpiar el input para permitir edición
    }
  };

  return (
    <div className="w-full">
      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Botón de ejecutar */}
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ejecutar"
          >
            <span className="text-sm font-bold">&gt;</span>
          </button>

          {/* Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`flex-1 bg-transparent border-none outline-none font-mono text-sm placeholder-gray-400 placeholder:font-sans mx-2 ${
              isLoading ? 'text-gray-500 cursor-wait' : 'text-gray-800'
            }`}
            placeholder="comando..."
            disabled={isLoading}
          />

          {/* Botón de detener */}
          {isLoading && onStop && (
            <button
              type="button"
              onClick={onStop}
              disabled={isStopping}
              className="flex items-center justify-center w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Detener"
            >
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
