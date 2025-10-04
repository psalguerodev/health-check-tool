import { ExternalService, Route } from './types';

// Función para syntax highlighting de XML con CSS puro
export const highlightXML = (
  xml: string,
  searchTerm: string = '',
  currentMatch: number = 0
): string => {
  let highlighted = xml
    // Escapar HTML primero
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Tags de apertura
    .replace(
      /&lt;([^\/\s!?&gt;]+)([^&gt;]*?)&gt;/g,
      '<span class="xml-tag">&lt;$1$2&gt;</span>'
    )
    // Tags de cierre
    .replace(
      /&lt;\/([^&gt;]+)&gt;/g,
      '<span class="xml-tag">&lt;/$1&gt;</span>'
    )
    // Tags auto-cerrados
    .replace(
      /&lt;([^\/\s!?&gt;]+)([^&gt;]*?)\/&gt;/g,
      '<span class="xml-tag">&lt;$1$2/&gt;</span>'
    )
    // Atributos
    .replace(/(\w+)=/g, '<span class="xml-attr">$1</span>=')
    // Valores de atributos
    .replace(/="([^"]*)"/g, '=<span class="xml-value">"$1"</span>')
    // Comentarios
    .replace(
      /&lt;!--([\s\S]*?)--&gt;/g,
      '<span class="xml-comment">&lt;!--$1--&gt;</span>'
    )
    // CDATA
    .replace(
      /&lt;!\[CDATA\[([\s\S]*?)\]\]&gt;/g,
      '<span class="xml-cdata">&lt;![CDATA[$1]]&gt;</span>'
    );

  // Aplicar resaltado de búsqueda si hay término de búsqueda (mínimo 3 caracteres)
  if (searchTerm && searchTerm.length >= 3) {
    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    let matchCount = 0;
    highlighted = highlighted.replace(regex, (match) => {
      const isCurrentMatch = matchCount === currentMatch;
      matchCount++;
      return `<span class="search-highlight ${
        isCurrentMatch ? 'current-match' : ''
      }">${match}</span>`;
    });
  }

  return highlighted;
};

// Función para contar coincidencias
export const countMatches = (text: string, searchTerm: string): number => {
  if (!searchTerm || searchTerm.length < 3) return 0;
  const regex = new RegExp(
    searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi'
  );
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};

// Función mejorada para detectar servicios externos usando árbol de decisiones
export const detectExternalServices = (xml: string): ExternalService[] => {
  const services: ExternalService[] = [];
  const lines = xml.split('\n');

  // Árbol de decisiones:
  // 1. ¿La URI de la llamada es cxf: o cxfrs:?
  // 2. ¿Es from (servidor) o to/toD (cliente)?
  // 3. Para cxfEndpoints: ¿address relativa o externa?

  // Detectar llamadas to/toD con cxf: (SOAP cliente)
  detectToCxfCalls(xml, services);

  // Detectar llamadas to/toD con cxfrs: (REST cliente)
  detectToCxfrsCalls(xml, services);

  // Detectar cxfEndpoints externos (usados desde to cxf:bean:ID)
  detectExternalCxfEndpoints(xml, services);

  // Detectar rsClient (siempre externo REST)
  detectRsClients(xml, services);

  // Eliminar duplicados basado en nombre y endpoint
  const uniqueServices = services.filter(
    (service, index, self) =>
      index ===
      self.findIndex(
        (s) =>
          // Mismo nombre exacto
          s.name === service.name ||
          // Mismo endpoint exacto
          s.endpoint === service.endpoint ||
          // Nombres similares (uno contiene al otro)
          (s.name.includes(service.name) && service.name.includes(s.name)) ||
          // Endpoints similares (uno contiene al otro)
          (s.endpoint.includes(service.endpoint) &&
            service.endpoint.includes(s.endpoint))
      )
  );

  return uniqueServices;
};

