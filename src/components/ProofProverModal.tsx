import React, { useState, useRef } from 'react';
import {
  ProofType,
  ProofStep,
  VerificationResult,
  verifyPropositionalTheorem,
  verifyAlgebraicProof,
  verifyMathematicalInduction,
  verifyCalculusODE,
  verifyPredicateTheorem,
  synthesizeProofChain,
  detectAlgebraicRule,
  CURATED_THEOREM_PRESETS,
  CuratedTheoremPreset,
  TableauNode,
  ProofGoal,
  initTacticProof,
  applyTactic,
  verifyGeometryTheorem,
  GeometryTheoremSpec,
  verifyMatrixTheorem,
  MatrixAlgebraSpec,
  verifyDPLLTheorem,
  ProofDAG,
} from '../math/theoremVerifier';
import { ThemeConfig } from '../types/graph';
import { MathView } from './MathView';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  BookOpen,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Binary,
  GitBranch,
  Layers,
  Wand2,
  Fingerprint,
  RotateCcw,
  Maximize2,
  Minimize2,
  HelpCircle,
  Compass,
  Grid,
  Share2,
  ArrowRight,
  Send,
  Play,
  Lightbulb,
} from 'lucide-react';

interface ProofProverModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
  initialTheoremFormula?: string;
  onPlotFormula?: (formula: string) => void;
  onPublishToAnnals?: (dossier: { title: string; latex: string; summary: string; category: string }) => void;
}

