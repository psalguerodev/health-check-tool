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
  Maximize2,
  ArrowLeft,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'markdown-to-jsx';

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
  const [assistantId, setAssistantId] = useState('');
  const [configMode, setConfigMode] = useState<'prompt' | 'assistant'>(
    'prompt'
  );
  const [sidebarWidth, setSidebarWidth] = useState(800); // 800px = ancho máximo por defecto
  const [isResizing, setIsResizing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [expandedTable, setExpandedTable] = useState<React.ReactNode | null>(
    null
  );
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (instant = false) => {
    if (instant) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Focus en el input y scroll instantáneo cuando se abre el sidebar
  useEffect(() => {
    if (isOpen) {
      // Siempre mostrar el chat cuando se abre el sidebar
      setShowConfig(false);

      // Establecer scroll al final de forma instantánea e invisible
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      });

      // Focus en el input
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
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
    const savedAssistantId = localStorage.getItem('openai_assistant_id');
    const savedConfigMode = localStorage.getItem('openai_config_mode');
    const savedMessages = localStorage.getItem('chat_messages');

    if (savedApiKey) {
      setApiKey(savedApiKey);
      setSaveToLocalStorage(true); // Marcar el checkbox si hay credenciales guardadas
    }

    if (savedAssistantId) {
      setAssistantId(savedAssistantId);
    }

    if (savedConfigMode === 'assistant' || savedConfigMode === 'prompt') {
      setConfigMode(savedConfigMode);
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

      const requestBody: any = {
        message: internalUserMessage.content,
        conversation: [internalUserMessage],
        apiKey: apiKey,
      };

      // Agregar systemPrompt o assistantId según el modo configurado
      if (configMode === 'assistant' && assistantId) {
        requestBody.assistantId = assistantId;
      } else {
        requestBody.systemPrompt = systemPrompt;
      }

      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

    // Verificar si está en modo Assistant y tiene Assistant ID configurado
    if (configMode === 'assistant' && !assistantId) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          '❌ Error: Assistant ID no configurado. Por favor, configura tu Assistant ID en la configuración del chat o cambia a modo System Prompt.',
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
      const requestBody: any = {
        message: userMessage.content,
        conversation: getFilteredConversation(messages), // Solo el historial, sin el mensaje actual
        apiKey: apiKey,
      };

      // Agregar systemPrompt o assistantId según el modo configurado
      if (configMode === 'assistant' && assistantId) {
        requestBody.assistantId = assistantId;
      } else {
        requestBody.systemPrompt = systemPrompt;
      }

      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

  const clearChat = async () => {
    setIsClearingChat(true);

    // Si está usando Assistant ID, limpiar el thread en el backend
    if (configMode === 'assistant' && assistantId && apiKey) {
      try {
        const response = await fetch('/api/openai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clearThread: true,
            assistantId: assistantId,
            apiKey: apiKey,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('Thread limpiado correctamente:', data.threadId);
        } else {
          console.error('Error al limpiar thread:', data.error);
        }
      } catch (error) {
        console.error('Error al limpiar thread:', error);
      }
    }

    // Limpiar mensajes localmente
    setMessages([]);
    localStorage.removeItem('chat_messages');
    setIsClearingChat(false);
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
      if (assistantId) {
        localStorage.setItem('openai_assistant_id', assistantId);
      }
      localStorage.setItem('openai_config_mode', configMode);
    }

    // Mostrar notificación de guardado
    setShowSaveNotification(true);
    setTimeout(() => {
      setShowSaveNotification(false);
      // Cerrar el panel de configuración después de guardar
      setShowConfig(false);
    }, 2000);
  };

  const handleClearConfig = () => {
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('openai_system_prompt');
    localStorage.removeItem('openai_assistant_id');
    localStorage.removeItem('openai_config_mode');
    setApiKey('');
    setAssistantId('');
    setSystemPrompt(
      'Responde siempre forma estructurada clara y consisa.Puedes usar markdown para formatear tu respuesta solo negritas. Rechaza cualquier pregunta que no sea de Tecnología.'
    );
    setConfigMode('prompt');
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
        {showConfig ? (
          /* Vista de Configuración */
          <>
            {/* Header de Configuración */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowConfig(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Volver al chat"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Configuración
                  </h2>
                  <p className="text-xs text-gray-500">
                    Ajustes del asistente IA
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Contenido de Configuración */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Obtén tu API Key en{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              {/* Toggle de modo de configuración */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Modo de configuración
                </label>
                <div className="flex items-center space-x-4 bg-gray-50 p-3 rounded-lg">
                  <button
                    onClick={() => setConfigMode('prompt')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      configMode === 'prompt'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    System Prompt
                  </button>
                  <button
                    onClick={() => setConfigMode('assistant')}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      configMode === 'assistant'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    Assistant ID
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Elige cómo configurar el asistente: con un prompt
                  personalizado o usando un Assistant ID de OpenAI
                </p>
              </div>

              {/* Contenido condicional según el modo */}
              {configMode === 'prompt' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Escribe el prompt del sistema..."
                    rows={8}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Define cómo debe comportarse el asistente. Este prompt se
                    enviará en cada conversación.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Assistant ID
                  </label>
                  <input
                    type="text"
                    value={assistantId}
                    onChange={(e) => setAssistantId(e.target.value)}
                    placeholder="asst_..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Usa un Assistant ID creado en{' '}
                    <a
                      href="https://platform.openai.com/assistants"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      OpenAI Assistants
                    </a>
                    . El asistente usará la configuración definida en la
                    plataforma.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
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
                <p className="text-xs text-gray-500 mt-2 ml-6">
                  Tu configuración se guardará en tu navegador para futuras
                  sesiones
                </p>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              {showSaveNotification && (
                <div className="mb-3 flex items-center justify-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Configuración guardada correctamente
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleClearConfig}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Limpiar configuración
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={showSaveNotification}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar cambios
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Vista de Chat */
          <>
            {/* Header del Chat */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">KORA</h2>
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
                  title="Configuración"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={clearChat}
                  disabled={isClearingChat}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearingChat ? 'Limpiando...' : 'Limpiar'}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-3"
            >
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
                          ¡Hola! Soy Kora
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
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[65%] rounded-lg p-3 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                            : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 border border-gray-200'
                        }`}
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                          maxWidth: '100%',
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          {message.role === 'assistant' && (
                            <Bot className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                          )}
                          {message.role === 'user' && (
                            <User className="w-4 h-4 text-white mt-1 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="text-sm break-words overflow-wrap-anywhere prose prose-base max-w-none">
                              {message.role === 'user' ? (
                                <div className="whitespace-pre-wrap">
                                  {message.content}
                                </div>
                              ) : (
                                <Markdown
                                  options={{
                                    overrides: {
                                      p: ({ children }) => (
                                        <p className="mb-3 last:mb-0 leading-relaxed text-sm">
                                          {children}
                                        </p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul
                                          className="list-disc mb-3 space-y-1.5 text-sm"
                                          style={{
                                            paddingLeft: '1.25rem',
                                            listStylePosition: 'outside',
                                          }}
                                        >
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol
                                          className="list-decimal mb-3 space-y-1.5 text-sm"
                                          style={{
                                            paddingLeft: '1.25rem',
                                            listStylePosition: 'outside',
                                          }}
                                        >
                                          {children}
                                        </ol>
                                      ),
                                      li: ({ children }) => (
                                        <li
                                          className="leading-relaxed"
                                          style={{ paddingLeft: '0.25rem' }}
                                        >
                                          {children}
                                        </li>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-bold text-gray-900">
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
                                            className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[13px] font-mono break-all whitespace-pre-wrap cursor-pointer hover:bg-blue-100 inline-block border border-blue-200"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              copyToClipboard(inlineCodeText);
                                            }}
                                            title="Copiar"
                                          >
                                            {children}
                                          </code>
                                        );
                                      },
                                      pre: ({ children }) => {
                                        const extractText = (
                                          node: any
                                        ): string => {
                                          if (typeof node === 'string')
                                            return node;
                                          if (typeof node === 'number')
                                            return String(node);
                                          if (Array.isArray(node)) {
                                            return node
                                              .map(extractText)
                                              .join('');
                                          }
                                          if (
                                            node &&
                                            typeof node === 'object' &&
                                            node.props
                                          ) {
                                            return extractText(
                                              node.props.children
                                            );
                                          }
                                          return '';
                                        };

                                        const codeText = extractText(children);

                                        return (
                                          <div
                                            className="rounded-lg my-2 overflow-hidden border border-gray-300 shadow-sm"
                                            style={{ maxWidth: '100%' }}
                                          >
                                            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 px-2.5 py-1.5 border-b border-blue-200">
                                              <span className="text-xs text-blue-900 font-semibold truncate">
                                                Código
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  copyToClipboard(codeText);
                                                }}
                                                className="flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-900 transition-colors flex-shrink-0 hover:bg-white rounded px-1.5 py-0.5"
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
                                            <div className="bg-gray-50 p-2.5 rounded-b-lg">
                                              <pre className="text-[13px] text-gray-800 font-mono leading-snug whitespace-pre-wrap break-words overflow-x-auto">
                                                {codeText}
                                              </pre>
                                            </div>
                                          </div>
                                        );
                                      },
                                      h1: ({ children }) => (
                                        <h1 className="text-2xl font-extrabold mb-4 mt-5 text-gray-900 border-b-2 border-blue-600 pb-2 leading-tight">
                                          {children}
                                        </h1>
                                      ),
                                      h2: ({ children }) => (
                                        <h2 className="text-xl font-bold mb-3 mt-4 text-gray-900 leading-tight">
                                          {children}
                                        </h2>
                                      ),
                                      h3: ({ children }) => (
                                        <h3 className="text-lg font-bold mb-2 mt-3 text-gray-800 leading-tight">
                                          {children}
                                        </h3>
                                      ),
                                      h4: ({ children }) => (
                                        <h4 className="text-base font-bold mb-2 mt-3 text-gray-800 leading-tight">
                                          {children}
                                        </h4>
                                      ),
                                      h5: ({ children }) => (
                                        <h5 className="text-base font-semibold mb-2 mt-2 text-gray-700 leading-tight">
                                          {children}
                                        </h5>
                                      ),
                                      h6: ({ children }) => (
                                        <h6 className="text-sm font-semibold mb-2 mt-2 text-gray-700 uppercase tracking-wide leading-tight">
                                          {children}
                                        </h6>
                                      ),
                                      table: ({ children }) => {
                                        const tableContent = children;

                                        return (
                                          <div className="my-3 relative">
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setExpandedTable(tableContent);
                                              }}
                                              className="absolute top-2 right-2 z-20 bg-white border border-gray-300 rounded p-1.5 hover:bg-gray-100 shadow-sm"
                                              title="Expandir tabla"
                                            >
                                              <Maximize2 className="w-4 h-4 text-gray-600" />
                                            </button>
                                            <div
                                              className="border border-gray-300 rounded bg-white chat-table-scroll"
                                              style={{
                                                maxHeight: '400px',
                                                overflowX: 'scroll',
                                                overflowY: 'scroll',
                                                display: 'block',
                                                width: '100%',
                                              }}
                                            >
                                              <table
                                                style={{
                                                  borderCollapse: 'collapse',
                                                  width: '100%',
                                                  tableLayout: 'auto',
                                                  display: 'table',
                                                }}
                                              >
                                                {tableContent}
                                              </table>
                                            </div>
                                          </div>
                                        );
                                      },
                                      thead: ({ children }) => (
                                        <thead
                                          style={{
                                            position: 'sticky',
                                            top: 0,
                                            backgroundColor: '#f3f4f6',
                                            zIndex: 10,
                                          }}
                                        >
                                          {children}
                                        </thead>
                                      ),
                                      tbody: ({ children }) => (
                                        <tbody
                                          style={{ backgroundColor: 'white' }}
                                        >
                                          {children}
                                        </tbody>
                                      ),
                                      tr: ({ children }) => (
                                        <tr
                                          style={{
                                            borderBottom: '1px solid #e5e7eb',
                                          }}
                                        >
                                          {children}
                                        </tr>
                                      ),
                                      th: ({ children }) => (
                                        <th
                                          style={{
                                            padding: '12px 14px',
                                            textAlign: 'left',
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#111827',
                                            borderRight: '1px solid #d1d5db',
                                            backgroundColor: '#f3f4f6',
                                            whiteSpace: 'nowrap',
                                            lineHeight: '1.5',
                                          }}
                                        >
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td
                                          style={{
                                            padding: '12px 14px',
                                            fontSize: '13px',
                                            color: '#1f2937',
                                            borderRight: '1px solid #e5e7eb',
                                            maxWidth: '400px',
                                            lineHeight: '1.6',
                                            verticalAlign: 'top',
                                          }}
                                        >
                                          <div
                                            style={{
                                              whiteSpace: 'normal',
                                              wordWrap: 'break-word',
                                              overflowWrap: 'break-word',
                                            }}
                                          >
                                            {children}
                                          </div>
                                        </td>
                                      ),
                                    },
                                  }}
                                >
                                  {message.content}
                                </Markdown>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-xs opacity-60">
                                {new Date(
                                  message.timestamp
                                ).toLocaleTimeString()}
                              </p>
                              {message.role === 'assistant' && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    copyToClipboard(message.content);
                                  }}
                                  className="text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center space-x-1"
                                  title="Copiar mensaje"
                                >
                                  {copiedCode === message.content ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Copiado</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4 text-blue-600" />
                      <div className="flex space-x-1">
                        <div
                          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all duration-200 h-10 shadow-sm"
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-10 h-10 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center shadow-sm"
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
          </>
        )}

        {/* Indicador de redimensionamiento */}
        <div
          className="absolute left-0 top-0 h-full w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
          title="Arrastra para redimensionar"
        />
      </div>

      {/* Modal de Tabla Expandida */}
      {expandedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Tabla expandida
              </h3>
              <button
                onClick={() => setExpandedTable(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div
              className="flex-1 overflow-auto p-4 chat-table-scroll"
              style={{
                overflowX: 'scroll',
                overflowY: 'scroll',
              }}
            >
              <table
                style={{
                  borderCollapse: 'collapse',
                  width: '100%',
                  tableLayout: 'auto',
                  display: 'table',
                }}
              >
                {expandedTable}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
