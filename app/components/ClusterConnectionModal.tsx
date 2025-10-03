'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, RefreshCw, Settings } from 'lucide-react';
import ParameterSelectorLink from './ParameterSelectorLink';
import { Parameter } from '../context/ParameterStoreContext';

interface ClusterConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionEstablished: (clusterName: string, region: string) => void;
}

export default function ClusterConnectionModal({
  isOpen,
  onClose,
  onConnectionEstablished,
}: ClusterConnectionModalProps) {
  const [clusterName, setClusterName] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [awsProfile, setAwsProfile] = useState('Developer-713881832377');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
    output?: string;
    hasPermissions?: boolean;
    context?: string;
  } | null>(null);
  const [processOutput, setProcessOutput] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [selectedClusterParam, setSelectedClusterParam] =
    useState<Parameter | null>(null);
  const [selectedRegionParam, setSelectedRegionParam] =
    useState<Parameter | null>(null);

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia) - us-east-1' },
    { value: 'us-east-2', label: 'US East (Ohio) - us-east-2' },
    { value: 'us-west-1', label: 'US West (N. California) - us-west-1' },
    { value: 'us-west-2', label: 'US West (Oregon) - us-west-2' },
    { value: 'eu-west-1', label: 'Europe (Ireland) - eu-west-1' },
    { value: 'eu-west-2', label: 'Europe (London) - eu-west-2' },
    { value: 'eu-west-3', label: 'Europe (Paris) - eu-west-3' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt) - eu-central-1' },
    {
      value: 'ap-southeast-1',
      label: 'Asia Pacific (Singapore) - ap-southeast-1',
    },
    {
      value: 'ap-southeast-2',
      label: 'Asia Pacific (Sydney) - ap-southeast-2',
    },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) - ap-northeast-1' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul) - ap-northeast-2' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai) - ap-south-1' },
    { value: 'ca-central-1', label: 'Canada (Central) - ca-central-1' },
    { value: 'sa-east-1', label: 'South America (São Paulo) - sa-east-1' },
  ];

  const checkConnection = async () => {
    if (!clusterName) {
      alert('Por favor ingrese el nombre del cluster');
      return;
    }

    setIsConnecting(true);
    setConnectionStatus(null);
    setProcessOutput([]);
    setCurrentStep('');

    try {
      // Ejecutar el script real paso a paso
      const steps = [
        {
          step: '🚀 Conectando a AWS EKS...',
          command: 'echo "🚀 Conectando a AWS EKS..."',
          delay: 500,
        },
        {
          step: '📝 Configurando variables de entorno...',
          command: `export AWS_PROFILE=${awsProfile} && export EKS_CLUSTER_NAME=${clusterName} && export AWS_ACCESS_KEY_ID=${awsAccessKeyId} && export AWS_SECRET_ACCESS_KEY=${awsSecretAccessKey}${
            awsSessionToken
              ? ` && export AWS_SESSION_TOKEN=${awsSessionToken}`
              : ''
          } && echo "✅ Variables configuradas"`,
          delay: 1000,
        },
        {
          step: `✅ Perfil AWS: ${awsProfile}`,
          command: `echo "✅ Perfil AWS: ${awsProfile}"`,
          delay: 500,
        },
        {
          step: `✅ Cluster EKS: ${clusterName}`,
          command: `echo "✅ Cluster EKS: ${clusterName}"`,
          delay: 500,
        },
        {
          step: '🔍 Verificando identidad AWS...',
          command: 'aws sts get-caller-identity',
          delay: 1000,
        },
        {
          step: '🔧 Actualizando kubeconfig...',
          command: `aws eks update-kubeconfig --name ${clusterName} --region ${region} --profile ${awsProfile}`,
          delay: 1500,
        },
        {
          step: '🎉 ¡Conexión completada! Ya puedes usar kubectl',
          command: 'echo "🎉 ¡Conexión completada! Ya puedes usar kubectl"',
          delay: 500,
        },
      ];

      // Ejecutar pasos con comandos reales
      let hasError = false;
      for (const { step, command, delay } of steps) {
        setCurrentStep(step);
        setProcessOutput((prev) => [...prev, step]);

        try {
          // Ejecutar comando real
          const response = await fetch('/api/kubernetes-execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              command: command,
              clusterName,
              region,
              awsProfile,
              awsAccessKeyId,
              awsSecretAccessKey,
              awsSessionToken,
            }),
          });

          const data = await response.json();

          if (data.success) {
            setProcessOutput((prev) => [...prev, `  ${data.output}`]);
          } else {
            setProcessOutput((prev) => [...prev, `  ❌ Error: ${data.error}`]);
            hasError = true;
            break; // Detener el proceso si hay error
          }
        } catch (cmdError) {
          setProcessOutput((prev) => [...prev, `  ❌ Error: ${cmdError}`]);
          hasError = true;
          break; // Detener el proceso si hay error
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Si hubo error, no continuar con la verificación final
      if (hasError) {
        setProcessOutput((prev) => [
          ...prev,
          '  ❌ Proceso detenido debido a errores',
        ]);
        setConnectionStatus({
          success: false,
          message: 'El proceso se detuvo debido a errores en los comandos',
        });
        return;
      }

      // Verificar conexión final
      const response = await fetch('/api/kubernetes-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clusterName,
          region,
          awsProfile,
          awsAccessKeyId,
          awsSecretAccessKey,
          awsSessionToken,
        }),
      });

      const data = await response.json();

      setConnectionStatus({
        success: data.success,
        message: data.message,
        output: data.output,
        hasPermissions: data.hasPermissions,
        context: data.context,
      });

      if (data.success) {
        onConnectionEstablished(clusterName, region);
      }
    } catch (error: any) {
      setConnectionStatus({
        success: false,
        message: `Error de conexión: ${error.message}`,
      });
    } finally {
      setIsConnecting(false);
      setCurrentStep('');
    }
  };

  const resetForm = () => {
    setClusterName('');
    setRegion('us-east-1');
    setAwsProfile('Developer-713881832377');
    setAwsAccessKeyId('');
    setAwsSecretAccessKey('');
    setAwsSessionToken('');
    setConnectionStatus(null);
    setProcessOutput([]);
    setCurrentStep('');
    setSelectedClusterParam(null);
    setSelectedRegionParam(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-blue-100 rounded">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Configuración de Cluster
              </h2>
              <p className="text-xs text-gray-600">
                Configure la conexión a su cluster de Kubernetes
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Contenido dividido en dos columnas */}
        <div className="flex flex-1">
          {/* Guía Rápida - Izquierda */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-3">
            <div className="space-y-2">
              <div>
                <h3 className="text-xs font-semibold text-gray-900 mb-2">
                  Proceso Automático
                </h3>
              </div>

              <div className="space-y-2">
                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        1
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-gray-900">
                      🚀 Conectando a AWS EKS
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Inicializa la conexión y configura variables de entorno
                  </p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        2
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-gray-900">
                      📝 Configurando AWS SSO
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Configura autenticación SSO y credenciales de sesión
                  </p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        3
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-gray-900">
                      🔍 Verificando identidad AWS
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Valida credenciales y verifica permisos de acceso
                  </p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        4
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-gray-900">
                      🔧 Actualizando kubeconfig
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Configura kubectl para conectarse al cluster EKS
                  </p>
                </div>

                <div className="bg-white rounded p-2 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-green-600">
                        ✓
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-gray-900">
                      🎉 ¡Conexión completada!
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    Ya puedes usar kubectl para interactuar con el cluster
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido Principal - Derecha */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {/* Configuración del Cluster */}
            <div className="space-y-3">
              {/* Primera línea - Nombre del Cluster */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nombre del Cluster
                </label>
                <ParameterSelectorLink
                  category="aws"
                  placeholder="servicios-integracion-qa"
                  value={clusterName}
                  onChange={setClusterName}
                  onSelect={setSelectedClusterParam}
                  className="w-full"
                />
              </div>

              {/* Segunda línea - Región y Perfil AWS */}
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Región AWS
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {regions.map((reg) => (
                      <option key={reg.value} value={reg.value}>
                        {reg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Perfil AWS
                  </label>
                  <input
                    type="text"
                    value={awsProfile}
                    onChange={(e) => setAwsProfile(e.target.value)}
                    placeholder="Developer-713881832377"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tercera línea - Credenciales AWS */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  Credenciales AWS
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      AWS Access Key ID
                    </label>
                    <input
                      type="text"
                      value={awsAccessKeyId}
                      onChange={(e) => setAwsAccessKeyId(e.target.value)}
                      placeholder="AKIA..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      AWS Secret Access Key
                    </label>
                    <input
                      type="password"
                      value={awsSecretAccessKey}
                      onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                      placeholder="Secret key..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      AWS Session Token (opcional)
                    </label>
                    <input
                      type="password"
                      value={awsSessionToken}
                      onChange={(e) => setAwsSessionToken(e.target.value)}
                      placeholder="Session token..."
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Botones - Abajo a la derecha */}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={checkConnection}
                  disabled={
                    isConnecting ||
                    !clusterName ||
                    !awsAccessKeyId ||
                    !awsSecretAccessKey
                  }
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? 'Conectando...' : 'Conectar'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Resetear
                </button>
              </div>
            </div>

            {/* Consola del Script */}
            {(isConnecting || processOutput.length > 0 || connectionStatus) && (
              <div className="space-y-3">
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                  {/* Header de la consola */}
                  <div className="bg-gray-800 px-3 py-2 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-xs text-gray-300 ml-2">
                        {isConnecting
                          ? 'Ejecutando Script EKS...'
                          : connectionStatus?.success
                          ? 'Script Completado'
                          : 'Script Fallido'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido de la consola */}
                  <div className="p-3">
                    {/* Paso Actual */}
                    {currentStep && (
                      <div className="mb-2 p-2 bg-gray-800 border border-gray-600 rounded">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-400 font-medium">
                            {currentStep}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Output de la consola */}
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {processOutput.map((line, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 text-xs font-mono"
                        >
                          <span className="text-gray-500 select-none">$</span>
                          <span
                            className={`${
                              line.includes('❌')
                                ? 'text-red-400'
                                : line.includes('✅')
                                ? 'text-green-400'
                                : line.includes('🔍')
                                ? 'text-yellow-400'
                                : line.includes('🔧')
                                ? 'text-blue-400'
                                : line.includes('🎉')
                                ? 'text-green-400'
                                : line.startsWith('  ')
                                ? 'text-gray-300'
                                : 'text-white'
                            }`}
                          >
                            {line}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Cursor parpadeante cuando está ejecutando */}
                    {isConnecting && (
                      <div className="flex items-center space-x-1 mt-2">
                        <span className="text-green-400">$</span>
                        <div className="w-2 h-4 bg-green-400 animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Estado de la Conexión */}
            {connectionStatus && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-lg border ${
                    connectionStatus.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {connectionStatus.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h3
                        className={`text-sm font-medium ${
                          connectionStatus.success
                            ? 'text-green-800'
                            : 'text-red-800'
                        }`}
                      >
                        {connectionStatus.success
                          ? 'Conexión Exitosa'
                          : 'Error de Conexión'}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          connectionStatus.success
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {connectionStatus.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Información Adicional */}
                {connectionStatus.success && (
                  <div className="space-y-3">
                    {connectionStatus.context && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          Contexto Actual:
                        </h4>
                        <code className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                          {connectionStatus.context}
                        </code>
                      </div>
                    )}

                    {connectionStatus.hasPermissions !== undefined && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          Permisos:
                        </h4>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            connectionStatus.hasPermissions
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {connectionStatus.hasPermissions
                            ? 'Permisos completos disponibles'
                            : 'Permisos limitados'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Output Detallado */}
                {connectionStatus.output && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Detalles de la Conexión:
                    </h4>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      <pre>{connectionStatus.output}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 p-3 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          {connectionStatus?.success && (
            <button
              onClick={() => {
                onConnectionEstablished(clusterName, region);
                handleClose();
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
