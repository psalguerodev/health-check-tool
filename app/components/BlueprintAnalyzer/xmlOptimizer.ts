import { BlueprintAnalysis } from './types';

export interface XmlOptimizationOptions {
  includeFullXml: boolean;
  includeRoutes: boolean;
  includeDataSources: boolean;
  includeExternalServices: boolean;
  includeConfiguration: boolean;
  includeDependencies: boolean;
  maxLength?: number;
}

export class XmlOptimizer {
  /**
   * Extrae los datos más importantes del XML basándose en las opciones del usuario
   */
  static extractImportantData(
    fullXml: string,
    analysis: BlueprintAnalysis,
    options: XmlOptimizationOptions
  ): string {
    if (options.includeFullXml) {
      return this.truncateIfNeeded(fullXml, options.maxLength);
    }

    const extractedSections: string[] = [];

    // Header del XML
    const xmlHeader = this.extractXmlHeader(fullXml);
    if (xmlHeader) {
      extractedSections.push(xmlHeader);
    }

    // Rutas (camel:route)
    if (options.includeRoutes) {
      const routes = this.extractRoutes(fullXml);
      if (routes.length > 0) {
        extractedSections.push('<!-- RUTAS PRINCIPALES -->');
        extractedSections.push(...routes);
      }
    }

    // Data Sources (beans de conexión)
    if (options.includeDataSources) {
      const dataSources = this.extractDataSources(fullXml);
      if (dataSources.length > 0) {
        extractedSections.push('<!-- DATA SOURCES -->');
        extractedSections.push(...dataSources);
      }
    }

    // Servicios Externos (camelcxf, rest, etc.)
    if (options.includeExternalServices) {
      const externalServices = this.extractExternalServices(fullXml);
      if (externalServices.length > 0) {
        extractedSections.push('<!-- SERVICIOS EXTERNOS -->');
        extractedSections.push(...externalServices);
      }
    }

    // Configuración (properties, beans de configuración)
    if (options.includeConfiguration) {
      const configuration = this.extractConfiguration(fullXml);
      if (configuration.length > 0) {
        extractedSections.push('<!-- CONFIGURACIÓN -->');
        extractedSections.push(...configuration);
      }
    }

    // Dependencias (beans, imports)
    if (options.includeDependencies) {
      const dependencies = this.extractDependencies(fullXml);
      if (dependencies.length > 0) {
        extractedSections.push('<!-- DEPENDENCIAS -->');
        extractedSections.push(...dependencies);
      }
    }

    // Footer del XML
    const xmlFooter = this.extractXmlFooter(fullXml);
    if (xmlFooter) {
      extractedSections.push(xmlFooter);
    }

    // Si no hay suficientes elementos extraídos, agregar más contenido del XML
    if (extractedSections.length < 3) {
      const additionalContent = this.extractAdditionalContent(fullXml);
      if (additionalContent.length > 0) {
        extractedSections.push('<!-- CONTENIDO ADICIONAL -->');
        extractedSections.push(...additionalContent);
      }
    }

    const optimizedXml = extractedSections.join('\n\n');
    return this.truncateIfNeeded(optimizedXml, options.maxLength);
  }

  /**
   * Extrae datos estructurados de servicios externos para envío a la IA
   */
  static extractExternalServicesData(
    analysis: BlueprintAnalysis,
    options: XmlOptimizationOptions
  ): string {
    if (
      !options.includeExternalServices ||
      analysis.externalServices.length === 0
    ) {
      return '';
    }

    const servicesData: string[] = [];
    servicesData.push('=== SERVICIOS EXTERNOS ENCONTRADOS ===\n');

    analysis.externalServices.forEach((service, index) => {
      servicesData.push(`SERVICIO ${index + 1}:`);
      servicesData.push(`- Nombre: ${service.name}`);
      servicesData.push(`- Tipo: ${service.type}`);
      if (service.endpoint) {
        servicesData.push(`- Endpoint: ${service.endpoint}`);
      }
      if (service.configProperty) {
        servicesData.push(
          `- Propiedad de Configuración: ${service.configProperty}`
        );
      }
      servicesData.push('');
    });

    servicesData.push('=== INFORMACIÓN ADICIONAL ===');
    servicesData.push(
      `Total de servicios externos: ${analysis.externalServices.length}`
    );
    servicesData.push(
      `Servicios REST: ${
        analysis.externalServices.filter((s) =>
          s.type.toLowerCase().includes('rest')
        ).length
      }`
    );
    servicesData.push(
      `Servicios SOAP: ${
        analysis.externalServices.filter(
          (s) =>
            s.type.toLowerCase().includes('soap') ||
            s.type.toLowerCase().includes('cxf')
        ).length
      }`
    );
    servicesData.push('');

    return servicesData.join('\n');
  }

