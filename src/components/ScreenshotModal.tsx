import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Sparkles, X, AlertCircle, Loader2, Image as ImageIcon, Monitor, CheckCircle, HelpCircle } from 'lucide-react';
import { captureScreenFrame } from '../utils/screenCapture';
import { AISummarizeScreenshotResult } from '../types/note';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AISummarizeScreenshotResult, imageDataUrl?: string) => void;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [userInstruction, setUserInstruction] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    } else {
      // Setup paste listener
      const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              handleFileSelected(file);
              e.preventDefault();
              break;
            }
          }
        }
      };

      window.addEventListener('paste', handlePaste);
      return () => {
        window.removeEventListener('paste', handlePaste);
      };
    }
  }, [isOpen]);

  const resetState = () => {
    setImageDataUrl(null);
    setMimeType('image/png');
    setUserInstruction('');
    setError(null);
    setIsLoading(false);
    setIsCapturing(false);
    setLoadingStep('');
  };

  const handleFileSelected = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Harap pilih file gambar (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            setImageDataUrl(optimized);
            setMimeType('image/jpeg');
            return;
          }
        }
        setImageDataUrl(rawUrl);
      };
      img.src = rawUrl;
    };
    reader.onerror = () => {
      setError('Gagal membaca gambar.');
    };
    reader.readAsDataURL(file);
  };

  // Direct Screen Capture API
  const handleDirectScreenCapture = async () => {
    setError(null);
    setIsCapturing(true);
    try {
      const { dataUrl } = await captureScreenFrame();
      setImageDataUrl(dataUrl);
      setMimeType('image/png');
    } catch (err: any) {
      console.warn('Screen capture cancelled or failed:', err);
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Gagal menangkap layar. Pastikan Anda memberikan izin tangkapan layar di browser.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  // Sample screenshot for instant testing
  const handleLoadSample = (sampleType: 'dashboard' | 'code' | 'invoice') => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sampleType === 'dashboard') {
      // Dark dashboard mockup canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 800, 450);

      // Header
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 800, 50);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('⚡ SaaS Executive Dashboard Q4', 24, 32);

      // KPI Cards
      const cards = [
        { label: 'MRR Revenue', val: '$148,200', change: '+18.4%', col: '#10b981' },
        { label: 'Active Users', val: '42,500', change: '+22.1%', col: '#10b981' },
        { label: 'Churn Rate', val: '2.1%', change: '-0.4%', col: '#6366f1' },
        { label: 'Server Uptime', val: '99.98%', change: 'Target 99.9%', col: '#38bdf8' },
      ];

      cards.forEach((c, i) => {
        const x = 24 + i * 190;
        ctx.fillStyle = '#1e293b';
        ctx.roundRect(x, 70, 175, 100, 10);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.fillText(c.label, x + 16, 96);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(c.val, x + 16, 130);

        ctx.fillStyle = c.col;
        ctx.font = '12px sans-serif';
        ctx.fillText(c.change, x + 16, 154);
      });

      // Chart simulation
      ctx.fillStyle = '#1e293b';
      ctx.roundRect(24, 190, 752, 230, 10);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Quarterly Growth vs Target (Action: Finalize Budget by Nov 15)', 40, 224);

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, 380);
      ctx.bezierCurveTo(200, 350, 400, 260, 550, 280);
      ctx.lineTo(720, 240);
      ctx.stroke();
    } else if (sampleType === 'code') {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, 800, 450);

      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, 0, 800, 40);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(20, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(38, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(56, 20, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '13px monospace';
      ctx.fillText('gemini-client.ts — Workspace Service', 80, 24);

      ctx.fillStyle = '#60a5fa';
      ctx.font = '14px monospace';
      ctx.fillText('import { GoogleGenAI } from "@google/genai";', 30, 80);
      ctx.fillText('export async function summarizeScreenshot(img) {', 30, 120);
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('  // TODO: Fix memory leak on image canvas', 50, 150);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText('  const res = await ai.models.generateContent({', 50, 180);
      ctx.fillText('    model: "gemini-3.8-flash",', 70, 210);
      ctx.fillText('    contents: [img, { text: "Ekstraksi OCR & ringkasan" }],', 70, 240);
      ctx.fillText('  });', 50, 270);
      ctx.fillText('  return res.text;', 50, 300);
      ctx.fillText('}', 30, 330);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 450);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('INVOICE / TAGIHAN RESMI', 40, 60);

      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.fillText('No. Dokumen: INV-2026-8842 | Jatuh Tempo: 28 Oktober 2026', 40, 95);
      ctx.fillText('Klien: PT Teknologi Cerdas Nusantara', 40, 120);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 150, 720, 180);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(41, 151, 718, 40);

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('DESKRIPSI LAYANAN', 60, 175);
      ctx.fillText('QTY', 450, 175);
      ctx.fillText('JUMLAH (IDR)', 600, 175);

      ctx.font = '14px sans-serif';
      ctx.fillText('Lisensi Enterprise Google Gemini AI Workspace', 60, 220);
      ctx.fillText('1', 455, 220);
      ctx.fillText('Rp 18.500.000', 600, 220);

      ctx.fillText('Instalasi & Konfigurasi Serverless', 60, 260);
      ctx.fillText('1', 455, 260);
      ctx.fillText('Rp 4.500.000', 600, 260);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('TOTAL: Rp 23.000.000', 540, 370);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setImageDataUrl(dataUrl);
    setMimeType('image/png');
  };

  const handleAutoSummarize = async () => {
    if (!imageDataUrl) {
      setError('Silakan pilih atau tangkap screenshot terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep('Mengunggah tangkapan layar...');

    try {
      setLoadingStep('Gemini 3.8 Flash mengekstrak teks (OCR) & wawasan visual...');
      const response = await fetch('/api/ai/screenshot-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageDataUrl,
          mimeType,
          userInstruction: userInstruction.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal menganalisis screenshot');
      }

      setLoadingStep('Menyusun format catatan terstruktur Notion AI...');
      const result = await response.json();

      if (result.success && result.data) {
        onSuccess(result.data, imageDataUrl);
        onClose();
      } else {
        throw new Error('Respon model tidak valid');
      }
    } catch (err: any) {
      console.error('Screenshot summarization error:', err);
      setError(err?.message || 'Terjadi kesalahan saat menganalisis gambar dengan Gemini AI.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Screenshot Auto-Summarize <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">Gemini Vision</span>
              </h2>
              <p className="text-xs text-zinc-400">Ekstrak teks visual (OCR) & ringkas gambar instan ala Notion AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading || isCapturing}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Screenshot Dropzone / Preview Stage */}
          {imageDataUrl ? (
            <div className="relative rounded-2xl border border-zinc-700/80 bg-zinc-950 overflow-hidden group">
              <img
                src={imageDataUrl}
                alt="Screenshot Preview"
                className="w-full max-h-[260px] object-contain bg-zinc-950/80"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImageDataUrl(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700 shadow-md backdrop-blur-sm transition-colors"
                >
                  Ganti Gambar
                </button>
              </div>
              <div className="px-4 py-2 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle className="w-4 h-4" /> Screenshot siap dianalisis
                </span>
                <span>Format: {mimeType.replace('image/', '').toUpperCase()}</span>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                isDragOver
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 mb-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                Tarik screenshot ke sini atau tempel (Ctrl + V)
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Bisa berupa mockup UI, grafik data, snippet kode, laporan spreadsheet, dokumen, atau chat percakapan.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={handleDirectScreenCapture}
                  disabled={isCapturing}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                >
                  <Monitor className="w-4 h-4" />
                  {isCapturing ? 'Membuka Layar...' : 'Tangkap Layar Langsung'}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f);
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Pilih File Gambar
                </button>
              </div>

              {/* Instant Test Presets */}
              <div className="mt-5 pt-4 border-t border-zinc-800/80 w-full flex flex-col items-center">
                <span className="text-[11px] text-zinc-500 mb-2">Atau coba dengan sampel screenshot siap uji:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadSample('dashboard')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors"
                  >
                    📊 Dashboard Metrik
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('invoice')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors"
                  >
                    🧾 Dokumen Tagihan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('code')}
                    className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition-colors"
                  >
                    💻 Snippet Kode
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Instruction / Context */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Instruksi Tambahan <span className="text-zinc-500">(Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Misal: 'Fokus pada angka tabel di sebelah kanan' atau 'Rekomendasikan perbaikan UX'..."
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Gemini Vision OCR + Ringkasan Visual Komprehensif
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleAutoSummarize}
              disabled={isLoading || !imageDataUrl}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingStep || 'Menganalisis...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Summarize Screenshot</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
