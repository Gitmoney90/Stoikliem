import React, { useRef, useEffect, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import { ThemeConfig } from '../types/graph';

interface QRScannerProps {
  theme: ThemeConfig;
  onScan: (data: string) => void;
  onClose?: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ theme, onScan }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setErrorMsg(null);

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setHasPermission(false);
      setErrorMsg('Camera access is not supported in this browser or iframe environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setHasPermission(true);
        setIsScanning(true);
      }
    } catch (err: any) {
      // Gracefully handle permission denial or unavailable hardware without emitting error logs
      setHasPermission(false);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message).toLowerCase().includes('permission denied');

      if (isPermissionDenied) {
        setErrorMsg('Camera access was not granted. You can paste the token directly or upload a QR image.');
      } else if (err?.name === 'NotFoundError' || String(err?.message).toLowerCase().includes('not found')) {
        setErrorMsg('No camera hardware detected on this device.');
      } else {
        setErrorMsg('Camera could not be started in this environment. You can paste the token directly or upload a QR screenshot.');
      }
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Frame processing loop
  useEffect(() => {
    if (!hasPermission || !isScanning) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          setIsScanning(false);
          onScan(code.data);
          return;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animationFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hasPermission, isScanning, onScan]);

  // Fallback: Read QR from uploaded snapshot file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            onScan(code.data);
          } else {
            setErrorMsg('Could not detect a valid QR code in this image. Please try another or paste token directly.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="relative rounded-xl overflow-hidden border bg-stone-950 flex flex-col items-center justify-center min-h-[250px] max-h-[320px]"
      style={{ borderColor: theme.border }}
    >
      {hasPermission === false ? (
        <div className="p-5 text-center space-y-3 max-w-sm">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-xs text-stone-300 leading-relaxed">
            {errorMsg || 'Camera permission was not granted.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 text-stone-200 hover:bg-stone-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Camera</span>
            </button>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-700 text-white hover:bg-amber-600 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      ) : hasPermission === null ? (
        <div className="p-4 text-center text-xs text-stone-400 space-y-2">
          <Camera className="w-6 h-6 animate-pulse mx-auto text-amber-500" />
          <p>Initializing camera...</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="w-full h-full object-cover" />

          {/* Viewfinder target box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-44 h-44 border-2 border-dashed border-amber-400/80 rounded-2xl relative animate-pulse">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
            </div>
          </div>

          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-between px-3 text-2xs text-white/80 bg-black/60 backdrop-blur-xs py-1">
            <span>Point camera at peer's QR code</span>
            <label className="cursor-pointer underline hover:text-white flex items-center gap-1">
              <Upload className="w-3 h-3" />
              <span>Or upload image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </>
      )}
    </div>
  );
};
