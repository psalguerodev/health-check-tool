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
    <div className="flex items-center space-x-1 ml-auto">
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Copiar al portapapeles"
      >
        {copied ? (
          <Check className="w-3 h-3 text-green-600" />
        ) : (
          <Copy className="w-3 h-3 text-gray-600" />
        )}
      </button>
      <button
        onClick={handleDownload}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Descargar resultado"
      >
        <Download className="w-3 h-3 text-gray-600" />
      </button>
    </div>
  );
}
