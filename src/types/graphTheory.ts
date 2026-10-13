export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string;
  state?: 'default' | 'active' | 'visited' | 'path' | 'source' | 'target';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight?: number;
  directed?: boolean;
  state?: 'default' | 'active' | 'path' | 'mst';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphAlgorithm =
  | 'none'
  | 'dijkstra'
  | 'bfs'
  | 'dfs'
  | 'euler'
  | 'coloring'
  | 'bipartite';

export interface GraphTheoryPreset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  historicalContext: string;
  graph: GraphData;
}
