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
    // Usar system prompt específico para análisis de blueprints, ignorando el personalizado
    const systemPrompt = `Eres un experto en análisis de blueprints Apache Camel OSGi. Analiza el XML proporcionado y extrae información específica y real. No uses placeholders genéricos.`;

    console.log('🔧 System prompt para análisis:', systemPrompt);

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

    console.log(`XML original obtenido: ${fullBlueprintXml.length} caracteres`);
    console.log(
      `Primeros 200 caracteres del XML:`,
      fullBlueprintXml.substring(0, 200)
    );
    console.log(
      `¿XML contiene <blueprint?`,
      fullBlueprintXml.includes('<blueprint')
    );
    console.log(
      `¿XML contiene </blueprint>?`,
      fullBlueprintXml.includes('</blueprint>')
    );
    console.log(`¿XML está vacío?`, fullBlueprintXml.trim().length === 0);
    console.log(`¿XML contiene solo espacios?`, fullBlueprintXml.trim() === '');

    // Optimizar el XML según las opciones del usuario
    const optimizationOptions =
      xmlOptimization || XmlOptimizer.getDefaultOptions();
    const blueprintXml = XmlOptimizer.extractImportantData(
      fullBlueprintXml,
      analysis,
      optimizationOptions
    );

    console.log(`XML optimizado: ${blueprintXml.length} caracteres`);
    console.log(`Opciones de optimización:`, optimizationOptions);
    console.log(
      `Primeros 200 caracteres del XML optimizado:`,
      blueprintXml.substring(0, 200)
    );
    console.log(
      `¿XML optimizado está vacío?`,
      blueprintXml.trim().length === 0
    );
    console.log(
      `¿XML optimizado contiene <blueprint?`,
      blueprintXml.includes('<blueprint')
    );
    console.log(
      `¿XML optimizado contiene </blueprint>?`,
      blueprintXml.includes('</blueprint>')
    );

    // Calcular tokens estimados
    let estimatedInputTokens = XmlOptimizer.estimateTokenCount(blueprintXml);
    console.log(
      `XML optimizado: ${blueprintXml.length} caracteres (~${estimatedInputTokens} tokens)`
    );

    // Extraer datos estructurados según las opciones
    let structuredData = XmlOptimizer.extractStructuredData(
      analysis,
      optimizationOptions
    );
    console.log(`Datos estructurados: ${structuredData.length} caracteres`);

    // Agregar tokens de los datos estructurados y del prompt
    estimatedInputTokens += XmlOptimizer.estimateTokenCount(structuredData);
    estimatedInputTokens += 2000; // Tokens estimados del prompt y system message

    // PROTECCIÓN: Verificar límite de tokens (GPT-4 tiene límite de 8k input en el plan básico)
    const MAX_INPUT_TOKENS = 7500; // Dejamos margen de seguridad
    const MAX_OUTPUT_TOKENS = 2500; // Tokens para la respuesta

    if (estimatedInputTokens > MAX_INPUT_TOKENS) {
      console.warn(
        `⚠️ Tokens estimados (${estimatedInputTokens}) exceden el límite. Reduciendo...`
      );

      // Estrategia de reducción progresiva
      if (optimizationOptions.includeFullXml) {
        // Paso 1: Reducir el XML completo
        const reducedLength = Math.floor(optimizationOptions.maxLength! * 0.6); // Reducir 40%
        console.log(
          `Reduciendo XML de ${optimizationOptions.maxLength} a ${reducedLength} caracteres`
        );

        const reducedXml = XmlOptimizer.extractImportantData(
          fullBlueprintXml,
          analysis,
          { ...optimizationOptions, maxLength: reducedLength }
        );

        estimatedInputTokens = XmlOptimizer.estimateTokenCount(reducedXml);
        estimatedInputTokens += XmlOptimizer.estimateTokenCount(structuredData);
        estimatedInputTokens += 2000;

        // Si aún es muy grande, quitar XML completo y usar solo secciones importantes
        if (estimatedInputTokens > MAX_INPUT_TOKENS) {
          console.warn(
            `⚠️ Aún muy grande. Cambiando a modo extracción selectiva...`
          );
          const selectiveOptions = {
            ...optimizationOptions,
            includeFullXml: false, // Quitar XML completo
            maxLength: 30000,
          };

          const selectiveXml = XmlOptimizer.extractImportantData(
            fullBlueprintXml,
            analysis,
            selectiveOptions
          );

          return this.generateWithReducedContent(
            apiKey,
            systemPrompt,
            analysis,
            summaryType,
            additionalInstructions,
            selectiveXml,
            structuredData,
            MAX_OUTPUT_TOKENS
          );
        }

        // Si ahora está bien, continuar con XML reducido
        return this.generateWithReducedContent(
          apiKey,
          systemPrompt,
          analysis,
          summaryType,
          additionalInstructions,
          reducedXml,
          structuredData,
          MAX_OUTPUT_TOKENS
        );
      }
    }

    console.log(
      `✅ Tokens estimados: ${estimatedInputTokens} (dentro del límite de ${MAX_INPUT_TOKENS})`
    );
    console.log(`📤 Tokens máximos de respuesta: ${MAX_OUTPUT_TOKENS}`);

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

    console.log(`Prompt final construido: ${finalPrompt.length} caracteres`);
    console.log(
      `¿XML incluido en prompt?`,
      finalPrompt.includes('XML del Blueprint')
    );
    console.log(
      `¿Prompt contiene <blueprint?`,
      finalPrompt.includes('<blueprint')
    );
    console.log(
      `¿Prompt contiene </blueprint>?`,
      finalPrompt.includes('</blueprint>')
    );
    console.log(
      `Últimos 200 caracteres del prompt:`,
      finalPrompt.substring(finalPrompt.length - 200)
    );

    // Combinar prompt con datos estructurados si están disponibles
    const combinedPrompt = structuredData
      ? `${finalPrompt}\n\n=== DATOS ESTRUCTURADOS DEL ANÁLISIS ===\n${structuredData}`
      : finalPrompt;

    console.log(`Prompt combinado: ${combinedPrompt.length} caracteres`);
    console.log(
      `¿Prompt combinado contiene XML?`,
      combinedPrompt.includes('XML del Blueprint')
    );
    console.log(
      `¿Prompt combinado contiene <blueprint?`,
      combinedPrompt.includes('<blueprint')
    );

    // Llamar a OpenAI con protección de límites
    return this.callOpenAI(
      apiKey,
      systemPrompt,
      combinedPrompt,
      MAX_OUTPUT_TOKENS
    );
  }

  /**
   * Función helper para generar con contenido reducido
   */
  private static async generateWithReducedContent(
    apiKey: string,
    systemPrompt: string,
    analysis: BlueprintAnalysis,
    summaryType: 'detailed' | 'compact',
    additionalInstructions: string | undefined,
    blueprintXml: string,
    structuredData: string,
    maxOutputTokens: number
  ): Promise<string> {
    console.log('📝 Generando con contenido reducido...');

    const basePrompts = {
      detailed: this.getDetailedPrompt(analysis.serviceName),
      compact: this.getCompactPrompt(analysis.serviceName),
    };

    const finalPrompt = this.buildFinalPrompt(
      basePrompts[summaryType],
      additionalInstructions,
      blueprintXml
    );

    const combinedPrompt = structuredData
      ? `${finalPrompt}\n\n=== DATOS ESTRUCTURADOS DEL ANÁLISIS ===\n${structuredData}`
      : finalPrompt;

    return this.callOpenAI(
      apiKey,
      systemPrompt,
      combinedPrompt,
      maxOutputTokens
    );
  }

  /**
   * Llamada a OpenAI con manejo de errores robusto
   */
  private static async callOpenAI(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    console.log(`📤 Enviando a OpenAI:`);
    console.log(`- System prompt length: ${systemPrompt.length}`);
    console.log(`- User prompt length: ${userPrompt.length}`);
    console.log(
      `- ¿User prompt contiene XML?`,
      userPrompt.includes('=== BLUEPRINT XML COMPLETO ===')
    );
    console.log(
      `- ¿User prompt contiene <blueprint?`,
      userPrompt.includes('<blueprint')
    );
    console.log(`- Max tokens: ${maxTokens}`);

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
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
                content: userPrompt,
              },
            ],
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Manejo específico de error de rate limit
        if (errorData.error?.code === 'rate_limit_exceeded') {
          const errorMsg = errorData.error.message || '';

          if (errorMsg.includes('tokens per min')) {
            throw new Error(
              `❌ Límite de tokens por minuto excedido en tu cuenta de OpenAI.\n\n` +
                `El blueprint es muy grande para tu plan actual.\n\n` +
                `Soluciones:\n` +
                `1. Espera 1 minuto y vuelve a intentar\n` +
                `2. Usa el modo "Resumen Compacto" en lugar de "Análisis Detallado"\n` +
                `3. Actualiza tu plan de OpenAI para más TPM (Tokens Per Minute)\n\n` +
                `Más info: https://platform.openai.com/account/rate-limits`
            );
          }

          if (errorMsg.includes('Request too large')) {
            throw new Error(
              `❌ La solicitud es demasiado grande incluso después de la reducción automática.\n\n` +
                `Soluciones:\n` +
                `1. Usa "Resumen Compacto" que consume menos tokens\n` +
                `2. El blueprint puede ser excepcionalmente grande\n` +
                `3. Considera analizar secciones específicas en lugar del servicio completo`
            );
          }
        }

        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}\n` +
            `${errorData.error?.message || 'Error desconocido'}`
        );
      }

      const data = await response.json();
      const aiResponse =
        data.choices[0]?.message?.content || 'No se pudo generar el resumen';

      console.log(`🤖 Respuesta de la IA recibida:`);
      console.log(`- Longitud: ${aiResponse.length} caracteres`);
      console.log(`- Primeros 200 caracteres:`, aiResponse.substring(0, 200));
      console.log(
        `- ¿Dice que no hay XML?`,
        aiResponse.toLowerCase().includes('no proporcionaste') ||
          aiResponse.toLowerCase().includes('no se proporcionó')
      );

      return aiResponse;
    } catch (error: any) {
      // Re-lanzar errores ya formateados
      if (error.message.includes('❌')) {
        throw error;
      }

      // Error genérico
      throw new Error(
        `Error al conectar con OpenAI: ${error.message}\n\n` +
          `Verifica tu API Key y conexión a internet.`
      );
    }
  }

  private static getDetailedPrompt(serviceName: string): string {
    return `Analiza el blueprint.xml de Apache Camel OSGi del servicio "${serviceName}". 

