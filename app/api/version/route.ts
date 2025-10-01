import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'version.json');

    // Intentar leer el archivo de versión
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return NextResponse.json(versionData);
    } else {
      // Fallback si no existe el archivo
      return NextResponse.json({
        version: '0.1.1',
        buildDate: '2024-01-15',
        description: 'Health Check Tool - Sistema de monitoreo de conectividad',
      });
    }
  } catch (error: any) {
    // Fallback en caso de error
    return NextResponse.json({
      version: '0.1.1',
      buildDate: '2024-01-15',
      description: 'Health Check Tool - Sistema de monitoreo de conectividad',
    });
  }
}
