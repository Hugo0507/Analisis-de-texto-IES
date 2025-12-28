/**
 * NetworkGraphViz Component (Organism)
 *
 * Network graph visualization using Nivo for factor co-occurrence, relationships, etc.
 */

import React from 'react';
import { ResponsiveNetwork } from '@nivo/network';

export interface NetworkNode {
  id: string;
  height?: number;
  size?: number;
  color?: string;
}

export interface NetworkLink {
  source: string;
  target: string;
  distance?: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface NetworkGraphVizProps {
  data: NetworkData;
  title?: string;
  height?: number;
  linkDistance?: number;
  repulsivity?: number;
  className?: string;
}

export const NetworkGraphViz: React.FC<NetworkGraphVizProps> = ({
  data,
  title,
  height = 600,
  linkDistance = 100,
  repulsivity = 10,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h3>
      )}

      <div style={{ height: `${height}px` }}>
        <ResponsiveNetwork
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          linkDistance={linkDistance}
          centeringStrength={0.3}
          repulsivity={repulsivity}
          nodeSize={(node) => node.size || 12}
          activeNodeSize={(node) => (node.size || 12) * 1.5}
          nodeColor={(node) => node.color || '#3b82f6'}
          nodeBorderWidth={1}
          nodeBorderColor={{
            from: 'color',
            modifiers: [['darker', 0.8]],
          }}
          linkThickness={() => 2}
          linkBlendMode="multiply"
          motionConfig="gentle"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm text-gray-600">
        <p>• Node size represents importance/frequency</p>
        <p>• Lines represent relationships/co-occurrence</p>
      </div>
    </div>
  );
};
