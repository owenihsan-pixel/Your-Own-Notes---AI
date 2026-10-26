import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Pause, Play, Sparkles, X, Upload, Volume2, AlertCircle, Loader2, Check } from 'lucide-react';
import { blobToBase64, formatDuration, getSupportedMimeType } from '../utils/audio';
import { AISummarizeVoiceResult } from '../types/note';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: AISummarizeVoiceResult, audioDataUrl?: string) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/webm');
  const [language, setLanguage] = useState<'id' | 'en' | 'auto'>('id');
  const [userContext, setUserContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Audio Analyser & MediaRecorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // File input ref for uploading audio file
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopAllMedia();
      resetState();
    }
    return () => {
      stopAllMedia();
    };
  }, [isOpen]);

  const resetState = () => {
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioBase64(null);
    setError(null);
    setIsLoading(false);
    setLoadingStep('');
    setUserContext('');
  };

  const stopAllMedia = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
  };

  // Start recording
  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Setup Web Audio API Analyser for live visualizer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();

      // Setup MediaRecorder
      const supportedMime = getSupportedMimeType();
      setMimeType(supportedMime);

      const recorder = new MediaRecorder(stream, { mimeType: supportedMime });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const finalBlob = new Blob(audioChunksRef.current, { type: supportedMime });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        try {
          const b64 = await blobToBase64(finalBlob);
          setAudioBase64(b64);
        } catch (err) {
          console.error('Failed to convert audio to base64', err);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setError('Akses mikrofon ditolak atau tidak tersedia. Pastikan izin mikrofon telah diberikan di browser.');
    }
  };

  // Pause / Resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  // Draw real-time audio waveform
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.6;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max(4, (dataArray[i] / 255) * canvas.height * 0.9);

        // Indigo to violet gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a855f7');

        ctx.fillStyle = gradient;
        // Rounded bar cap
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 3, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };
    render();
  };

  // Upload custom audio file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAudioBlob(file);
    setMimeType(file.type || 'audio/mp3');
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    try {
      const b64 = await blobToBase64(file);
      setAudioBase64(b64);
    } catch (err) {
      setError('Gagal membaca file audio.');
    }
  };

  // Send to Gemini for auto summarize
  const handleAutoSummarize = async () => {
    if (!audioBase64 && !audioBlob) {
      setError('Silakan rekam suara atau unggah file audio terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep('Mengirim data audio ke server...');

    try {
      let b64 = audioBase64;
      if (!b64 && audioBlob) {
        b64 = await blobToBase64(audioBlob);
      }

      setLoadingStep('Gemini 3.8 Flash mendengarkan & mentranskripsi...');
      const response = await fetch('/api/ai/voice-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: b64,
          mimeType,
          language,
          userContext: userContext.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memproses audio');
      }

      setLoadingStep('Menyusun ringkasan Notion AI & action items...');
      const result = await response.json();

      if (result.success && result.data) {
        onSuccess(result.data, audioUrl || undefined);
        onClose();
      } else {
        throw new Error('Format respon AI tidak sesuai');
      }
    } catch (err: any) {
      console.error('Voice summarization error:', err);
      setError(err?.message || 'Terjadi kesalahan saat memproses dengan Gemini AI.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Voice Auto-Summarize <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Gemini 3.8</span>
              </h2>
              <p className="text-xs text-zinc-400">Rekam percakapan/ide & rangkum seketika seperti Notion AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Waveform / Visualizer Stage */}
          <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950 border border-zinc-800/60 overflow-hidden min-h-[170px]">
            {isRecording ? (
              <div className="w-full flex flex-col items-center gap-4">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={70}
                  className="w-full max-w-sm h-16"
                />
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="font-mono text-2xl font-bold tracking-wider text-zinc-100">
                    {formatDuration(duration)}
                  </span>
                  {isPaused && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                      Dijeda
                    </span>
                  )}
                </div>
              </div>
            ) : audioUrl ? (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-zinc-200">Rekaman Suara Siap Disusun AI</p>
                <audio controls src={audioUrl} className="w-full max-w-md mt-1 h-9 rounded-lg" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-zinc-400 py-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                  <Mic className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-zinc-300">Tekan tombol rekam untuk mulai</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Bicara santai dalam Bahasa Indonesia atau Inggris. Gemini akan mentranskripsi dan membuat ringkasan rapi.
                </p>
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-3">
            {!isRecording && !audioUrl && (
              <button
                type="button"
                onClick={startRecording}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
              >
                <Mic className="w-4 h-4" />
                Mulai Rekam Suara
              </button>
            )}

            {isRecording && (
              <>
                <button
                  type="button"
                  onClick={togglePause}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium flex items-center gap-2 border border-zinc-700 transition-colors"
                >
                  {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                  {isPaused ? 'Lanjutkan' : 'Jeda'}
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Selesai Merekam
                </button>
              </>
            )}

            {!isRecording && audioUrl && (
              <button
                type="button"
                onClick={() => {
                  setAudioBlob(null);
                  setAudioUrl(null);
                  setAudioBase64(null);
                  startRecording();
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition-colors"
              >
                Rekam Ulang
              </button>
            )}

            {/* Upload File Alternative */}
            {!isRecording && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm font-medium border border-zinc-700/60 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Upload Audio
                </button>
              </>
            )}
          </div>

          {/* Context & Options */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">Bahasa Utama Rekaman</label>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    language === 'id' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Bahasa Indonesia
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    language === 'en' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('auto')}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    language === 'auto' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Auto
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Konteks Tambahan <span className="text-zinc-500">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Diskusi evaluasi kuartal 3 tim marketing..."
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Auto-generate transkrip, poin kunci & to-do
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
              disabled={isLoading || (!audioBlob && !audioBase64)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{loadingStep || 'Meringkas...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Summarize dengan AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
