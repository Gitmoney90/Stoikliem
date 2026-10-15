import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Viewport,
  GraphExpression,
  GridMode,
  ThemeId,
} from './types/graph';
import { THEMES } from './math/themes';
import { parseEquation, ParsedEquationInfo, EvalScope } from './math/evaluator';
import { CurvePreset } from './math/presets';
import { fetchGraphByShareCode, GraphDocument } from './lib/graphService';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { GraphCanvas } from './components/GraphCanvas';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PresetsModal } from './components/PresetsModal';
import { TableModal } from './components/TableModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { AuthModal } from './components/AuthModal';
import { ShareSubmissionModal } from './components/ShareSubmissionModal';
import { CommunityGalleryModal } from './components/CommunityGalleryModal';
import { P2PRoomModal } from './components/P2PRoomModal';
import { GraphTheoryModal } from './components/GraphTheoryModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ResearchAnnalsModal } from './components/ResearchAnnalsModal';
import { P2PEngine, P2PConnectionState } from './lib/webrtc';
import { ChevronLeft, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function App() {
  // Theme & Grid State
  const [themeId, setThemeId] = useState<ThemeId>('parchment');
  const [gridMode, setGridMode] = useState<GridMode>('cartesian');
  const [showMinorGrid, setShowMinorGrid] = useState<boolean>(true);
  const [angleUnit, setAngleUnit] = useState<'rad' | 'deg'>('rad');

  const theme = THEMES[themeId] || THEMES.parchment;

  // Viewport State
  const [viewport, setViewport] = useState<Viewport>({
    xMin: -8,
    xMax: 8,
    yMin: -6,
    yMax: 6,
    width: 0,
    height: 0,
  });

  // UI Panels & Modals State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareSubmissionOpen, setIsShareSubmissionOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isP2PRoomOpen, setIsP2PRoomOpen] = useState(false);
  const [isGraphTheoryOpen, setIsGraphTheoryOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [optimisticSubmissions, setOptimisticSubmissions] = useState<GraphDocument[]>([]);

  // WebRTC P2P Engine Instance
  const p2pEngine = useMemo(() => new P2PEngine(), []);
  const [p2pConnectionState, setP2PConnectionState] = useState<P2PConnectionState>('disconnected');

  useEffect(() => {
    p2pEngine.onStateChange = (st) => setP2PConnectionState(st);
  }, [p2pEngine]);

  // Check URL parameters for direct P2P Room invite link
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('p2p_room');
      if (roomParam) {
        setIsP2PRoomOpen(true);
      }
    } catch {}
  }, []);

  // Notification Banner when loading a shared submission
  const [loadedGraphTitle, setLoadedGraphTitle] = useState<string | null>(null);

  // Initial Mathematical Expressions: showcases implicit, parametric, polar, and dynamic slider!
  const [expressions, setExpressions] = useState<GraphExpression[]>([
    {
      id: 'expr_slider_a',
      rawText: 'a = 2',
      color: '#B45309',
      visible: true,
      type: 'slider',
      variableName: 'a',
      sliderValue: 2,
      sliderMin: 0.5,
      sliderMax: 5,
      sliderStep: 0.1,
      isPlaying: false,
      playSpeed: 1,
      playDirection: 1,
    },
    {
      id: 'expr_folium',
      rawText: 'x^3 + y^3 - 3*a*x*y = 0',
      color: '#1E3A8A',
      visible: true,
      type: 'implicit',
    },
    {
      id: 'expr_rose',
      rawText: 'r = 3 * cos(3 * theta)',
      color: '#B91C1C',
      visible: true,
      type: 'polar',
      thetaMin: 0,
      thetaMax: Math.PI,
    },
    {
      id: 'expr_lissajous',
      rawText: '( 4 * sin(2*t), 4 * sin(3*t) )',
      color: '#15803D',
      visible: false,
      type: 'parametric',
      tMin: 0,
      tMax: 2 * Math.PI,
    },
  ]);

  const [activeExpressionId, setActiveExpressionId] = useState<string | null>(
    'expr_folium'
  );

  // Load from unique share link query parameter: ?graph=pg_xxxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const graphCode = params.get('graph');

    if (graphCode) {
      fetchGraphByShareCode(graphCode).then((doc) => {
        if (doc) {
          try {
            const rawExprs = JSON.parse(doc.expressionsJson);
            const rawVp = JSON.parse(doc.viewportJson);

            const parsedExprs: GraphExpression[] = rawExprs.map((e: any, idx: number) => ({
              id: `shared_${idx}_${Date.now()}`,
              rawText: e.rawText,
              color: e.color || theme.curvePalette[idx % theme.curvePalette.length],
              visible: e.visible !== false,
              type: e.type || 'explicit',
              sliderValue: e.sliderValue,
              sliderMin: e.sliderMin,
              sliderMax: e.sliderMax,
              sliderStep: e.sliderStep,
              tMin: e.tMin,
              tMax: e.tMax,
              thetaMin: e.thetaMin,
              thetaMax: e.thetaMax,
              showDerivative: e.showDerivative,
              showIntegral: e.showIntegral,
              integralA: e.integralA,
              integralB: e.integralB,
            }));

            setExpressions(parsedExprs);
            setActiveExpressionId(parsedExprs[0]?.id || null);

            setViewport((prev) => ({
              ...prev,
              xMin: rawVp.xMin ?? -8,
              xMax: rawVp.xMax ?? 8,
              yMin: rawVp.yMin ?? -6,
              yMax: rawVp.yMax ?? 6,
            }));

            if (doc.gridMode) setGridMode(doc.gridMode as GridMode);
            if (doc.themeId) setThemeId(doc.themeId as ThemeId);

            setLoadedGraphTitle(doc.title);
            setTimeout(() => setLoadedGraphTitle(null), 5000);
          } catch (e) {
            console.error('Failed to hydrate shared graph:', e);
          }
        }
      });
      return;
    }

    // Fallback: check #state=...
    try {
      const hash = window.location.hash;
      if (hash.includes('state=')) {
        const raw = decodeURIComponent(hash.split('state=')[1]);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const loaded: GraphExpression[] = parsed.map((item, idx) => ({
            id: `imported_${idx}_${Date.now()}`,
            rawText: item.t,
            color: item.c || theme.curvePalette[idx % theme.curvePalette.length],
            visible: item.v !== false,
            type: 'explicit',
          }));
          setExpressions(loaded);
          setActiveExpressionId(loaded[0].id);
        }
      }
    } catch {
      // Ignore hash parse error
    }
  }, [theme.curvePalette]);

  // Compute variable scope from sliders
  const scope: EvalScope = useMemo(() => {
    const sc: EvalScope = {};
    expressions.forEach((expr) => {
      if (expr.type === 'slider' && expr.variableName && expr.sliderValue !== undefined) {
        sc[expr.variableName] = expr.sliderValue;
      }
    });
    return sc;
  }, [expressions]);

  // Compile equations & cache AST
  const parsedEquations = useMemo(() => {
    const map = new Map<string, ParsedEquationInfo>();
    expressions.forEach((expr) => {
      try {
        const parsed = parseEquation(expr.rawText, angleUnit);
        map.set(expr.id, parsed);
        if (parsed.type === 'slider' && expr.type !== 'slider') {
          expr.type = 'slider';
          expr.variableName = parsed.variableName;
          if (expr.sliderValue === undefined) {
            expr.sliderValue = parsed.variableValue ?? 1;
            expr.sliderMin = -10;
            expr.sliderMax = 10;
            expr.sliderStep = 0.1;
          }
        } else if (parsed.type === 'point') {
          expr.type = 'point';
          if (parsed.pointX !== undefined && expr.pointX === undefined) expr.pointX = parsed.pointX;
          if (parsed.pointY !== undefined && expr.pointY === undefined) expr.pointY = parsed.pointY;
        } else if (parsed.type !== 'slider' && expr.type !== parsed.type) {
          expr.type = parsed.type;
        }
        expr.error = null;
      } catch (err: any) {
        expr.error = err.message || 'Syntax error';
      }
    });
    return map;
  }, [expressions, angleUnit]);

  // Animation Loop for Playing Sliders
  const animFrameRef = useRef<number | null>(null);
  useEffect(() => {
    const hasPlaying = expressions.some((e) => e.type === 'slider' && e.isPlaying);
    if (!hasPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setExpressions((prev) =>
        prev.map((expr) => {
          if (!expr.isPlaying || expr.type !== 'slider' || expr.sliderValue === undefined) {
            return expr;
          }

          const min = expr.sliderMin ?? -10;
          const max = expr.sliderMax ?? 10;
          const span = max - min;
          const speed = (expr.playSpeed ?? 1) * (span / 4);
          let dir = expr.playDirection ?? 1;
          let nextVal = expr.sliderValue + dir * speed * dt;

          if (nextVal >= max) {
            nextVal = max;
            dir = -1;
          } else if (nextVal <= min) {
            nextVal = min;
            dir = 1;
          }

          return {
            ...expr,
            sliderValue: parseFloat(nextVal.toFixed(3)),
            playDirection: dir,
          };
        })
      );

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [expressions]);

  // Expression Handlers
  const handleAddExpression = (
    typeHint: 'function' | 'slider' | 'parametric' | 'polar' | 'vector' | 'fractal' = 'function'
  ) => {
    const newId = `expr_${Date.now()}`;
    const nextColor = theme.curvePalette[expressions.length % theme.curvePalette.length];

    let defaultText = 'y = x^2 - 4';
    let type: any = 'explicit';
    let fractalType: any = undefined;

    if (typeHint === 'slider') {
      const letters = 'bckmnpqr';
      const usedVars = new Set(expressions.map((e) => e.variableName).filter(Boolean));
      const chosen = letters.split('').find((l) => !usedVars.has(l)) || 'b';
      defaultText = `${chosen} = 1`;
      type = 'slider';
    } else if (typeHint === 'parametric') {
      defaultText = '( 3*cos(t), 3*sin(t) )';
      type = 'parametric';
    } else if (typeHint === 'polar') {
      defaultText = 'r = 2 * (1 - cos(theta))';
      type = 'polar';
    } else if (typeHint === 'vector') {
      defaultText = '( x^2 - y^2 - 1, 2*x*y )';
      type = 'complex_vector';
    } else if (typeHint === 'fractal') {
      defaultText = 'fractal: mandelbrot';
      type = 'fractal';
      fractalType = 'mandelbrot';
    } else if (gridMode === 'complex_vector') {
      defaultText = '( -y / (x^2 + y^2), x / (x^2 + y^2) )';
      type = 'complex_vector';
    } else if (gridMode === 'complex') {
      defaultText = 'fractal: mandelbrot';
      type = 'fractal';
      fractalType = 'mandelbrot';
    }

    const newExpr: GraphExpression = {
      id: newId,
      rawText: defaultText,
      color: nextColor,
      visible: true,
      type,
      fractalType,
      maxIterations: type === 'fractal' ? 75 : undefined,
      sliderValue: typeHint === 'slider' ? 1 : undefined,
      sliderMin: -10,
      sliderMax: 10,
      sliderStep: 0.1,
    };

    setExpressions((prev) => [...prev, newExpr]);
    setActiveExpressionId(newId);
  };

  const handleUpdateText = (id: string, text: string) => {
    setExpressions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, rawText: text } : e))
    );
  };

  const handleToggleVisible = (id: string) => {
    setExpressions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e))
    );
  };

  const handleChangeColor = (id: string, color: string) => {
    setExpressions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, color } : e))
    );
  };

  const handleDeleteExpression = (id: string) => {
    setExpressions((prev) => prev.filter((e) => e.id !== id));
    if (activeExpressionId === id) {
      setActiveExpressionId(null);
    }
  };

  const handleDuplicateExpression = (id: string) => {
    const item = expressions.find((e) => e.id === id);
    if (!item) return;
    const newId = `expr_${Date.now()}`;
    const nextColor = theme.curvePalette[(expressions.length + 1) % theme.curvePalette.length];
    setExpressions((prev) => [
      ...prev,
      { ...item, id: newId, color: nextColor },
    ]);
    setActiveExpressionId(newId);
  };

  const handleUpdateExpressionData = (id: string, data: Partial<GraphExpression>) => {
    setExpressions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e))
    );
  };

  // Preset Loader
  const handleLoadPreset = (preset: CurvePreset) => {
    const loaded: GraphExpression[] = preset.expressions.map((exp, idx) => ({
      id: `preset_${preset.id}_${idx}_${Date.now()}`,
      rawText: exp.rawText,
      color: exp.color || theme.curvePalette[idx % theme.curvePalette.length],
      visible: true,
      type: exp.fractalType
        ? 'fractal'
        : exp.pointX !== undefined
        ? 'point'
        : exp.isPolya
        ? 'complex_vector'
        : (exp.type || 'explicit'),
      sliderValue: exp.sliderValue,
      sliderMin: exp.sliderMin ?? -10,
      sliderMax: exp.sliderMax ?? 10,
      sliderStep: exp.sliderStep ?? 0.1,
      tMin: exp.tMin,
      tMax: exp.tMax,
      thetaMin: exp.thetaMin,
      thetaMax: exp.thetaMax,
      showDerivative: exp.showDerivative,
      showIntegral: exp.showIntegral,
      integralA: exp.integralA,
      integralB: exp.integralB,
      isPolya: exp.isPolya,
      fractalType: exp.fractalType,
      juliaCr: exp.juliaCr,
      juliaCi: exp.juliaCi,
      maxIterations: exp.maxIterations,
      pointX: exp.pointX,
      pointY: exp.pointY,
      pointLabel: exp.pointLabel,
    }));

    setExpressions(loaded);
    setActiveExpressionId(loaded[loaded.length - 1]?.id || null);

    if (preset.gridMode) {
      setGridMode(preset.gridMode);
    }

    setViewport((prev) => ({
      ...prev,
      xMin: preset.viewport.xMin,
      xMax: preset.viewport.xMax,
      yMin: preset.viewport.yMin,
      yMax: preset.viewport.yMax,
    }));

    showToast(`Loaded: ${preset.name}`);
  };

  // Add multiple plotted point expressions from Value Table
  const handleAddPointExpressions = (points: { x: number; y: number; label: string }[]) => {
    const newExprs: GraphExpression[] = points.map((p, i) => ({
      id: `pt_${Date.now()}_${i}`,
      rawText: `(${p.x}, ${p.y})`,
      color: theme.accent,
      visible: true,
      type: 'point',
      pointX: p.x,
      pointY: p.y,
      pointLabel: p.label,
    }));
    setExpressions((prev) => [...prev, ...newExprs]);
  };

  // CAS Direct Graphing Handlers
  const handlePlotCASExpression = (rawText: string, color?: string) => {
    const newId = `cas_${Date.now()}`;
    const nextColor = color || theme.curvePalette[expressions.length % theme.curvePalette.length];
    const formatted = rawText.startsWith('y =') || rawText.startsWith('y=') || rawText.includes('=')
      ? rawText
      : `y = ${rawText}`;
    const newExpr: GraphExpression = {
      id: newId,
      rawText: formatted,
      color: nextColor,
      visible: true,
      type: 'explicit',
    };
    setExpressions((prev) => [...prev, newExpr]);
    setActiveExpressionId(newId);
  };

  const handlePlotCASPoint = (x: number, y: number, label: string, color?: string) => {
    const newId = `cas_pt_${Date.now()}`;
    const newExpr: GraphExpression = {
      id: newId,
      rawText: `(${Number(x.toFixed(4))}, ${Number(y.toFixed(4))})`,
      color: color || theme.accent,
      visible: true,
      type: 'point',
      pointX: x,
      pointY: y,
      pointLabel: label,
    };
    setExpressions((prev) => [...prev, newExpr]);
    setActiveExpressionId(newId);
  };

  // Toast feedback banner helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Quick mathematical template insert
  const handleAddExpressionWithText = (rawText: string) => {
    const newId = `expr_${Date.now()}`;
    const nextColor = theme.curvePalette[expressions.length % theme.curvePalette.length];
    const newExpr: GraphExpression = {
      id: newId,
      rawText,
      color: nextColor,
      visible: true,
      type: 'explicit',
    };
    setExpressions((prev) => [...prev, newExpr]);
    setActiveExpressionId(newId);
    showToast(`Added locus: ${rawText}`);
  };

  // Plot attached locus from research dispatches
  const handlePlotAttachedExpressions = (exprs: GraphExpression[], title: string) => {
    const plotted = exprs.map((e, idx) => ({
      ...e,
      id: `th_${Date.now()}_${idx}`,
      visible: true,
      color: e.color || theme.curvePalette[idx % theme.curvePalette.length],
    }));
    setExpressions(plotted);
    setActiveExpressionId(plotted[0]?.id || null);
    showToast(`Plotted locus for: "${title}"`);
  };

  // Virtual Keypad insert & backspace
  const handleInsertKeypadText = (str: string) => {
    if (!activeExpressionId) {
      if (expressions.length > 0) {
        setActiveExpressionId(expressions[0].id);
      } else {
        handleAddExpression();
        return;
      }
    }

    setExpressions((prev) =>
      prev.map((e) => {
        if (e.id === activeExpressionId) {
          return { ...e, rawText: e.rawText + str };
        }
        return e;
      })
    );
  };

  const handleKeypadBackspace = () => {
    if (!activeExpressionId) return;
    setExpressions((prev) =>
      prev.map((e) => {
        if (e.id === activeExpressionId && e.rawText.length > 0) {
          return { ...e, rawText: e.rawText.slice(0, -1) };
        }
        return e;
      })
    );
  };

  const handleKeypadClear = () => {
    if (!activeExpressionId) return;
    setExpressions((prev) =>
      prev.map((e) => (e.id === activeExpressionId ? { ...e, rawText: '' } : e))
    );
  };

  // Hydrate from Community / User Submission / P2P Sync
  const handleLoadGraphSubmission = (data: {
    title?: string;
    expressions: GraphExpression[];
    viewport: Viewport;
    gridMode: GridMode;
    themeId: ThemeId;
  }) => {
    setExpressions(data.expressions);
    setActiveExpressionId(data.expressions[0]?.id || null);
    setViewport((prev) => ({
      ...prev,
      xMin: data.viewport.xMin,
      xMax: data.viewport.xMax,
      yMin: data.viewport.yMin,
      yMax: data.viewport.yMax,
    }));
    setGridMode(data.gridMode);
    setThemeId(data.themeId);
    setLoadedGraphTitle(data.title || 'Peer Synchronized Locus');
    setTimeout(() => setLoadedGraphTitle(null), 5000);
  };

  return (
    <div
      className="flex flex-col w-screen h-[100dvh] overflow-hidden select-none"
      style={{
        backgroundColor: theme.bgCanvas,
        color: theme.textPrimary,
      }}
    >
      {/* Top Bar Navigation (Strict 3-Zone Contract with Auth, Share Submission, and P2P Room) */}
      <TopNav
        theme={theme}
        themeId={themeId}
        gridMode={gridMode}
        onSelectGridMode={setGridMode}
        onToggleTheme={() => setThemeId(themeId === 'slate' || themeId === 'engraving' ? 'parchment' : 'slate')}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onToggleAnalysis={() => setIsAnalysisOpen(!isAnalysisOpen)}
        isAnalysisOpen={isAnalysisOpen}
        onOpenTable={() => setIsTableOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShareSubmission={() => setIsShareSubmissionOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenP2PRoom={() => setIsP2PRoomOpen(true)}
        isP2PConnected={p2pConnectionState === 'connected'}
        onOpenGraphTheory={() => setIsGraphTheoryOpen(true)}
        onOpenResearch={() => setIsResearchOpen(true)}
      />

      {/* Floating Smooth Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 py-2 bg-stone-900/90 text-stone-100 backdrop-blur-md rounded-full shadow-2xl border border-stone-700/60 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Shared Graph Loaded Toast Banner */}
      {loadedGraphTitle && (
        <div
          className="px-4 py-2 border-b flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-200 z-30"
          style={{
            backgroundColor: theme.accent,
            color: '#FFFFFF',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Loaded Submission: {loadedGraphTitle}</span>
          </div>
          <button
            onClick={() => setLoadedGraphTitle(null)}
            className="text-2xs underline hover:opacity-80 min-h-[32px] px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Responsive Collapsible Sidebar */}
        <Sidebar
          expressions={expressions}
          parsedEquations={parsedEquations}
          activeExpressionId={activeExpressionId}
          theme={theme}
          isOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onSelectExpression={(id) => setActiveExpressionId(id)}
          onAddExpression={handleAddExpression}
          onAddExpressionWithText={handleAddExpressionWithText}
          onUpdateText={handleUpdateText}
          onToggleVisible={handleToggleVisible}
          onChangeColor={handleChangeColor}
          onDeleteExpression={handleDeleteExpression}
          onDuplicateExpression={handleDuplicateExpression}
          onUpdateExpressionData={handleUpdateExpressionData}
          isKeypadOpen={isKeypadOpen}
          onToggleKeypad={() => setIsKeypadOpen(!isKeypadOpen)}
          onInsertKeypadText={handleInsertKeypadText}
          onKeypadBackspace={handleKeypadBackspace}
          onKeypadClear={handleKeypadClear}
          onOpenCAS={(id) => {
            setActiveExpressionId(id);
            setIsAnalysisOpen(true);
          }}
        />

        {/* Sidebar Collapse Toggle Button (Desktop only; on mobile controlled via bottom nav) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Hide Expressions Panel' : 'Show Expressions Panel'}
          className="hidden md:flex absolute left-0 top-3 z-20 p-2 rounded-r-lg border-y border-r shadow-md transition-transform hover:opacity-90 items-center justify-center min-h-[38px] active:scale-95"
          style={{
            transform: isSidebarOpen ? 'translateX(320px)' : 'translateX(0)',
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
            color: theme.textSecondary,
          }}
          aria-label={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {isSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Graphing Engine Canvas Area */}
        <main className="flex-1 h-full relative overflow-hidden">
          <GraphCanvas
            viewport={viewport}
            onViewportChange={setViewport}
            expressions={expressions}
            parsedEquations={parsedEquations}
            scope={scope}
            theme={theme}
            gridMode={gridMode}
            showMinorGrid={showMinorGrid}
            angleUnit={angleUnit}
            activeExpressionId={activeExpressionId}
            onSelectExpression={(id) => setActiveExpressionId(id)}
            onSelectGridMode={setGridMode}
            onLoadPreset={handleLoadPreset}
            onOpenPresets={() => setIsPresetsOpen(true)}
          />

          {/* Calculus Studio Drawer */}
          <AnalysisPanel
            isOpen={isAnalysisOpen}
            onClose={() => setIsAnalysisOpen(false)}
            theme={theme}
            expressions={expressions}
            parsedEquations={parsedEquations}
            activeExpressionId={activeExpressionId}
            onSelectExpression={(id) => setActiveExpressionId(id)}
            viewport={viewport}
            scope={scope}
            onUpdateExpressionData={handleUpdateExpressionData}
            onPlotExpression={handlePlotCASExpression}
            onPlotPoint={handlePlotCASPoint}
          />
        </main>
      </div>

      {/* Dedicated Android Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        theme={theme}
        expressionsCount={expressions.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isAnalysisOpen={isAnalysisOpen}
        onToggleAnalysis={() => setIsAnalysisOpen(!isAnalysisOpen)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenGraphTheory={() => setIsGraphTheoryOpen(true)}
        onOpenTable={() => setIsTableOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShareSubmission={() => setIsShareSubmissionOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenP2PRoom={() => setIsP2PRoomOpen(true)}
        isP2PConnected={p2pConnectionState === 'connected'}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        isKeypadOpen={isKeypadOpen}
        onToggleKeypad={() => setIsKeypadOpen(!isKeypadOpen)}
        onOpenResearch={() => setIsResearchOpen(true)}
        gridMode={gridMode}
        onSelectGridMode={setGridMode}
      />

      {/* Classical Curve Presets Gallery Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        theme={theme}
        onLoadPreset={handleLoadPreset}
      />

      {/* Table of Values Modal */}
      <TableModal
        isOpen={isTableOpen}
        onClose={() => setIsTableOpen(false)}
        theme={theme}
        expressions={expressions}
        parsedEquations={parsedEquations}
        scope={scope}
        onAddPointExpressions={handleAddPointExpressions}
      />

      {/* Cartography & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onSelectTheme={(id) => setThemeId(id)}
        gridMode={gridMode}
        onSelectGridMode={setGridMode}
        showMinorGrid={showMinorGrid}
        onToggleMinorGrid={setShowMinorGrid}
        angleUnit={angleUnit}
        onSelectAngleUnit={setAngleUnit}
      />

      {/* Export & Download Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        theme={theme}
        expressions={expressions}
        onOpenShareSubmission={() => setIsShareSubmissionOpen(true)}
      />

      {/* User Login & Account Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        theme={theme}
        onSuccess={() => setIsShareSubmissionOpen(true)}
      />

      {/* Unique Graph Submission & Share Modal */}
      <ShareSubmissionModal
        isOpen={isShareSubmissionOpen}
        onClose={() => setIsShareSubmissionOpen(false)}
        theme={theme}
        expressions={expressions}
        viewport={viewport}
        gridMode={gridMode}
        themeId={themeId}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSubmissionSuccess={(newGraph) => {
          setOptimisticSubmissions((prev) => [
            newGraph,
            ...prev.filter((g) => g.id !== newGraph.id && g.shareCode !== newGraph.shareCode),
          ]);
        }}
      />

      {/* Community & Personal Submissions Gallery Archive */}
      <CommunityGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        theme={theme}
        optimisticSubmissions={optimisticSubmissions}
        onLoadGraphSubmission={handleLoadGraphSubmission}
      />

      {/* Zero-Backend WebRTC P2P Room Modal */}
      <P2PRoomModal
        isOpen={isP2PRoomOpen}
        onClose={() => setIsP2PRoomOpen(false)}
        theme={theme}
        expressions={expressions}
        viewport={viewport}
        gridMode={gridMode}
        themeId={themeId}
        onLoadSyncedGraph={handleLoadGraphSubmission}
        p2pEngine={p2pEngine}
        connectionState={p2pConnectionState}
      />

      {/* Graph Theory Interactive Section & Treatise Modal */}
      <GraphTheoryModal
        isOpen={isGraphTheoryOpen}
        onClose={() => setIsGraphTheoryOpen(false)}
        theme={theme}
      />

      {/* Research & Theorems Annals Modal */}
      <ResearchAnnalsModal
        isOpen={isResearchOpen}
        onClose={() => setIsResearchOpen(false)}
        theme={theme}
        currentExpressions={expressions}
        onPlotAttachedExpressions={handlePlotAttachedExpressions}
        onShowToast={showToast}
      />
    </div>
  );
}
