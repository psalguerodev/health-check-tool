import {
  BlueprintAnalysis,
  Route,
  Dependency,
  DataSource,
  Property,
  ExternalService,
} from './types';
import { detectExternalServices } from './utils';

export class BlueprintAnalysisService {
  static async analyzeBlueprint(
    serviceName: string
  ): Promise<BlueprintAnalysis> {
    // Obtener el XML del blueprint real
    const response = await fetch(`/api/blueprint-xml/${serviceName}`);
    if (!response.ok) {
      throw new Error('No se pudo obtener el blueprint XML');
    }
    const xmlContent = await response.text();

    // Parsear el XML para extraer información
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // Detectar servicios externos mejorado
    const detectedExternalServices = detectExternalServices(xmlContent);

    // Extraer rutas
    const routes = this.extractRoutes(xmlDoc);

    // Extraer dependencias
    const dependencies = this.extractDependencies(xmlDoc);

    // Extraer data sources
    const dataSources = this.extractDataSources(xmlDoc);

    // Extraer propiedades
    const properties = this.extractProperties(xmlDoc);

    return {
      serviceName,
      routes,
      dependencies,
      dataSources,
      externalServices: detectedExternalServices,
      properties,
    };
  }

  private static extractRoutes(xmlDoc: Document): Route[] {
    const routes: Route[] = [];
    const routeElements = xmlDoc.querySelectorAll('route');

    routeElements.forEach((routeEl) => {
      const id = routeEl.getAttribute('id') || '';
      const fromEl = routeEl.querySelector('from');
      const address = fromEl?.getAttribute('uri') || '';

      // Detectar protocolo y tipo
      const { protocol, type, path } = this.detectProtocolAndType(address);

      routes.push({
        id,
        address,
        protocol,
        type,
        path: path || address,
        description: `Ruta ${id}`,
      });
    });

    return routes;
  }

  private static detectProtocolAndType(address: string) {
    let protocol = 'Other';
    let type = 'Other';
    let path = '';

    if (address.startsWith('rest:')) {
      protocol = 'HTTP';
      type = 'REST';
      const pathMatch = address.match(/rest:([^?]+)/);
      path = pathMatch ? pathMatch[1] : address;
    } else if (address.startsWith('cxfrs:')) {
      protocol = 'HTTP';
      type = 'REST';
      const pathMatch = address.match(/cxfrs:([^?]+)/);
      path = pathMatch ? pathMatch[1] : address;
    } else if (address.startsWith('cxf:')) {
      protocol = 'SOAP';
      type = 'SOAP';
      path = address;
    } else if (address.startsWith('http:')) {
      protocol = 'HTTP';
      type = 'HTTP';
      path = address;
    } else if (address.startsWith('https:')) {
      protocol = 'HTTPS';
      type = 'HTTP';
      path = address;
    } else if (address.startsWith('direct:')) {
      protocol = 'Direct';
      type = 'Internal';
      path = address;
    } else if (address.startsWith('vm:')) {
      protocol = 'VM';
      type = 'Internal';
      path = address;
    } else if (address.startsWith('timer:')) {
      protocol = 'Timer';
      type = 'Scheduled';
      path = address;
    } else if (address.startsWith('file:')) {
      protocol = 'File';
      type = 'File System';
      path = address;
    } else if (address.startsWith('ftp:')) {
      protocol = 'FTP';
      type = 'File Transfer';
      path = address;
    } else if (address.startsWith('jms:')) {
      protocol = 'JMS';
      type = 'Message Queue';
      path = address;
    } else if (address.startsWith('amqp:')) {
      protocol = 'AMQP';
      type = 'Message Queue';
      path = address;
    } else if (address.startsWith('kafka:')) {
      protocol = 'Kafka';
      type = 'Message Queue';
      path = address;
    } else if (address.startsWith('sql:')) {
      protocol = 'SQL';
      type = 'Database';
      path = address;
    } else if (address.startsWith('jdbc:')) {
      protocol = 'JDBC';
      type = 'Database';
      path = address;
    }

    return { protocol, type, path };
  }

