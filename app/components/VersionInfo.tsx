'use client';

import { useState, useEffect } from 'react';
import { Tag, X, FileText, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface VersionInfo {
  version: string;
  buildDate: string;
  description: string;
}

export default function VersionInfo() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changelog, setChangelog] = useState<string>('');
  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false);

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

  const fetchChangelog = async () => {
    setIsLoadingChangelog(true);
    try {
      const response = await fetch('/api/changelog');
      if (response.ok) {
        const text = await response.text();
        setChangelog(text);
      } else {
        setChangelog('Changelog no disponible');
      }
    } catch (error) {
      console.error('Error fetching changelog:', error);
      setChangelog('Error al cargar el changelog');
    } finally {
      setIsLoadingChangelog(false);
    }
  };

  const handleVersionClick = () => {
    setIsModalOpen(true);
    if (!changelog) {
      fetchChangelog();
    }
  };

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
    <>
      <div
        className="flex items-center space-x-1 text-xs text-gray-400 cursor-pointer hover:text-blue-600 transition-colors"
        onClick={handleVersionClick}
        title="Ver changelog"
      >
        <Tag className="w-3 h-3" />
        <span>v{versionInfo.version}</span>
      </div>

      {/* Modal de Changelog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Changelog v{versionInfo.version}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {versionInfo.description} • {versionInfo.buildDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido del changelog */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {isLoadingChangelog ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-500">
                      Cargando changelog...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base font-semibold text-gray-800 mb-2 mt-4">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-3">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-3 space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-3 space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-gray-700 leading-relaxed">
                          {children}
                        </li>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-800 overflow-x-auto mb-3">
                          {children}
                        </pre>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-gray-900">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-gray-600">{children}</em>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50 text-sm text-gray-700 italic mb-3">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {changelog}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
