import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clusterName, region, awsProfile } = body;

    if (!clusterName || !region) {
      return NextResponse.json(
        { error: 'Cluster name y region son requeridos' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      // Configurar AWS CLI para usar el cluster de EKS
      const profile = awsProfile || 'default';
      const awsConfigureCmd = `aws eks update-kubeconfig --region ${region} --name ${clusterName} --profile ${profile}`;

      // Verificar conexión al cluster
      const connectionTestCmd = `kubectl cluster-info --request-timeout=10s`;

      // Verificar contexto actual
      const contextCmd = `kubectl config current-context`;

      // Verificar permisos básicos
      const authCmd = `kubectl auth can-i get pods`;

      // Ejecutar comandos en secuencia
      const fullCommand = `${awsConfigureCmd} && ${connectionTestCmd} && ${contextCmd} && ${authCmd}`;

      console.log(`Verificando conexión a cluster: ${fullCommand}`);

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: 30000, // 30 segundos timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      const duration = Date.now() - startTime;

      // Analizar la salida para determinar el estado de la conexión
      const isConnected =
        stdout.includes('Kubernetes control plane') ||
        stdout.includes('is running at') ||
        stdout.includes('cluster-info');

      const hasPermissions =
        stdout.includes('yes') ||
        stdout.includes('get pods') ||
        !stderr.includes('no');

      return NextResponse.json({
        success: isConnected,
        message: isConnected
          ? `Conexión exitosa al cluster ${clusterName} en ${region}`
          : `Error de conexión al cluster ${clusterName}`,
        output: stdout,
        error: stderr,
        duration,
        clusterName,
        region,
        hasPermissions,
        context: stdout.includes('context')
          ? stdout.split('\n').find((line) => line.includes('context'))
          : null,
      });
    } catch (execError: any) {
      const duration = Date.now() - startTime;

      let errorMessage = `Error de conexión al cluster ${clusterName}`;

      if (execError.message.includes('Unable to locate credentials')) {
        errorMessage = `Credenciales AWS no configuradas. Configure AWS CLI.`;
      } else if (execError.message.includes('No such cluster')) {
        errorMessage = `Cluster no encontrado: ${clusterName}. Verifique el nombre y la región.`;
      } else if (execError.message.includes('Invalid region')) {
        errorMessage = `Región AWS inválida: ${region}.`;
      } else if (
        execError.message.includes('Error: You must be logged in to the server')
      ) {
        errorMessage = `No autenticado en Kubernetes. Verifique su kubeconfig.`;
      } else if (execError.message.includes('The connection to the server')) {
        errorMessage = `No se pudo conectar al servidor Kubernetes. Verifique la red o el cluster.`;
      } else if (
        execError.message.includes(
          'error: You must specify an authentication method'
        )
      ) {
        errorMessage = `Error de autenticación. Verifique sus credenciales AWS.`;
      } else if (execError.message.includes('timeout')) {
        errorMessage = `Timeout de conexión al cluster ${clusterName}. Verifique la conectividad.`;
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        output: execError.stdout || '',
        error: execError.message,
        duration,
        clusterName,
        region,
        hasPermissions: false,
        context: null,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