IMPORTANTE: El XML completo del blueprint se proporciona a continuación en este mismo mensaje. Debes analizar TODO el contenido XML que aparece después de esta instrucción.

Genera un análisis técnico detallado en formato Markdown enfocándote SOLO en:

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
- El análisis debe ser exhaustivo y útil para la migración

EJEMPLO DE TABLA CORRECTA:
|| Servicio | Tipo | Endpoint | Bean ID |
||----------|------|----------|---------|
|| Customer REST API | REST | \${customer.api.url}/v1/customers | customerServiceClient |

EJEMPLO DE BEAN DETALLADO:
- Bean ID: customerServiceClient
- Clase: org.apache.camel.component.http4.HttpComponent
- URL: \${customer.api.url}/v1/customers
- Timeout: 5000ms
- Usado en rutas: customerDataRoute, customerValidationRoute

Recuerda: USA SOLO información real extraída del XML proporcionado`;
  }

  private static getCompactPrompt(serviceName: string): string {
    return `Analiza el blueprint.xml de Apache Camel OSGi del servicio "${serviceName}". 

El XML se proporciona a continuación. Genera un resumen ejecutivo compacto con:

## RESUMEN GENERAL
- **Propósito**: ¿Qué función cumple este servicio?
- **Tipo**: REST, SOAP, Batch, etc.
- **Tecnologías**: Apache Camel, CXF, ActiveMQ, etc.

