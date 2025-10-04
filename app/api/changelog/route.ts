import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Ruta al archivo changelog.md en la raíz del proyecto
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

    // Verificar si el archivo existe
    if (!fs.existsSync(changelogPath)) {
      return new NextResponse('Changelog no encontrado', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Leer el contenido del archivo
    const changelogContent = fs.readFileSync(changelogPath, 'utf-8');

    // Retornar el contenido como texto plano
    return new NextResponse(changelogContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error al leer el changelog:', error);
    return new NextResponse('Error interno del servidor', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
