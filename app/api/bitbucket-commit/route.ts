import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const {
      username,
      appPassword,
      workspace,
      repoSlug,
      fileName,
      content,
      message,
      tag,
    } = await request.json();

    // Validar que todos los campos requeridos estén presentes
    if (
      !username ||
      !appPassword ||
      !workspace ||
      !repoSlug ||
      !fileName ||
      !content ||
      !message
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Codificar credenciales en Base64
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // URL del repositorio
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;

    console.log('Publicando a Bitbucket:', {
      workspace,
      repoSlug,
      fileName,
      contentLength: content.length,
    });

    // Determinar el tipo de contenido basado en la extensión del archivo
    const contentType = fileName.endsWith('.csv')
      ? 'text/csv; charset=utf-8'
      : 'application/json';

    // Crear el form data para el commit en la rama 'data'
    const formData = new FormData();
    formData.append('message', message);
    formData.append('branch', 'data');
    formData.append(
      fileName,
      new Blob([content], { type: contentType }),
      fileName
    );

    // Hacer el commit a Bitbucket
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: formData,
    });

    console.log('Respuesta de Bitbucket:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Bitbucket:', errorText);
      return NextResponse.json(
        { error: 'Error al hacer commit en Bitbucket', details: errorText },
        { status: response.status }
      );
    }

    // Intentar parsear la respuesta como JSON, si falla usar texto
    let result;
    const responseText = await response.text();
    try {
      result = responseText ? JSON.parse(responseText) : { success: true };
    } catch (e) {
      console.log('Respuesta de Bitbucket no es JSON:', responseText);
      result = { success: true, message: 'Commit realizado correctamente' };
    }

    // Si se proporcionó un tag, crear el tag en Bitbucket
    if (tag) {
      console.log('Creando tag:', tag);

      // Obtener el hash del último commit en la rama 'data'
      const branchUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches/data`;
      const branchResponse = await fetch(branchUrl, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      if (branchResponse.ok) {
        const branchData = await branchResponse.json();
        const commitHash = branchData.target?.hash;

        if (commitHash) {
          // Crear el tag
          const tagUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/tags`;
          const tagResponse = await fetch(tagUrl, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: tag,
              target: {
                hash: commitHash,
              },
              message: message,
            }),
          });

          if (tagResponse.ok) {
            console.log('Tag creado exitosamente:', tag);
          } else {
            const tagError = await tagResponse.text();
            console.error('Error al crear tag:', tagError);
          }
        }
      }
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error en bitbucket-commit:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