// Detectar llamadas to/toD con cxf: (SOAP cliente)
const detectToCxfCalls = (xml: string, services: ExternalService[]) => {
  // to/toD con cxf:bean:ID o cxf:{{...}} (siempre cliente externo)
  const toCxfCalls = xml.match(/to(?:D)?\s+[^>]*uri="cxf:[^"]*"/g);

  if (toCxfCalls) {
    toCxfCalls.forEach((call) => {
      const uriMatch = call.match(/uri="cxf:([^"]*)"/);

      if (uriMatch) {
        const fullUri = uriMatch[1];
        // Extraer nombre del servicio desde la URI
        let serviceName = 'SOAP Service';
        let configProperty = '';
        let cleanEndpoint = fullUri;

        if (fullUri.includes('bean:')) {
          // Manejar casos de bean:bean:ID
          const beanParts = fullUri.split('bean:');
          const beanId = beanParts[beanParts.length - 1].split('?')[0];
          serviceName = beanId;

          // Buscar la propiedad de configuración correspondiente al bean
          let beanEndpointMatch = null;

          // Buscar específicamente camelcxf:cxfEndpoint con el ID del bean
          // Primero buscar el ID y luego buscar el address en la misma línea
          const idMatch = xml.match(new RegExp(`id="${beanId}"`, 'i'));
          if (idMatch) {
            const idIndex = idMatch.index;
            // Buscar hacia atrás desde el ID para encontrar el address
            const beforeId = xml.substring(0, idIndex);
            const addressMatch = beforeId.match(/address="([^"]*)"[^>]*$/);
            if (addressMatch) {
              beanEndpointMatch = [null, addressMatch[1]];
            }
          }

          if (beanEndpointMatch) {
            console.log('Using cxfEndpoint match');
          } else {
            // Si no encuentra cxfEndpoint, buscar cualquier nodo con el ID
            const anyNodeMatch = xml.match(
              new RegExp(
                `<[^>]*id="${beanId}"[^>]*address="([^"]*)"[^>]*/?>`,
                'i'
              )
            );

            console.log('Any node match:', anyNodeMatch);
            beanEndpointMatch = anyNodeMatch;
          }

          console.log('Bean ID:', beanId);
          console.log('Bean endpoint match:', beanEndpointMatch);

          if (beanEndpointMatch && beanEndpointMatch[1]) {
            const address = beanEndpointMatch[1];
            console.log('Address found:', address);

            // Verificar si es una URL directa (no es propiedad de configuración)
            if (address.startsWith('/') || address.startsWith('http')) {
              console.log('Direct URL found, not a config property');
              cleanEndpoint = address;
            } else {
              // Extraer propiedad de configuración del address
              if (address.includes('[{') && address.includes('}]')) {
                const propertyMatch = address.match(/\[\{([^}]+)\}\]/);
                if (propertyMatch) {
                  configProperty = propertyMatch[1];
                  cleanEndpoint = configProperty;
                  console.log(
                    'Config property extracted ([]):',
                    configProperty
                  );
                }
              } else if (address.includes('{[') && address.includes(']}')) {
                const propertyMatch = address.match(/\{\[([^\]]+)\]\}/);
                if (propertyMatch) {
                  configProperty = propertyMatch[1];
                  cleanEndpoint = configProperty;
                  console.log(
                    'Config property extracted ({}):',
                    configProperty
                  );
                }
              } else if (address.includes('{{') && address.includes('}}')) {
                const propertyMatch = address.match(/\{\{([^}]+)\}\}/);
                if (propertyMatch) {
                  configProperty = propertyMatch[1];
                  cleanEndpoint = configProperty;
                  console.log(
                    'Config property extracted ({{}}):',
                    configProperty
                  );
                }
              } else if (address.includes('[[') && address.includes(']]')) {
                const propertyMatch = address.match(/\[\[([^\]]+)\]\]/);
                if (propertyMatch) {
                  configProperty = propertyMatch[1];
                  cleanEndpoint = configProperty;
                  console.log(
                    'Config property extracted ([[]]):',
                    configProperty
                  );
                }
              } else {
                // Si no es un placeholder, usar la dirección directamente
                cleanEndpoint = address;
                console.log(
                  'No placeholder found, using address directly:',
                  address
                );
              }
            }
          } else {
            console.log('No bean endpoint match found');
          }
        } else if (fullUri.includes('{{')) {
          // Extraer propiedad de configuración de placeholders {{...}}
          const propertyMatch = fullUri.match(/\{\{([^}]+)\}\}/);
          if (propertyMatch) {
            configProperty = propertyMatch[1];
            cleanEndpoint = configProperty;
          }
          serviceName = fullUri.split('{{')[1].split('}}')[0];
        } else if (fullUri.includes('[{') && fullUri.includes('}]')) {
          // Extraer propiedad de configuración de placeholders [{...}]
          const propertyMatch = fullUri.match(/\[\{([^}]+)\}\]/);
          if (propertyMatch) {
            configProperty = propertyMatch[1];
            cleanEndpoint = configProperty;
          }
          serviceName = fullUri.split('[{')[1].split('}]')[0];
        } else if (fullUri.includes('{[') && fullUri.includes(']}')) {
          // Extraer propiedad de configuración de placeholders {[...]}
          const propertyMatch = fullUri.match(/\{\[([^\]]+)\]\}/);
          if (propertyMatch) {
            configProperty = propertyMatch[1];
            cleanEndpoint = configProperty;
          }
          serviceName = fullUri.split('{[')[1].split(']}')[0];
        }

        const isOrchestration = detectOrchestrationIndicators(xml, serviceName);

        console.log('Creating SOAP service with:', {
          name: serviceName,
          endpoint: cleanEndpoint,
          configProperty: configProperty,
          hasConfigProperty: !!configProperty,
        });

        services.push({
          name: serviceName,
          type: 'SOAP Service',
          endpoint: cleanEndpoint,
          protocol: 'SOAP',
          description: isOrchestration
            ? 'Cliente SOAP externo (orquestación detectada)'
            : 'Cliente SOAP externo',
          configProperty: configProperty || undefined,
        });
      }
    });
  }
};

