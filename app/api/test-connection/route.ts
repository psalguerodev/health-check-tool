import { NextRequest, NextResponse } from 'next/server';
import {
  testDB2Connection,
  testSQLServerConnection,
  testPostgreSQLConnection,
  testSQSConnection,
  testHTTPConnection,
  testTelnetConnection,
  testPingConnection,
} from '../../../lib/connections';
import {
  DB2Config,
  SQLServerConfig,
  PostgreSQLConfig,
  SQSConfig,
  HTTPConfig,
  TelnetConfig,
  PingConfig,
} from '../../../types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config } = body;

    let result;

    switch (type) {
      case 'DB2':
        result = await testDB2Connection(config as DB2Config);
        break;
      case 'SQLServer':
        result = await testSQLServerConnection(config as SQLServerConfig);
        break;
      case 'PostgreSQL':
        result = await testPostgreSQLConnection(config as PostgreSQLConfig);
        break;
      case 'SQS':
        result = await testSQSConnection(config as SQSConfig);
        break;
      case 'HTTP':
        result = await testHTTPConnection(config as HTTPConfig);
        break;
      case 'Telnet':
        result = await testTelnetConnection(config as TelnetConfig);
        break;
      case 'Ping':
        result = await testPingConnection(config as PingConfig);
        break;
      default:
        return NextResponse.json(
          { error: 'Tipo de conexión no soportado' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
