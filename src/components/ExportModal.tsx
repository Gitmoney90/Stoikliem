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

  const handleDownloadTransparentPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, off.width, off.height);
    const d = imgData.data;

    // Convert canvas background pixels into alpha 0
    const bgHex = theme.bgCanvas.replace('#', '');
    const bgR = parseInt(bgHex.substring(0, 2), 16) || 250;
    const bgG = parseInt(bgHex.substring(2, 4), 16) || 246;
    const bgB = parseInt(bgHex.substring(4, 6), 16) || 238;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (Math.abs(r - bgR) < 18 && Math.abs(g - bgG) < 18 && Math.abs(b - bgB) < 18) {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const link = document.createElement('a');
    link.download = `${exportTitle.toLowerCase().replace(/\s+/g, '_')}_transparent.png`;
    link.href = off.toDataURL('image/png');
    link.click();
  };

  const handleDownloadSVG = () => {
    const canvas = document.querySelector('canvas');
    const width = canvas?.width || 1200;
    const height = canvas?.height || 800;
    const activeExpressions = expressions.filter((e) => e.visible);

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svgContent += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svgContent += `  <style>\n    .axis { stroke: ${theme.gridAxis}; stroke-width: 1.5; }\n    .title { font-family: serif; font-size: 16px; fill: ${theme.textPrimary}; }\n  </style>\n`;
    svgContent += `  <rect width="100%" height="100%" fill="${theme.bgCanvas}" />\n`;
    if (canvas) {
      svgContent += `  <image href="${canvas.toDataURL('image/png')}" width="${width}" height="${height}" />\n`;
    }
    activeExpressions.forEach((expr, idx) => {
      svgContent += `  <!-- Curve ${idx + 1}: ${expr.rawText.replace(/&/g, '&amp;').replace(/</g, '&lt;')} -->\n`;
    });
    svgContent += `  <text x="24" y="36" class="title">${exportTitle}</text>\n`;
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportTitle.toLowerCase().replace(/\s+/g, '_')}_vector.svg`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: theme.bgCard,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between shrink-0 min-h-[52px]"
          style={{
            backgroundColor: theme.bgSidebar,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 shrink-0" style={{ color: theme.accent }} />
            <h2
              className="text-sm sm:text-base font-bold tracking-tight truncate"
              style={{
                fontFamily: '"Cinzel", "Source Serif 4", serif',
                color: theme.textPrimary,
              }}
            >
              Export & Share Figure
            </h2>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: theme.textSecondary }}
            aria-label="Close Export"
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
              onClick={handleDownloadTransparentPNG}
              className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              <div className="flex items-center gap-2.5">
                <Image className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Download Transparent Background PNG</span>
              </div>
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownloadSVG}
              className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-between font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{
                borderColor: theme.border,
                color: theme.textPrimary,
              }}
            >
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-indigo-500" />
                <span>Download High-Resolution SVG Vector</span>
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
