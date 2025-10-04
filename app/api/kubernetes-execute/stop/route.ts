import { NextRequest, NextResponse } from 'next/server';

// Almacenar procesos activos (en producción usar Redis o similar)
const activeProcesses = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processId } = body;

    if (!processId) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID de proceso requerido',
        },
        { status: 400 }
      );
    }

    // Buscar el proceso activo
    const process = activeProcesses.get(processId);

    if (!process) {
      return NextResponse.json(
        {
          success: false,
          message: 'Proceso no encontrado o ya terminado',
        },
        { status: 404 }
      );
    }

    try {
      const startTime = Date.now();

      // Capturar output antes de terminar
      let capturedOutput = '';
      let capturedError = '';

      // Si el proceso tiene stdout/stderr, capturar lo que haya
      if (process.stdout) {
        process.stdout.on('data', (data: any) => {
          capturedOutput += data.toString();
        });
      }

      if (process.stderr) {
        process.stderr.on('data', (data: any) => {
          capturedError += data.toString();
        });
      }

      // Terminar el proceso
      process.kill('SIGTERM');

      // Esperar un poco y forzar terminación si es necesario
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 1000);

      // Esperar a que el proceso termine realmente con timeout
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(true);
        }, 2000); // Timeout de 2 segundos

        if (process.killed) {
          clearTimeout(timeout);
          resolve(true);
        } else {
          process.on('close', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          process.on('exit', () => {
            clearTimeout(timeout);
            resolve(true);
          });
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Remover de la lista de procesos activos
      activeProcesses.delete(processId);

      // Combinar output y error si existen
      const finalOutput =
        capturedOutput + (capturedError ? `\n${capturedError}` : '');

      return NextResponse.json({
        success: true,
        message: `Proceso terminado exitosamente en ${duration}ms`,
        output: finalOutput || 'Proceso interrumpido sin output',
        duration: duration,
      });
    } catch (error) {
      console.error('Error al terminar proceso:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error al terminar el proceso',
          error: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error interno del servidor',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
