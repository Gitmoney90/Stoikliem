import React, { useState } from 'react';
import { GraphExpression, ThemeConfig } from '../types/graph';
import { X, Download, Copy, Check, Share2, Image, FileCode } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeConfig;
  expressions: GraphExpression[];
  onOpenShareSubmission?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  theme,
  expressions,
  onOpenShareSubmission,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [exportTitle, setExportTitle] = useState('Principia Graphica Figure');

  if (!isOpen) return null;

  const handleDownloadPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // Create high-resolution export snapshot
    const link = document.createElement('a');
    link.download = `${exportTitle.toLowerCase().replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyLatex = () => {
    const latexLines = expressions
      .filter((e) => e.visible)
      .map((e) => `\\begin{equation*}\n  ${e.rawText}\n\\end{equation*}`)
      .join('\n\n');

    navigator.clipboard.writeText(latexLines);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  const handleCopyShareLink = () => {
    const serialized = encodeURIComponent(
      JSON.stringify(
        expressions.map((e) => ({
          t: e.rawText,
          c: e.color,
          v: e.visible,
        }))
      )
    );
    const url = `${window.location.origin}${window.location.pathname}#state=${serialized}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5" style={{ color: theme.accent }} />
            <h2
              className="text-base font-bold tracking-tight"
              style={{
                fontFamily: '"Cinzel", "Source Serif 4", serif',
                color: theme.textPrimary,
              }}
            >
              Export & Share Mathematical Figure
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4 text-xs font-sans">
          <div>
            <label className="block text-2xs uppercase tracking-wider font-semibold mb-1" style={{ color: theme.textMuted }}>
              Figure Title
            </label>
            <input
              type="text"
              value={exportTitle}
              onChange={(e) => setExportTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border text-xs"
              style={{
                backgroundColor: theme.bgSidebar,
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            />
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadPNG}
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-between font-semibold shadow-xs hover:opacity-90 transition-all active:scale-98"
              style={{
                backgroundColor: theme.textPrimary,
                color: theme.bgCanvas,
              }}
            >
              <div className="flex items-center gap-2.5">
                <Image className="w-4 h-4" />
                <span>Download High-Resolution PNG</span>
              </div>
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleCopyLatex}
              className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4" />
                <span>Copy Formulas as LaTeX Equations</span>
              </div>
              {copiedLatex ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {onOpenShareSubmission && (
              <button
                onClick={() => {
                  onClose();
                  onOpenShareSubmission();
                }}
                className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                style={{
                  borderColor: theme.accent,
                  color: theme.accent,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4" />
                  <span>Publish & Generate Unique Share Code</span>
                </div>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">Cloud</span>
              </button>
            )}

            <button
              onClick={handleCopyShareLink}
              className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4" />
                <span>Copy Direct URL State Hash</span>
              </div>
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