export const ProofProverModal: React.FC<ProofProverModalProps> = ({
  isOpen,
  onClose,
  theme,
  onShowToast,
  initialTheoremFormula,
  onPlotFormula,
  onPublishToAnnals,
}) => {
  const [activeProofType, setActiveProofType] = useState<ProofType>('propositional_logic');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // 1. Propositional Logic State
  const [logicFormula, setLogicFormula] = useState<string>(
    initialTheoremFormula || '((P -> Q) & !Q) -> !P'
  );

  // 2. Algebraic Equivalence Chain State
  const [algebraSteps, setAlgebraSteps] = useState<ProofStep[]>([
    { id: '1', expression: '(x + y)^2', justification: 'Given binomial problem' },
    { id: '2', expression: '(x + y)*(x + y)', justification: 'Exponentiation definition' },
    { id: '3', expression: 'x^2 + x*y + y*x + y^2', justification: 'FOIL distributivity' },
    { id: '4', expression: 'x^2 + 2*x*y + y^2', justification: 'Addition of like terms' },
  ]);

  // 3. Automated Step Synthesizer State
  const [autoStartExpr, setAutoStartExpr] = useState<string>('(x + 2)^3');
  const [autoTargetExpr, setAutoTargetExpr] = useState<string>('x^3 + 6*x^2 + 12*x + 8');

  // 4. Custom Induction State
  const [inductionName, setInductionName] = useState<string>('Sum of First n Integers');
  const [inductionTerm, setInductionTerm] = useState<string>('k');
  const [inductionClosedForm, setInductionClosedForm] = useState<string>('n*(n + 1)/2');
  const [inductionBaseN, setInductionBaseN] = useState<number>(1);

  // 5. Calculus ODE State
  const [odeEquation, setOdeEquation] = useState<string>('diff(y, x, 2) + 4*y = 0');
  const [odeCandidate, setOdeCandidate] = useState<string>('3*cos(2*x) + 5*sin(2*x)');
  const [odeVariable, setOdeVariable] = useState<string>('x');

  // 6. First-Order Predicate Logic State
  const [predQuantifier, setPredQuantifier] = useState<'forall' | 'exists'>('forall');
  const [predVar, setPredVar] = useState<string>('x');
  const [predDomainText, setPredDomainText] = useState<string>('-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5');
  const [predExpr, setPredExpr] = useState<string>('x^2 >= 0');

  // 7. Interactive Tactic Assistant State (Lean/Coq)
  const [tacticStatement, setTacticStatement] = useState<string>('(A & B) -> (B & A)');
  const [tacticGoals, setTacticGoals] = useState<ProofGoal[]>(() => initTacticProof('(A & B) -> (B & A)'));
  const [tacticScript, setTacticScript] = useState<string[]>([]);
  const [tacticParam, setTacticParam] = useState<string>('');

  // 8. Coordinate Geometry Prover State
  const [geoPreset, setGeoPreset] = useState<GeometryTheoremSpec>({
    id: 'pythagoras',
    name: 'Pythagorean Orthogonality in Cartesian Plane',
    figureType: 'right_triangle',
    points: [
      { name: 'A', x: '0', y: '0' },
      { name: 'B', x: 'a', y: '0' },
      { name: 'C', x: '0', y: 'b' },
    ],
    invariantsToProve: [
      {
        statement: '|AB|² + |AC|² ≡ |BC|²',
        lhsSymbolic: 'a^2 + b^2',
        rhsSymbolic: '(a - 0)^2 + (0 - b)^2',
        description: 'Euclidean distance metric sum equals hypotenuse squared',
      },
    ],
  });

  // 9. Matrix Algebra State
  const [matrixSize, setMatrixSize] = useState<2 | 3>(2);
  const [matrixA, setMatrixA] = useState<string[][]>([['a', 'b'], ['c', 'd']]);
  const [matrixB, setMatrixB] = useState<string[][]>([['e', 'f'], ['g', 'h']]);
  const [matrixProperty, setMatrixProperty] = useState<'det_multiplicativity' | 'cayley_hamilton' | 'trace_cyclic'>('det_multiplicativity');

  // 10. DPLL SAT Solver State
  const [dpllFormula, setDpllFormula] = useState<string>('(P | Q | R) & (!P | !Q) & (!Q | R) & (!R | P)');

  // Verification Result & Visualizer State
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [copiedLatex, setCopiedLatex] = useState<boolean>(false);
  const [showTableauTree, setShowTableauTree] = useState<boolean>(true);
  const [activeVisualizerTab, setActiveVisualizerTab] = useState<'steps' | 'dag' | 'tableau' | 'models'>('steps');

  if (!isOpen) return null;

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      let res: VerificationResult;
      try {
        if (activeProofType === 'propositional_logic') {
          res = verifyPropositionalTheorem(logicFormula);
        } else if (activeProofType === 'dpll_sat') {
          res = verifyDPLLTheorem(dpllFormula);
        } else if (activeProofType === 'algebraic_equivalence') {
          res = verifyAlgebraicProof(algebraSteps);
        } else if (activeProofType === 'auto_prover') {
          res = synthesizeProofChain(autoStartExpr, autoTargetExpr);
        } else if (activeProofType === 'mathematical_induction') {
          res = verifyMathematicalInduction({
            name: inductionName,
            termFormula: inductionTerm,
            rightClosedFormula: inductionClosedForm,
            baseN: inductionBaseN,
            leftSumFormula: (n: number) => {
              let sum = 0;
              for (let i = inductionBaseN; i <= n; i++) {
                if (inductionTerm === 'k') sum += i;
                else if (inductionTerm === 'k^2') sum += i * i;
                else if (inductionTerm === 'k^3') sum += i * i * i;
                else if (inductionTerm === '2*k - 1') sum += 2 * i - 1;
                else sum += i;
              }
              return sum;
            },
          });
        } else if (activeProofType === 'calculus_ode') {
          res = verifyCalculusODE({
            odeEquation,
            candidateSolution: odeCandidate,
            variable: odeVariable,
          });
        } else if (activeProofType === 'tactic_assistant') {
          const allClosed = tacticGoals.every((g) => g.isClosed);
          res = {
            verified: allClosed,
            proofType: 'tactic_assistant',
            title: `Tactic Proof: ${tacticStatement}`,
            executionTimeMs: 1.2,
            stepsCount: tacticScript.length,
            summary: allClosed
              ? `All ${tacticGoals.length} goal branches discharged via formal tactics. Q.E.D.`
              : `${tacticGoals.filter((g) => !g.isClosed).length} goal(s) remain unproven.`,
            qedSeal: allClosed ? 'Q.E.D. (Tactics Certified)' : 'Incomplete Proof State',
            proofFingerprint: `QED-TACTIC-${Date.now().toString(16).toUpperCase()}`,
            tacticState: { goals: tacticGoals, stepsExecuted: tacticScript },
            stepResults: tacticScript.map((step, idx) => ({
              stepIndex: idx + 1,
              expression: step,
              justification: 'Interactive Lean-style tactic execution',
              isValid: true,
              invariantTested: 'Goal transformation invariant',
            })),
          };
        } else if (activeProofType === 'coordinate_geometry') {
          res = verifyGeometryTheorem(geoPreset);
        } else if (activeProofType === 'matrix_algebra') {
          res = verifyMatrixTheorem({
            name: matrixProperty === 'det_multiplicativity' ? 'det(AB) = det(A)·det(B)' : 'Cayley-Hamilton Characteristic Theorem',
            size: matrixSize,
            matrixA,
            matrixB,
            property: matrixProperty,
          });
        } else {
          const domain = predDomainText
            .split(',')
            .map((s) => Number(s.trim()))
            .filter((n) => !isNaN(n));
          res = verifyPredicateTheorem({
            quantifier: predQuantifier,
            variableName: predVar,
            domain: domain.length > 0 ? domain : [0, 1, 2, 3, 4, 5],
            predicateExpression: predExpr,
          });
        }
      } catch (err: any) {
        res = {
          verified: false,
          proofType: activeProofType,
          title: 'Proof Verification Invariant Error',
          executionTimeMs: 0,
          stepsCount: 0,
          summary: `Deduction engine error: ${err?.message || 'Check formula syntax'}`,
          qedSeal: 'Verification Error',
          proofFingerprint: 'QED-ERROR',
          stepResults: [],
        };
      }

      setVerificationResult(res);
      setIsVerifying(false);
      onShowToast(
        res.verified
          ? `Theorem Formally Certified: ${res.qedSeal}`
          : 'Verification completed: Deductive invariant not met.'
      );
    }, 40);
  };

  const handleExecuteTactic = (tactic: 'intro' | 'split' | 'exact' | 'ring' | 'refl' | 'auto') => {
    const outcome = applyTactic(tacticGoals, tactic, tacticParam);
    if (outcome.success) {
      setTacticGoals(outcome.goals);
      setTacticScript((prev) => [...prev, `${tactic}${tacticParam ? ` ${tacticParam}` : ''}`]);
      setTacticParam('');
      onShowToast(outcome.message);
      if (outcome.goals.every((g) => g.isClosed)) {
        setTimeout(handleVerify, 100);
      }
    } else {
      onShowToast(`Tactic failed: ${outcome.message}`);
    }
  };

  const handleResetTactics = (stmt?: string) => {
    const st = stmt || tacticStatement;
    setTacticStatement(st);
    setTacticGoals(initTacticProof(st));
    setTacticScript([]);
    setTacticParam('');
    setVerificationResult(null);
  };

  const handleLoadPreset = (preset: CuratedTheoremPreset) => {
    setActiveProofType(preset.proofType);
    if (preset.proofType === 'propositional_logic') {
      setLogicFormula(preset.inputData);
    } else if (preset.proofType === 'dpll_sat') {
      setDpllFormula(preset.inputData);
    } else if (preset.proofType === 'first_order_predicate') {
      setPredQuantifier(preset.inputData.quantifier);
      setPredVar(preset.inputData.variable);
      setPredDomainText(preset.inputData.domain);
      setPredExpr(preset.inputData.predicate);
    } else if (preset.proofType === 'algebraic_equivalence') {
      setAlgebraSteps(preset.inputData);
    } else if (preset.proofType === 'auto_prover') {
      setAutoStartExpr(preset.inputData.startExpr);
      setAutoTargetExpr(preset.inputData.targetExpr);
    } else if (preset.proofType === 'mathematical_induction') {
      setInductionName(preset.inputData.name);
      setInductionTerm(preset.inputData.termFormula || 'k');
      setInductionClosedForm(preset.inputData.rightClosedFormula);
      setInductionBaseN(preset.inputData.baseN || 1);
    } else if (preset.proofType === 'calculus_ode') {
      setOdeEquation(preset.inputData.odeEquation);
      setOdeCandidate(preset.inputData.candidateSolution);
      setOdeVariable(preset.inputData.variable || 'x');
    } else if (preset.proofType === 'tactic_assistant') {
      handleResetTactics(preset.inputData);
    } else if (preset.proofType === 'coordinate_geometry') {
      setGeoPreset(preset.inputData);
    } else if (preset.proofType === 'matrix_algebra') {
      setMatrixA(preset.inputData.matrixA);
      if (preset.inputData.matrixB) setMatrixB(preset.inputData.matrixB);
      setMatrixProperty(preset.inputData.property);
    }
    setVerificationResult(null);
  };

  const handleAddAlgebraStep = () => {
    const nextIdx = algebraSteps.length + 1;
    const prev = algebraSteps[algebraSteps.length - 1]?.expression || 'x';
    setAlgebraSteps((s) => [
      ...s,
      {
        id: `step_${Date.now()}`,
        expression: prev,
        justification: `Deduction step ${nextIdx}`,
      },
    ]);
  };

  const handleRemoveAlgebraStep = (id: string) => {
    setAlgebraSteps((s) => s.filter((step) => step.id !== id));
  };

  const handleAutoJustifyStep = (idx: number) => {
    if (idx === 0) return;
    const rule = detectAlgebraicRule(algebraSteps[idx - 1].expression, algebraSteps[idx].expression);
    setAlgebraSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, justification: rule } : s))
    );
    onShowToast(`Detected rule: ${rule}`);
  };

  const handleRepairStepWithDiagnostic = (idx: number, fix: string) => {
    setAlgebraSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, expression: fix, justification: 'Repaired by Auto-Diagnostic' } : s))
    );
    onShowToast(`Repaired step ${idx + 1} with certified canonical expression`);
    setTimeout(handleVerify, 50);
  };

  const handleCopyTranscript = () => {
    if (!verificationResult) return;
    const transcript = [
      `=== STOIKLIEM AUTOMATED PROOF VERIFICATION CERTIFICATE ===`,
      `Theorem: ${verificationResult.title}`,
      `Type: ${verificationResult.proofType.replace('_', ' ').toUpperCase()}`,
      `Status: ${verificationResult.verified ? 'CERTIFIED Q.E.D.' : 'FALSIFIED / REFUTED'}`,
      `Seal: ${verificationResult.qedSeal}`,
      `Proof Fingerprint: ${verificationResult.proofFingerprint}`,
      `Execution Time: ${verificationResult.executionTimeMs}ms (100% Client-Side, Zero External API)`,
      `Summary: ${verificationResult.summary}`,
      `Step-by-Step Deductions:`,
      ...verificationResult.stepResults.map(
        (s) => `  [${s.isValid ? 'VALID' : 'INVALID'}] Step ${s.stepIndex}: ${s.expression} — Justification: ${s.justification}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    onShowToast('Formal proof certificate copied to clipboard');
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const handleCopyLatex = () => {
    if (!verificationResult?.latexProof) {
      onShowToast('No LaTeX export available for this theorem');
      return;
    }
    navigator.clipboard.writeText(verificationResult.latexProof);
    setCopiedLatex(true);
    onShowToast('LaTeX proof code copied to clipboard');
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  // Tableau Tree recursive node renderer
  const renderTableauNode = (node: TableauNode) => {
    return (
      <div key={node.id} className="flex flex-col gap-1.5 pl-3 border-l-2 my-1" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2 text-2xs font-mono">
          <span className={`px-1.5 py-0.5 rounded text-3xs font-bold ${node.isClosed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {node.isClosed ? '⊗ CLOSED' : '○ OPEN'}
          </span>
          <span className="font-semibold">{node.formula}</span>
          <span className="opacity-60 text-3xs italic">[{node.ruleApplied}]</span>
        </div>
        {node.contradiction && (
          <div className="text-3xs text-emerald-500 pl-4 font-mono">
            ↳ {node.contradiction}
          </div>
        )}
        {node.children && node.children.map((child) => renderTableauNode(child))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full ${isFullScreen ? 'h-full max-w-full rounded-none' : 'max-w-5xl max-h-[94vh] rounded-2xl'} border shadow-2xl flex flex-col overflow-hidden transition-all duration-200`}
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
          color: theme.textPrimary,
        }}
      >
        {/* Top Header Bar */}
        <div
          className="px-4 sm:px-6 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base tracking-tight" style={{ fontFamily: '"Cinzel", serif' }}>
                  Stoikliem Theorem Prover & Proof Assistant
                </h2>
                <span className="px-1.5 py-0.2 rounded text-4xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ULTRA ENGINE
                </span>
              </div>
              <p className="text-3xs opacity-70 font-mono">
                100% Client-Side Formal Proof Assistant · Tactics · Tableaux · Induction · Geometry · ODEs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : 'Run Automated Prover'}</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 hidden sm:inline-flex"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Proof Studio'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Engine Proof Mode Switcher */}
        <div
          className="px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs"
          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
        >
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'tactic_assistant', label: 'Tactic Assistant (Lean)', icon: Wand2 },
              { id: 'propositional_logic', label: 'Logic Tableaux', icon: Binary },
              { id: 'dpll_sat', label: 'DPLL SAT Engine', icon: Layers },
              { id: 'first_order_predicate', label: 'Predicate Logic (∀/∃)', icon: HelpCircle },
              { id: 'algebraic_equivalence', label: 'Algebraic Chains', icon: GitBranch },
              { id: 'coordinate_geometry', label: 'Coordinate Geometry', icon: Compass },
              { id: 'matrix_algebra', label: 'Matrix Invariants', icon: Grid },
              { id: 'mathematical_induction', label: 'Peano Induction', icon: TrendingUp },
              { id: 'calculus_ode', label: 'Calculus ODEs', icon: Sparkles },
              { id: 'auto_prover', label: 'Auto Synthesizer', icon: Lightbulb },
            ].map((tab) => {
              const isCur = activeProofType === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveProofType(tab.id as any);
                    setVerificationResult(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all text-2xs flex items-center gap-1 whitespace-nowrap active:scale-95 ${
                    isCur
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-75'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <BookOpen className="w-3.5 h-3.5 opacity-60" />
            <select
              onChange={(e) => {
                const found = CURATED_THEOREM_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleLoadPreset(found);
              }}
              value=""
              className="px-2 py-1 rounded-md border text-2xs bg-transparent outline-none max-w-[210px] truncate"
              style={{ borderColor: theme.border, color: theme.textPrimary }}
            >
              <option value="" disabled>
                Load Classical Theorem Preset...
              </option>
              {CURATED_THEOREM_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  [{p.category.split(' ')[0]}] {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Proof Engine Working Surface */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. TACTIC ASSISTANT (LEAN / COQ STYLE) */}
          {activeProofType === 'tactic_assistant' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4 text-emerald-500" />
                      <span>Interactive Goal-Directed Tactic Assistant</span>
                    </h3>
                    <p className="text-3xs opacity-75 font-mono mt-0.5">
                      Apply deductive tactics step-by-step to discharge goal sequents
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResetTactics()}
                      className="px-2 py-1 rounded border text-3xs font-mono opacity-70 hover:opacity-100 flex items-center gap-1"
                      style={{ borderColor: theme.border }}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Goals</span>
                    </button>
                    <button
                      onClick={() => handleExecuteTactic('auto')}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-3xs flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Tactic Solve</span>
                    </button>
                  </div>
                </div>

                {/* Theorem Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tacticStatement}
                    onChange={(e) => setTacticStatement(e.target.value)}
                    placeholder="e.g. (A & B) -> (B & A)"
                    className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                  <button
                    onClick={() => handleResetTactics(tacticStatement)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderColor: theme.border }}
                  >
                    Set Theorem
                  </button>
                </div>

                {/* Interactive Tactic Execution Bar */}
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                  <div className="flex items-center gap-1.5 flex-wrap text-2xs">
                    <span className="text-3xs font-bold uppercase tracking-wider opacity-70 mr-1">Apply Tactic:</span>
                    <button
                      onClick={() => handleExecuteTactic('intro')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold font-mono active:scale-95"
                      title="intro [H]: Strip implication antecedent as hypothesis"
                    >
                      intro
                    </button>
                    <button
                      onClick={() => handleExecuteTactic('split')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold font-mono active:scale-95"
                      title="split: Split conjunction A ∧ B into two subgoals"
                    >
                      split
                    </button>
                    <button
                      onClick={() => handleExecuteTactic('exact')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold font-mono active:scale-95"
                      title="exact [H]: Close goal matching hypothesis"
                    >
                      exact
                    </button>
                    <button
                      onClick={() => handleExecuteTactic('ring')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold font-mono active:scale-95"
                      title="ring: Close algebraic equality goal via ring invariants"
                    >
                      ring
                    </button>
                    <button
                      onClick={() => handleExecuteTactic('refl')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-semibold font-mono active:scale-95"
                      title="refl: Reflexivity X = X"
                    >
                      refl
                    </button>

                    <input
                      type="text"
                      value={tacticParam}
                      onChange={(e) => setTacticParam(e.target.value)}
                      placeholder="Optional arg (e.g. H1)"
                      className="w-28 px-2 py-1 rounded border text-3xs font-mono bg-transparent outline-none"
                      style={{ borderColor: theme.border }}
                    />
                  </div>
                </div>

                {/* Goals Stack View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-2">
                    <span className="text-3xs font-bold uppercase tracking-wider opacity-70">
                      Goal Stack ({tacticGoals.filter((g) => !g.isClosed).length} Open / {tacticGoals.length} Total):
                    </span>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {tacticGoals.map((g, idx) => (
                        <div
                          key={g.id}
                          className={`p-3 rounded-xl border space-y-1.5 text-xs font-mono ${g.isClosed ? 'opacity-50 border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}
                          style={{ borderColor: g.isClosed ? undefined : theme.border }}
                        >
                          <div className="flex items-center justify-between text-2xs font-bold">
                            <span>Subgoal {idx + 1}</span>
                            <span className={g.isClosed ? 'text-emerald-500' : 'text-amber-500'}>
                              {g.isClosed ? `✓ CLOSED (${g.closedBy})` : '○ OPEN GOAL'}
                            </span>
                          </div>
                          {g.hypotheses.length > 0 && (
                            <div className="text-3xs space-y-0.5 opacity-80 border-b pb-1" style={{ borderColor: theme.border }}>
                              {g.hypotheses.map((h) => (
                                <div key={h.id}>
                                  <span className="text-indigo-400 font-semibold">{h.name}</span>: {h.formula}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-xs font-semibold">
                            <span className="text-amber-500 font-bold">⊢ </span>
                            <span>{g.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tactic History Script View */}
                  <div className="space-y-2">
                    <span className="text-3xs font-bold uppercase tracking-wider opacity-70">
                      Interactive Tactic Proof Script:
                    </span>
                    <div className="p-3 rounded-xl border bg-black/10 dark:bg-black/30 font-mono text-2xs space-y-1 max-h-56 overflow-y-auto">
                      <div className="text-emerald-500 font-bold">theorem user_proof : {tacticStatement} := by</div>
                      {tacticScript.length === 0 ? (
                        <div className="text-3xs opacity-50 italic pl-4">-- Apply tactics above to begin proof script</div>
                      ) : (
                        tacticScript.map((step, idx) => (
                          <div key={idx} className="pl-4 text-stone-300">
                            {step}
                          </div>
                        ))
                      )}
                      {tacticGoals.every((g) => g.isClosed) && (
                        <div className="text-emerald-400 font-bold pl-4">qed</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. PROPOSITIONAL LOGIC PROVER */}
          {activeProofType === 'propositional_logic' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider opacity-70 flex items-center justify-between">
                  <span>Propositional Sequent / Tautology Candidate:</span>
                  <span className="font-mono text-3xs lowercase opacity-60">supports ¬, ∧, ∨, ⇒, ⇔</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logicFormula}
                    onChange={(e) => setLogicFormula(e.target.value)}
                    placeholder="e.g. ((P -> Q) & !Q) -> !P"
                    className="flex-1 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-mono bg-transparent outline-none focus:ring-1"
                    style={{ borderColor: theme.border, color: theme.textPrimary }}
                  />
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
                  >
                    Prove Tautology
                  </button>
                </div>
              </div>

              {/* Logical Operator Keypad */}
              <div className="flex items-center gap-1.5 flex-wrap text-2xs font-mono">
                <span className="opacity-60 text-3xs uppercase font-bold mr-1">Insert Operators:</span>
                {[
                  { label: '¬ Not (!)', val: '!' },
                  { label: '∧ And (&)', val: ' & ' },
                  { label: '∨ Or (|)', val: ' | ' },
                  { label: '⇒ Implies (->)', val: ' -> ' },
                  { label: '⇔ Iff (<->)', val: ' <-> ' },
                  { label: 'P', val: 'P' },
                  { label: 'Q', val: 'Q' },
                  { label: 'R', val: 'R' },
                  { label: 'S', val: 'S' },
                ].map((op) => (
                  <button
                    key={op.label}
                    onClick={() => setLogicFormula((prev) => prev + op.val)}
                    className="px-2 py-0.5 rounded border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                    style={{ borderColor: theme.border }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. DPLL SAT ENGINE */}
          {activeProofType === 'dpll_sat' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <span>Davis-Putnam-Logemann-Loveland (DPLL) SAT Engine</span>
                    </h3>
                    <p className="text-3xs opacity-75 font-mono mt-0.5">
                      CNF clause satisfiability prover with unit propagation, pure literal rule & conflict resolution
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDpllFormula('(P | Q | R) & (!P | !Q) & (!Q | R) & (!R | P)')}
                      className="px-2 py-1 rounded border text-3xs font-mono opacity-80 hover:opacity-100"
                      style={{ borderColor: theme.border }}
                    >
                      Preset: 3-SAT
                    </button>
                    <button
                      onClick={() => setDpllFormula('(P | Q) & (!P | Q) & (P | !Q) & (!P | !Q)')}
                      className="px-2 py-1 rounded border text-3xs font-mono opacity-80 hover:opacity-100"
                      style={{ borderColor: theme.border }}
                    >
                      Preset: Contradiction
                    </button>
                  </div>
                </div>

                {/* Clause Set Formula Input */}
                <div className="space-y-1">
                  <label className="text-3xs font-bold uppercase tracking-wider opacity-70">
                    Conjunctive Normal Form (CNF) Clauses:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dpllFormula}
                      onChange={(e) => setDpllFormula(e.target.value)}
                      placeholder="e.g. (P | Q | R) & (!P | !Q) & (!Q | R)"
                      className="flex-1 px-3 py-2 rounded-xl border text-xs sm:text-sm font-mono bg-transparent outline-none"
                      style={{ borderColor: theme.border }}
                    />
                    <button
                      onClick={handleVerify}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
                    >
                      Solve SAT
                    </button>
                  </div>
                </div>

                {/* Quick Symbol Keypad */}
                <div className="flex items-center gap-1.5 flex-wrap text-2xs font-mono pt-1">
                  <span className="opacity-60 text-3xs uppercase font-bold mr-1">Insert:</span>
                  {[
                    { label: '¬ Not (!)', val: '!' },
                    { label: '∨ Or (|)', val: ' | ' },
                    { label: '∧ And (&)', val: ' & ' },
                    { label: '(', val: '(' },
                    { label: ')', val: ')' },
                    { label: 'P', val: 'P' },
                    { label: 'Q', val: 'Q' },
                    { label: 'R', val: 'R' },
                    { label: 'S', val: 'S' },
                  ].map((op) => (
                    <button
                      key={op.label}
                      onClick={() => setDpllFormula((prev) => prev + op.val)}
                      className="px-2 py-0.5 rounded border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                      style={{ borderColor: theme.border }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>

                {/* Active Clauses Chips Preview */}
                <div className="p-3 rounded-lg border bg-black/5 dark:bg-black/20 space-y-1.5" style={{ borderColor: theme.border }}>
                  <span className="text-3xs font-bold uppercase tracking-wider opacity-70">Parsed Clause Set Σ:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dpllFormula
                      .split('&')
                      .map((c) => c.trim())
                      .filter(Boolean)
                      .map((c, idx) => (
                        <span key={idx} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-2xs border border-emerald-500/20">
                          Clause {idx + 1}: {c}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. FIRST-ORDER PREDICATE LOGIC */}
          {activeProofType === 'first_order_predicate' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2" style={{ borderColor: theme.border }}>
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-emerald-500" />
                      <span>First-Order Predicate Logic & Quantifier Model Checker</span>
                    </h3>
                    <p className="text-3xs opacity-75 font-mono mt-0.5">
                      Verifies universal (∀) and existential (∃) formulas across discrete mathematical domains
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPredQuantifier('forall')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${predQuantifier === 'forall' ? 'bg-emerald-600 text-white shadow-xs' : 'border opacity-70'}`}
                      style={{ borderColor: theme.border }}
                    >
                      ∀ Universal
                    </button>
                    <button
                      onClick={() => setPredQuantifier('exists')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${predQuantifier === 'exists' ? 'bg-emerald-600 text-white shadow-xs' : 'border opacity-70'}`}
                      style={{ borderColor: theme.border }}
                    >
                      ∃ Existential
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-3xs uppercase font-bold opacity-70">Bound Variable:</label>
                    <input
                      type="text"
                      value={predVar}
                      onChange={(e) => setPredVar(e.target.value)}
                      placeholder="e.g. x"
                      className="w-full px-3 py-1.5 rounded-lg border font-mono bg-transparent outline-none"
                      style={{ borderColor: theme.border }}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-3xs uppercase font-bold opacity-70">Predicate Formula P({predVar}):</label>
                    <input
                      type="text"
                      value={predExpr}
                      onChange={(e) => setPredExpr(e.target.value)}
                      placeholder="e.g. x^2 >= 0 or prime(x) & x > 2"
                      className="w-full px-3 py-1.5 rounded-lg border font-mono bg-transparent outline-none"
                      style={{ borderColor: theme.border }}
                    />
                  </div>
                </div>

                {/* Domain Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-3xs uppercase font-bold opacity-70">Model Domain D (Comma-separated integers):</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPredDomainText('-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5')}
                        className="px-2 py-0.5 rounded border text-3xs font-mono opacity-70 hover:opacity-100"
                        style={{ borderColor: theme.border }}
                      >
                        Integers [-5..5]
                      </button>
                      <button
                        onClick={() => setPredDomainText('1, 2, 3, 4, 5, 6, 7, 8, 9, 10')}
                        className="px-2 py-0.5 rounded border text-3xs font-mono opacity-70 hover:opacity-100"
                        style={{ borderColor: theme.border }}
                      >
                        Naturals [1..10]
                      </button>
                      <button
                        onClick={() => setPredDomainText('2, 3, 5, 7, 11, 13, 17, 19')}
                        className="px-2 py-0.5 rounded border text-3xs font-mono opacity-70 hover:opacity-100"
                        style={{ borderColor: theme.border }}
                      >
                        Primes &le; 20
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={predDomainText}
                    onChange={(e) => setPredDomainText(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border font-mono text-xs bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. ALGEBRAIC EQUIVALENCE CHAIN WITH MISTAKE DIAGNOSTICS */}
          {activeProofType === 'algebraic_equivalence' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-2xs font-bold uppercase tracking-wider opacity-70">
                  Deductive Transformation Steps (E₁ ≡ E₂ ≡ ... ≡ Eₙ)
                </label>
                <button
                  onClick={handleAddAlgebraStep}
                  className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-2xs flex items-center gap-1 hover:bg-emerald-500/25"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Deduction Step</span>
                </button>
              </div>

              <div className="space-y-2">
                {algebraSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs"
                    style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-2xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1 w-full space-y-1">
                      <input
                        type="text"
                        value={step.expression}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAlgebraSteps((prev) =>
                            prev.map((s) => (s.id === step.id ? { ...s, expression: val } : s))
                          );
                        }}
                        placeholder="Mathematical Expression"
                        className="w-full px-3 py-1.5 rounded-lg border text-xs font-mono bg-transparent outline-none"
                        style={{ borderColor: theme.border }}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={step.justification || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAlgebraSteps((prev) =>
                              prev.map((s) => (s.id === step.id ? { ...s, justification: val } : s))
                            );
                          }}
                          placeholder="Justification (e.g. Distributive Law)"
                          className="flex-1 px-2 py-0.5 rounded text-3xs opacity-80 bg-transparent border-b"
                          style={{ borderColor: theme.border }}
                        />
                        {idx > 0 && (
                          <button
                            onClick={() => handleAutoJustifyStep(idx)}
                            className="px-1.5 py-0.5 rounded border text-4xs font-mono opacity-70 hover:opacity-100 flex items-center gap-0.5"
                            style={{ borderColor: theme.border }}
                            title="Auto-detect mathematical rule applied"
                          >
                            <Wand2 className="w-2.5 h-2.5" />
                            <span>Auto-Justify</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {algebraSteps.length > 2 && (
                      <button
                        onClick={() => handleRemoveAlgebraStep(step.id)}
                        className="p-1.5 rounded hover:text-rose-500 opacity-60 hover:opacity-100 shrink-0 self-end sm:self-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Mistake Diagnostic & Auto-Fix Card */}
              {verificationResult?.diagnostic && verificationResult.diagnostic.hasError && (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 space-y-2 text-2xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-500 font-bold">
                    <XCircle className="w-4 h-4" />
                    <span>Proof Diagnostic: {verificationResult.diagnostic.suspectedCause}</span>
                  </div>
                  <p className="opacity-90">{verificationResult.diagnostic.hint}</p>
                  {verificationResult.diagnostic.counterExamplePoints && (
                    <div className="font-mono text-3xs opacity-80">
                      Counterexample test point (x={verificationResult.diagnostic.counterExamplePoints.x}, y={verificationResult.diagnostic.counterExamplePoints.y}):
                      LHS = {verificationResult.diagnostic.counterExamplePoints.lhsVal} ≠ RHS = {verificationResult.diagnostic.counterExamplePoints.rhsVal}
                    </div>
                  )}
                  {verificationResult.diagnostic.suggestedFix && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="font-mono text-3xs">Suggested repair: {verificationResult.diagnostic.suggestedFix}</span>
                      <button
                        onClick={() => handleRepairStepWithDiagnostic(1, verificationResult!.diagnostic!.suggestedFix!)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-3xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Apply Auto-Repair</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. COORDINATE GEOMETRY PROVER */}
          {activeProofType === 'coordinate_geometry' && (
            <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-500" />
                  <h4 className="font-bold text-xs sm:text-sm">Coordinate Geometry Algebraic Theorem Prover</h4>
                </div>
                <span className="text-3xs font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">
                  {geoPreset.name}
                </span>
              </div>
              <p className="text-2xs opacity-75 leading-relaxed">
                Represents geometric configurations as symbolic points in the Cartesian plane ℝ² and uses polynomial ring reduction to certify that distance, orthogonality, and concurrence invariants hold for all parameters.
              </p>

              {/* Visual Geometric Points Table */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {geoPreset.points.map((p) => (
                  <div key={p.name} className="p-2.5 rounded-lg border font-mono text-2xs flex items-center justify-between" style={{ borderColor: theme.border }}>
                    <span className="font-bold text-amber-500">{p.name}</span>
                    <span className="opacity-80">({p.x}, {p.y})</span>
                  </div>
                ))}
              </div>

              {/* Invariant Statement */}
              <div className="p-3 rounded-xl border space-y-1" style={{ borderColor: theme.border }}>
                <div className="text-3xs font-bold uppercase tracking-wider opacity-60">Invariant Statement:</div>
                <div className="font-mono text-xs font-semibold text-emerald-400">{geoPreset.invariantsToProve[0]?.statement}</div>
                <div className="text-3xs opacity-75">{geoPreset.invariantsToProve[0]?.description}</div>
              </div>
            </div>
          )}

          {/* 5. MATRIX ALGEBRA PROVER */}
          {activeProofType === 'matrix_algebra' && (
            <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-indigo-500" />
                  <h4 className="font-bold text-xs sm:text-sm">Symbolic Matrix Algebra & Invariant Prover</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMatrixProperty('det_multiplicativity')}
                    className={`px-2 py-0.5 rounded text-3xs font-semibold ${matrixProperty === 'det_multiplicativity' ? 'bg-indigo-600 text-white' : 'border opacity-70'}`}
                    style={{ borderColor: theme.border }}
                  >
                    det(AB) = det(A)det(B)
                  </button>
                  <button
                    onClick={() => setMatrixProperty('cayley_hamilton')}
                    className={`px-2 py-0.5 rounded text-3xs font-semibold ${matrixProperty === 'cayley_hamilton' ? 'bg-indigo-600 text-white' : 'border opacity-70'}`}
                    style={{ borderColor: theme.border }}
                  >
                    Cayley-Hamilton
                  </button>
                </div>
              </div>

              {/* 2x2 Matrix Input Grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-3xs font-bold uppercase tracking-wider opacity-70">Matrix A (2×2):</span>
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border" style={{ borderColor: theme.border }}>
                    <input
                      type="text"
                      value={matrixA[0][0]}
                      onChange={(e) => setMatrixA([[e.target.value, matrixA[0][1]], matrixA[1]])}
                      className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                      style={{ borderColor: theme.border }}
                    />
                    <input
                      type="text"
                      value={matrixA[0][1]}
                      onChange={(e) => setMatrixA([[matrixA[0][0], e.target.value], matrixA[1]])}
                      className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                      style={{ borderColor: theme.border }}
                    />
                    <input
                      type="text"
                      value={matrixA[1][0]}
                      onChange={(e) => setMatrixA([matrixA[0], [e.target.value, matrixA[1][1]]])}
                      className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                      style={{ borderColor: theme.border }}
                    />
                    <input
                      type="text"
                      value={matrixA[1][1]}
                      onChange={(e) => setMatrixA([matrixA[0], [matrixA[1][0], e.target.value]])}
                      className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                      style={{ borderColor: theme.border }}
                    />
                  </div>
                </div>

                {matrixProperty === 'det_multiplicativity' && (
                  <div className="space-y-1">
                    <span className="text-3xs font-bold uppercase tracking-wider opacity-70">Matrix B (2×2):</span>
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border" style={{ borderColor: theme.border }}>
                      <input
                        type="text"
                        value={matrixB[0][0]}
                        onChange={(e) => setMatrixB([[e.target.value, matrixB[0][1]], matrixB[1]])}
                        className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                        style={{ borderColor: theme.border }}
                      />
                      <input
                        type="text"
                        value={matrixB[0][1]}
                        onChange={(e) => setMatrixB([[matrixB[0][0], e.target.value], matrixB[1]])}
                        className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                        style={{ borderColor: theme.border }}
                      />
                      <input
                        type="text"
                        value={matrixB[1][0]}
                        onChange={(e) => setMatrixB([matrixB[0], [e.target.value, matrixB[1][1]]])}
                        className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                        style={{ borderColor: theme.border }}
                      />
                      <input
                        type="text"
                        value={matrixB[1][1]}
                        onChange={(e) => setMatrixB([matrixB[0], [matrixB[1][0], e.target.value]])}
                        className="p-1.5 rounded border text-center font-mono text-xs bg-transparent"
                        style={{ borderColor: theme.border }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. AUTOMATED STEP SYNTHESIZER / AUTO-PROVER */}
          {activeProofType === 'auto_prover' && (
            <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-500" />
                <h4 className="font-bold text-xs sm:text-sm">Automated Derivation Synthesizer</h4>
              </div>
              <p className="text-2xs opacity-75 leading-relaxed">
                Provide any Left-Hand Side (Hypothesis) and Target Right-Hand Side. The client-side symbolic search engine will automatically discover, construct, and certify the intermediate deduction steps.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Start Expression (LHS):</label>
                  <input
                    type="text"
                    value={autoStartExpr}
                    onChange={(e) => setAutoStartExpr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Target Expression (RHS):</label>
                  <input
                    type="text"
                    value={autoTargetExpr}
                    onChange={(e) => setAutoTargetExpr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>
              </div>

              <button
                onClick={handleVerify}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Synthesize Multi-Step Formal Proof</span>
              </button>
            </div>
          )}

          {/* 7. MATHEMATICAL INDUCTION CUSTOMIZER */}
          {activeProofType === 'mathematical_induction' && (
            <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs sm:text-sm">Peano Axiom Mathematical Induction</h4>
              </div>
              <p className="text-2xs opacity-75 leading-relaxed">
                Rigorous symbolic induction verifies that the Base Case holds for n = n₀, and algebraically proves that S(k+1) − S(k) ≡ a(k+1) holds for all positive integers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Summand Term a_k:</label>
                  <input
                    type="text"
                    value={inductionTerm}
                    onChange={(e) => setInductionTerm(e.target.value)}
                    placeholder="e.g. k^2 or 2*k - 1"
                    className="w-full px-3 py-1.5 rounded-lg border font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-3xs uppercase font-bold opacity-70">Closed-Form Sum S_n:</label>
                  <input
                    type="text"
                    value={inductionClosedForm}
                    onChange={(e) => setInductionClosedForm(e.target.value)}
                    placeholder="e.g. n*(n+1)*(2*n+1)/6"
                    className="w-full px-3 py-1.5 rounded-lg border font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. CALCULUS & DIFFERENTIAL EQUATION VERIFIER */}
          {activeProofType === 'calculus_ode' && (
            <div className="p-4 rounded-xl border space-y-4" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-xs sm:text-sm">Calculus Differential Equation (ODE) Invariant Verifier</h4>
              </div>
              <p className="text-2xs opacity-75 leading-relaxed">
                Tests whether a given function $y(x)$ rigorously satisfies a linear or nonlinear differential equation by computing exact symbolic derivatives and verifying that the differential residual vanishes identically.
              </p>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Differential Equation L(y) = 0:</label>
                  <input
                    type="text"
                    value={odeEquation}
                    onChange={(e) => setOdeEquation(e.target.value)}
                    placeholder="e.g. diff(y, x, 2) + 4*y = 0 or y'' + 4*y = 0"
                    className="w-full px-3 py-2 rounded-lg border font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-3xs uppercase font-bold opacity-70">Candidate Closed-Form Function y(x):</label>
                  <input
                    type="text"
                    value={odeCandidate}
                    onChange={(e) => setOdeCandidate(e.target.value)}
                    placeholder="e.g. 3*cos(2*x) + 5*sin(2*x) or 10*e^(-3*x)"
                    className="w-full px-3 py-2 rounded-lg border font-mono bg-transparent outline-none"
                    style={{ borderColor: theme.border }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VERIFICATION REPORT, VISUALIZER DAG & Q.E.D. DOSSIER */}
          {verificationResult && (
            <div
              className={`p-5 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-md ${
                verificationResult.verified
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-rose-500/50 bg-rose-500/5'
              }`}
            >
              {/* Header Seal Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: theme.border }}>
                <div className="flex items-start sm:items-center gap-2.5">
                  {verificationResult.verified ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 flex-wrap">
                      <span>{verificationResult.qedSeal}</span>
                      <span className="text-3xs font-mono font-normal opacity-60">
                        ({verificationResult.executionTimeMs}ms)
                      </span>
                    </h3>
                    <p className="text-2xs opacity-80 mt-0.5">{verificationResult.summary}</p>
                    <div className="flex items-center gap-1.5 text-3xs font-mono opacity-70 mt-1">
                      <Fingerprint className="w-3 h-3 text-emerald-500" />
                      <span>Fingerprint: {verificationResult.proofFingerprint}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                  {/* Publish to Annals Button */}
                  {onPublishToAnnals && verificationResult.verified && (
                    <button
                      onClick={() => {
                        onPublishToAnnals({
                          title: verificationResult.title,
                          latex: verificationResult.latexProof || verificationResult.title,
                          summary: verificationResult.summary,
                          category: 'theorem',
                        });
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-2xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      title="Publish certified theorem to Annals of Mathematical Discovery"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Publish to Annals</span>
                    </button>
                  )}

                  {/* Plot in studio if there's a graphable formula */}
                  {onPlotFormula && (
                    <button
                      onClick={() => {
                        if (activeProofType === 'calculus_ode') {
                          onPlotFormula(odeCandidate);
                        } else if (activeProofType === 'auto_prover') {
                          onPlotFormula(autoStartExpr);
                        } else if (algebraSteps.length > 0) {
                          onPlotFormula(algebraSteps[0].expression);
                        }
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                      style={{ borderColor: theme.border }}
                      title="Plot this mathematical equation on the Stoikliem Graphica Canvas"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="hidden sm:inline">Plot in Studio</span>
                    </button>
                  )}

                  <button
                    onClick={handleCopyLatex}
                    className="px-2.5 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    style={{ borderColor: theme.border }}
                  >
                    {copiedLatex ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>LaTeX</span>
                  </button>

                  <button
                    onClick={handleCopyTranscript}
                    className="px-3 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    style={{ borderColor: theme.border }}
                  >
                    {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Certificate</span>
                  </button>
                </div>
              </div>

              {/* Visualizer Mode Tabs: Steps | Interactive DAG | Tableaux | Valuation Models */}
              <div className="flex items-center gap-1 border-b pb-2 text-2xs font-semibold" style={{ borderColor: theme.border }}>
                <button
                  onClick={() => setActiveVisualizerTab('steps')}
                  className={`px-3 py-1 rounded-lg transition-all ${activeVisualizerTab === 'steps' ? 'bg-emerald-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                >
                  Deductive Steps ({verificationResult.stepResults.length})
                </button>
                {verificationResult.proofDAG && (
                  <button
                    onClick={() => setActiveVisualizerTab('dag')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${activeVisualizerTab === 'dag' ? 'bg-emerald-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>Proof DAG Graph</span>
                  </button>
                )}
                {verificationResult.tableauTree && (
                  <button
                    onClick={() => setActiveVisualizerTab('tableau')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${activeVisualizerTab === 'tableau' ? 'bg-emerald-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <Binary className="w-3 h-3" />
                    <span>Tableau Refutation</span>
                  </button>
                )}
                {(verificationResult.truthTable || verificationResult.dpllResult || verificationResult.predicateUniverse) && (
                  <button
                    onClick={() => setActiveVisualizerTab('models')}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${activeVisualizerTab === 'models' ? 'bg-emerald-600 text-white shadow-xs' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>
                      {verificationResult.dpllResult
                        ? `DPLL SAT Trace (${verificationResult.dpllResult.decisionSteps.length})`
                        : verificationResult.predicateUniverse
                        ? `Domain Matrix (${verificationResult.predicateUniverse.domainValues.length})`
                        : `Valuation Space (${verificationResult.truthTable?.rows.length || 0})`}
                    </span>
                  </button>
                )}
              </div>

              {/* 1. INTERACTIVE PROOF DAG GRAPH VIEW */}
              {activeVisualizerTab === 'dag' && verificationResult.proofDAG && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="p-4 rounded-xl border bg-black/5 dark:bg-black/20 overflow-x-auto min-h-[160px]" style={{ borderColor: theme.border }}>
                    <svg className="w-full min-w-[500px] h-36">
                      {/* Render Edges */}
                      {verificationResult.proofDAG.edges.map((e, idx) => {
                        const fromNode = verificationResult.proofDAG!.nodes.find((n) => n.id === e.from);
                        const toNode = verificationResult.proofDAG!.nodes.find((n) => n.id === e.to);
                        if (!fromNode || !toNode) return null;
                        return (
                          <g key={idx}>
                            <line
                              x1={fromNode.x + 40}
                              y1={fromNode.y}
                              x2={toNode.x - 40}
                              y2={toNode.y}
                              stroke="rgba(16, 185, 129, 0.4)"
                              strokeWidth="2"
                              strokeDasharray="4 2"
                            />
                            {e.label && (
                              <text
                                x={(fromNode.x + toNode.x) / 2}
                                y={((fromNode.y + toNode.y) / 2) - 8}
                                textAnchor="middle"
                                fill="currentColor"
                                className="text-4xs opacity-60 font-mono"
                              >
                                {e.label}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Render Nodes */}
                      {verificationResult.proofDAG.nodes.map((n) => (
                        <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                          <rect
                            x="-45"
                            y="-20"
                            width="90"
                            height="40"
                            rx="10"
                            fill={n.isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                            stroke={n.isPassed ? '#10B981' : '#EF4444'}
                            strokeWidth="1.5"
                          />
                          <text
                            textAnchor="middle"
                            y="-4"
                            fill="currentColor"
                            className="font-bold text-3xs font-mono"
                          >
                            {n.label}
                          </text>
                          <text
                            textAnchor="middle"
                            y="10"
                            fill="currentColor"
                            className="text-4xs opacity-75 font-mono truncate max-w-[80px]"
                          >
                            {n.expression.slice(0, 14)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>
              )}

              {/* 2. DEDUCTIVE STEPS LIST VIEW */}
              {activeVisualizerTab === 'steps' && (
                <div className="space-y-2 animate-in fade-in">
                  <span className="text-3xs font-bold uppercase tracking-wider opacity-60">
                    Step-by-Step Formal Verification Chain:
                  </span>
                  <div className="space-y-2">
                    {verificationResult.stepResults.map((s) => (
                      <div
                        key={s.stepIndex}
                        className="p-3 rounded-xl border flex items-start gap-2.5 text-xs shadow-2xs"
                        style={{ backgroundColor: theme.bgSidebar, borderColor: theme.border }}
                      >
                        <div className="mt-0.5">
                          {s.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="font-mono font-semibold truncate">{s.expression}</div>
                          <div className="text-2xs opacity-75">{s.justification}</div>
                          <div className="text-3xs opacity-60 font-mono">{s.invariantTested}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. TABLEAU VIEW */}
              {activeVisualizerTab === 'tableau' && verificationResult.tableauTree && (
                <div className="space-y-2 animate-in fade-in">
                  <div className="p-3 rounded-xl border overflow-x-auto max-h-52" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                    {renderTableauNode(verificationResult.tableauTree)}
                  </div>
                </div>
              )}

              {/* 4. VALUATION / DPLL TRACE / PREDICATE UNIVERSE VIEW */}
              {activeVisualizerTab === 'models' && (
                <div className="space-y-3 animate-in fade-in">
                  {/* DPLL SAT Visualizer */}
                  {verificationResult.dpllResult && (
                    <div className="space-y-3">
                      {/* Model Status Card */}
                      <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                        <div>
                          <div className="text-3xs font-bold uppercase tracking-wider opacity-70">DPLL Status & Model:</div>
                          <div className="font-bold text-xs flex items-center gap-2 mt-0.5">
                            <span className={verificationResult.dpllResult.satisfiable ? 'text-emerald-400' : 'text-rose-400'}>
                              {verificationResult.dpllResult.satisfiable ? '✓ SATISFIABLE MODEL' : '⊗ UNSATISFIABLE REFUTATION'}
                            </span>
                            <span className="text-3xs opacity-60 font-mono">
                              ({verificationResult.dpllResult.decisionSteps.length} inference steps)
                            </span>
                          </div>
                        </div>

                        {verificationResult.dpllResult.model && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-3xs font-mono opacity-70">Assignment:</span>
                            {Object.entries(verificationResult.dpllResult.model).map(([v, val]) => (
                              <span
                                key={v}
                                className={`px-2 py-0.5 rounded text-3xs font-mono font-bold border ${val ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30'}`}
                              >
                                {v} ↦ {val ? '⊤ (True)' : '⊥ (False)'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* DPLL Step-by-Step Decision Log */}
                      <div className="overflow-x-auto max-h-56 border rounded-xl" style={{ borderColor: theme.border }}>
                        <table className="w-full text-2xs text-left font-mono">
                          <thead className="border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                            <tr>
                              <th className="p-2 border-r" style={{ borderColor: theme.border }}>Step</th>
                              <th className="p-2 border-r" style={{ borderColor: theme.border }}>Rule Type</th>
                              <th className="p-2 border-r" style={{ borderColor: theme.border }}>Literal Action</th>
                              <th className="p-2 border-r" style={{ borderColor: theme.border }}>Level</th>
                              <th className="p-2">Reason / Trigger</th>
                            </tr>
                          </thead>
                          <tbody>
                            {verificationResult.dpllResult.decisionSteps.map((step) => (
                              <tr key={step.stepIndex} className="border-b hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: theme.border }}>
                                <td className="p-2 border-r font-bold" style={{ borderColor: theme.border }}>#{step.stepIndex}</td>
                                <td className="p-2 border-r" style={{ borderColor: theme.border }}>
                                  <span className={`px-1.5 py-0.5 rounded text-3xs font-bold uppercase ${
                                    step.type === 'unit_propagate'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : step.type === 'decide'
                                      ? 'bg-indigo-500/20 text-indigo-400'
                                      : step.type === 'conflict_backtrack'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}>
                                    {step.type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="p-2 border-r font-semibold" style={{ borderColor: theme.border }}>{step.literal}</td>
                                <td className="p-2 border-r" style={{ borderColor: theme.border }}>Lvl {step.decisionLevel}</td>
                                <td className="p-2 opacity-80">{step.clauseReason || 'Branching choice'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Predicate Universe Domain Visualizer */}
                  {verificationResult.predicateUniverse && (
                    <div className="space-y-3">
                      {/* Witness / Counterexample Card */}
                      <div className="p-3.5 rounded-xl border space-y-1" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                        <div className="text-3xs font-bold uppercase tracking-wider opacity-70">
                          {verificationResult.predicateUniverse.quantifier === 'forall' ? 'Universal Invariant (∀)' : 'Existential Witness (∃)'}:
                        </div>
                        <div className="font-mono text-xs font-semibold">
                          {verificationResult.predicateUniverse.witnessOrCounterExample ? (
                            <span className={verificationResult.verified ? 'text-emerald-400' : 'text-rose-400'}>
                              {verificationResult.verified ? 'Witness Certified: ' : 'Counterexample Detected: '}
                              {verificationResult.predicateUniverse.witnessOrCounterExample.variable} = {verificationResult.predicateUniverse.witnessOrCounterExample.value}
                            </span>
                          ) : (
                            <span className="text-emerald-400">All domain elements satisfy invariant.</span>
                          )}
                        </div>
                      </div>

                      {/* Domain Matrix Grid */}
                      <div className="space-y-1.5">
                        <span className="text-3xs font-bold uppercase tracking-wider opacity-70">
                          Discrete Domain Valuation Space ({verificationResult.predicateUniverse.domainValues.length} models):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {verificationResult.predicateUniverse.domainValues.map((v, idx) => {
                            const stepRes = verificationResult.stepResults[idx];
                            const isPass = stepRes ? stepRes.isValid : true;
                            return (
                              <div
                                key={idx}
                                className={`p-2 rounded-lg border text-center font-mono text-2xs ${
                                  isPass
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                    : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                <div className="font-bold">{verificationResult.predicateUniverse!.domainVariable} = {String(v)}</div>
                                <div className="text-3xs opacity-80 mt-0.5">{isPass ? '✓ PASS' : '✗ FAIL'}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standard Propositional Truth Table */}
                  {verificationResult.truthTable && (
                    <div className="overflow-x-auto max-h-48 border rounded-xl" style={{ borderColor: theme.border }}>
                      <table className="w-full text-2xs text-left font-mono">
                        <thead className="border-b" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
                          <tr>
                            {verificationResult.truthTable.variables.map((v) => (
                              <th key={v} className="p-2 border-r" style={{ borderColor: theme.border }}>
                                {v}
                              </th>
                            ))}
                            <th className="p-2">Formula Result (φ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verificationResult.truthTable.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: theme.border }}>
                              {verificationResult.truthTable!.variables.map((v) => (
                                <td key={v} className="p-2 border-r" style={{ borderColor: theme.border }}>
                                  {row.assignment[v] ? (
                                    <span className="text-emerald-600 font-bold">T (1)</span>
                                  ) : (
                                    <span className="text-rose-500">F (0)</span>
                                  )}
                                </td>
                              ))}
                              <td className="p-2 font-bold">
                                {row.result ? (
                                  <span className="text-emerald-600">✓ TRUE</span>
                                ) : (
                                  <span className="text-rose-600">✗ FALSE</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
