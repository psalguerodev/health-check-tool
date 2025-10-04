import {
  Container,
  Globe,
  Database,
  Settings,
  ExternalLink,
  BarChart3,
  Bot,
} from 'lucide-react';

export const TABS = [
  { id: 'routes', label: 'Rutas', icon: Globe },
  { id: 'dependencies', label: 'Dependencias', icon: Database },
  { id: 'datasources', label: 'Data Sources', icon: Database },
  { id: 'externalServices', label: 'Servicios Externos', icon: ExternalLink },
  { id: 'graph', label: 'Gráfico', icon: BarChart3 },
  { id: 'properties', label: 'Configuración', icon: Settings },
  { id: 'summary', label: 'Resumir con IA', icon: Bot },
  { id: 'rawxml', label: 'XML Crudo', icon: Container },
];

export const PROPERTY_LABELS: { [key: string]: string } = {
  url: 'URL',
  jdbcUrl: 'URL',
  username: 'Usuario',
  password: 'Contraseña',
  driverClassName: 'Driver',
};
