import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { serviceName: string } }
) {
  try {
    const { serviceName } = params;

    // Ruta al archivo blueprint.xml del servicio usando el slug del repositorio
    const blueprintPath = path.join(
      process.cwd(),
      'public',
      'data',
      'blueprints',
      serviceName,
      'blueprint.xml'
    );

    // Verificar si el archivo existe
    if (!fs.existsSync(blueprintPath)) {
      return NextResponse.json(
        { error: 'Blueprint no encontrado' },
        { status: 404 }
      );
    }

    // Leer el contenido del archivo XML
    const xmlContent = fs.readFileSync(blueprintPath, 'utf-8');

    // Retornar el XML como texto plano
    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error al leer el blueprint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
