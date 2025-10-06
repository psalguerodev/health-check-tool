import {
  Container,
  Globe,
  Database,
  Settings,
  ExternalLink,
  BarChart3,
  Bot,
  GitBranch,
  Package,
  Server,
  Route,
} from 'lucide-react';

export const TABS = [
  { id: 'routes', label: 'Rutas', icon: Route },
  { id: 'dependencies', label: 'Dependencias', icon: Package },
  { id: 'datasources', label: 'Data Sources', icon: Server },
  { id: 'externalServices', label: 'Servicios Externos', icon: ExternalLink },
  { id: 'graph', label: 'Gráfico', icon: BarChart3 },
  { id: 'properties', label: 'Configuración', icon: Settings },
  { id: 'summary', label: 'Resumir con IA', icon: Bot },
  { id: 'rawxml', label: 'XML Crudo', icon: Container },
  { id: 'repository', label: 'Repositorio', icon: GitBranch },
];

export const PROPERTY_LABELS: { [key: string]: string } = {
  url: 'URL',
  jdbcUrl: 'URL',
  username: 'Usuario',
  password: 'Contraseña',
  driverClassName: 'Driver',
};
