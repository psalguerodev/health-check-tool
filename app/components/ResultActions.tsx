'use client';

import { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';

interface ResultActionsProps {
  content: string;
  filename?: string;
}

export default function ResultActions({
  content,
  filename = 'result',
}: ResultActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center space-x-2 ml-auto">
      <button
        onClick={handleCopy}
        className="p-1 text-gray-500 hover:text-gray-700"
        title="Copiar al portapapeles"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      <button
        onClick={handleDownload}
        className="p-1 text-gray-500 hover:text-gray-700"
        title="Descargar resultado"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>
  );
}
