import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const {
      username,
      appPassword,
      workspace,
      repoSlug,
      fileName,
      tag,
      branch,
    } = await request.json();

    // Validar que todos los campos requeridos estén presentes
    if (
      !username ||
      !appPassword ||
      !workspace ||
      !repoSlug ||
      !fileName ||
      (!tag && !branch)
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Codificar credenciales en Base64
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // URL para obtener el archivo (desde tag o branch)
    const ref = tag || branch || 'main';
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/${ref}/${fileName}`;

    console.log('Obteniendo archivo de Bitbucket:', {
      workspace,
      repoSlug,
      fileName,
      ref,
      type: tag ? 'tag' : 'branch',
    });

    // Obtener el archivo desde Bitbucket
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Bitbucket:', errorText);
      return NextResponse.json(
        { error: 'Error al obtener archivo de Bitbucket', details: errorText },
        { status: response.status }
      );
    }

    const content = await response.text();

    console.log('Archivo obtenido exitosamente, tamaño:', content.length);

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error('Error en bitbucket-file:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
