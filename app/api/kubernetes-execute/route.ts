import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const execAsync = promisify(exec);

// Ya no se necesita función de parsing, las variables vienen listas del frontend

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

// Almacenar procesos activos para poder terminarlos

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clusterName,
      region,
      command,
      namespace,
      isServerMode,
      exportAwsVars,
      awsCredentialsExport,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      sessionId,
      processId,
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
        let bashCommand = command;

        // Detectar si estamos en macOS y usar gtimeout
        const timeoutCmd =
          process.platform === 'darwin' ? 'gtimeout' : 'timeout';

        // Comandos que necesitan timeouts específicos para respuestas rápidas
        const commandLower = command.toLowerCase();

        // Comandos de red - timeouts cortos (5-10 segundos)
        if (
          commandLower.startsWith('ping') &&
          !command.includes('timeout') &&
          !command.includes('-c')
        ) {
          bashCommand = `${timeoutCmd} 5s ${command}`;
        } else if (
          commandLower.startsWith('telnet') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 8s ${command}`;
        } else if (
          commandLower.startsWith('nc ') ||
          (commandLower.startsWith('netcat ') && !command.includes('timeout'))
        ) {
          bashCommand = `${timeoutCmd} 8s ${command}`;
        } else if (
          commandLower.startsWith('curl') &&
          !command.includes('timeout') &&
          !command.includes('--max-time')
        ) {
          bashCommand = `${timeoutCmd} 10s ${command}`;
        } else if (
          commandLower.startsWith('wget') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 10s ${command}`;
        }

        // Comandos de monitoreo - timeouts medios (15-20 segundos)
        else if (
          commandLower.startsWith('htop') ||
          commandLower.startsWith('top')
        ) {
          bashCommand = `${timeoutCmd} 15s ${command}`;
        } else if (
          commandLower.startsWith('iotop') ||
          commandLower.startsWith('nethogs')
        ) {
          bashCommand = `${timeoutCmd} 15s ${command}`;
        } else if (
          commandLower.startsWith('tcpdump') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 20s ${command}`;
        } else if (
          commandLower.startsWith('journalctl -f') ||
          commandLower.startsWith('tail -f')
        ) {
          bashCommand = `${timeoutCmd} 15s ${command}`;
        }

        // Comandos de desarrollo - timeouts largos (30-60 segundos)
        else if (
          commandLower.startsWith('npm run dev') ||
          commandLower.startsWith('yarn dev')
        ) {
          bashCommand = `${timeoutCmd} 30s ${command}`;
        } else if (
          commandLower.startsWith('ng serve') ||
          commandLower.startsWith('vue serve')
        ) {
          bashCommand = `${timeoutCmd} 30s ${command}`;
        } else if (
          commandLower.startsWith('docker run') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 45s ${command}`;
        } else if (
          commandLower.startsWith('docker logs -f') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 20s ${command}`;
        }

        // Comandos de transferencia - timeouts variables
        else if (
          commandLower.startsWith('rsync') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 30s ${command}`;
        } else if (
          commandLower.startsWith('scp') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 20s ${command}`;
        } else if (
          commandLower.startsWith('aws s3 cp') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 60s ${command}`;
        } else if (
          commandLower.startsWith('aws s3 sync') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 120s ${command}`;
        }

        // Comandos de Kubernetes - timeouts específicos
        else if (
          commandLower.startsWith('kubectl logs -f') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 20s ${command}`;
        } else if (
          commandLower.startsWith('kubectl get -w') ||
          commandLower.startsWith('kubectl watch')
        ) {
          bashCommand = `${timeoutCmd} 15s ${command}`;
        }

        // Comandos de sistema - timeouts cortos
        else if (
          commandLower.startsWith('systemctl status') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 5s ${command}`;
        } else if (
          commandLower.startsWith('systemctl logs') &&
          !command.includes('timeout')
        ) {
          bashCommand = `${timeoutCmd} 10s ${command}`;
        }

        // Si se solicita exportar variables AWS, usar las variables del frontend
        if (exportAwsVars && awsCredentialsExport) {
          // Convertir VARIABLE="valor" a export VARIABLE="valor"
          const exportCommands = awsCredentialsExport
            .split('\n')
            .filter(
              (line: string) => line.trim() && !line.trim().startsWith('#')
            )
            .map((line: string) => {
              const trimmed = line.trim();
              if (trimmed.includes('=') && !trimmed.startsWith('export ')) {
                return `export ${trimmed}`;
              }
              return trimmed;
            })
            .join(' && ');

          // Solo exportar las variables sin mostrar información extra
          bashCommand = `${exportCommands} && ${command}`;
          console.log(`Exportando variables AWS antes de ejecutar: ${command}`);
        } else if (exportAwsVars && !awsCredentialsExport) {
          console.log(
            `No hay variables de entorno AWS configuradas, ejecutando comando sin exportar variables`
          );
        }

        fullCommand = `bash -c "${bashCommand}"`;
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
            awsProfile: 'default', // Ya no se usa, se mantiene por compatibilidad
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

      let stdout = '';
      let stderr = '';

      if (processId) {
        // Usar spawn para poder controlar el proceso
        const { spawn } = require('child_process');
        const child = spawn('bash', ['-c', fullCommand], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Capturar output
        child.stdout.on('data', (data: any) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: any) => {
          stderr += data.toString();
        });

        // Esperar a que termine el proceso
        await new Promise((resolve, reject) => {
          child.on('close', (code: any) => {
            if (code === 0) {
              resolve(code);
            } else if (code === 124) {
              // Timeout es exitoso, no es un error
              resolve(code);
            } else {
              // Crear un error personalizado que incluya stderr
              const error = new Error(`Process exited with code ${code}`);
              (error as any).stderr = stderr;
              (error as any).stdout = stdout;
              reject(error);
            }
          });

          child.on('error', (error: any) => {
            (error as any).stderr = stderr;
            (error as any).stdout = stdout;
            reject(error);
          });

          // Timeout de 30 segundos
          const timeoutId = setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGTERM');
              const error = new Error('Command timeout');
              (error as any).stderr = stderr;
              (error as any).stdout = stdout;
              reject(error);
            }
          }, 30000);

          // Limpiar timeout cuando el proceso termine
          child.on('close', () => {
            clearTimeout(timeoutId);
          });
        });
      } else {
        // Fallback al método anterior si no hay processId
        const result = await execAsync(fullCommand, {
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        });
        stdout = result.stdout;
        stderr = result.stderr;
      }

      const duration = Date.now() - startTime;

      // Si la duración es 0 o muy pequeña, usar un valor mínimo
      const finalDuration = duration < 10 ? 10 : duration;

      return NextResponse.json({
        success: true,
        message: isServerMode
          ? `Comando del servidor ejecutado exitosamente`
          : `Comando ejecutado exitosamente en cluster ${clusterName}`,
        output: stdout,
        duration: finalDuration,
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

      // Si la duración es 0 o muy pequeña, usar un valor mínimo
      const finalDuration = duration < 10 ? 10 : duration;

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
        output: execError.stderr || execError.stdout || '',
        duration: finalDuration,
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
