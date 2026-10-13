import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GraphNode,
  GraphEdge,
  GraphData,
  GraphAlgorithm,
  GraphTheoryPreset,
} from '../types/graphTheory';
import { GRAPH_THEORY_PRESETS } from '../math/graphTheoryPresets';
import {
  computeGraphMetrics,
  dijkstra,
  GraphMetrics,
} from '../math/graphTheoryAlgorithms';
import { ThemeConfig } from '../types/graph';
import {
  X,
  Network,
  BookOpen,
  Sparkles,
  Play,
  RotateCcw,
  Palette,
  Route,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react';

interface GraphTheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
}

type ViewMode = 'sandbox' | 'treatise';

export const GraphTheoryModal: React.FC<GraphTheoryModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('sandbox');
  const [currentPresetId, setCurrentPresetId] = useState<string>('konigsberg');

  // Graph state
  const [graph, setGraph] = useState<GraphData>(() => {
    return JSON.parse(JSON.stringify(GRAPH_THEORY_PRESETS[0].graph));
  });

  // Active Algorithm
  const [activeAlgorithm, setActiveAlgorithm] = useState<GraphAlgorithm>('none');
  const [dijkstraSource, setDijkstraSource] = useState<string | null>(null);
  const [dijkstraTarget, setDijkstraTarget] = useState<string | null>(null);

  // Interaction: Dragging, Edge Creation
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<string | null>(null);
  const [isAddingNodeMode, setIsAddingNodeMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Computed Graph Metrics
  const metrics: GraphMetrics = React.useMemo(() => {
    return computeGraphMetrics(graph);
  }, [graph]);

  // Dijkstra Shortest Path calculation
  const dijkstraResult = React.useMemo(() => {
    if (activeAlgorithm === 'dijkstra' && dijkstraSource && dijkstraTarget) {
      return dijkstra(graph, dijkstraSource, dijkstraTarget);
    }
    return null;
  }, [graph, activeAlgorithm, dijkstraSource, dijkstraTarget]);

  // Load Preset
  const handleLoadPreset = (preset: GraphTheoryPreset) => {
    setCurrentPresetId(preset.id);
    setGraph(JSON.parse(JSON.stringify(preset.graph)));
    setSelectedNodeForEdge(null);
    setDijkstraSource(null);
    setDijkstraTarget(null);
    setActiveAlgorithm('none');
  };

  // Canvas Mouse Interactions
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked a node
    const clickedNode = graph.nodes.find((n) => Math.hypot(n.x - x, n.y - y) <= 20);

    if (clickedNode) {
      if (activeAlgorithm === 'dijkstra') {
        if (!dijkstraSource || (dijkstraSource && dijkstraTarget)) {
          setDijkstraSource(clickedNode.id);
          setDijkstraTarget(null);
        } else if (dijkstraSource !== clickedNode.id) {
          setDijkstraTarget(clickedNode.id);
        }
        return;
      }

      if (selectedNodeForEdge) {
        if (selectedNodeForEdge !== clickedNode.id) {
          // Toggle edge between selectedNode and clickedNode
          setGraph((prev) => {
            const existingEdgeIndex = prev.edges.findIndex(
              (edge) =>
                (edge.source === selectedNodeForEdge && edge.target === clickedNode.id) ||
                (edge.source === clickedNode.id && edge.target === selectedNodeForEdge)
            );

            if (existingEdgeIndex >= 0) {
              return {
                ...prev,
                edges: prev.edges.filter((_, idx) => idx !== existingEdgeIndex),
              };
            } else {
              const newEdge: GraphEdge = {
                id: `e_${Date.now()}`,
                source: selectedNodeForEdge,
                target: clickedNode.id,
                weight: Math.floor(Math.random() * 5) + 1,
              };
              return { ...prev, edges: [...prev.edges, newEdge] };
            }
          });
        }
        setSelectedNodeForEdge(null);
      } else {
        setDraggingNodeId(clickedNode.id);
      }
      return;
    }

    // Clicked empty space
    if (selectedNodeForEdge) {
      setSelectedNodeForEdge(null);
      return;
    }

    if (isAddingNodeMode) {
      const nextId = `v_${Date.now()}`;
      const newLabel = `v${graph.nodes.length + 1}`;
      setGraph((prev) => ({
        ...prev,
        nodes: [...prev.nodes, { id: nextId, label: newLabel, x, y }],
      }));
      setIsAddingNodeMode(false);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingNodeId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(25, Math.min(canvas.width - 25, e.clientX - rect.left));
    const y = Math.max(25, Math.min(canvas.height - 25, e.clientY - rect.top));

    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === draggingNodeId ? { ...n, x, y } : n)),
    }));
  };

  const handleCanvasPointerUp = () => {
    setDraggingNodeId(null);
  };

  // Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 640);
    const height = (canvas.height = 420);

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Edges
    graph.edges.forEach((edge) => {
      const srcNode = graph.nodes.find((n) => n.id === edge.source);
      const tgtNode = graph.nodes.find((n) => n.id === edge.target);
      if (!srcNode || !tgtNode) return;

      const isPathEdge = dijkstraResult?.pathEdgeIds.includes(edge.id);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(srcNode.x, srcNode.y);
      ctx.lineTo(tgtNode.x, tgtNode.y);

      if (isPathEdge) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 2.2;
      }
      ctx.stroke();

      // Draw edge weight badge if weighted
      if (edge.weight !== undefined && edge.weight > 1) {
        const mx = (srcNode.x + tgtNode.x) / 2;
        const my = (srcNode.y + tgtNode.y) / 2;
        ctx.fillStyle = theme.bgCard;
        ctx.beginPath();
        ctx.arc(mx, my, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = theme.textSecondary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(edge.weight), mx, my);
      }

      ctx.restore();
    });

    // 2. Draw Nodes (Vertices)
    graph.nodes.forEach((node) => {
      const deg = metrics.degrees[node.id] || 0;
      const isOddDegree = deg % 2 !== 0;
      const isSelected = selectedNodeForEdge === node.id;
      const isDijkstraSrc = dijkstraSource === node.id;
      const isDijkstraTgt = dijkstraTarget === node.id;
      const isDijkstraPath = dijkstraResult?.pathNodeIds.includes(node.id);

      ctx.save();

      // Node background fill
      let fillColor = theme.bgCard;
      if (activeAlgorithm === 'coloring') {
        fillColor = metrics.nodeColors[node.id] || '#3B82F6';
      } else if (activeAlgorithm === 'euler') {
        fillColor = isOddDegree ? '#EF4444' : '#10B981';
      } else if (isDijkstraSrc) {
        fillColor = '#10B981';
      } else if (isDijkstraTgt) {
        fillColor = '#EF4444';
      } else if (isDijkstraPath) {
        fillColor = '#F59E0B';
      } else if (isSelected) {
        fillColor = theme.accent;
      }

      // Outer Glow / Ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, 18, 0, 2 * Math.PI);
      ctx.fillStyle = fillColor;
      ctx.fill();

      ctx.lineWidth = isSelected || isDijkstraPath ? 3 : 2;
      ctx.strokeStyle = isSelected ? '#FFFFFF' : theme.textPrimary;
      ctx.stroke();

      // Label inside vertex
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillStyle = activeAlgorithm === 'coloring' || isDijkstraPath || isSelected || activeAlgorithm === 'euler' ? '#FFFFFF' : theme.textPrimary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label.length <= 4 ? node.label : node.label.slice(0, 3), node.x, node.y);

      // Degree counter badge
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.fillText(`deg: ${deg}`, node.x, node.y + 28);

      ctx.restore();
    });
  }, [
    graph,
    theme,
    metrics,
    activeAlgorithm,
    selectedNodeForEdge,
    dijkstraSource,
    dijkstraTarget,
    dijkstraResult,
  ]);

  if (!isOpen) return null;

  const currentPreset =
    GRAPH_THEORY_PRESETS.find((p) => p.id === currentPresetId) ||
    GRAPH_THEORY_PRESETS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-3 sm:px-6 py-3 sm:py-4 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 min-h-[52px]"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Network className="w-5 h-5 shrink-0" style={{ color: theme.accent }} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className="text-sm sm:text-base font-bold tracking-tight truncate"
                  style={{
                    fontFamily: '"Cinzel", "Source Serif 4", serif',
                    color: theme.textPrimary,
                  }}
                >
                  Graph Theory Explorer
                </h2>
                <span className="text-3xs sm:text-2xs font-mono px-1.5 sm:px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-amber-700">
                  G = (V, E)
                </span>
              </div>
              <p className="text-2xs sm:text-xs line-clamp-1 hidden xs:block" style={{ color: theme.textSecondary }}>
                The mathematical study of networks, topological paths, and structural connectivity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: theme.border }}>
              <button
                onClick={() => setViewMode('sandbox')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1 rounded text-2xs font-semibold transition-colors min-h-[34px] flex items-center justify-center ${
                  viewMode === 'sandbox' ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: viewMode === 'sandbox' ? theme.accent : 'transparent',
                  color: viewMode === 'sandbox' ? '#FFFFFF' : theme.textPrimary,
                }}
              >
                Sandbox
              </button>
              <button
                onClick={() => setViewMode('treatise')}
                className={`px-2.5 sm:px-3 py-1 sm:py-1 rounded text-2xs font-semibold transition-colors min-h-[34px] flex items-center justify-center ${
                  viewMode === 'treatise' ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: viewMode === 'treatise' ? theme.accent : 'transparent',
                  color: viewMode === 'treatise' ? '#FFFFFF' : theme.textPrimary,
                }}
              >
                Treatise
              </button>
            </div>

            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: theme.textSecondary }}
              aria-label="Close Graph Theory Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= VIEW 1: INTERACTIVE SANDBOX ================= */}
        {viewMode === 'sandbox' && (
          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0 text-xs font-sans">
            {/* Left / Center Canvas Area */}
            <div className="flex-1 p-4 flex flex-col border-b md:border-b-0 md:border-r" style={{ borderColor: theme.border }}>
              {/* Presets Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2.5 mb-2 shrink-0">
                <span className="text-2xs font-semibold uppercase tracking-wider shrink-0" style={{ color: theme.textMuted }}>
                  Canonical Presets:
                </span>
                {GRAPH_THEORY_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleLoadPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-semibold whitespace-nowrap border transition-all ${
                      currentPresetId === p.id ? 'ring-1' : 'opacity-75 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: currentPresetId === p.id ? theme.accent : theme.bgSidebar,
                      borderColor: theme.border,
                      color: currentPresetId === p.id ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Interactive Canvas Container */}
              <div
                className="relative flex-1 rounded-2xl border shadow-inner overflow-hidden flex items-center justify-center min-h-[360px]"
                style={{ backgroundColor: theme.bgCanvas, borderColor: theme.border }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block cursor-pointer select-none"
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                />

                {/* Floating Canvas Instructions */}
                <div className="absolute left-3 bottom-3 pointer-events-none px-2.5 py-1 rounded-md bg-stone-900/80 backdrop-blur-xs text-2xs text-stone-300 font-mono">
                  {selectedNodeForEdge
                    ? 'Click another node to toggle edge connection'
                    : isAddingNodeMode
                    ? 'Click anywhere on canvas to place new vertex'
                    : 'Drag nodes to reposition · Click to select'}
                </div>
              </div>

              {/* Canvas Action Bar */}
              <div className="flex items-center justify-between gap-2 pt-3 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsAddingNodeMode(!isAddingNodeMode);
                      setSelectedNodeForEdge(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold text-2xs flex items-center gap-1.5 transition-all ${
                      isAddingNodeMode ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: isAddingNodeMode ? theme.accent : theme.bgSidebar,
                      borderColor: theme.border,
                      color: isAddingNodeMode ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingNodeMode ? 'Cancel Add Vertex' : 'Add Vertex'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (graph.nodes.length > 0) {
                        setSelectedNodeForEdge(graph.nodes[0].id);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg border font-semibold text-2xs flex items-center gap-1.5 hover:opacity-80 transition-all ${
                      selectedNodeForEdge ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: selectedNodeForEdge ? theme.accent : theme.bgSidebar,
                      borderColor: theme.border,
                      color: selectedNodeForEdge ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>Connect Edge</span>
                  </button>

                  <button
                    onClick={() => handleLoadPreset(currentPreset)}
                    title="Reset to default preset"
                    className="p-1.5 rounded-lg border text-2xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ borderColor: theme.border, color: theme.textSecondary }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setGraph({ nodes: [], edges: [] })}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 hover:bg-rose-50 text-2xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Right Sidebar: Algorithms & Mathematical Invariants */}
            <div className="w-full md:w-80 p-4 space-y-4 overflow-y-auto shrink-0" style={{ backgroundColor: theme.bgSidebar }}>
              {/* Preset Commentary Box */}
              <div className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1.5" style={{ borderColor: theme.border }}>
                <h4 className="font-bold text-xs" style={{ fontFamily: '"Source Serif 4", serif', color: theme.textPrimary }}>
                  {currentPreset.name}
                </h4>
                <p className="text-2xs font-serif italic text-amber-700">
                  {currentPreset.subtitle}
                </p>
                <p className="text-2xs leading-relaxed" style={{ color: theme.textSecondary }}>
                  {currentPreset.description}
                </p>
              </div>

              {/* Mathematical Invariants */}
              <div className="p-3.5 rounded-xl border space-y-2.5" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <span className="font-semibold text-2xs uppercase tracking-wider block" style={{ color: theme.textMuted }}>
                  Topological Invariants
                </span>

                <div className="grid grid-cols-2 gap-2 font-mono text-2xs tabular-nums">
                  <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                    <span className="block text-2xs" style={{ color: theme.textMuted }}>Order |V| (Vertices)</span>
                    <span className="text-base font-bold" style={{ color: theme.textPrimary }}>{metrics.vertexCount}</span>
                  </div>
                  <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                    <span className="block text-2xs" style={{ color: theme.textMuted }}>Size |E| (Edges)</span>
                    <span className="text-base font-bold" style={{ color: theme.accent }}>{metrics.edgeCount}</span>
                  </div>
                  <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                    <span className="block text-2xs" style={{ color: theme.textMuted }}>Chromatic Number χ</span>
                    <span className="text-base font-bold" style={{ color: '#10B981' }}>{metrics.chromaticNumber}</span>
                  </div>
                  <div className="p-2 rounded bg-black/5 dark:bg-white/5">
                    <span className="block text-2xs" style={{ color: theme.textMuted }}>Components</span>
                    <span className="text-base font-bold" style={{ color: theme.textPrimary }}>{metrics.connectedComponents}</span>
                  </div>
                </div>

                {/* Handshaking Lemma readout */}
                <div className="pt-2 border-t text-2xs space-y-1" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between font-mono">
                    <span style={{ color: theme.textMuted }}>Handshaking Lemma:</span>
                    <span className="font-semibold text-emerald-600">Σ deg(v) = 2|E|</span>
                  </div>
                  <div className="text-2xs font-mono" style={{ color: theme.textSecondary }}>
                    Sum of degrees: {Object.values(metrics.degrees).reduce((a, b) => a + b, 0)} = 2 × {metrics.edgeCount}
                  </div>
                </div>
              </div>

              {/* Algorithms Deck */}
              <div className="p-3.5 rounded-xl border space-y-2.5" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <span className="font-semibold text-2xs uppercase tracking-wider block" style={{ color: theme.textMuted }}>
                  Explore Famous Theorems
                </span>

                <div className="space-y-1.5">
                  {/* Euler Circuit */}
                  <button
                    onClick={() => setActiveAlgorithm(activeAlgorithm === 'euler' ? 'none' : 'euler')}
                    className={`w-full p-2 rounded-lg border text-left font-semibold text-2xs flex items-center justify-between transition-colors ${
                      activeAlgorithm === 'euler' ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: activeAlgorithm === 'euler' ? theme.accent : theme.bgSidebar,
                      borderColor: theme.border,
                      color: activeAlgorithm === 'euler' ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <span>Eulerian Trail & Circuit</span>
                    <span className="text-2xs font-mono">Euler 1736</span>
                  </button>

                  {/* Graph Coloring */}
                  <button
                    onClick={() => setActiveAlgorithm(activeAlgorithm === 'coloring' ? 'none' : 'coloring')}
                    className={`w-full p-2 rounded-lg border text-left font-semibold text-2xs flex items-center justify-between transition-colors ${
                      activeAlgorithm === 'coloring' ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: activeAlgorithm === 'coloring' ? theme.accent : theme.bgSidebar,
                      borderColor: theme.border,
                      color: activeAlgorithm === 'coloring' ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <span>Vertex Coloring (χ={metrics.chromaticNumber})</span>
                    <span className="text-2xs font-mono">Welsh-Powell</span>
                  </button>

                  {/* Dijkstra Shortest Path */}
                  <button
                    onClick={() => {
                      if (activeAlgorithm === 'dijkstra') {
                        setActiveAlgorithm('none');
                      } else {
                        setActiveAlgorithm('dijkstra');
                        if (graph.nodes.length >= 2) {
                          setDijkstraSource(graph.nodes[0].id);
                          setDijkstraTarget(graph.nodes[graph.nodes.length - 1].id);
                        }
                      }
                    }}
                    className={`w-full p-2 rounded-lg border text-left font-semibold text-2xs flex items-center justify-between transition-colors ${
                      activeAlgorithm === 'dijkstra' ? 'ring-1' : ''
                    }`}
                    style={{
                      backgroundColor: activeAlgorithm === 'dijkstra' ? theme.accent : theme.bgSidebar,
                      borderColor: theme.border,
                      color: activeAlgorithm === 'dijkstra' ? '#FFFFFF' : theme.textPrimary,
                    }}
                  >
                    <span>Dijkstra Shortest Path</span>
                    <span className="text-2xs font-mono">Dijkstra 1956</span>
                  </button>
                </div>

                {/* Algorithm Details Box */}
                {activeAlgorithm === 'euler' && (
                  <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 space-y-1.5 text-2xs border" style={{ borderColor: theme.border }}>
                    <div className="font-semibold" style={{ color: theme.textPrimary }}>
                      Euler's Criterion Analysis:
                    </div>
                    <div>
                      {metrics.isEulerianCircuit ? (
                        <span className="text-emerald-600 font-bold">✓ Eulerian Circuit exists! (Every vertex has even degree)</span>
                      ) : metrics.isEulerianPath ? (
                        <span className="text-amber-600 font-bold">✓ Open Eulerian Trail exists! (Exactly 2 odd vertices)</span>
                      ) : (
                        <span className="text-rose-600 font-bold">✗ No Eulerian Trail possible ({metrics.oddDegreeCount} odd vertices: {metrics.oddDegreeNodes.join(', ')})</span>
                      )}
                    </div>
                    <p className="text-2xs" style={{ color: theme.textMuted }}>
                      Red vertices have odd degrees; green vertices have even degrees.
                    </p>
                  </div>
                )}

                {activeAlgorithm === 'dijkstra' && (
                  <div className="p-2.5 rounded-lg bg-black/5 dark:bg-white/5 space-y-1.5 text-2xs border" style={{ borderColor: theme.border }}>
                    <div className="font-semibold" style={{ color: theme.textPrimary }}>
                      Shortest Path Pathfinding:
                    </div>
                    <p style={{ color: theme.textSecondary }}>
                      Click any two nodes on canvas to calculate shortest path.
                    </p>
                    {dijkstraResult && dijkstraResult.pathNodeIds.length > 0 ? (
                      <div className="font-mono text-2xs space-y-0.5">
                        <div className="text-amber-600 font-bold">Total Path Weight: {dijkstraResult.totalDistance}</div>
                        <div className="truncate text-stone-500">Route: {dijkstraResult.pathNodeIds.join(' → ')}</div>
                      </div>
                    ) : (
                      <span className="text-rose-500">No reachable path between selected vertices.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 2: FOUNDATIONAL TREATISE ================= */}
        {viewMode === 'treatise' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 text-xs leading-relaxed max-w-3xl mx-auto">
            {/* Chapter 1: The First Principle */}
            <section className="space-y-3">
              <span className="text-2xs font-mono uppercase tracking-widest text-amber-700 font-bold block">
                01. The Geometry of Position
              </span>
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: '"Source Serif 4", serif', color: theme.textPrimary }}
              >
                What is a Mathematical Graph?
              </h3>
              <p style={{ color: theme.textSecondary }}>
                In everyday language, a "graph" often denotes a Cartesian curve plotting continuous variables such as $y = f(x)$. But in discrete mathematics, a <strong>Graph $G = (V, E)$</strong> is a fundamentally distinct structure: an abstract relational network consisting of a set of vertices $V$ (entities or points) connected by a set of edges $E$ (relationships or links).
              </p>
              <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 font-mono text-2xs space-y-2" style={{ borderColor: theme.border }}>
                <div className="font-bold text-amber-700">Canonical Mathematical Notation:</div>
                <div>G = (V, E) where V = {'{v₁, v₂, ..., vₙ}'} and E ⊆ {'{(u, v) | u, v ∈ V}'}</div>
                <div>Handshaking Lemma: Σ deg(v) = 2|E| (The sum of degrees is always twice the number of edges)</div>
              </div>
            </section>

            {/* Chapter 2: The Königsberg Bridge Problem */}
            <section className="space-y-3">
              <span className="text-2xs font-mono uppercase tracking-widest text-amber-700 font-bold block">
                02. Historical Genesis (1736)
              </span>
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: '"Source Serif 4", serif', color: theme.textPrimary }}
              >
                The Seven Bridges of Königsberg
              </h3>
              <p style={{ color: theme.textSecondary }}>
                In the historic Prussian city of Königsberg (modern Kaliningrad), seven bridges spanned the Pregel River connecting two large islands to each other and the mainland. Citizens wondered: <em>Could one take a stroll through the city crossing each bridge exactly once and return to the starting point?</em>
              </p>
              <p style={{ color: theme.textSecondary }}>
                Leonhard Euler made the profound realization that the precise distances, bridge lengths, and geographic shapes were completely irrelevant. By collapsing the 4 land areas into vertices and the 7 bridges into edges, Euler proved that for a continuous loop to exist, <strong>every vertex must have an even degree</strong>, because every entrance into a landmass requires a distinct exit bridge. Since all four vertices in Königsberg have odd degrees (3, 3, 3, 5), the stroll is mathematically impossible.
              </p>
            </section>

            {/* Chapter 3: Planar Graphs & Kuratowski's Theorem */}
            <section className="space-y-3">
              <span className="text-2xs font-mono uppercase tracking-widest text-amber-700 font-bold block">
                03. Planarity & Kuratowski's Theorem
              </span>
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: '"Source Serif 4", serif', color: theme.textPrimary }}
              >
                Can Every Graph Be Drawn Without Edge Crossings?
              </h3>
              <p style={{ color: theme.textSecondary }}>
                A graph is called <strong>planar</strong> if it can be embedded in a 2-dimensional plane such that no edges intersect except at their common endpoints. Euler's polyhedral formula establishes:
              </p>
              <div className="p-3 rounded-xl border bg-black/5 dark:bg-white/5 font-mono text-center text-xs font-bold text-emerald-600" style={{ borderColor: theme.border }}>
                V - E + F = 2 (Vertices - Edges + Faces = 2)
              </div>
              <p style={{ color: theme.textSecondary }}>
                In 1930, Polish mathematician Kazimierz Kuratowski formulated one of the deepest theorems in topology: a finite graph is planar if and only if it does not contain a subdivision of either the complete graph K₅ or the complete bipartite graph K₃,₃ (the three utilities puzzle).
              </p>
            </section>

            {/* Chapter 4: The Four Color Theorem */}
            <section className="space-y-3">
              <span className="text-2xs font-mono uppercase tracking-widest text-amber-700 font-bold block">
                04. The Four Color Theorem (1976)
              </span>
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: '"Source Serif 4", serif', color: theme.textPrimary }}
              >
                Chromatic Numbers & Map Coloring
              </h3>
              <p style={{ color: theme.textSecondary }}>
                Given any political map separated into contiguous regions, how many colors are needed to ensure no two adjacent countries share the same color? First conjectured by Francis Guthrie in 1852, Kenneth Appel and Wolfgang Haken proved in 1976 that <strong>no more than 4 colors are ever required</strong> for any planar graph ($\chi(G) \le 4$). This marked the first major mathematical theorem proved with the aid of computer exhaustions.
              </p>
            </section>

            {/* Chapter 5: Real-World Applications */}
            <section className="space-y-3 pb-6">
              <span className="text-2xs font-mono uppercase tracking-widest text-amber-700 font-bold block">
                05. Universal Applications
              </span>
              <h3
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: '"Source Serif 4", serif', color: theme.textPrimary }}
              >
                From Internet Routing to Neural Networks
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border }}>
                  <div className="font-bold text-xs mb-1" style={{ color: theme.textPrimary }}>GPS & Internet Routing</div>
                  <p style={{ color: theme.textSecondary }}>Dijkstra and A* algorithms calculate the fastest turn-by-turn routes across global road networks and BGP fiber packets.</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border }}>
                  <div className="font-bold text-xs mb-1" style={{ color: theme.textPrimary }}>PageRank & Social Graphs</div>
                  <p style={{ color: theme.textSecondary }}>Google’s original algorithm treats web pages as nodes and hyperlinks as directed edges, analyzing random-walk stationary distributions.</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border }}>
                  <div className="font-bold text-xs mb-1" style={{ color: theme.textPrimary }}>Molecular Chemistry</div>
                  <p style={{ color: theme.textSecondary }}>Atoms as vertices and covalent chemical bonds as edges determine molecular isomer counts and drug interactions.</p>
                </div>
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border }}>
                  <div className="font-bold text-xs mb-1" style={{ color: theme.textPrimary }}>Biological Connectomes</div>
                  <p style={{ color: theme.textSecondary }}>Neurons and synaptic connections form complex small-world networks with high clustering and short path lengths.</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