  /**
   * Extrae datos estructurados de Data Sources para envío a la IA
   */
  static extractDataSourcesData(
    analysis: BlueprintAnalysis,
    options: XmlOptimizationOptions
  ): string {
    if (!options.includeDataSources || analysis.dataSources.length === 0) {
      return '';
    }

    const dataSourcesData: string[] = [];
    dataSourcesData.push('=== DATA SOURCES ENCONTRADOS ===\n');

    analysis.dataSources.forEach((ds, index) => {
      dataSourcesData.push(`DATA SOURCE ${index + 1}:`);
      dataSourcesData.push(`- Nombre: ${ds.name}`);
      dataSourcesData.push(`- Tipo: ${ds.type}`);
      if (ds.properties && ds.properties.length > 0) {
        dataSourcesData.push(`- Propiedades: ${ds.properties.join(', ')}`);
      }
      dataSourcesData.push('');
    });

    dataSourcesData.push('=== INFORMACIÓN ADICIONAL ===');
    dataSourcesData.push(
      `Total de data sources: ${analysis.dataSources.length}`
    );
    const uniqueTypes = Array.from(
      new Set(analysis.dataSources.map((ds) => ds.type))
    );
    dataSourcesData.push(`Tipos únicos: ${uniqueTypes.join(', ')}`);
    dataSourcesData.push('');

    return dataSourcesData.join('\n');
  }

  /**
   * Extrae datos estructurados de rutas para envío a la IA
   */
  static extractRoutesData(
    analysis: BlueprintAnalysis,
    options: XmlOptimizationOptions
  ): string {
    if (!options.includeRoutes || analysis.routes.length === 0) {
      return '';
    }

    const routesData: string[] = [];
    routesData.push('=== RUTAS ENCONTRADAS ===\n');

    analysis.routes.forEach((route, index) => {
      routesData.push(`RUTA ${index + 1}:`);
      routesData.push(`- ID: ${route.id}`);
      routesData.push(`- Protocolo: ${route.protocol}`);
      if (route.path) {
        routesData.push(`- Path: ${route.path}`);
      }
      if (route.description) {
        routesData.push(`- Descripción: ${route.description}`);
      }
      routesData.push('');
    });

    routesData.push('=== INFORMACIÓN ADICIONAL ===');
    routesData.push(`Total de rutas: ${analysis.routes.length}`);
    routesData.push(
      `Rutas internas: ${
        analysis.routes.filter((r) =>
          r.protocol.toLowerCase().includes('internal')
        ).length
      }`
    );
    routesData.push(
      `Rutas externas: ${
        analysis.routes.filter(
          (r) => !r.protocol.toLowerCase().includes('internal')
        ).length
      }`
    );
    routesData.push('');

    return routesData.join('\n');
  }

  /**
   * Extrae todos los datos estructurados según las opciones seleccionadas
   */
  static extractStructuredData(
    analysis: BlueprintAnalysis,
    options: XmlOptimizationOptions
  ): string {
    const structuredData: string[] = [];

    // Agregar datos de servicios externos si está seleccionado
    const externalServicesData = this.extractExternalServicesData(
      analysis,
      options
    );
    if (externalServicesData) {
      structuredData.push(externalServicesData);
    }

    // Agregar datos de data sources si está seleccionado
    const dataSourcesData = this.extractDataSourcesData(analysis, options);
    if (dataSourcesData) {
      structuredData.push(dataSourcesData);
    }

    // Agregar datos de rutas si está seleccionado
    const routesData = this.extractRoutesData(analysis, options);
    if (routesData) {
      structuredData.push(routesData);
    }

    return structuredData.join('\n\n');
  }

