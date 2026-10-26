import React from 'react';
import {
  Plus,
  Mic,
  Camera,
  Search,
  Pin,
  Calendar,
  Sparkles,
  Layers,
  FileText,
  Volume2,
  Image as ImageIcon,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { Note, NoteCategory } from '../types/note';
import { User } from 'firebase/auth';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onOpenVoiceRecorder: () => void;
  onOpenScreenshotModal: () => void;
  onOpenLiveMeeting: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: NoteCategory;
  onSelectCategory: (cat: NoteCategory) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  currentUser: User | null;
  onSignInGoogle: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onOpenVoiceRecorder,
  onOpenScreenshotModal,
  onOpenLiveMeeting,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedTag,
  onSelectTag,
  currentUser,
  onSignInGoogle,
  onSignOut,
}) => {
  // Extract all unique tags
  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Counts
  const counts = React.useMemo(() => {
    return {
      all: notes.length,
      voice: notes.filter((n) => n.category === 'voice').length,
      screenshot: notes.filter((n) => n.category === 'screenshot').length,
      favorites: notes.filter((n) => n.isPinned).length,
    };
  }, [notes]);

  // Filtered notes
  const filteredNotes = React.useMemo(() => {
    return notes.filter((n) => {
      // Category filter
      if (selectedCategory === 'voice' && n.category !== 'voice') return false;
      if (selectedCategory === 'screenshot' && n.category !== 'screenshot') return false;
      if (selectedCategory === 'favorites' && !n.isPinned) return false;

      // Tag filter
      if (selectedTag && !n.tags?.includes(selectedTag)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = n.title.toLowerCase().includes(q);
        const inContent = n.content.toLowerCase().includes(q);
        const inSummary = n.summary.toLowerCase().includes(q);
        const inTags = n.tags?.some((t) => t.toLowerCase().includes(q));
        return inTitle || inContent || inSummary || inTags;
      }
      return true;
    });
  }, [notes, selectedCategory, selectedTag, searchQuery]);

  return (
    <aside className="w-80 h-full flex flex-col bg-zinc-900 border-r border-zinc-800/80 text-zinc-100 select-none">
      {/* App Branding */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-1.5">
              Your Own Notes <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">AI</span>
            </h1>
            <p className="text-[11px] text-zinc-500">Voice, Vision & Smart Notes</p>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="p-3 space-y-2 border-b border-zinc-800/60">
        {/* Live Meeting Assistant Button */}
        <button
          type="button"
          onClick={onOpenLiveMeeting}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600/20 via-orange-600/20 to-amber-600/20 hover:from-red-600/30 hover:to-orange-600/30 text-red-200 text-xs font-semibold flex items-center justify-between border border-red-500/40 shadow-sm transition-all group"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span>Live Transcribe & Rapat</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">Live AI</span>
        </button>

        <button
          type="button"
          onClick={onNewNote}
          className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700/60 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 text-zinc-300" />
          <span>Catatan Teks Baru</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenVoiceRecorder}
            className="py-2 px-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rekam Suara</span>
          </button>

          <button
            type="button"
            onClick={onOpenScreenshotModal}
            className="py-2 px-2.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Screenshot</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 py-2 border-b border-zinc-800/60">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3" />
          <input
            type="text"
            placeholder="Cari catatan, topik, atau tag..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Navigation Filter Categories */}
      <div className="p-3 border-b border-zinc-800/60 space-y-1 text-xs">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-colors ${
            selectedCategory === 'all' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Semua Catatan</span>
          </div>
          <span className="text-[11px] text-zinc-500">{counts.all}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('voice')}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-colors ${
            selectedCategory === 'voice' ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Voice Notes</span>
          </div>
          <span className="text-[11px] text-zinc-500">{counts.voice}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('screenshot')}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-colors ${
            selectedCategory === 'screenshot' ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30 font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>Screenshots Vision</span>
          </div>
          <span className="text-[11px] text-zinc-500">{counts.screenshot}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectCategory('favorites')}
          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium transition-colors ${
            selectedCategory === 'favorites' ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>Catatan Disematkan</span>
          </div>
          <span className="text-[11px] text-zinc-500">{counts.favorites}</span>
        </button>
      </div>

      {/* Tags Scroll */}
      {allTags.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800/60">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
            Filter Label / Tag
          </div>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {selectedTag && (
              <button
                type="button"
                onClick={() => onSelectTag(null)}
                className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 hover:text-white"
              >
                &times; Semua Tag
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            Tidak ada catatan yang sesuai.
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote(note.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-zinc-800/90 text-white shadow-sm border border-zinc-700/80'
                    : 'hover:bg-zinc-800/40 text-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm select-none shrink-0">{note.icon || '📝'}</span>
                    <h3 className="text-xs font-semibold truncate text-zinc-100">
                      {note.title || 'Untitled Note'}
                    </h3>
                  </div>
                  {note.isPinned && (
                    <Pin className="w-3 h-3 text-amber-400 fill-current shrink-0 mt-0.5" />
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                  {note.summary || note.content.slice(0, 100) || 'Belum ada konten'}
                </p>

                <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
                  <span>
                    {new Date(note.updatedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      note.category === 'voice'
                        ? 'text-indigo-400 bg-indigo-500/10'
                        : note.category === 'screenshot'
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-zinc-400 bg-zinc-800'
                    }`}
                  >
                    {note.category}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Google Calendar Profile / Connection Card */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60">
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.email}`}
                alt="Avatar"
                className="w-7 h-7 rounded-full border border-blue-500/40 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 truncate flex items-center gap-1">
                  <span>{currentUser.displayName || 'Pengguna'}</span>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Google Calendar On</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Keluar Google"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignInGoogle}
            className="w-full py-2 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Hubungkan Google Calendar</span>
          </button>
        )}
      </div>
    </aside>
  );
};
