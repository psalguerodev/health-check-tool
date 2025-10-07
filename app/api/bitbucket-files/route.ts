import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, appPassword, workspace, repoSlug } = await request.json();

    // Validar que todos los campos requeridos estén presentes
    if (!username || !appPassword || !workspace || !repoSlug) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Codificar credenciales en Base64
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // URL para obtener los archivos del repositorio en la rama 'data'
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src/data/`;

    console.log('Obteniendo archivos de Bitbucket:', {
      workspace,
      repoSlug,
      apiUrl,
    });

    // Obtener los archivos desde Bitbucket
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
        { error: 'Error al obtener archivos de Bitbucket', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log(
      'Respuesta completa de Bitbucket:',
      JSON.stringify(data, null, 2)
    );
    console.log('Total de archivos encontrados:', data.values?.length || 0);

    // Mostrar todos los archivos para debug
    if (data.values) {
      console.log('Archivos encontrados:');
      data.values.forEach((file: any, index: number) => {
        console.log(`${index + 1}. ${file.path} (${file.type})`);
      });
    }

    // Filtrar solo archivos de Release Plans
    const releasePlanFiles =
      data.values
        ?.filter((file: any) => {
          const isReleasePlan =
            file.path &&
            file.path.startsWith('release-plan') &&
            file.path.endsWith('.csv');

          console.log(
            `Evaluando archivo: ${file.path} - Es Release Plan: ${isReleasePlan}`
          );
          return isReleasePlan;
        })
        .map((file: any) => {
          // Extraer nombre del plan del archivo
          let planName = file.path
            .replace('release-plan', '')
            .replace('.csv', '');
          if (planName.startsWith('-')) {
            planName = planName.substring(1); // Remover el guión inicial
          }
          if (!planName) {
            planName = 'default';
          }

          return {
            fileName: file.path,
            planName: planName,
            size: file.size,
            commit: file.commit?.hash,
          };
        }) || [];

    console.log('Archivos de Release Plans encontrados:', releasePlanFiles);

    return NextResponse.json({ success: true, files: releasePlanFiles });
  } catch (error) {
    console.error('Error en bitbucket-files:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
