import { NextRequest, NextResponse } from 'next/server';
import {
  SSMClient,
  GetParametersByPathCommand,
  GetParameterCommand,
} from '@aws-sdk/client-ssm';

export async function POST(request: NextRequest) {
  try {
    const {
      action,
      credentials,
      path = '/',
      parameterName,
    } = await request.json();

    // Configurar cliente AWS
    const ssmClient = new SSMClient({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    if (action === 'list') {
      // Listar parámetros por path
      const command = new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: true,
      });

      const response = await ssmClient.send(command);

      return NextResponse.json({
        success: true,
        parameters:
          response.Parameters?.map((param) => ({
            name: param.Name,
            value: param.Value,
            type: param.Type,
            description: param.Description,
            version: param.Version,
            lastModifiedDate: param.LastModifiedDate,
          })) || [],
        nextToken: response.NextToken,
      });
    }

    if (action === 'get') {
      // Obtener un parámetro específico
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
      });

      const response = await ssmClient.send(command);

      return NextResponse.json({
        success: true,
        parameter: {
          name: response.Parameter?.Name,
          value: response.Parameter?.Value,
          type: response.Parameter?.Type,
          version: response.Parameter?.Version,
          lastModifiedDate: response.Parameter?.LastModifiedDate,
        },
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Acción no válida',
    });
  } catch (error: any) {
    console.error('Error AWS Parameter Store:', error);
    return NextResponse.json(
      {
        success: false,
        message: `Error al conectar con AWS Parameter Store: ${error.message}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