  /**
   * Extrae el header del XML (declaraciones, namespaces)
   */
  private static extractXmlHeader(xml: string): string | null {
    const headerMatch = xml.match(/<\?xml[^>]*>[\s\S]*?<blueprint[^>]*>/);
    return headerMatch ? headerMatch[0] : null;
  }

  /**
   * Extrae las rutas principales del blueprint
   */
  private static extractRoutes(xml: string): string[] {
    const routes: string[] = [];

    // Buscar rutas camel:route
    const routeRegex = /<camel:route[^>]*>[\s\S]*?<\/camel:route>/g;
    let match;
    while ((match = routeRegex.exec(xml)) !== null) {
      routes.push(match[0]);
    }

    // Si no hay rutas camel:route, buscar otros elementos de ruta
    if (routes.length === 0) {
      // Buscar elementos camel:from, camel:to, camel:process
      const camelElementsRegex =
        /<(?:camel:from|camel:to|camel:process|camel:choice|camel:when|camel:otherwise)[^>]*>[\s\S]*?<\/(?:camel:from|camel:to|camel:process|camel:choice|camel:when|camel:otherwise)>/g;
      while ((match = camelElementsRegex.exec(xml)) !== null) {
        routes.push(match[0]);
      }
    }

    // Si aún no hay rutas, buscar cualquier elemento camel:
    if (routes.length === 0) {
      const anyCamelRegex = /<camel:[^>]*>[\s\S]*?<\/camel:[^>]*>/g;
      while ((match = anyCamelRegex.exec(xml)) !== null) {
        routes.push(match[0]);
      }
    }

    return routes.slice(0, 15); // Aumentado a 15 rutas
  }

  /**
   * Extrae data sources (beans de conexión a BD)
   */
  private static extractDataSources(xml: string): string[] {
    const dataSources: string[] = [];

    // Buscar beans de DataSource
    const dataSourceRegex =
      /<bean[^>]*class="[^"]*(?:DataSource|Connection|Pool)[^"]*"[^>]*>[\s\S]*?<\/bean>/g;
    let match;
    while ((match = dataSourceRegex.exec(xml)) !== null) {
      dataSources.push(match[0]);
    }

    // Buscar beans con propiedades de conexión
    const connectionBeanRegex =
      /<bean[^>]*>[\s\S]*?<property[^>]*(?:url|jdbc|database|host|port|username|password)[^>]*>[\s\S]*?<\/property>[\s\S]*?<\/bean>/g;
    while ((match = connectionBeanRegex.exec(xml)) !== null) {
      dataSources.push(match[0]);
    }

    // Buscar beans con IDs relacionados a BD
    const dbBeanRegex =
      /<bean[^>]*id="[^"]*(?:dataSource|database|db|connection|jdbc)[^"]*"[^>]*>[\s\S]*?<\/bean>/g;
    while ((match = dbBeanRegex.exec(xml)) !== null) {
      dataSources.push(match[0]);
    }

    // Buscar elementos camel con URIs de BD
    const dbUriRegex =
      /<(?:camel:to|camel:from)[^>]*uri="[^"]*(?:sql|jdbc|database)[^"]*"[^>]*>/g;
    while ((match = dbUriRegex.exec(xml)) !== null) {
      dataSources.push(match[0]);
    }

    return dataSources.slice(0, 8); // Aumentado a 8 data sources
  }

