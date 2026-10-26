import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Volume2,
  FileText,
  ListChecks,
  Clock,
  Activity,
} from 'lucide-react';
import { blobToBase64, formatDuration, getSupportedMimeType } from '../utils/audio';
import { Note } from '../types/note';

interface LiveMeetingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingFinished: (newNote: Note) => void;
}

export const LiveMeetingAssistantModal: React.FC<LiveMeetingAssistantModalProps> = ({
  isOpen,
  onClose,
  onMeetingFinished,
}) => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState('Rapat & Brainstorming Tim');
  const [meetingContext, setMeetingContext] = useState('');
  const [language, setLanguage] = useState<'id-ID' | 'en-US'>('id-ID');

  // Real-time transcript state
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [liveHighlights, setLiveHighlights] = useState<string[]>([]);

  // State when finalizing
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizingStep, setFinalizingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const interimIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Keep a ref of latest accumulatedTranscript for intervals
  const accumulatedTranscriptRef = useRef('');
  accumulatedTranscriptRef.current = accumulatedTranscript;

  useEffect(() => {
    if (!isOpen) {
      stopAll();
      resetState();
    }
  }, [isOpen]);

  useEffect(() => {
    // Scroll transcript container to bottom on change
    if (transcriptBottomRef.current) {
      transcriptBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [accumulatedTranscript, interimText]);

  const resetState = () => {
    setIsLiveActive(false);
    setDuration(0);
    setAccumulatedTranscript('');
    setInterimText('');
    setLiveHighlights([]);
    setIsFinalizing(false);
    setFinalizingStep('');
    setError(null);
  };

  const stopAll = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (interimIntervalRef.current) {
      clearInterval(interimIntervalRef.current);
      interimIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
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

  // Turn ON Microphone & Start Live Meeting Assistant
  const handleStartLiveAssistant = async () => {
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

      // 1. Audio Visualizer Setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      drawLiveWaveform();

      // 2. Audio Recorder Setup
      const supportedMime = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType: supportedMime });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.start(500);

      // 3. Web Speech Recognition for Live Streaming Transcript
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
          let currentInterim = '';
          let newlyFinalized = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              newlyFinalized += event.results[i][0].transcript + ' ';
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (newlyFinalized) {
            setAccumulatedTranscript((prev) => (prev + ' ' + newlyFinalized).trim());
          }
          setInterimText(currentInterim);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition status:', e?.error);
        };

        recognition.onend = () => {
          // Keep recognition alive if still active
          if (recognitionRef.current && isLiveActive) {
            try {
              recognition.start();
            } catch (_) {}
          }
        };

        recognition.start();
      } else {
        console.warn('Web Speech Recognition API tidak didukung pada browser ini. Menggunakan rekaman audio penuh.');
      }

      setIsLiveActive(true);
      setDuration(0);

      // Timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Live Pulse: periodic interim summary every 15 seconds
      interimIntervalRef.current = window.setInterval(async () => {
        const currentText = accumulatedTranscriptRef.current;
        if (currentText && currentText.trim().length > 30) {
          try {
            const res = await fetch('/api/ai/live-interim-summary', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ liveTranscript: currentText }),
            });
            const data = await res.json();
            if (data.success && data.bullets?.length > 0) {
              setLiveHighlights(data.bullets);
            }
          } catch (_) {}
        }
      }, 14000);
    } catch (err: any) {
      console.error('Failed to start live assistant:', err);
      setError('Gagal mengakses mikrofon. Pastikan Anda mengizinkan akses mikrofon di browser.');
    }
  };

  // Draw animated live waveform
  const drawLiveWaveform = () => {
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

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.max(4, (dataArray[i] / 255) * canvas.height * 0.95);

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#ef4444');
        gradient.addColorStop(1, '#f97316');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, (canvas.height - barHeight) / 2, barWidth - 3, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };
    render();
  };

  // Turn OFF Microphone & Automatically Finalize Meeting Notes with Gemini
  const handleStopAndFinalize = async () => {
    setIsFinalizing(true);
    setFinalizingStep('Mematikan mikrofon & menyimpan rekaman audio...');

    // Stop live recognition & streams
    if (timerRef.current) clearInterval(timerRef.current);
    if (interimIntervalRef.current) clearInterval(interimIntervalRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (_) {}
    }

    let finalAudioBlob: Blob | null = null;
    let finalAudioBase64: string | null = null;
    let audioUrl: string | undefined = undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve();
        mediaRecorderRef.current.onstop = async () => {
          const supportedMime = getSupportedMimeType();
          finalAudioBlob = new Blob(audioChunksRef.current, { type: supportedMime });
          audioUrl = URL.createObjectURL(finalAudioBlob);
          try {
            finalAudioBase64 = await blobToBase64(finalAudioBlob);
          } catch (e) {
            console.error('Base64 conversion failed', e);
          }
          resolve();
        };
        mediaRecorderRef.current.stop();
      });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    setIsLiveActive(false);

    try {
      setFinalizingStep('Gemini 3.8 Flash menyusun ringkasan rapat, agenda, keputusan & to-do...');

      const response = await fetch('/api/ai/live-meeting-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liveTranscript: (accumulatedTranscript + ' ' + interimText).trim(),
          audioData: finalAudioBase64,
          mimeType: getSupportedMimeType(),
          meetingContext: `${meetingTitle}. ${meetingContext}`.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal merangkum rapat langsung');
      }

      setFinalizingStep('Selesai! Membuka catatan rapat di workspace...');
      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        const newNote: Note = {
          id: `note-live-${Date.now()}`,
          title: data.title || meetingTitle || 'Notulensi Rapat AI',
          icon: '🔴',
          category: 'voice',
          tags: data.tags?.length > 0 ? data.tags : ['LiveMeeting', 'Rapat', 'AI'],
          summary: data.summary || '',
          keyPoints: data.keyDecisions || [],
          actionItems: data.actionItems || [],
          transcription: data.cleanedTranscript || accumulatedTranscript,
          content: data.markdownContent,
          mediaUrl: audioUrl,
          mediaMimeType: getSupportedMimeType(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        onMeetingFinished(newNote);
        onClose();
      } else {
        throw new Error('Format respon AI tidak sesuai');
      }
    } catch (err: any) {
      console.error('Finalize error:', err);
      setError(err?.message || 'Terjadi kesalahan saat merangkum rapat.');
      setIsFinalizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Radio className="w-5 h-5" />
              </div>
              {isLiveActive && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Live Transcribe & Meeting Assistant
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                  Gemini Live Notes
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Mikrofon mendengar, menulis teks real-time, dan seketika merangkum begitu mic dimatikan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isFinalizing}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Meeting Config & Title */}
          {!isLiveActive && !isFinalizing && (
            <div className="space-y-4 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Judul / Topik Pertemuan</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Misal: Rapat Evaluasi Sprint & Roadmap Produk..."
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Bahasa Transkripsi</label>
                  <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setLanguage('id-ID')}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium ${
                        language === 'id-ID' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      🇮🇩 Bahasa Indonesia
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en-US')}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium ${
                        language === 'en-US' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Agenda atau Catatan Tambahan <span className="text-zinc-500">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={meetingContext}
                  onChange={(e) => setMeetingContext(e.target.value)}
                  placeholder="Misal: Dihadiri oleh tim backend, fokus pada timeline deployment minggu ini..."
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          )}

          {/* Live Waveform & Live Status Stage */}
          {isLiveActive && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-red-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <canvas
                  ref={canvasRef}
                  width={220}
                  height={50}
                  className="w-48 h-10 rounded-lg"
                />
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl font-bold text-zinc-100 tracking-wider">
                    {formatDuration(duration)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                    <Radio className="w-3 h-3" /> LIVE MENDENGAR
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStopAndFinalize}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
              >
                <MicOff className="w-4 h-4" />
                <span>Matikan Mic & Selesaikan Ringkasan</span>
              </button>
            </div>
          )}

          {/* Live Streaming Content Display */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Live Streaming Transcript Column (2 cols) */}
            <div className="lg:col-span-2 flex flex-col border border-zinc-800 rounded-2xl bg-zinc-950 p-4 min-h-[220px] max-h-[320px]">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 border-b border-zinc-800 pb-2 mb-2">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <FileText className="w-3.5 h-3.5 text-red-400" />
                  Transkrip Langsung (Live Transcript)
                </span>
                <span className="text-[11px] text-zinc-500">
                  {isLiveActive ? 'Mendengarkan...' : 'Menunggu Mic Aktif'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto text-xs leading-relaxed font-mono space-y-2 pr-1">
                {accumulatedTranscript ? (
                  <p className="text-zinc-200">{accumulatedTranscript}</p>
                ) : null}

                {interimText ? (
                  <p className="text-red-400 italic font-medium animate-pulse">
                    {interimText}
                  </p>
                ) : null}

                {!accumulatedTranscript && !interimText && (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-8">
                    <Activity className="w-6 h-6 mb-2 opacity-40 text-zinc-400" />
                    <p className="text-zinc-400 font-medium">Belum ada suara yang masuk.</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Klik "Nyalakan Mic & Mulai Asisten Rapat" untuk mulai mencatat otomatis.
                    </p>
                  </div>
                )}
                <div ref={transcriptBottomRef} />
              </div>
            </div>

            {/* Live AI Pulse / Key Takeaways Highlights (1 col) */}
            <div className="flex flex-col border border-zinc-800 rounded-2xl bg-zinc-950/80 p-4 min-h-[220px] max-h-[320px]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 border-b border-zinc-800 pb-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Live AI Takeaways</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 text-xs">
                {liveHighlights.length > 0 ? (
                  liveHighlights.map((hl, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2 animate-fade-in"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span className="leading-snug">{hl}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-6 text-xs">
                    <p>Wawasan & poin penting akan muncul secara langsung saat rapat berlangsung.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Finalizing Overlay */}
          {isFinalizing && (
            <div className="p-8 rounded-2xl bg-zinc-950 border border-red-500/40 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <div>
                <p className="text-sm font-bold text-zinc-100">{finalizingStep}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Gemini sedang menyusun notulensi rapat, mengekstrak to-do items, dan membersihkan transkrip.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/50 flex items-center justify-between">
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>Mendengar &bull; Menulis &bull; Merangkum otomatis</span>
          </div>

          <div className="flex items-center gap-2">
            {!isLiveActive && !isFinalizing && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleStartLiveAssistant}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  <span>Nyalakan Mic & Mulai Asisten Rapat</span>
                </button>
              </>
            )}

            {isLiveActive && (
              <button
                type="button"
                onClick={handleStopAndFinalize}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all active:scale-95"
              >
                <MicOff className="w-4 h-4" />
                <span>Matikan Mic & Selesaikan Ringkasan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
