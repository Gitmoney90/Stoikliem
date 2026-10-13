import { GraphNode, GraphEdge, GraphData } from '../types/graphTheory';

export interface GraphMetrics {
  vertexCount: number;
  edgeCount: number;
  degrees: Record<string, number>;
  maxDegree: number;
  minDegree: number;
  isEulerianCircuit: boolean;
  isEulerianPath: boolean;
  oddDegreeCount: number;
  oddDegreeNodes: string[];
  connectedComponents: number;
  isBipartite: boolean;
  chromaticNumber: number;
  nodeColors: Record<string, string>;
}

const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export function computeGraphMetrics(graph: GraphData): GraphMetrics {
  const { nodes, edges } = graph;
  const vertexCount = nodes.length;
  const edgeCount = edges.length;

  const degrees: Record<string, number> = {};
  nodes.forEach((n) => (degrees[n.id] = 0));

  edges.forEach((e) => {
    if (degrees[e.source] !== undefined) degrees[e.source]++;
    if (degrees[e.target] !== undefined) degrees[e.target]++;
  });

  const degreeValues = Object.values(degrees);
  const maxDegree = degreeValues.length > 0 ? Math.max(...degreeValues) : 0;
  const minDegree = degreeValues.length > 0 ? Math.min(...degreeValues) : 0;

  // Odd degree vertices (Eulerian criteria)
  const oddDegreeNodes = nodes.filter((n) => (degrees[n.id] || 0) % 2 !== 0).map((n) => n.id);
  const oddDegreeCount = oddDegreeNodes.length;

  // Connected components
  const adj = getAdjacencyList(graph);
  const visited = new Set<string>();
  let connectedComponents = 0;

  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      connectedComponents++;
      // BFS
      const queue = [n.id];
      visited.add(n.id);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        (adj[curr] || []).forEach((neighbor) => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
    }
  });

  const isConnected = connectedComponents <= 1 || nodes.length === 0;
  const isEulerianCircuit = isConnected && oddDegreeCount === 0 && edgeCount > 0;
  const isEulerianPath = isConnected && (oddDegreeCount === 2 || oddDegreeCount === 0) && edgeCount > 0;

  // Bipartite check (2-coloring)
  let isBipartite = true;
  const bipColors: Record<string, number> = {};
  nodes.forEach((n) => {
    if (bipColors[n.id] === undefined && isBipartite) {
      bipColors[n.id] = 0;
      const q = [n.id];
      while (q.length > 0) {
        const u = q.shift()!;
        const neighbors = adj[u] || [];
        for (const v of neighbors) {
          if (bipColors[v] === undefined) {
            bipColors[v] = 1 - bipColors[u];
            q.push(v);
          } else if (bipColors[v] === bipColors[u]) {
            isBipartite = false;
            break;
          }
        }
      }
    }
  });

  // Greedy Graph Coloring (Welsh-Powell heuristic)
  const sortedNodes = [...nodes].sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
  const nodeColorIndices: Record<string, number> = {};
  let maxColorUsed = 0;

  sortedNodes.forEach((node) => {
    const neighborColors = new Set<number>();
    (adj[node.id] || []).forEach((neigh) => {
      if (nodeColorIndices[neigh] !== undefined) {
        neighborColors.add(nodeColorIndices[neigh]);
      }
    });

    let assignedColor = 0;
    while (neighborColors.has(assignedColor)) {
      assignedColor++;
    }

    nodeColorIndices[node.id] = assignedColor;
    if (assignedColor > maxColorUsed) maxColorUsed = assignedColor;
  });

  const nodeColors: Record<string, string> = {};
  nodes.forEach((n) => {
    const idx = nodeColorIndices[n.id] ?? 0;
    nodeColors[n.id] = COLOR_PALETTE[idx % COLOR_PALETTE.length];
  });

  const chromaticNumber = vertexCount > 0 ? maxColorUsed + 1 : 0;

  return {
    vertexCount,
    edgeCount,
    degrees,
    maxDegree,
    minDegree,
    isEulerianCircuit,
    isEulerianPath,
    oddDegreeCount,
    oddDegreeNodes,
    connectedComponents,
    isBipartite,
    chromaticNumber,
    nodeColors,
  };
}

export function getAdjacencyList(graph: GraphData): Record<string, string[]> {
  const adj: Record<string, string[]> = {};
  graph.nodes.forEach((n) => (adj[n.id] = []));
  graph.edges.forEach((e) => {
    if (!adj[e.source]) adj[e.source] = [];
    if (!adj[e.target]) adj[e.target] = [];
    if (!adj[e.source].includes(e.target)) adj[e.source].push(e.target);
    if (!e.directed && !adj[e.target].includes(e.source)) adj[e.target].push(e.source);
  });
  return adj;
}

/**
 * Dijkstra's Shortest Path
 */
export function dijkstra(
  graph: GraphData,
  sourceId: string,
  targetId: string
): { pathNodeIds: string[]; pathEdgeIds: string[]; totalDistance: number } {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const previousEdge: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  graph.nodes.forEach((n) => {
    distances[n.id] = Infinity;
    previous[n.id] = null;
    previousEdge[n.id] = null;
    unvisited.add(n.id);
  });

  distances[sourceId] = 0;

  // Build edge lookup
  const edgeWeights: Record<string, Record<string, { weight: number; edgeId: string }>> = {};
  graph.nodes.forEach((n) => (edgeWeights[n.id] = {}));

  graph.edges.forEach((e) => {
    const w = e.weight ?? 1;
    edgeWeights[e.source][e.target] = { weight: w, edgeId: e.id };
    if (!e.directed) {
      edgeWeights[e.target][e.source] = { weight: w, edgeId: e.id };
    }
  });

  while (unvisited.size > 0) {
    let closestNode: string | null = null;
    let minDist = Infinity;

    unvisited.forEach((nodeId) => {
      if (distances[nodeId] < minDist) {
        minDist = distances[nodeId];
        closestNode = nodeId;
      }
    });

    if (closestNode === null || minDist === Infinity) break;
    if (closestNode === targetId) break;

    unvisited.delete(closestNode);

    const neighbors = edgeWeights[closestNode] || {};
    for (const [neighborId, { weight, edgeId }] of Object.entries(neighbors)) {
      if (unvisited.has(neighborId)) {
        const alt = distances[closestNode] + weight;
        if (alt < distances[neighborId]) {
          distances[neighborId] = alt;
          previous[neighborId] = closestNode;
          previousEdge[neighborId] = edgeId;
        }
      }
    }
  }

  const pathNodeIds: string[] = [];
  const pathEdgeIds: string[] = [];
  let curr: string | null = targetId;

  if (distances[targetId] !== Infinity) {
    while (curr) {
      pathNodeIds.unshift(curr);
      const edge = previousEdge[curr];
      if (edge) pathEdgeIds.unshift(edge);
      curr = previous[curr];
    }
  }

  return {
    pathNodeIds,
    pathEdgeIds,
    totalDistance: distances[targetId] === Infinity ? 0 : distances[targetId],
  };
}