  /**
   * Extrae servicios externos (CXF, REST, etc.)
   */
  private static extractExternalServices(xml: string): string[] {
    const services: string[] = [];

    // Buscar servicios CXF
    const cxfRegex = /<camelcxf:[^>]*>[\s\S]*?<\/camelcxf:[^>]*>/g;
    let match;
    while ((match = cxfRegex.exec(xml)) !== null) {
      services.push(match[0]);
    }

    // Buscar servicios REST
    const restRegex = /<rest:[^>]*>[\s\S]*?<\/rest:[^>]*>/g;
    while ((match = restRegex.exec(xml)) !== null) {
      services.push(match[0]);
    }

    // Buscar elementos camel:to con URIs HTTP/HTTPS/SOAP
    const httpToRegex =
      /<camel:to[^>]*uri="[^"]*(?:http|https|soap)[^"]*"[^>]*>[\s\S]*?<\/camel:to>/g;
    while ((match = httpToRegex.exec(xml)) !== null) {
      services.push(match[0]);
    }

    // Buscar elementos camel:from con URIs HTTP/HTTPS/SOAP
    const httpFromRegex =
      /<camel:from[^>]*uri="[^"]*(?:http|https|soap)[^"]*"[^>]*>[\s\S]*?<\/camel:from>/g;
    while ((match = httpFromRegex.exec(xml)) !== null) {
      services.push(match[0]);
    }

    // Buscar beans con clases relacionadas a servicios web
    const webServiceBeanRegex =
      /<bean[^>]*class="[^"]*(?:Service|Client|Proxy|Endpoint)[^"]*"[^>]*>[\s\S]*?<\/bean>/g;
    while ((match = webServiceBeanRegex.exec(xml)) !== null) {
      services.push(match[0]);
    }

    return services.slice(0, 12); // Aumentado a 12 servicios externos
  }

  /**
   * Extrae configuración (properties, beans de configuración)
   */
  private static extractConfiguration(xml: string): string[] {
    const configs: string[] = [];

    // Buscar properties
    const propertyRegex = /<property[^>]*>[\s\S]*?<\/property>/g;
    let match;
    while ((match = propertyRegex.exec(xml)) !== null) {
      configs.push(match[0]);
    }

    // Buscar beans de configuración
    const configBeanRegex =
      /<bean[^>]*id="[^"]*(?:config|Config|configuration|Configuration)[^"]*"[^>]*>[\s\S]*?<\/bean>/g;
    while ((match = configBeanRegex.exec(xml)) !== null) {
      configs.push(match[0]);
    }

    // Buscar beans con propiedades de configuración
    const propertyBeanRegex =
      /<bean[^>]*>[\s\S]*?<property[^>]*>[\s\S]*?<\/property>[\s\S]*?<\/bean>/g;
    while ((match = propertyBeanRegex.exec(xml)) !== null) {
      configs.push(match[0]);
    }

    // Buscar elementos con atributos de configuración
    const configAttrRegex =
      /<(?:bean|camel:route|camel:from|camel:to)[^>]*(?:url|endpoint|address|host|port|timeout|connectionTimeout|readTimeout)[^>]*>/g;
    while ((match = configAttrRegex.exec(xml)) !== null) {
      configs.push(match[0]);
    }

    return configs.slice(0, 15); // Aumentado a 15 configuraciones
  }

  /**
   * Extrae dependencias (beans, imports)
   */
  private static extractDependencies(xml: string): string[] {
    const dependencies: string[] = [];

    // Buscar todos los beans
    const beanRegex = /<bean[^>]*>[\s\S]*?<\/bean>/g;
    let match;
    while ((match = beanRegex.exec(xml)) !== null) {
      dependencies.push(match[0]);
    }

    // Buscar imports
    const importRegex = /<import[^>]*>[\s\S]*?<\/import>/g;
    while ((match = importRegex.exec(xml)) !== null) {
      dependencies.push(match[0]);
    }

    // Buscar referencias a beans
    const beanRefRegex = /<ref[^>]*bean="[^"]*"[^>]*>/g;
    while ((match = beanRefRegex.exec(xml)) !== null) {
      dependencies.push(match[0]);
    }

    // Buscar elementos con dependencias
    const dependencyAttrRegex =
      /<(?:camel:to|camel:from|camel:process)[^>]*(?:ref|bean)[^>]*>/g;
    while ((match = dependencyAttrRegex.exec(xml)) !== null) {
      dependencies.push(match[0]);
    }