## DEPENDENCIAS EXTERNAS
### Servicios Externos
| Servicio | Protocolo | Endpoint | Propósito |
|----------|-----------|----------|-----------|
| [Nombre] | [REST/SOAP] | [URL] | [Descripción] |

### Bases de Datos
| DataSource | Driver | Propósito |
|------------|--------|-----------|
| [ID] | [Driver] | [Descripción] |

## RUTAS PRINCIPALES
| ID de Ruta | Tipo | Endpoint/URI | Propósito |
|------------|------|--------------|-----------|
| [ID] | [REST/SOAP/JMS] | [URI] | [Descripción] |

IMPORTANTE: 
- Extrae información REAL del XML proporcionado
- No uses placeholders genéricos
- Máximo 300 palabras
- Enfócate solo en funcionalidad, dependencias y rutas

Recuerda: USA SOLO información real extraída del XML proporcionado`;
  }

  private static buildFinalPrompt(
    basePrompt: string,
    additionalInstructions?: string,
    blueprintXml?: string
  ): string {
    let finalPrompt = basePrompt;

    // Agregar instrucciones adicionales si existen
    if (additionalInstructions) {
      finalPrompt += `\n\n🎯 INSTRUCCIONES PERSONALIZADAS DEL USUARIO:\n${additionalInstructions}\n\n⚠️ PRIORIDAD MÁXIMA: Estas instrucciones personalizadas tienen prioridad absoluta sobre cualquier formato estándar. Debes seguir EXACTAMENTE lo que el usuario solicita:\n- Si pide tablas específicas, créalas con los datos reales del XML\n- Si pide listas, úsalas en lugar de párrafos\n- Si pide análisis de aspectos específicos, enfócate SOLO en esos aspectos\n- Si pide formato particular, úsalo sin excepción\n- Usa Markdown para formatear: tablas (|), listas (-), código (\`\`\`), etc.\n- Extrae datos REALES del XML, no uses placeholders genéricos\n\nIMPORTANTE: Tu respuesta debe reflejar fielmente estas instrucciones personalizadas.`;
    }

    // Agregar el XML del blueprint de forma simple y directa
    if (blueprintXml && blueprintXml.trim().length > 0) {
      console.log(`Agregando XML al prompt. Longitud: ${blueprintXml.length}`);
      finalPrompt += `\n\n=== XML DEL BLUEPRINT APACHE CAMEL OSGi ===\n\n${blueprintXml}\n\n=== FIN DEL XML ===\n\nIMPORTANTE: El XML anterior contiene toda la información del blueprint. Analiza cada elemento, bean, ruta, configuración y dependencia que aparece en el XML.`;
    } else {
      console.log(
        'ERROR: blueprintXml está vacío, undefined o solo contiene espacios'
      );
      finalPrompt += `\n\nERROR: No se pudo obtener el XML del blueprint.`;
    }

    return finalPrompt;
  }
}