// Detectar llamadas to/toD con cxfrs: (REST cliente)
const detectToCxfrsCalls = (xml: string, services: ExternalService[]) => {
  // to/toD con cxfrs:bean:ID o cxfrs:{{...}} (siempre cliente externo)
  const toCxfrsCalls = xml.match(/to(?:D)?\s+uri="cxfrs:[^"]*"/g);

  if (toCxfrsCalls) {
    toCxfrsCalls.forEach((call) => {
      const uriMatch = call.match(/uri="cxfrs:([^"]*)"/);
      if (uriMatch) {
        const fullUri = uriMatch[1];
        let serviceName = 'REST Service';
        let configProperty = '';
        let cleanEndpoint = fullUri;

        if (fullUri.includes('bean:')) {
          serviceName = fullUri.split('bean:')[1].split('?')[0];
          // Para REST, no buscar propiedades de configuración en cxfEndpoints
          // Solo usar el bean ID como endpoint
          cleanEndpoint = fullUri;
        } else if (fullUri.includes('{{')) {
          // Extraer propiedad de configuración de placeholders {{...}}
          const propertyMatch = fullUri.match(/\{\{([^}]+)\}\}/);
          if (propertyMatch) {
            configProperty = propertyMatch[1];
            cleanEndpoint = configProperty;
          }
          serviceName = fullUri.split('{{')[1].split('}}')[0];
        } else if (fullUri.includes('[{') && fullUri.includes('}]')) {
          // Extraer propiedad de configuración de placeholders [{...}]
          const propertyMatch = fullUri.match(/\[\{([^}]+)\}\]/);
          if (propertyMatch) {
            configProperty = propertyMatch[1];
            cleanEndpoint = configProperty;
          }
          serviceName = fullUri.split('[{')[1].split('}]')[0];
        } else if (fullUri.includes('{[') && fullUri.includes(']}')) {
          // Extraer propiedad de configuración de placeholders {[...]}
          const propertyMatch = fullUri.match(/\{\[([^\]]+)\]\}/);
          if (propertyMatch) {
            configProperty = propertyMatch[1];
            cleanEndpoint = configProperty;
          }
          serviceName = fullUri.split('{[')[1].split(']}')[0];
        }

        const isOrchestration = detectOrchestrationIndicators(xml, serviceName);

        services.push({
          name: serviceName,
          type: 'REST Client',
          endpoint: cleanEndpoint,
          protocol: 'REST',
          description: isOrchestration
            ? 'Cliente REST externo (orquestación detectada)'
            : 'Cliente REST externo',
          configProperty: configProperty || undefined,
        });
      }
    });
  }
};

// Detectar cxfEndpoints externos (usados desde to cxf:bean:ID)
const detectExternalCxfEndpoints = (
  xml: string,
  services: ExternalService[]
) => {
  // Buscar cxfEndpoints con address no relativa que se usen desde to cxf:bean:ID
  const cxfEndpoints = xml.match(
    /<camelcxf:cxfEndpoint\b[^>]*\baddress="[^\/][^"]*"[^>]*\bid="([^"]*)"[^>]*>/g
  );

  if (cxfEndpoints) {
    cxfEndpoints.forEach((endpoint) => {
      const addressMatch = endpoint.match(/address="([^"]*)"/);
      const idMatch = endpoint.match(/id="([^"]*)"/);

      if (addressMatch && idMatch) {
        const address = addressMatch[1];
        const id = idMatch[1];

        // Verificar que se use desde to cxf:bean:ID (cliente)
        const isUsedAsClient =
          xml.includes(`to cxf:bean:${id}`) ||
          xml.includes(`toD cxf:bean:${id}`) ||
          xml.includes(`to cxf:{{${id}}}`) ||
          xml.includes(`toD cxf:{{${id}}}`);

        if (isUsedAsClient && !isLocalAddress(address)) {
          const isOrchestration = detectOrchestrationIndicators(xml, id);

          services.push({
            name: id,
            type: 'SOAP Service',
            endpoint: address,
            protocol: 'SOAP',
            description: isOrchestration
              ? 'Endpoint SOAP externo (orquestación detectada)'
              : 'Endpoint SOAP externo',
          });
        }
      }
    });
  }
};

