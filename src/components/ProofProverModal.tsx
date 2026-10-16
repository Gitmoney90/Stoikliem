import React, { useState, useMemo } from 'react';
import {
  ProofType,
  ProofStep,
  VerificationResult,
  verifyPropositionalTheorem,
  verifyAlgebraicProof,
  verifyMathematicalInduction,
  CURATED_THEOREM_PRESETS,
  CuratedTheoremPreset,
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
  ArrowRight,
  Clock,
  Award,
} from 'lucide-react';

interface ProofProverModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  onShowToast: (msg: string) => void;
  initialTheoremFormula?: string;
}

export const ProofProverModal: React.FC<ProofProverModalProps> = ({
  isOpen,
  onClose,
  theme,
  onShowToast,
  initialTheoremFormula,
}) => {
  const [activeProofType, setActiveProofType] = useState<ProofType>('propositional_logic');

  // Propositional Logic State
  const [logicFormula, setLogicFormula] = useState<string>(
    initialTheoremFormula || '((P -> Q) & !Q) -> !P'
  );

  // Algebraic Equivalence Chain State
  const [algebraSteps, setAlgebraSteps] = useState<ProofStep[]>([
    { id: '1', expression: '(x + y)^2', justification: 'Given binomial expansion problem' },
    { id: '2', expression: '(x + y)*(x + y)', justification: 'Definition of exponentiation' },
    { id: '3', expression: 'x^2 + x*y + y*x + y^2', justification: 'Distributive FOIL property' },
    { id: '4', expression: 'x^2 + 2*x*y + y^2', justification: 'Commutative addition of like terms x*y' },
  ]);

  // Induction Preset State
  const [selectedInductionPreset, setSelectedInductionPreset] = useState<string>('th_gauss_summation');

  // Verification Result State
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      let res: VerificationResult;
      if (activeProofType === 'propositional_logic') {
        res = verifyPropositionalTheorem(logicFormula);
      } else if (activeProofType === 'algebraic_equivalence') {
        res = verifyAlgebraicProof(algebraSteps);
      } else {
        const preset = CURATED_THEOREM_PRESETS.find((p) => p.id === selectedInductionPreset);
        if (preset && preset.proofType === 'mathematical_induction') {
          res = verifyMathematicalInduction(preset.inputData);
        } else {
          res = verifyMathematicalInduction(CURATED_THEOREM_PRESETS[5].inputData);
        }
      }
      setVerificationResult(res);
      setIsVerifying(false);
      onShowToast(
        res.verified
          ? `Theorem Certified: ${res.qedSeal}`
          : 'Verification completed: Deductive flaw detected.'
      );
    }, 50);
  };

  const handleLoadPreset = (preset: CuratedTheoremPreset) => {
    setActiveProofType(preset.proofType);
    if (preset.proofType === 'propositional_logic') {
      setLogicFormula(preset.inputData);
    } else if (preset.proofType === 'algebraic_equivalence') {
      setAlgebraSteps(preset.inputData);
    } else {
      setSelectedInductionPreset(preset.id);
    }
    setVerificationResult(null);
  };

  const handleAddAlgebraStep = () => {
    const nextIdx = algebraSteps.length + 1;
    setAlgebraSteps((prev) => [
      ...prev,
      {
        id: `step_${Date.now()}`,
        expression: prev[prev.length - 1]?.expression || 'x',
        justification: `Deduction step ${nextIdx}`,
      },
    ]);
  };

  const handleRemoveAlgebraStep = (id: string) => {
    if (algebraSteps.length <= 2) {
      onShowToast('A proof chain requires at least 2 steps');
      return;
    }
    setAlgebraSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleCopyTranscript = () => {
    if (!verificationResult) return;
    const transcript = [
      `=== STOIKLIEM PROOF VERIFICATION CERTIFICATE ===`,
      `Theorem: ${verificationResult.title}`,
      `Type: ${verificationResult.proofType.replace('_', ' ').toUpperCase()}`,
      `Status: ${verificationResult.verified ? 'CERTIFIED Q.E.D.' : 'FALSIFIED'}`,
      `Execution Time: ${verificationResult.executionTimeMs}ms (Client-Side, Zero-API)`,
      `Summary: ${verificationResult.summary}`,
      `Seal: ${verificationResult.qedSeal}`,
      `Steps Verified:`,
      ...verificationResult.stepResults.map(
        (s) => `  [${s.isValid ? 'VALID' : 'INVALID'}] Step ${s.stepIndex}: ${s.expression} (${s.justification})`
      ),
    ].join('\n');

    navigator.clipboard.writeText(transcript);
    setCopiedTranscript(true);
    onShowToast('Proof certificate copied to clipboard');
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: theme.bgSidebar,
          borderColor: theme.border,
          color: theme.textPrimary,
        }}
      >
        {/* Header Bar */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="font-bold text-sm sm:text-base tracking-tight" style={{ fontFamily: '"Cinzel", serif' }}>
                Automated Proof Prover & Theorem Verifier
              </h2>
              <p className="text-3xs opacity-70 font-mono">
                100% Client-Side Deterministic Prover · Zero External APIs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isVerifying ? 'Verifying...' : 'Run Automated Proof'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Proof Mode Segmented Switcher & Preset Selector */}
        <div
          className="px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs"
          style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}
        >
          {/* Mode Switcher */}
          <div className="flex items-center gap-1">
            {[
              { id: 'propositional_logic', label: 'Propositional Logic' },
              { id: 'algebraic_equivalence', label: 'Algebraic Identity Chain' },
              { id: 'mathematical_induction', label: 'Mathematical Induction' },
            ].map((tab) => {
              const isCur = activeProofType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveProofType(tab.id as any);
                    setVerificationResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    isCur
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-75'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Selector */}
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 opacity-60" />
            <select
              onChange={(e) => {
                const found = CURATED_THEOREM_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleLoadPreset(found);
              }}
              value=""
              className="px-2 py-1 rounded-md border text-2xs bg-transparent outline-none"
              style={{ borderColor: theme.border, color: theme.textPrimary }}
            >
              <option value="" disabled>
                Load Classical Theorem Preset...
              </option>
              {CURATED_THEOREM_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Proof Input Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. PROPOSITIONAL LOGIC PROVER */}
          {activeProofType === 'propositional_logic' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider opacity-70">
                  Propositional Theorem Statement (Sequent / Tautology Candidate)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logicFormula}
                    onChange={(e) => setLogicFormula(e.target.value)}
                    placeholder="e.g. ((P -> Q) & !Q) -> !P"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm font-mono bg-transparent outline-none focus:ring-1"
                    style={{ borderColor: theme.border, color: theme.textPrimary }}
                  />
                  <button
                    onClick={handleVerify}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Prove
                  </button>
                </div>
              </div>

              {/* Logical Symbols Helper Keys */}
              <div className="flex items-center gap-1.5 flex-wrap text-2xs font-mono">
                <span className="opacity-60 text-3xs uppercase font-bold mr-1">Insert Operators:</span>
                {[
                  { label: '¬ (Not)', val: '!' },
                  { label: '∧ (And)', val: ' & ' },
                  { label: '∨ (Or)', val: ' | ' },
                  { label: '⇒ (Implies)', val: ' -> ' },
                  { label: '⇔ (Iff)', val: ' <-> ' },
                  { label: 'P', val: 'P' },
                  { label: 'Q', val: 'Q' },
                  { label: 'R', val: 'R' },
                ].map((op) => (
                  <button
                    key={op.label}
                    onClick={() => setLogicFormula((prev) => prev + op.val)}
                    className="px-2 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/5 active:scale-95"
                    style={{ borderColor: theme.border }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. ALGEBRAIC EQUIVALENCE CHAIN */}
          {activeProofType === 'algebraic_equivalence' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-2xs font-bold uppercase tracking-wider opacity-70">
                  Deductive Algebraic Transformation Chain (E₁ ≡ E₂ ≡ ... ≡ Eₙ)
                </label>
                <button
                  onClick={handleAddAlgebraStep}
                  className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-2xs flex items-center gap-1 hover:bg-emerald-500/25"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Deduction Step</span>
                </button>
              </div>

              <div className="space-y-2.5">
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
                        placeholder="Expression (e.g. x^2 - y^2)"
                        className="w-full px-3 py-1.5 rounded-lg border text-xs font-mono bg-transparent outline-none"
                        style={{ borderColor: theme.border }}
                      />
                      <input
                        type="text"
                        value={step.justification || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAlgebraSteps((prev) =>
                            prev.map((s) => (s.id === step.id ? { ...s, justification: val } : s))
                          );
                        }}
                        placeholder="Mathematical Axiom / Rule (e.g. Distributive Law)"
                        className="w-full px-2 py-0.5 rounded text-3xs opacity-80 bg-transparent border-b"
                        style={{ borderColor: theme.border }}
                      />
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
            </div>
          )}

          {/* 3. MATHEMATICAL INDUCTION */}
          {activeProofType === 'mathematical_induction' && (
            <div className="p-4 rounded-xl border space-y-3" style={{ backgroundColor: theme.bgCard, borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-xs sm:text-sm">Peano Axiom Mathematical Induction</h4>
              </div>
              <p className="text-2xs opacity-75 leading-relaxed">
                Automated client-side verification evaluates both the Base Case $P(n_0)$ and the recursive algebraic step
                $P(k) \implies P(k+1)$ to prove the statement holds for all integers $n \ge n_0$.
              </p>
              <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 font-mono text-xs">
                Selected: {CURATED_THEOREM_PRESETS.find((p) => p.id === selectedInductionPreset)?.title}
              </div>
            </div>
          )}

          {/* VERIFICATION REPORT / CERTIFICATE VIEW */}
          {verificationResult && (
            <div
              className={`p-5 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-md ${
                verificationResult.verified
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-rose-500/50 bg-rose-500/5'
              }`}
            >
              {/* Header Seal Banner */}
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2.5">
                  {verificationResult.verified ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                      <span>{verificationResult.qedSeal}</span>
                      <span className="text-3xs font-mono font-normal opacity-60">
                        ({verificationResult.executionTimeMs}ms)
                      </span>
                    </h3>
                    <p className="text-2xs opacity-80">{verificationResult.summary}</p>
                  </div>
                </div>

                <button
                  onClick={handleCopyTranscript}
                  className="px-3 py-1.5 rounded-lg border text-2xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                  style={{ borderColor: theme.border }}
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTranscript ? 'Copied' : 'Copy Certificate'}</span>
                </button>
              </div>

              {/* Deductive Step-by-Step Breakdown */}
              <div className="space-y-2">
                <span className="text-3xs font-bold uppercase tracking-wider opacity-60">
                  Deductive Proof Invariant Checks:
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

              {/* Truth Table Preview (for Propositional Logic) */}
              {verificationResult.truthTable && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                  <span className="text-3xs font-bold uppercase tracking-wider opacity-60">
                    Truth Valuation Table ({verificationResult.truthTable.rows.length} models checked):
                  </span>
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
