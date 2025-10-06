'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

interface BitbucketAccount {
  id: string;
  name: string;
  workspace: string;
  email: string;
  apiToken: string;
}

export default function BitbucketConfigModule() {
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState<BitbucketAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<BitbucketAccount>({
    id: '',
    name: '',
    workspace: '',
    email: '',
    apiToken: '',
  });
  const [showToken, setShowToken] = useState(false);
  const [saveToLocalStorage, setSaveToLocalStorage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // Cargar cuentas guardadas
  useEffect(() => {
    const savedAccounts = localStorage.getItem('bitbucket_accounts');
    if (savedAccounts) {
      try {
        const parsedAccounts = JSON.parse(savedAccounts);
        setAccounts(parsedAccounts);
        setSaveToLocalStorage(true);
      } catch (error) {
        console.error('Error al cargar cuentas:', error);
      }
    }
  }, []);

  const handleSave = () => {
    if (
      !currentAccount.name ||
      !currentAccount.workspace ||
      !currentAccount.email ||
      !currentAccount.apiToken
    ) {
      alert('Por favor completa todos los campos');
      return;
    }

    let updatedAccounts: BitbucketAccount[];

    if (editingId) {
      // Actualizar cuenta existente
      updatedAccounts = accounts.map((acc) =>
        acc.id === editingId ? { ...currentAccount, id: editingId } : acc
      );
    } else {
      // Agregar nueva cuenta
      const newAccount = {
        ...currentAccount,
        id: Date.now().toString(),
      };
      updatedAccounts = [...accounts, newAccount];
    }

    setAccounts(updatedAccounts);

    if (saveToLocalStorage) {
      localStorage.setItem(
        'bitbucket_accounts',
        JSON.stringify(updatedAccounts)
      );
    }

    // Mostrar notificación
    setShowSaveNotification(true);
    setTimeout(() => setShowSaveNotification(false), 2000);

    // Limpiar formulario
    setCurrentAccount({
      id: '',
      name: '',
      workspace: '',
      email: '',
      apiToken: '',
    });
    setEditingId(null);
  };

  const handleEdit = (account: BitbucketAccount) => {
    setCurrentAccount(account);
    setEditingId(account.id);
  };

  const handleDelete = (id: string) => {
    const updatedAccounts = accounts.filter((acc) => acc.id !== id);
    setAccounts(updatedAccounts);

    if (saveToLocalStorage) {
      localStorage.setItem(
        'bitbucket_accounts',
        JSON.stringify(updatedAccounts)
      );
    }
  };

  const handleClear = () => {
    setCurrentAccount({
      id: '',
      name: '',
      workspace: '',
      email: '',
      apiToken: '',
    });
    setEditingId(null);
  };

  const handleClearAll = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todas las cuentas?')) {
      setAccounts([]);
      localStorage.removeItem('bitbucket_accounts');
      setSaveToLocalStorage(false);
    }
  };

  const handleSaveToLocalStorageChange = (checked: boolean) => {
    setSaveToLocalStorage(checked);
    if (checked && accounts.length > 0) {
      localStorage.setItem('bitbucket_accounts', JSON.stringify(accounts));
    } else if (!checked) {
      localStorage.removeItem('bitbucket_accounts');
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Configurar Bitbucket Cloud"
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Configuración Online</span>
        </button>
      </div>

      {/* Modal de configuración */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Configuración Bitbucket Cloud
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    {editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Cuenta
                    </label>
                    <input
                      type="text"
                      value={currentAccount.name}
                      onChange={(e) =>
                        setCurrentAccount({
                          ...currentAccount,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ej: Cuenta Principal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace
                    </label>
                    <input
                      type="text"
                      value={currentAccount.workspace}
                      onChange={(e) =>
                        setCurrentAccount({
                          ...currentAccount,
                          workspace: e.target.value,
                        })
                      }
                      placeholder="arkho"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={currentAccount.email}
                      onChange={(e) =>
                        setCurrentAccount({
                          ...currentAccount,
                          email: e.target.value,
                        })
                      }
                      placeholder="tu-email@ejemplo.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={currentAccount.apiToken}
                        onChange={(e) =>
                          setCurrentAccount({
                            ...currentAccount,
                            apiToken: e.target.value,
                          })
                        }
                        placeholder="tu-api-token"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showToken ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Nota:</strong> Necesitas crear un API Token en
                      Bitbucket con permisos de lectura para repositorios.
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingId ? 'Actualizar' : 'Agregar'}</span>
                    </button>
                    {(editingId || currentAccount.name) && (
                      <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista de cuentas guardadas */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Cuentas Guardadas ({accounts.length})
                    </h4>
                    {accounts.length > 0 && (
                      <button
                        onClick={handleClearAll}
                        className="text-xs text-red-600 hover:text-red-700 transition-colors"
                      >
                        Eliminar todas
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {accounts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No hay cuentas guardadas</p>
                      </div>
                    ) : (
                      accounts.map((account) => (
                        <div
                          key={account.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {account.name}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {account.workspace} • {account.email}
                              </p>
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <button
                                onClick={() => handleEdit(account)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Editar"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(account.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLocalStorage}
                  onChange={(e) =>
                    handleSaveToLocalStorageChange(e.target.checked)
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Guardar en navegador (localStorage)
                </span>
              </label>
            </div>

            {/* Notificación de guardado */}
            {showSaveNotification && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Guardado correctamente
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