// Detectar rsClient (siempre externo REST)
const detectRsClients = (xml: string, services: ExternalService[]) => {
  // <camelcxf:rsClient> siempre es externo REST
  const rsClients = xml.match(
    /<camelcxf:rsClient\b[^>]*\baddress="[^"]+"[^>]*\bid="([^"]*)"[^>]*>/g
  );

  if (rsClients) {
    rsClients.forEach((client) => {
      const addressMatch = client.match(/address="([^"]*)"/);
      const idMatch = client.match(/id="([^"]*)"/);

      if (addressMatch && idMatch) {
        const address = addressMatch[1];
        const id = idMatch[1];

        if (!isLocalAddress(address)) {
          const isOrchestration = detectOrchestrationIndicators(xml, id);

          // Extraer propiedad de configuración limpia si es un placeholder
          let cleanEndpoint = address;
          let configProperty = '';

          if (address.includes('[{') && address.includes('}]')) {
            // Extraer la propiedad de configuración sin llaves ni corchetes
            const propertyMatch = address.match(/\[\{([^}]+)\}\]/);
            if (propertyMatch) {
              configProperty = propertyMatch[1];
              cleanEndpoint = configProperty; // Mostrar la propiedad limpia
            }
          } else if (address.includes('{[') && address.includes(']}')) {
            // Extraer la propiedad de configuración sin llaves ni corchetes
            const propertyMatch = address.match(/\{\[([^\]]+)\]\}/);
            if (propertyMatch) {
              configProperty = propertyMatch[1];
              cleanEndpoint = configProperty; // Mostrar la propiedad limpia
            }
          }

          services.push({
            name: id,
            type: 'REST Client',
            endpoint: cleanEndpoint,
            protocol: 'REST',
            description: isOrchestration
              ? 'Cliente REST externo (orquestación detectada)'
              : 'Cliente REST externo',
            configProperty: configProperty || undefined, // Añadir la propiedad de configuración
          });
        }
      }
    });
  }
};

// Verificar si es una dirección local
const isLocalAddress = (address: string): boolean => {
  return (
    address.includes('localhost') ||
    address.includes('127.0.0.1') ||
    address.startsWith('/') ||
    address.includes('{[') ||
    address.includes('[[')
  );
};

// Nota: Ya no necesitamos filtrar servidores porque el árbol de decisiones
// ya distingue correctamente entre clientes (to/toD) y servidores (from)

// Detectar indicios de orquestación
const detectOrchestrationIndicators = (
  xml: string,
  serviceName: string
): boolean => {
  const lines = xml.split('\n');
  const serviceIndex = lines.findIndex((line) => line.includes(serviceName));

  if (serviceIndex === -1) return false;

  // Buscar indicios en ±10 líneas del servicio
  const start = Math.max(0, serviceIndex - 10);
  const end = Math.min(lines.length, serviceIndex + 10);
  const contextLines = lines.slice(start, end).join('\n');

  // Indicios de orquestación
  const orchestrationIndicators = [
    /xslt:\/\/[^"]+/g, // xslt://... cerca de la llamada
    /<removeHeaders\b[^>]*\bpattern="(?:\*|JMS\*|SOAPAction\*)"/g, // removeHeaders con patrones específicos
    /<set\s+[^>]*\bExchange\.[^>]*>/g, // set de Exchange.*
  ];

  return orchestrationIndicators.some((pattern) => pattern.test(contextLines));
};

// Función para generar recomendaciones basadas en servicios externos
export const generateRecommendations = (
  routes: Route[],
  externalServices: ExternalService[]
): string[] => {
  const recommendations: string[] = [];

  // Recomendaciones específicas para servicios externos REST y SOAP
  if (externalServices.some((s) => s.protocol === 'SOAP')) {
    recommendations.push(
      'Implementa circuit breakers para servicios SOAP externos'
    );
    recommendations.push('Configura timeouts apropiados para servicios SOAP');
  }

  if (externalServices.some((s) => s.protocol === 'REST')) {
    recommendations.push(
      'Implementa retry policies para servicios REST externos'
    );
    recommendations.push(
      'Configura headers de autenticación para servicios REST'
    );
  }

  // Recomendaciones generales para servicios externos
  if (externalServices.length > 0) {
    recommendations.push(
      'Implementa logging detallado para todas las llamadas externas'
    );
    recommendations.push(
      'Configura monitoreo y alertas para servicios externos'
    );
  }

  return recommendations;
};

// Función para copiar al portapapeles
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Error copying to clipboard:', err);
    throw err;
  }
};
