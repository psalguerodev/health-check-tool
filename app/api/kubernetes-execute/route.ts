import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Almacenar sesiones activas en memoria (en producción usar Redis o similar)
const activeSessions = new Map<
  string,
  {
    clusterName: string;
    region: string;
    awsProfile: string;
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsSessionToken?: string;
    lastActivity: Date;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clusterName,
      region,
      command,
      namespace,
      isServerMode,
      awsProfile,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      sessionId,
    } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'Command es requerido' },
        { status: 400 }
      );
    }

    if (!isServerMode && !clusterName) {
      return NextResponse.json(
        { error: 'Cluster name es requerido en modo Kubernetes' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    try {
      let fullCommand: string;

      if (isServerMode) {
        // Ejecutar comando en una sesión de bash para mantener variables
        fullCommand = `bash -c "${command}"`;
        console.log(`Ejecutando comando del servidor: ${fullCommand}`);
      } else {
        // Manejar sesiones persistentes
        let sessionData;

        if (sessionId && activeSessions.has(sessionId)) {
          // Usar sesión existente
          sessionData = activeSessions.get(sessionId)!;
          sessionData.lastActivity = new Date();
          console.log(`Usando sesión existente: ${sessionId}`);
        } else {
          // Crear nueva sesión
          const newSessionId =
            sessionId ||
            `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionData = {
            clusterName,
            region,
            awsProfile: awsProfile || 'default',
            awsAccessKeyId,
            awsSecretAccessKey,
            awsSessionToken,
            lastActivity: new Date(),
          };
          activeSessions.set(newSessionId, sessionData);
          console.log(`Nueva sesión creada: ${newSessionId}`);
        }

        // Configurar variables de entorno y kubeconfig
        const envVars = `export AWS_PROFILE=${
          sessionData.awsProfile
        } && export AWS_ACCESS_KEY_ID=${
          sessionData.awsAccessKeyId
        } && export AWS_SECRET_ACCESS_KEY=${sessionData.awsSecretAccessKey}${
          sessionData.awsSessionToken
            ? ` && export AWS_SESSION_TOKEN=${sessionData.awsSessionToken}`
            : ''
        }`;
        const awsConfigureCmd = `aws eks update-kubeconfig --region ${sessionData.region} --name ${sessionData.clusterName} --profile ${sessionData.awsProfile}`;

        // Ejecutar el comando kubectl con el namespace especificado
        const kubectlCmd =
          namespace && namespace !== 'default'
            ? `kubectl --namespace=${namespace} ${command}`
            : `kubectl ${command}`;

        // Ejecutar comandos en secuencia con variables de entorno
        fullCommand = `${envVars} && ${awsConfigureCmd} && ${kubectlCmd}`;
        console.log(`Ejecutando comando Kubernetes con sesión: ${fullCommand}`);
      }

      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout: 30000, // 30 segundos timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        message: isServerMode
          ? `Comando del servidor ejecutado exitosamente`
          : `Comando ejecutado exitosamente en cluster ${clusterName}`,
        output: stdout,
        duration,
        clusterName: isServerMode ? null : clusterName,
        region: isServerMode ? null : region,
        command,
        namespace: isServerMode ? null : namespace,
        sessionId:
          sessionId ||
          (activeSessions.size > 0
            ? Array.from(activeSessions.keys())[activeSessions.size - 1]
            : null),
      });
    } catch (execError: any) {
      const duration = Date.now() - startTime;

      let errorMessage = isServerMode
        ? `Error ejecutando comando del servidor`
        : `Error ejecutando comando en cluster ${clusterName}`;

      if (execError.message.includes('command not found')) {
        errorMessage = `kubectl o aws CLI no encontrado. Instale las herramientas necesarias.`;
      } else if (execError.message.includes('Unable to locate credentials')) {
        errorMessage = `Credenciales AWS no configuradas. Configure AWS CLI.`;
      } else if (execError.message.includes('An error occurred')) {
        errorMessage = `Error de AWS: ${execError.message}`;
      } else if (
        execError.message.includes(
          "error: the server doesn't have a resource type"
        )
      ) {
        errorMessage = `Tipo de recurso no encontrado: ${command}`;
      } else if (execError.message.includes('error: no resource found')) {
        errorMessage = `Recurso no encontrado en el namespace ${namespace}`;
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        error: execError.message,
        output: execError.stdout || '',
        duration,
        clusterName,
        region,
        command,
        namespace,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
