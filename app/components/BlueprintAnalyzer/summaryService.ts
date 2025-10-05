import { BlueprintAnalysis } from './types';
import { XmlOptimizer, XmlOptimizationOptions } from './xmlOptimizer';

export class SummaryService {
  static async generateSummary(
    analysis: BlueprintAnalysis,
    summaryType: 'detailed' | 'compact',
    additionalInstructions?: string,
    xmlOptimization?: XmlOptimizationOptions
  ): Promise<string> {
    const apiKey = localStorage.getItem('openai_api_key');
    const systemPrompt =
      localStorage.getItem('openai_system_prompt') ||
      'Eres un experto en análisis de arquitectura de software y migración de sistemas.';

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Obtener el XML del blueprint
    const xmlResponse = await fetch(
      `/api/blueprint-xml/${analysis.serviceName}`
    );
    if (!xmlResponse.ok) {
      throw new Error('Failed to fetch blueprint XML');
    }
    const fullBlueprintXml = await xmlResponse.text();

    // Optimizar el XML según las opciones del usuario
    const optimizationOptions =
      xmlOptimization || XmlOptimizer.getDefaultOptions();
    const blueprintXml = XmlOptimizer.extractImportantData(
      fullBlueprintXml,
      analysis,
      optimizationOptions
    );

    // Calcular tokens estimados
    const estimatedTokens = XmlOptimizer.estimateTokenCount(blueprintXml);
    console.log(
      `XML optimizado: ${blueprintXml.length} caracteres (~${estimatedTokens} tokens)`
    );

    // Extraer datos estructurados según las opciones
    const structuredData = XmlOptimizer.extractStructuredData(
      analysis,
      optimizationOptions
    );
    console.log(`Datos estructurados: ${structuredData.length} caracteres`);

    // Prompts base
    const basePrompts = {
      detailed: this.getDetailedPrompt(analysis.serviceName),
      compact: this.getCompactPrompt(analysis.serviceName),
    };

    // Construir el prompt final
    const finalPrompt = this.buildFinalPrompt(
      basePrompts[summaryType],
      additionalInstructions,
      blueprintXml
    );

    // Combinar prompt con datos estructurados si están disponibles
    const combinedPrompt = structuredData
      ? `${finalPrompt}\n\n=== DATOS ESTRUCTURADOS DEL ANÁLISIS ===\n${structuredData}`
      : finalPrompt;

    // Llamar a OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: combinedPrompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No se pudo generar el resumen';
  }

