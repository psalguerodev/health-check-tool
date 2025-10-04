import React from 'react';
import { Node, Edge } from 'reactflow';
import { BlueprintAnalysis } from './types';

export class GraphService {
  static generateGraphData(analysis: BlueprintAnalysis): {
    nodes: Node[];
    edges: Edge[];
  } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Nodo central del servicio
    nodes.push({
      id: 'service',
      type: 'default',
      position: { x: 400, y: 200 },
      data: {
        label: (
          <div className="text-center w-full relative group">
            <div
              className="font-bold text-blue-600 truncate"
              title={analysis.serviceName}
            >
              {analysis.serviceName}
            </div>
            <div className="text-xs text-gray-500">Servicio Principal</div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              <div className="font-semibold">{analysis.serviceName}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </div>
        ),
      },
      style: {
        background: '#dbeafe',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '160px',
        maxWidth: '200px',
        textAlign: 'center',
        fontSize: '14px',
        lineHeight: '1.4',
      },
    });

    // Nodos de Data Sources
    analysis.dataSources.forEach((ds, index) => {
      const nodeId = `datasource-${index}`;
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: 100,
          y: 100 + index * 160,
        },
        data: {
          label: (
            <div className="text-center w-full relative group">
              <div
                className="font-bold text-purple-600 truncate"
                title={ds.name}
              >
                {ds.name}
              </div>
              <div className="text-xs text-gray-500 truncate" title={ds.type}>
                {ds.type}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="font-semibold">{ds.name}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          ),
        },
        style: {
          background: '#f3e8ff',
          border: '2px solid #8b5cf6',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '160px',
          maxWidth: '200px',
          textAlign: 'center',
          fontSize: '14px',
          lineHeight: '1.4',
        },
      });

      // Edge del servicio a la data source
      edges.push({
        id: `service-to-${nodeId}`,
        source: 'service',
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: '#8b5cf6', strokeWidth: 2 },
        label: 'Usa',
      });
    });

    // Nodos de Servicios Externos
    analysis.externalServices.forEach((service, index) => {
      const nodeId = `external-${index}`;
      nodes.push({
        id: nodeId,
        type: 'default',
        position: {
          x: 700,
          y: 100 + index * 160,
        },
        data: {
          label: (
            <div className="text-center w-full relative group">
              <div
                className="font-bold text-orange-600 truncate"
                title={service.name}
              >
                {service.name}
              </div>
              <div
                className="text-xs text-gray-500 truncate"
                title={service.type}
              >
                {service.type}
              </div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                <div className="font-semibold">{service.name}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          ),
        },
        style: {
          background: '#fed7aa',
          border: '2px solid #f97316',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '160px',
          maxWidth: '200px',
          textAlign: 'center',
          fontSize: '14px',
          lineHeight: '1.4',
        },
      });

      // Edge del servicio a servicios externos
      edges.push({
        id: `service-to-${nodeId}`,
        source: 'service',
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: '#f97316', strokeWidth: 2 },
        label: 'Invoca',
      });
    });

    return { nodes, edges };
  }
}
