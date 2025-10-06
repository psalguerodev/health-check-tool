## [0.1.38] - 2025-10-05

### Changed

- Carga dinámica de blueprints disponibles desde CSV en lugar de lista hardcodeada
- Tabla de repositorios Camel ahora lee blueprints desde `/data/blueprints/lista-repositorios-blueprints.csv`
- Reducción de código de 217 líneas a 10 líneas en CamelRepositoriesTable
- Mejor mantenibilidad: agregar/quitar blueprints solo requiere actualizar el CSV

### Fixed

- Corrección del parseo del CSV de blueprints (ahora salta header y toma solo la primera columna)
- Repositorios con blueprints disponibles ahora se detectan correctamente en la tabla

## [0.1.36] - 2025-10-05

### Added

- Sistema completo de configuración para chat KORA con dos modos: System Prompt y Assistant ID
- Integración con OpenAI Assistants API v2
- Botón de copiar en cada mensaje de respuesta de la IA
- Indicador de escritura con animación de bolitas (typing indicator)
- Modal expandible para visualizar tablas completas
- Tooltips instantáneos CSS para elementos de código inline
- Persistencia automática de configuración en localStorage
- Limpieza automática de threads cuando se usa Assistant ID
- Notificación visual al guardar configuración
- Checkbox que refleja el estado de credenciales guardadas
- Soporte completo para jerarquía de títulos H1-H6 en Markdown
- Ancho máximo del sidebar (800px) al abrir el chat

### Changed

- Rediseño completo de las burbujas de mensaje con gradientes atractivos
- Mensajes de usuario: gradiente azul (blue-500 a blue-600)
- Mensajes de IA: gradiente gris claro con borde sutil
- Ancho máximo de burbujas reducido a 65% para mejor legibilidad
- Padding horizontal aumentado en contenedor de mensajes (24px)
- Bloques de código multilínea más compactos con header azul
- Títulos con mejor jerarquía visual y tamaños diferenciados (H1: 24px, H2: 20px, H3: 18px)
- Negritas más prominentes con color negro
- Tablas con texto y columnas más legibles (13px)
- Input de mensaje con diseño más limpio y sin doble borde
- Listas numeradas y con bullets correctamente alineadas (texto al lado del marcador)
- Scrollbars personalizados en tablas del chat
- Scroll instantáneo e invisible al abrir el chat (sin efecto de "bajada")
- Chat siempre se abre en vista principal, no en configuración
- Nombre del asistente cambiado a "KORA"
- Mensaje de bienvenida: "¡Hola! Soy Kora"

### Fixed

- Corrección del scroll horizontal en tablas dentro de burbujas
- Eliminación del scroll al hacer clic en tooltips de código
- Problema de números y texto en celdas de tablas (ahora lado a lado)
- Alineación vertical de contenido en celdas de tablas
- Comportamiento de listas dentro de tablas
- Efecto de scroll visible al abrir el sidebar

## [0.1.35] - 2025-10-04

### Added

- Reestructuración completa del servicio de resúmenes AI
- Simplificación de instrucciones adicionales a 3 opciones de valor
- Corrección del scroll automático en modal de pantalla completa XML
- Mejora de prompts para análisis de servicios externos
- Optimización de prompts para análisis de migración
- Refinamiento de prompts para arquitectura de integración
- Instrucciones específicas de formato Markdown para respuestas AI
- Aumento de tokens máximos a 4000 para respuestas más detalladas
- Prompts más específicos y técnicos para análisis exhaustivos
- Mejor organización del código con separación de responsabilidades

### Changed

- Mejor estructura modular en SummaryService
- Prompts optimizados para casos de uso específicos
- Scroll automático funcional en búsqueda XML
- Instrucciones adicionales más enfocadas y valiosas
- Respuestas AI más estructuradas y detalladas

### Fixed

- Corrección del scroll en modal de pantalla completa XML
- Mejora en la detección de servicios externos
- Optimización de prompts para evitar respuestas genéricas

## [0.1.33] - 2025-10-04

### Added

- Modal de changelog al hacer click en el tag de versión
- Funcionalidad de copia para fragmentos de código inline en el chat
- Scroll interno para bloques de código en el chat
- Focus automático en el input del chat al abrir
- Cierre del sidebar con dos clicks fuera del área

### Changed

- Mejorado el renderizado de código en el chat con solución más ligera
- Optimizado el diseño de tablas en el chat para ser más compactas
- Aumentado el ancho por defecto del sidebar del chat a 600px
- Mejorado el diseño de la opción de almacenamiento en variables de entorno

### Fixed

- Corregido el desbordamiento de código en burbujas del chat
- Solucionado el problema de [object Object] en el renderizado de código
- Arreglado el tipo de ref para el textarea en el chat

## [0.1.32] - 2025-10-03

### Added

- Sistema de variables de entorno con opciones de almacenamiento
- Configuración de credenciales AWS
- Mejoras en el chat con syntax highlighting

### Changed

- Optimización del rendimiento del chat
- Mejoras en la UI/UX general

## [0.1.31] - 2025-10-02

### Added

- Funcionalidad de chat con IA
- Integración con OpenAI API
- Sistema de historial de conversaciones

### Fixed

- Correcciones menores en la interfaz
- Mejoras en la estabilidad del sistema
