export interface Route {
  id: string;
  address: string;
  protocol: string;
  type: string;
  path?: string;
  description?: string;
}

export interface Dependency {
  name: string;
  type: string;
  description: string;
  properties: string[];
}

export interface DataSource {
  name: string;
  type: string;
  properties: string[];
}

export interface Property {
  name: string;
  value: string;
  description?: string;
}

export interface ExternalService {
  name: string;
  endpoint: string;
  type: string;
  protocol: string;
  description: string;
  method?: string;
  properties?: string[];
  configProperty?: string;
}

export interface BlueprintAnalysis {
  serviceName: string;
  routes: Route[];
  dependencies: Dependency[];
  dataSources: DataSource[];
  properties: Property[];
  externalServices: ExternalService[];
}

export interface BlueprintAnalyzerProps {
  serviceName: string;
  onBack: () => void;
  onHistoryOpen: () => void;
  onChatOpen: () => void;
}
