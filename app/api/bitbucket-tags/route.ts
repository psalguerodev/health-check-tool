import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { username, appPassword, workspace, repoSlug, fileName } =
      await request.json();

    // Validar que todos los campos requeridos estén presentes
    if (!username || !appPassword || !workspace || !repoSlug) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Codificar credenciales en Base64
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // URL para obtener los tags del repositorio
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/tags?sort=-name&pagelen=50`;

    console.log('Obteniendo tags de Bitbucket:', {
      workspace,
      repoSlug,
    });

    // Obtener los tags desde Bitbucket
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
        { error: 'Error al obtener tags de Bitbucket', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    let allTags = data.values?.map((tag: any) => tag.name) || [];

    // Si se especifica un fileName, filtrar tags que contengan ese archivo
    if (fileName) {
      console.log('Filtrando tags para archivo:', fileName);

      // Filtrar tags que contengan el nombre del archivo
      // Los tags pueden tener formato como: "release-plan-v1.0.0" o "v1.0.0-release-plan"
      const filteredTags = allTags.filter((tag: string) => {
        return tag
          .toLowerCase()
          .includes(fileName.toLowerCase().replace('.csv', ''));
      });

      console.log('Tags filtrados:', filteredTags);
      return NextResponse.json({ success: true, tags: filteredTags });
    }

    console.log('Todos los tags obtenidos:', allTags);
    return NextResponse.json({ success: true, tags: allTags });
  } catch (error) {
    console.error('Error en bitbucket-tags:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
