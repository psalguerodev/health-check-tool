'use client';

import { LucideIcon } from 'lucide-react';
import VersionInfo from './VersionInfo';

interface PageHeaderProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  onHistoryOpen: () => void;
  onChatOpen: () => void;
  currentPage: 'health' | 'kernel' | 'camel';
  showSectionFilter?: boolean;
}

export default function PageHeader({
  icon: Icon,
  iconColor,
  title,
  description,
  onHistoryOpen,
  onChatOpen,
  currentPage,
}: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3">
              <Icon className={`w-7 h-7 ${iconColor}`} />
              <div>
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-semibold text-gray-900 relative">
                    <span className="bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent">
                      {title}
                    </span>
                    <div className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"></div>
                  </h1>
                  <VersionInfo />
                </div>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
              </div>
            </div>
          </div>
          {/* Navbar elegante con líneas */}
          <nav className="flex items-center space-x-6">
            {/* Páginas principales */}
            <div className="flex items-center space-x-6">
              <a
                href="/"
                className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                  currentPage === 'health'
                    ? 'text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Health Check
                {currentPage === 'health' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </a>
              <a
                href="/kernel"
                className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                  currentPage === 'kernel'
                    ? 'text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Kernel
                {currentPage === 'kernel' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </a>
              <a
                href="/camel"
                className={`relative px-1 py-2 text-sm font-medium transition-colors ${
                  currentPage === 'camel'
                    ? 'text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Camel
                {currentPage === 'camel' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </a>
            </div>

            {/* Separador */}
            <div className="w-px h-6 bg-gray-300"></div>

            {/* Herramientas */}
            <div className="flex items-center space-x-4">
              <button
                onClick={onHistoryOpen}
                className="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Historial
              </button>
              <button
                onClick={onChatOpen}
                className="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                title="Chat IA"
              >
                Chat
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