  private static extractDependencies(xmlDoc: Document): Dependency[] {
    const dependencies: Dependency[] = [];
    const beanElements = xmlDoc.querySelectorAll('bean');

    beanElements.forEach((beanEl) => {
      const id = beanEl.getAttribute('id') || '';
      const className = beanEl.getAttribute('class') || '';
      const type = className.includes('DataSource') ? 'Database' : 'Service';

      dependencies.push({
        name: id,
        type,
        description: `Bean ${id}`,
        properties: [],
      });
    });

    return dependencies;
  }

  private static extractDataSources(xmlDoc: Document): DataSource[] {
    const dataSources: DataSource[] = [];
    const dataSourceElements = xmlDoc.querySelectorAll(
      'bean[class*="DataSource"]'
    );

    dataSourceElements.forEach((dsEl) => {
      const id = dsEl.getAttribute('id') || '';
      const className = dsEl.getAttribute('class') || '';

      // Detectar tipo de base de datos
      let dbType = this.detectDatabaseType(className);

      // Detectar tipo de base de datos por URL o driver
      const properties: string[] = [];
      const propElements = dsEl.querySelectorAll('property');
      let detectedDb = '';

      propElements.forEach((propEl) => {
        const name = propEl.getAttribute('name') || '';
        const value = propEl.getAttribute('value') || '';

        // Solo incluir propiedades importantes para Data Sources
        const importantProps = [
          'url',
          'jdbcUrl',
          'username',
          'password',
          'driverClassName',
        ];
        if (importantProps.includes(name) && value) {
          properties.push(`${name}: ${value}`);
        }

        // Detectar tipo de DB por URL
        if (name === 'url' && value) {
          detectedDb = this.detectDatabaseByUrl(value);
        }

        // Detectar tipo de DB por driver
        if (name === 'driverClassName' && value) {
          detectedDb = this.detectDatabaseByDriver(value);
        }
      });

      // Usar el tipo detectado o el tipo de conexión
      const finalType = detectedDb || dbType;

      dataSources.push({
        name: id,
        type: finalType,
        properties,
      });
    });

    return dataSources;
  }

  private static detectDatabaseType(className: string): string {
    if (className.includes('HikariDataSource')) return 'HikariCP';
    if (className.includes('BasicDataSource')) return 'Apache Commons DBCP';
    if (className.includes('DriverManagerDataSource')) return 'DriverManager';
    if (className.includes('SingleConnectionDataSource'))
      return 'Single Connection';
    if (className.includes('DataSource')) return 'Generic DataSource';
    return 'Unknown';
  }

  private static detectDatabaseByUrl(url: string): string {
    if (url.includes('mysql://')) return 'MySQL';
    if (url.includes('postgresql://')) return 'PostgreSQL';
    if (url.includes('oracle:')) return 'Oracle';
    if (url.includes('sqlserver://')) return 'SQL Server';
    if (url.includes('h2:')) return 'H2';
    if (url.includes('derby:')) return 'Apache Derby';
    if (url.includes('db2:')) return 'DB2';
    return '';
  }

  private static detectDatabaseByDriver(driver: string): string {
    if (driver.includes('mysql')) return 'MySQL';
    if (driver.includes('postgresql')) return 'PostgreSQL';
    if (driver.includes('oracle')) return 'Oracle';
    if (driver.includes('sqlserver')) return 'SQL Server';
    if (driver.includes('h2')) return 'H2';
    if (driver.includes('derby')) return 'Apache Derby';
    if (driver.includes('db2')) return 'DB2';
    return '';
  }

  private static extractProperties(xmlDoc: Document): Property[] {
    const properties: Property[] = [];
    const propertyElements = xmlDoc.querySelectorAll('property');

    propertyElements.forEach((propEl) => {
      const name = propEl.getAttribute('name') || '';
      const value = propEl.getAttribute('value') || '';

      if (name && value) {
        properties.push({
          name,
          value,
          description: `Propiedad ${name}`,
        });
      }
    });

    return properties;
  }
}
