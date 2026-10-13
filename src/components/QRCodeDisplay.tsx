import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Download } from 'lucide-react';
import { ThemeConfig } from '../types/graph';

interface QRCodeDisplayProps {
  token: string;
  theme: ThemeConfig;
  title?: string;
  subtitle?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  token,
  theme,
  title,
  subtitle,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;

    QRCode.toDataURL(token, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'L', // Low correction gives fewer denser blocks for large SDP payloads
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate QR code', err);
        // Fallback with higher tolerance if needed
        QRCode.toDataURL(token, { width: 320, margin: 1, errorCorrectionLevel: 'L' })
          .then((url) => setDataUrl(url))
          .catch(() => {});
      });
  }, [token]);

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `p2p_webrtc_signal.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {title && (
        <h4 className="font-semibold text-xs text-center" style={{ color: theme.textPrimary }}>
          {title}
        </h4>
      )}

      {/* QR Canvas Box */}
      <div className="p-3 bg-white rounded-2xl border shadow-sm flex items-center justify-center">
        {dataUrl ? (
          <img src={dataUrl} alt="WebRTC Signaling QR Code" className="w-56 h-56 object-contain" />
        ) : (
          <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-400">
            Generating QR Code...
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-2xs text-center max-w-xs leading-relaxed" style={{ color: theme.textSecondary }}>
          {subtitle}
        </p>
      )}

      {/* Manual Token Fallback */}
      <div className="w-full space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-2xs" style={{ color: theme.textMuted }}>
          <span>Manual Signal Token:</span>
          <span>{token.length} chars</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={token}
            className="flex-1 px-2.5 py-1.5 rounded-lg border font-mono text-2xs truncate select-all"
            style={{
              backgroundColor: theme.bgSidebar,
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.bgCard,
              color: theme.textPrimary,
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