  private static getDetailedPrompt(serviceName: string): string {
    return `Analiza el blueprint.xml de Apache Camel del servicio "${serviceName}" para migración. Genera un análisis técnico exhaustivo y detallado en formato Markdown que incluya:

## RESUMEN EJECUTIVO
- **Propósito del Servicio**: Problema de negocio que resuelve y función principal
- **Arquitectura General**: Cómo está estructurado y organizado el servicio
- **Tecnologías Utilizadas**: Stack tecnológico y frameworks identificados

## SERVICIOS EXTERNOS Y DEPENDENCIAS
### Tabla de Servicios Externos
| Servicio | Protocolo | Endpoint/Config | Propósito | Criticidad | Autenticación |
|----------|-----------|-----------------|-----------|------------|---------------|
| [Nombre específico] | [REST/SOAP/HTTP] | [URL/Propiedad real] | [Descripción detallada] | [Alta/Media/Baja] | [Sí/No/Tipo] |

### Análisis de Dependencias
- **Servicios REST**: Endpoints, métodos HTTP, operaciones, autenticación
- **Servicios SOAP**: Beans, WSDL, configuración, propiedades
- **Bases de Datos**: DataSources, conexiones, pools, drivers
- **Colas y Mensajería**: JMS, AMQP, Kafka, SQS
- **Sistemas de Archivos**: FTP, SFTP, S3, local

## CONFIGURACIÓN TÉCNICA
### Propiedades de Configuración
- **Endpoints**: URLs, puertos, contextos
- **Timeouts**: Conectividad, lectura, escritura
- **Retry Policies**: Reintentos, backoff, circuit breakers
- **Seguridad**: Certificados, autenticación, autorización
- **Performance**: Pool de conexiones, cache, optimizaciones

### Beans y Componentes
- **Beans Personalizados**: Clases Java, utilidades, helpers
- **Procesadores**: Transformaciones, validaciones, enriquecimientos
- **Interceptores**: Logging, monitoreo, auditoría
- **Validadores**: Reglas de negocio, esquemas, formatos

## FLUJOS DE PROCESAMIENTO
### Rutas Principales
- **Endpoints de Entrada**: REST, SOAP, JMS, File
- **Transformaciones**: Mapeo de datos, conversiones, enriquecimientos
- **Validaciones**: Reglas de negocio, esquemas, formatos
- **Salidas**: Respuestas, notificaciones, persistencia

### Patrones de Integración
- **Request-Reply**: Síncronos, asíncronos
- **Publish-Subscribe**: Eventos, notificaciones
- **Batch Processing**: Lotes, archivos, masivos
- **Real-time**: Streaming, tiempo real

## PUNTOS CRÍTICOS Y RIESGOS
### Dependencias Críticas
- **Servicios sin redundancia**: Single points of failure
- **Endpoints sin autenticación**: Vulnerabilidades de seguridad
- **Timeouts inadecuados**: Riesgo de bloqueos
- **Falta de circuit breakers**: Propagación de fallos

### Consideraciones de Seguridad
- **Comunicaciones seguras**: HTTPS, certificados válidos
- **Autenticación**: Tokens, credenciales, OAuth
- **Autorización**: Permisos, roles, acceso
- **Auditoría**: Logs, trazabilidad, compliance

## MONITOREO Y OBSERVABILIDAD
### Métricas Clave
- **Performance**: Latencia, throughput, recursos
- **Disponibilidad**: Uptime, errores, fallos
- **Negocio**: Transacciones, volúmenes, SLA
- **Técnicas**: CPU, memoria, disco, red

### Alertas y Alarmas
- **Críticas**: Fallos de servicio, timeouts
- **Advertencias**: Degradación, límites
- **Informativas**: Estadísticas, tendencias

## ANÁLISIS DE COMPLEJIDAD PARA MIGRACIÓN
### Rutas Más Complejas
- **Rutas con múltiples transformaciones**: Identifica las más complejas
- **Validaciones complejas**: Reglas de negocio, esquemas, formatos
- **Flujos asíncronos**: Procesamiento paralelo, callbacks, eventos
- **Procesamiento batch**: Archivos grandes, lotes, masivos
- **Manejo de errores avanzado**: Retry, circuit breakers, fallbacks

### Puntos Críticos de Migración
- **Dependencias externas críticas**: Servicios que no pueden fallar
- **Integraciones complejas**: Bases de datos, colas, almacenamiento
- **Transformaciones de datos**: Mapeos complejos, conversiones
- **Configuraciones específicas**: Propiedades, timeouts, retry policies
- **Beans personalizados**: Lógica de negocio, utilidades, helpers

## ESTRATEGIA DE MIGRACIÓN
### Priorización
- **Alta prioridad**: Funcionalidades críticas del negocio
- **Media prioridad**: Integraciones estándar, transformaciones simples
- **Baja prioridad**: Optimizaciones, mejoras, funcionalidades opcionales

### Consideraciones Técnicas
- **Compatibilidad**: Versiones de frameworks, dependencias
- **Testing**: Estrategias de validación, casos de prueba
- **Rollback**: Plan de contingencia, versionado
- **Monitoreo**: Métricas, alertas, dashboards post-migración

### Riesgos de Migración
- **Problemas de integración**: Verificar conectividad con sistemas externos
- **Performance**: Validar tiempos de respuesta, throughput
- **Datos**: Integridad, consistencia, migración de configuraciones

IMPORTANTE: 
- Responde en formato Markdown con estructura visual rica
- Usa títulos (# ## ###) para jerarquía clara
- Crea tablas detalladas con | para datos estructurados
- Usa listas con - y * para elementos
- Incluye bloques de código para configuraciones XML
- Usa negrita para términos importantes
- Usa código para nombres técnicos
- Para cada sección, proporciona información detallada y específica
- No uses frases genéricas
- Incluye ejemplos concretos, nombres específicos de endpoints, propiedades de configuración reales
- El análisis debe ser exhaustivo y útil para la migración`;
  }

  private static getCompactPrompt(serviceName: string): string {
    return `Analiza el blueprint.xml de Apache Camel del servicio "${serviceName}" y genera un resumen compacto que incluya:

1. **Propósito**: ¿Qué problema resuelve este servicio? ¿Para qué se usa?
2. **Funcionalidad Principal**: ¿Cómo funciona el servicio? ¿Qué hace con los datos?
3. **Endpoints Clave**: Principales rutas expuestas y su propósito
4. **Dependencias**: Bases de datos y servicios externos que utiliza
5. **Configuración**: Parámetros más importantes para su funcionamiento
6. **Caso de Uso**: Un ejemplo práctico de cómo se usaría este servicio

IMPORTANTE: Usa formato Markdown con títulos, listas y estructura clara.`;
  }

  private static buildFinalPrompt(
    basePrompt: string,
    additionalInstructions?: string,
    blueprintXml?: string
  ): string {
    let finalPrompt = basePrompt;

    // Agregar instrucciones adicionales si existen
    if (additionalInstructions) {
      finalPrompt += `\n\nINSTRUCCIONES ESPECÍFICAS DE FORMATO Y ESTRUCTURA:\n${additionalInstructions}\n\nIMPORTANTE: Estas instrucciones tienen prioridad sobre el formato estándar. Si solicitas tablas, listas, o estructuras específicas, úsalas en tu respuesta. Puedes usar Markdown para formatear tablas, listas, código, etc.`;
    }

    // Agregar el XML del blueprint
    if (blueprintXml) {
      finalPrompt += `\n\nBlueprint XML completo del servicio:\n\n${blueprintXml}`;
    }

    return finalPrompt;
  }
}
