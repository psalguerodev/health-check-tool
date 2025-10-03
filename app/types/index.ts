export interface ConnectionConfig {
  host: string;
  port?: number;
  database?: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface DB2Config extends ConnectionConfig {
  schema?: string;
}

export interface SQLServerConfig extends ConnectionConfig {
  instance?: string;
  encrypt?: boolean;
}

export interface PostgreSQLConfig extends ConnectionConfig {
  ssl?: boolean;
}

export interface SQSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  queueUrl: string;
}

export interface HTTPConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface TelnetConfig {
  host: string;
  port: number;
  timeout?: number;
}

export interface PingConfig {
  host: string;
  timeout?: number;
  count?: number;
}

export interface TestResult {
  success: boolean;
  message: string;
  duration?: number;
  error?: string;
  timestamp: Date;
  resolvedIP?: string;
  response?: any;
}

export interface ConnectionTest {
  id: string;
  name: string;
  type:
    | 'DB2'
    | 'SQLServer'
    | 'PostgreSQL'
    | 'SQS'
    | 'HTTP'
    | 'Telnet'
    | 'Ping'
    | 'Kubernetes';
  status: 'pending' | 'success' | 'error';
  result?: TestResult;
  config: any;
}