    return dependencies.slice(0, 20); // Aumentado a 20 dependencias
  }

  /**
   * Extrae el footer del XML
   */
  private static extractXmlFooter(xml: string): string | null {
    const footerMatch = xml.match(/<\/blueprint>/);
    return footerMatch ? footerMatch[0] : null;
  }

  /**
   * Extrae contenido adicional cuando no hay suficientes elementos específicos
   */
  private static extractAdditionalContent(xml: string): string[] {
    const additionalContent: string[] = [];

    // Buscar todos los beans que no se capturaron antes
    const allBeansRegex = /<bean[^>]*>[\s\S]*?<\/bean>/g;
    let match;
    while ((match = allBeansRegex.exec(xml)) !== null) {
      additionalContent.push(match[0]);
    }

    // Buscar elementos XML importantes que no se capturaron
    const importantElementsRegex =
      /<(?:camel:|rest:|camelcxf:)[^>]*>[\s\S]*?<\/(?:camel:|rest:|camelcxf:)[^>]*>/g;
    while ((match = importantElementsRegex.exec(xml)) !== null) {
      additionalContent.push(match[0]);
    }

    // Buscar elementos con atributos importantes
    const importantAttrsRegex =
      /<(?:bean|camel:route|camel:from|camel:to)[^>]*(?:id|class|uri|endpoint|address)[^>]*>/g;
    while ((match = importantAttrsRegex.exec(xml)) !== null) {
      additionalContent.push(match[0]);
    }

    return additionalContent.slice(0, 10); // Máximo 10 elementos adicionales
  }

  /**
   * Trunca el XML si excede la longitud máxima
   */
  private static truncateIfNeeded(xml: string, maxLength?: number): string {
    if (!maxLength || xml.length <= maxLength) {
      return xml;
    }

    const truncated = xml.substring(0, maxLength);
    return truncated + '\n\n<!-- XML TRUNCADO POR LÍMITE DE TOKENS -->';
  }

  /**
   * Calcula el tamaño aproximado en tokens del XML
   */
  static estimateTokenCount(xml: string): number {
    // Aproximación: 1 token ≈ 4 caracteres
    return Math.ceil(xml.length / 4);
  }

  /**
   * Obtiene opciones por defecto para optimización (MEJORADAS)
   */
  static getDefaultOptions(): XmlOptimizationOptions {
    return {
      includeFullXml: false,
      includeRoutes: true,
      includeDataSources: true,
      includeExternalServices: true,
      includeConfiguration: true,
      includeDependencies: true, // Cambiado a true para más contexto
      maxLength: 40000, // Aumentado a ~10,000 tokens para más información
    };
  }

  /**
   * Obtiene opciones para modo Compacto (OPTIMIZADO PARA MENOS TOKENS)
   * Incluye XML completo pero con límite conservador de tokens
   */
  static getCompactOptions(): XmlOptimizationOptions {
    return {
      includeFullXml: true, // Incluir XML completo para análisis completo
      includeRoutes: true,
      includeDataSources: true,
      includeExternalServices: true,
      includeConfiguration: true,
      includeDependencies: true,
      maxLength: 20000, // ~5,000 tokens - Conservador para modo compacto
    };
  }

  /**
   * Obtiene opciones para procesamiento completo (OPTIMIZADO PARA ANÁLISIS DETALLADO)
   * Con límites ajustados para evitar rate limits de OpenAI
   */
  static getFullProcessingOptions(): XmlOptimizationOptions {
    return {
      includeFullXml: true, // ¡INCLUIR XML COMPLETO!
      includeRoutes: true,
      includeDataSources: true,
      includeExternalServices: true,
      includeConfiguration: true,
      includeDependencies: true,
      maxLength: 100000, // ~25,000 tokens - Suficiente para XML completo
      // Para análisis detallado, priorizamos el XML completo sobre el límite de tokens
      // El sistema de reducción automática manejará casos extremos
    };
  }

  /**
   * Obtiene opciones para procesamiento mínimo
   */
  static getMinimalProcessingOptions(): XmlOptimizationOptions {
    return {
      includeFullXml: false,
      includeRoutes: true,
      includeDataSources: false,
      includeExternalServices: true,
      includeConfiguration: false,
      includeDependencies: false,
      maxLength: 15000, // ~3,750 tokens
    };
  }
}
