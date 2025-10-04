'use client';

import {
  Bot,
  Loader2,
  Send,
  Settings,
  User,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Removed heavy syntax highlighter for lighter chat implementation

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saveToLocalStorage, setSaveToLocalStorage] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('api');
  const [sidebarWidth, setSidebarWidth] = useState(600); // 600px = más ancho por defecto
  const [isResizing, setIsResizing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus en el input cuando se abre el sidebar
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Pequeño delay para asegurar que el sidebar esté completamente renderizado
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Manejar clicks fuera del sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        // Limpiar timeout anterior
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }

        setClickCount((prev) => prev + 1);

        // Reiniciar contador después de 2 segundos
        clickTimeoutRef.current = setTimeout(() => {
          setClickCount(0);
        }, 2000);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Cerrar después de 2 clicks
  useEffect(() => {
    if (clickCount >= 2) {
      onClose();
      setClickCount(0);
    }
  }, [clickCount, onClose]);

  // Removido: No cerrar al hacer clic fuera del modal

  useEffect(() => {
    // Cargar configuración del localStorage al abrir el sidebar
    const savedApiKey = localStorage.getItem('openai_api_key');
    const savedSystemPrompt = localStorage.getItem('openai_system_prompt');
    const savedMessages = localStorage.getItem('chat_messages');

    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    } else {
      // System prompt por defecto simplificado
      setSystemPrompt(
        `Responde siempre forma estructurada clara y consisa.Puedes usar markdown para formatear tu respuesta solo negritas. Rechaza cualquier pregunta que no sea de Tecnología.`
      );
    }

    // Cargar mensajes del localStorage
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convertir timestamps de string a Date
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
      }
    } else {
      // Si no hay mensajes guardados, generar mensaje de bienvenida desde la IA
      // Solo si hay API Key configurada
      if (savedApiKey) {
        setIsInitializing(true);
        generateWelcomeMessage();
      }
    }
  }, [isOpen]);

  // Función helper para filtrar mensajes internos y obtener el historial
  const getFilteredConversation = (messages: Message[]) => {
    return messages.filter((msg) => msg.id !== 'internal-user');
  };

  const generateWelcomeMessage = async () => {
    // Verificar si hay API Key configurada
    if (!apiKey) {
      console.log('No hay API Key configurada, saltando mensaje de bienvenida');
      setIsInitializing(false);
      return;
    }

    setIsInitializing(true);

    try {
      // Crear mensaje interno de usuario para contexto
      const internalUserMessage: Message = {
        id: 'internal-user',
        role: 'user',
        content: 'Saluda al usuario y pregúntale en qué puede ayudarle',
        timestamp: new Date(),
      };

      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: internalUserMessage.content,
          conversation: [internalUserMessage],
          apiKey: apiKey,
          systemPrompt: systemPrompt,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        // Incluir el mensaje interno de usuario en la conversación
        setMessages([internalUserMessage, welcomeMessage]);
        saveMessagesToLocalStorage([internalUserMessage, welcomeMessage]);
      } else {
        setIsConnected(false);
        // Si falla la IA, no mostrar mensaje de bienvenida
        setMessages([]);
      }
    } catch (error: any) {
      setIsConnected(false);
      // Si hay error, no mostrar mensaje de bienvenida
      setMessages([]);
    } finally {
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Verificar si hay API Key configurada
    if (!apiKey) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          '❌ Error: OpenAI API Key no configurada. Por favor, configura tu API Key en la configuración del chat.',
        timestamp: new Date(),
      };
      const newMessages = [
        ...messages,
        {
          id: Date.now().toString(),
          role: 'user' as const,
          content: inputMessage.trim(),
          timestamp: new Date(),
        },
        errorMessage,
      ];
      setMessages(newMessages);
      saveMessagesToLocalStorage(newMessages);
      setInputMessage('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    saveMessagesToLocalStorage(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversation: getFilteredConversation(messages), // Solo el historial, sin el mensaje actual
          apiKey: apiKey,
          systemPrompt: systemPrompt,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        const updatedMessages = [...newMessages, assistantMessage];
        setMessages(updatedMessages);
        saveMessagesToLocalStorage(updatedMessages);
      } else {
        setIsConnected(false);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Error: ${data.error}`,
          timestamp: new Date(),
        };
        const updatedMessages = [...newMessages, errorMessage];
        setMessages(updatedMessages);
        saveMessagesToLocalStorage(updatedMessages);
      }
    } catch (error: any) {
      setIsConnected(false);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error de conexión: ${error.message}`,
        timestamp: new Date(),
      };
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      saveMessagesToLocalStorage(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('chat_messages');
  };

  const saveMessagesToLocalStorage = (messagesToSave: Message[]) => {
    // Mantener solo los últimos 10 mensajes
    const limitedMessages = messagesToSave.slice(-10);
    localStorage.setItem('chat_messages', JSON.stringify(limitedMessages));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 300;
    const maxWidth = 800;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSaveConfig = () => {
    if (saveToLocalStorage) {
      if (apiKey) {
        localStorage.setItem('openai_api_key', apiKey);
      }
      if (systemPrompt) {
        localStorage.setItem('openai_system_prompt', systemPrompt);
      }
    }
    setShowConfig(false);
  };

  const handleClearConfig = () => {
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('openai_system_prompt');
    setApiKey('');
    setSystemPrompt(
      'Eres un asistente útil. Responde de forma clara y directa a las preguntas del usuario. Responde en español.'
    );
    setSaveToLocalStorage(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full bg-white shadow-xl flex flex-col"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Asistente IA
              </h2>
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isInitializing
                      ? 'bg-yellow-500 animate-pulse'
                      : isConnected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                ></div>
                <span className="text-xs text-gray-500">
                  {isInitializing
                    ? 'Inicializando...'
                    : isConnected
                    ? 'Conectado'
                    : 'Desconectado'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfig(true)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Configurar API Key"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={clearChat}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              {isInitializing ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <Bot className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Inicializando asistente...
                    </p>
                    <p className="text-xs text-gray-500">
                      Configurando conexión con OpenAI
                    </p>
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <Loader2 className="w-5 h-5 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">
                      Pensando...
                    </p>
                    <p className="text-xs text-gray-500">
                      Procesando tu mensaje
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Bot className="w-12 h-12 text-gray-300 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      ¡Hola! Soy tu asistente técnico
                    </p>
                    <p className="text-xs text-gray-500">
                      Escribe tu mensaje para comenzar la conversación
                    </p>
                    {!apiKey && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">
                          💡 Configura tu API Key para usar el asistente
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => {
              // Ocultar mensaje interno de usuario
              if (message.id === 'internal-user') {
                return null;
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                      maxWidth: '100%',
                    }}
                  >
                    <div className="flex items-start space-x-1">
                      {message.role === 'assistant' && (
                        <Bot className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      {message.role === 'user' && (
                        <User className="w-3 h-3 text-white mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="text-xs break-words overflow-wrap-anywhere prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-2">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-outside mb-2 space-y-1 pl-4">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic">{children}</em>
                              ),
                              code: ({ children }) => {
                                const inlineCodeText =
                                  typeof children === 'string'
                                    ? children
                                    : Array.isArray(children)
                                    ? children.join('')
                                    : String(children);

                                return (
                                  <code
                                    className="bg-gray-200 px-1 py-0.5 rounded text-xs break-all whitespace-pre-wrap cursor-pointer hover:bg-gray-300 transition-colors relative group"
                                    onClick={() =>
                                      copyToClipboard(inlineCodeText)
                                    }
                                    title="Hacer clic para copiar"
                                  >
                                    {children}
                                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                      {copiedCode === inlineCodeText
                                        ? 'Copiado!'
                                        : 'Copiar'}
                                    </span>
                                  </code>
                                );
                              },
                              pre: ({ children }) => {
                                // Extraer texto correctamente de los children
                                const extractText = (node: any): string => {
                                  if (typeof node === 'string') return node;
                                  if (typeof node === 'number')
                                    return String(node);
                                  if (Array.isArray(node)) {
                                    return node.map(extractText).join('');
                                  }
                                  if (
                                    node &&
                                    typeof node === 'object' &&
                                    node.props
                                  ) {
                                    return extractText(node.props.children);
                                  }
                                  return '';
                                };

                                const codeText = extractText(children);

                                return (
                                  <div
                                    className="rounded-lg my-2 overflow-hidden border border-gray-200"
                                    style={{ maxWidth: '100%' }}
                                  >
                                    <div className="flex items-center justify-between bg-gray-100 px-3 py-2 border-b border-gray-200">
                                      <span className="text-xs text-gray-600 font-medium truncate">
                                        Código
                                      </span>
                                      <button
                                        onClick={() =>
                                          copyToClipboard(codeText)
                                        }
                                        className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
                                      >
                                        {copiedCode === codeText ? (
                                          <>
                                            <Check className="w-3 h-3" />
                                            <span className="hidden sm:inline">
                                              Copiado
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span className="hidden sm:inline">
                                              Copiar
                                            </span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-b-lg">
                                      <pre className="text-xs text-gray-800 font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                                        {codeText}
                                      </pre>
                                    </div>
                                  </div>
                                );
                              },
                              h1: ({ children }) => (
                                <h1 className="text-sm font-bold mb-2">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-sm font-bold mb-2">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-bold mb-2">
                                  {children}
                                </h3>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto mb-2 border border-gray-200 rounded text-xs bg-white">
                                  <table className="min-w-full text-xs border-collapse">
                                    {children}
                                  </table>
                                </div>
                              ),
                              thead: ({ children }) => (
                                <thead className="bg-gray-50">{children}</thead>
                              ),
                              tbody: ({ children }) => (
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {children}
                                </tbody>
                              ),
                              tr: ({ children }) => (
                                <tr className="hover:bg-gray-50 transition-colors duration-150">
                                  {children}
                                </tr>
                              ),
                              th: ({ children }) => (
                                <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 bg-gray-50 whitespace-nowrap">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-2 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-2">
                <div className="flex items-center space-x-1">
                  <Bot className="w-3 h-3 text-blue-600" />
                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                  <span className="text-xs text-gray-600">Escribiendo...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-200 h-10"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="w-10 h-10 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            GPT-4 • La IA puede cometer errores
          </div>
        </div>

        {/* Indicador de redimensionamiento */}
        <div
          className="absolute left-0 top-0 h-full w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
          title="Arrastra para redimensionar"
        />
      </div>

      {/* Modal de Configuración */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Configurar Asistente IA
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('api')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'api'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                API Key
              </button>
              <button
                onClick={() => setActiveTab('prompt')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'prompt'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                System Prompt
              </button>
            </div>

            <div className="p-4">
              {/* Tab API Key */}
              {activeTab === 'api' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Obtén tu API Key en{' '}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        platform.openai.com
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {/* Tab System Prompt */}
              {activeTab === 'prompt' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      System Prompt
                    </label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Escribe el prompt del sistema..."
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Define cómo debe comportarse el asistente. Este prompt se
                      enviará en cada conversación.
                    </p>
                  </div>
                </div>
              )}

              {/* Configuración común */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <input
                  type="checkbox"
                  id="saveToLocalStorage"
                  checked={saveToLocalStorage}
                  onChange={(e) => setSaveToLocalStorage(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="saveToLocalStorage"
                  className="text-sm text-gray-700"
                >
                  Guardar configuración en localStorage
                </label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={handleClearConfig}
                  className="px-3 py-1 text-xs text-red-600 hover:text-red-700 underline"
                >
                  Limpiar configuración
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
