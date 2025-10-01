import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // Obtener información básica del sistema
    const platform = os.platform();
    const hostname = os.hostname();
    const uptime = Math.floor(os.uptime());

    // Obtener IP local
    const networkInterfaces = os.networkInterfaces();
    let localIP = '127.0.0.1';

    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
      }
    }

    // Obtener información de memoria
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const formatBytes = (bytes: number) => {
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return (
        Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
      );
    };

    // Obtener información de CPU
    const cpus = os.cpus();
    const cpuUsage = await getCPUUsage();

    // Formatear uptime
    const formatUptime = (seconds: number) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };

    const serverInfo = {
      ip: localIP,
      hostname,
      platform:
        platform === 'darwin'
          ? 'macOS'
          : platform === 'win32'
          ? 'Windows'
          : 'Linux',
      uptime: formatUptime(uptime),
      memory: {
        total: formatBytes(totalMem),
        free: formatBytes(freeMem),
        used: formatBytes(usedMem),
      },
      cpu: {
        usage: cpuUsage.toString(),
        cores: cpus.length,
      },
    };

    return NextResponse.json(serverInfo);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al obtener información del servidor' },
      { status: 500 }
    );
  }
}

async function getCPUUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "ps -A -o %cpu | awk '{s+=$1} END {print s}'"
    );
    const usage = parseFloat(stdout.trim());
    return Math.min(Math.round(usage), 100);
  } catch (error) {
    // Fallback: estimar basado en load average
    const loadAvg = os.loadavg()[0];
    const cores = os.cpus().length;
    return Math.min(Math.round((loadAvg / cores) * 100), 100);
  }
}
