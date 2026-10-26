import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Note, NoteCategory, AISummarizeVoiceResult, AISummarizeScreenshotResult } from './types/note';
import { loadNotes, saveNotes } from './utils/storage';
import { initAuth, googleSignIn, logout } from './utils/firebaseAuth';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { VoiceRecorderModal } from './components/VoiceRecorderModal';
import { ScreenshotModal } from './components/ScreenshotModal';
import { CalendarDetectorModal } from './components/CalendarDetectorModal';
import { LiveMeetingAssistantModal } from './components/LiveMeetingAssistantModal';
import { Sparkles, Menu, Plus, Mic, Camera, Calendar, Radio } from 'lucide-react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const initial = loadNotes();
    return initial.length > 0 ? initial[0].id : null;
  });

  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isLiveMeetingOpen, setIsLiveMeetingOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth state for Google Calendar
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Save notes whenever state updates
    saveNotes(notes);
  }, [notes]);

  useEffect(() => {
    // Initialize Firebase Auth listener
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Global listener for clipboard paste (Ctrl+V with screenshot image anywhere)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in textarea or input
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          setIsScreenshotModalOpen(true);
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || null;

  // Create new blank note
  const handleCreateNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Catatan Baru Tanpa Judul',
      icon: '📝',
      category: 'manual',
      tags: ['Draf'],
      summary: 'Catatan baru.',
      content: `# Catatan Baru Tanpa Judul

Mulai ketik ide, materi rapat, atau gunakan Notion AI di atas untuk menyusun catatan secara otomatis.

- [ ] Tugas pertama saya
- [ ] Jadwalkan evaluasi minggu depan
`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsMobileSidebarOpen(false);
  };

  // Voice recording auto-summarize callback
  const handleVoiceSuccess = (result: AISummarizeVoiceResult, audioDataUrl?: string) => {
    const newNote: Note = {
      id: `note-voice-${Date.now()}`,
      title: result.title || 'Rekaman Suara AI',
      icon: '🎙️',
      category: 'voice',
      tags: result.tags?.length > 0 ? result.tags : ['VoiceNote', 'AI'],
      summary: result.summary || '',
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      transcription: result.transcription || '',
      content: result.markdownContent,
      mediaUrl: audioDataUrl,
      mediaMimeType: 'audio/webm',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsMobileSidebarOpen(false);
  };

  // Screenshot OCR & analysis callback
  const handleScreenshotSuccess = (result: AISummarizeScreenshotResult, imageDataUrl?: string) => {
    const newNote: Note = {
      id: `note-screen-${Date.now()}`,
      title: result.title || 'Tangkapan Layar AI',
      icon: '📸',
      category: 'screenshot',
      tags: result.tags?.length > 0 ? result.tags : ['Screenshot', 'VisionAI'],
      summary: result.summary || '',
      keyPoints: result.keyInsights || [],
      actionItems: result.actionItems || [],
      ocrText: result.ocrText || '',
      content: result.markdownContent,
      mediaUrl: imageDataUrl,
      mediaMimeType: 'image/png',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsMobileSidebarOpen(false);
  };

  const handleMeetingFinished = (newNote: Note) => {
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsMobileSidebarOpen(false);
  };

  const handleUpdateNote = (updated: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleDeleteNote = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeNoteId === id) {
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleSignInGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) setCurrentUser(res.user);
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setCurrentUser(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop + Mobile slide-over) */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform lg:relative lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          notes={notes}
          activeNoteId={activeNoteId}
          onSelectNote={(id) => {
            setActiveNoteId(id);
            setIsMobileSidebarOpen(false);
          }}
          onNewNote={handleCreateNewNote}
          onOpenVoiceRecorder={() => setIsVoiceModalOpen(true)}
          onOpenScreenshotModal={() => setIsScreenshotModalOpen(true)}
          onOpenLiveMeeting={() => setIsLiveMeetingOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          currentUser={currentUser}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Your Own Notes - AI
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsLiveMeetingOpen(true)}
              className="p-2 text-red-400 bg-red-500/10 rounded-lg relative"
              title="Live Transcribe Rapat"
            >
              <Radio className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="p-2 text-indigo-400 bg-indigo-500/10 rounded-lg"
              title="Rekam Suara"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsScreenshotModalOpen(true)}
              className="p-2 text-purple-400 bg-purple-500/10 rounded-lg"
              title="Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Note Editor or Empty View */}
        {activeNote ? (
          <NoteEditor
            note={activeNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onOpenCalendarDetector={() => setIsCalendarModalOpen(true)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold text-zinc-100">Belum ada catatan yang dipilih</h2>
            <p className="text-xs text-zinc-500 max-w-sm mt-1.5 mb-6">
              Mulai dengan merekam suara, asisten rapat live, mengunggah screenshot untuk dirangkum AI, atau buat catatan baru secara manual.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsLiveMeetingOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all"
              >
                <Radio className="w-4 h-4" />
                <span>Live Transcribe & Rapat</span>
              </button>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <Mic className="w-4 h-4" />
                <span>Rekam Suara & Ringkas</span>
              </button>
              <button
                type="button"
                onClick={() => setIsScreenshotModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Screenshot Vision</span>
              </button>
              <button
                type="button"
                onClick={handleCreateNewNote}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Catatan Baru</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Meeting Assistant Modal */}
      <LiveMeetingAssistantModal
        isOpen={isLiveMeetingOpen}
        onClose={() => setIsLiveMeetingOpen(false)}
        onMeetingFinished={handleMeetingFinished}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={handleVoiceSuccess}
      />

      {/* Screenshot & OCR Modal */}
      <ScreenshotModal
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
        onSuccess={handleScreenshotSuccess}
      />

      {/* Calendar Detection & Reminder Modal */}
      {activeNote && (
        <CalendarDetectorModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          note={activeNote}
          currentUser={currentUser}
          onUserLoginSuccess={(user) => setCurrentUser(user)}
        />
      )}
    </div>
  );
}
