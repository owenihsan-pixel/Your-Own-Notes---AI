import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Bell, CheckCircle2, AlertCircle, Loader2, Sparkles, ExternalLink, X, Plus, CalendarCheck } from 'lucide-react';
import { Note } from '../types/note';
import { createCalendarEvent, GoogleCalendarEvent } from '../utils/calendarApi';
import { googleSignIn, getAccessToken } from '../utils/firebaseAuth';
import { User } from 'firebase/auth';

interface DetectedEvent {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  type: string;
  suggestedReminderMinutes: number;
  sourceSnippet: string;
}

interface CalendarDetectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  currentUser: User | null;
  onUserLoginSuccess: (user: User, token: string) => void;
}

export const CalendarDetectorModal: React.FC<CalendarDetectorModalProps> = ({
  isOpen,
  onClose,
  note,
  currentUser,
  onUserLoginSuccess,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedEvents, setDetectedEvents] = useState<DetectedEvent[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map of event index to created GoogleCalendarEvent
  const [syncedEvents, setSyncedEvents] = useState<Record<number, GoogleCalendarEvent>>({});
  const [syncingIndex, setSyncingIndex] = useState<number | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      scanNoteForEvents();
    } else {
      setDetectedEvents([]);
      setHasScanned(false);
      setError(null);
      setSyncedEvents({});
      setSyncingIndex(null);
    }
  }, [isOpen, note.id]);

  const scanNoteForEvents = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/detect-calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteTitle: note.title,
          noteContent: note.content || note.summary || note.transcription || '',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memindai acara kalender');
      }

      const result = await response.json();
      if (result.success && result.data) {
        setDetectedEvents(result.data.events || []);
      }
      setHasScanned(true);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err?.message || 'Gagal mendeteksi acara dari catatan.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSignInGoogle = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserLoginSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSyncToCalendar = async (event: DetectedEvent, index: number) => {
    let token = await getAccessToken();

    if (!token || !currentUser) {
      // Must prompt Google Sign In first
      try {
        setIsLoggingIn(true);
        const loginRes = await googleSignIn();
        if (!loginRes) return;
        token = loginRes.accessToken;
        onUserLoginSuccess(loginRes.user, loginRes.accessToken);
      } catch (err: any) {
        setError('Harap hubungkan akun Google untuk menambahkan acara ke Google Calendar.');
        return;
      } finally {
        setIsLoggingIn(false);
      }
    }

    setSyncingIndex(index);
    setError(null);
    try {
      const created = await createCalendarEvent(token, {
        summary: event.title,
        description: `${event.description}\n\n[Dibuat otomatis dari Catatan Your Own Notes - AI: "${note.title}"]\nReferensi Catatan: "${event.sourceSnippet}"`,
        startDateTime: event.startDate,
        endDateTime: event.endDate,
        isAllDay: event.isAllDay,
        reminderMinutes: event.suggestedReminderMinutes || 15,
      });

      setSyncedEvents((prev) => ({
        ...prev,
        [index]: created,
      }));
    } catch (err: any) {
      console.error('Calendar add error:', err);
      setError(err?.message || 'Gagal menyimpan ke Google Calendar.');
    } finally {
      setSyncingIndex(null);
    }
  };

  const formatEventDate = (isoString: string, isAllDay: boolean) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      if (isAllDay) {
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      return d.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Deteksi Kalender & Pengingat AI <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Google Calendar</span>
              </h2>
              <p className="text-xs text-zinc-400">Deteksi otomatis jadwal rapat, deadline tugas, dan sinkronkan dengan 1-klik</p>
            </div>
          </div>
          <button
            onClick={onClose}
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

          {/* User Google Auth status banner */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.email}`}
                  alt="User Avatar"
                  className="w-8 h-8 rounded-full border border-blue-500/30"
                />
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <span>Google Calendar Terhubung</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  </div>
                  <div className="text-[11px] text-zinc-400">{currentUser.email}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Google Calendar Belum Terhubung</div>
                  <div className="text-[11px] text-zinc-400">Masuk untuk sinkronisasi jadwal & pengingat otomatis</div>
                </div>
                <button
                  type="button"
                  onClick={handleSignInGoogle}
                  disabled={isLoggingIn}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Scanning Progress */}
          {isScanning && (
            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
              <div>
                <p className="text-sm font-semibold text-zinc-200">Gemini 3.8 mendeteksi komitmen waktu...</p>
                <p className="text-xs text-zinc-500 mt-0.5">Menganalisis kalimat, tanggal, rapat, dan deadline tugas</p>
              </div>
            </div>
          )}

          {/* Results List */}
          {!isScanning && hasScanned && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                  {detectedEvents.length > 0
                    ? `Ditemukan ${detectedEvents.length} potensi acara / tugas dari catatan ini:`
                    : 'Tidak ada jadwal atau tanggal khusus yang terdeteksi dalam catatan.'}
                </span>
                <button
                  type="button"
                  onClick={scanNoteForEvents}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Pindai Ulang
                </button>
              </div>

              {detectedEvents.length === 0 ? (
                <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-center text-zinc-500 text-sm">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                  <p className="font-medium text-zinc-400">Catatan ini belum memiliki komitmen waktu eksplisit.</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Coba tulis tanggal atau jam, misal: <br />
                    <span className="text-zinc-300">"Rapat evaluasi tim hari Jumat jam 14:00"</span> atau{' '}
                    <span className="text-zinc-300">"Deadline proposal 30 Oktober jam 5 sore"</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {detectedEvents.map((evt, idx) => {
                    const isSynced = Boolean(syncedEvents[idx]);
                    const googleEvent = syncedEvents[idx];
                    const isSyncing = syncingIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isSynced
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  evt.type === 'meeting'
                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                    : evt.type === 'deadline'
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {evt.type}
                              </span>
                              <h4 className="text-sm font-semibold text-zinc-100">{evt.title}</h4>
                            </div>

                            <p className="text-xs text-zinc-400">{evt.description}</p>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 pt-1">
                              <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{formatEventDate(evt.startDate, evt.isAllDay)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-zinc-400">
                                <Bell className="w-3.5 h-3.5 text-amber-400" />
                                <span>Pengingat {evt.suggestedReminderMinutes || 15} mnt sebelum</span>
                              </div>
                            </div>

                            {evt.sourceSnippet && (
                              <div className="text-[11px] text-zinc-500 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80 italic">
                                "{evt.sourceSnippet}"
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex flex-col items-end">
                            {isSynced ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                                </span>
                                {googleEvent?.htmlLink && (
                                  <a
                                    href={googleEvent.htmlLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                  >
                                    Buka Kalender <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSyncToCalendar(evt, idx)}
                                disabled={isSyncing}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all active:scale-95"
                              >
                                {isSyncing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                                <span>Tambah ke Kalender</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Terhubung langsung dengan Google Calendar API
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
