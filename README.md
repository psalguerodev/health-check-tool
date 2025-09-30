# Health Check Tool

Una aplicación Next.js minimalista para realizar pruebas de conexión a diferentes tipos de servicios, con un diseño inspirado en Wikipedia.

## Características

- **Interfaz tipo Wikipedia**: Diseño limpio y organizado
- **Múltiples tipos de conexión**:
  - DB2
  - SQL Server
  - PostgreSQL
  - AWS SQS
  - HTTP Requests (GET/POST)
- **Mensajes claros**: Resultados detallados y fáciles de entender
- **Ejecución independiente**: Cada prueba se ejecuta por separado
- **Estadísticas en tiempo real**: Contador de pruebas exitosas, errores y pendientes

## Instalación

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en modo desarrollo:

```bash
npm run dev
```

3. Abrir [http://localhost:3000](http://localhost:3000) en el navegador

## Compatibilidad

- **Apple Silicon (M1/M2)**: Totalmente compatible
- **Intel x64**: Totalmente compatible
- **DB2**: Usa verificación de conectividad TCP en lugar de ibm_db para compatibilidad universal

## Uso

1. **Agregar nueva prueba**: Haga clic en "Agregar Nueva Prueba de Conexión"
2. **Configurar conexión**: Complete los campos según el tipo de conexión
3. **Ejecutar prueba**: Haga clic en "Probar Conexión" en cada tarjeta
4. **Ver resultados**: Los resultados se muestran inmediatamente con detalles de éxito/error

## Tipos de Conexión Soportados

### DB2

- Host, puerto, base de datos
- Usuario y contraseña
- Esquema opcional

### SQL Server

- Host, puerto, base de datos
- Usuario y contraseña
- Instancia opcional
- Opción de encriptación

### PostgreSQL

- Host, puerto, base de datos
- Usuario y contraseña
- Opción SSL

### AWS SQS

- Región AWS
- Access Key ID y Secret Access Key
- URL de la cola

### HTTP Requests

- URL del endpoint
- Método (GET/POST)
- Headers personalizados
- Body de la petición
- Timeout configurable

## Tecnologías Utilizadas

- **Next.js 14**: Framework de React
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **Lucide React**: Iconos
- **Axios**: Peticiones HTTP
- **TCP Socket**: Conexión DB2 (compatible con Apple Silicon)
- **mssql**: Conexión SQL Server
- **pg**: Conexión PostgreSQL
- **@aws-sdk/client-sqs**: AWS SQS

## Estructura del Proyecto

```
app/
├── components/
│   ├── ConnectionCard.tsx    # Tarjeta individual de prueba
│   └── ConnectionForm.tsx    # Formulario para agregar pruebas
├── lib/
│   └── connections.ts        # Lógica de conexiones
├── types/
│   └── index.ts             # Definiciones de tipos
├── globals.css              # Estilos globales
├── layout.tsx               # Layout principal
└── page.tsx                 # Página principal
```

## Desarrollo

Para ejecutar en modo desarrollo:

```bash
npm run dev
```

Para construir para producción:

```bash
npm run build
npm start
```

## Notas de Seguridad

- Las credenciales se manejan en el cliente (no recomendado para producción)
- Para uso en producción, implementar autenticación y almacenamiento seguro de credenciales
- Considerar usar variables de entorno para configuraciones sensibles
