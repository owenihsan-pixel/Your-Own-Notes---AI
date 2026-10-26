import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { Note } from '../types/note';
import { NotionAIBar } from './NotionAIBar';
import {
  Pin,
  Trash2,
  Calendar,
  Download,
  Share2,
  Eye,
  Edit3,
  Columns,
  Tag,
  Clock,
  Sparkles,
  Volume2,
  Image as ImageIcon,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (updated: Note) => void;
  onDeleteNote: (id: string) => void;
  onOpenCalendarDetector: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onOpenCalendarDetector,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'edit'>('split');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [showImageFull, setShowImageFull] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);

  // Parse markdown with marked
  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(note.content || '', { gfm: true, breaks: true });
    } catch {
      return note.content;
    }
  }, [note.content]);

  // Update handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: Date.now(),
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNote({
      ...note,
      content: e.target.value,
      updatedAt: Date.now(),
    });
  };

  const handleTogglePin = () => {
    onUpdateNote({
      ...note,
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim().replace(/^#/, '');
    if (tag && !note.tags.includes(tag)) {
      onUpdateNote({
        ...note,
        tags: [...note.tags, tag],
        updatedAt: Date.now(),
      });
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({
      ...note,
      tags: note.tags.filter((t) => t !== tagToRemove),
      updatedAt: Date.now(),
    });
  };

  const handleInsertBelow = (newText: string) => {
    const updated = (note.content || '').trim() + '\n\n' + newText.trim() + '\n';
    onUpdateNote({
      ...note,
      content: updated,
      updatedAt: Date.now(),
    });
  };

  const handleReplaceContent = (newText: string) => {
    onUpdateNote({
      ...note,
      content: newText,
      updatedAt: Date.now(),
    });
  };

  // Export as Markdown file
  const handleExportMarkdown = () => {
    const blob = new Blob([note.content || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'catatan'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyNote = () => {
    navigator.clipboard.writeText(note.content || '');
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  // Toggle checklist checkbox inside content directly
  const handleCheckboxClick = (indexInMatches: number) => {
    let count = 0;
    const regex = /(- \[(?: |x)\] )/g;
    const newContent = note.content.replace(regex, (match) => {
      if (count === indexInMatches) {
        count++;
        return match === '- [ ] ' ? '- [x] ' : '- [ ] ';
      }
      count++;
      return match;
    });

    onUpdateNote({
      ...note,
      content: newContent,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Top action bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          {/* View Mode Switches */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'split' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tampilan Bersama (Split)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'preview' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Preview Rapi Notion"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'edit' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Editor Tulis"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
          </div>

          {/* Quick Calendar Detection trigger */}
          <button
            type="button"
            onClick={onOpenCalendarDetector}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Deteksi Acara & Kalender</span>
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleTogglePin}
            className={`p-2 rounded-xl transition-colors ${
              note.isPinned
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title={note.isPinned ? 'Lepas Pin' : 'Sematkan ke Atas'}
          >
            <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleCopyNote}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Salin Catatan"
          >
            {copiedNote ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Unduh file Markdown (.md)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Hapus catatan ini?')) {
                onDeleteNote(note.id);
              }
            }}
            className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
            title="Hapus Catatan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main scrollable workspace */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
        {/* Cover / Media Banner (Voice audio or Screenshot image) */}
        {note.category === 'voice' && note.mediaUrl && (
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-indigo-300">Rekaman Suara Asli Tersedia</h4>
                <p className="text-[11px] text-zinc-400">Putar kembali rekaman audio sumber catatan ini</p>
              </div>
            </div>
            <audio controls src={note.mediaUrl} className="h-8 max-w-sm rounded-lg" />
          </div>
        )}

        {note.category === 'screenshot' && note.mediaUrl && (
          <div className="relative rounded-2xl border border-purple-500/30 bg-zinc-950 overflow-hidden">
            <div className="p-3 bg-purple-950/20 border-b border-purple-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-purple-300 font-medium">
                <ImageIcon className="w-4 h-4" /> Tangkapan Layar Sumber (Screenshot Vision)
              </div>
              <button
                type="button"
                onClick={() => setShowImageFull(!showImageFull)}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {showImageFull ? 'Kecilkan' : 'Perbesar Tampilan'}
              </button>
            </div>
            <div className="flex justify-center p-3 bg-zinc-950/90">
              <img
                src={note.mediaUrl}
                alt="Screenshot Sumber"
                className={`rounded-xl object-contain transition-all ${
                  showImageFull ? 'max-h-[500px] w-full' : 'max-h-[180px]'
                }`}
              />
            </div>
          </div>
        )}

        {/* Note Title & Emoji Icon */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none">{note.icon || '📝'}</span>
            <input
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="Judul Catatan..."
              className="w-full text-2xl sm:text-3xl font-bold text-zinc-100 bg-transparent border-none focus:outline-none placeholder-zinc-600"
            />
          </div>

          {/* Metadata chips: category, tags, date */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span
              className={`px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wider text-[11px] ${
                note.category === 'voice'
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                  : note.category === 'screenshot'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}
            >
              {note.category === 'voice' ? '🎙️ Voice Note' : note.category === 'screenshot' ? '📸 Screenshot' : '📝 Teks'}
            </span>

            {/* Tags */}
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 ml-0.5"
                >
                  &times;
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <form onSubmit={handleAddTag} className="inline-flex items-center">
                <input
                  type="text"
                  autoFocus
                  placeholder="Nama tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onBlur={() => setIsAddingTag(false)}
                  className="px-2 py-0.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-indigo-500 w-24"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <Tag className="w-3 h-3" /> + Tag
              </button>
            )}

            <div className="flex items-center gap-1 text-zinc-500 ml-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Diperbarui {new Date(note.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Notion AI Assistant Bar */}
        <NotionAIBar
          noteTitle={note.title}
          noteContent={note.content}
          onInsertBelow={handleInsertBelow}
          onReplaceContent={handleReplaceContent}
          onTriggerCalendarScan={onOpenCalendarDetector}
        />

        {/* Note Content Area */}
        <div className="pt-2">
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[480px]">
              {/* Raw Markdown Editor */}
              <div className="flex flex-col border border-zinc-800 rounded-2xl bg-zinc-900/40 p-4">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Editor Markdown
                </div>
                <textarea
                  value={note.content}
                  onChange={handleContentChange}
                  placeholder="Ketik catatan Markdown di sini..."
                  className="w-full flex-1 min-h-[420px] bg-transparent text-sm text-zinc-200 font-mono resize-none focus:outline-none leading-relaxed placeholder-zinc-600"
                />
              </div>

              {/* Live Notion Preview */}
              <div className="flex flex-col border border-zinc-800 rounded-2xl bg-zinc-900/20 p-5 overflow-y-auto">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                  Preview Notion AI
                </div>
                <div
                  className="prose-notion text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            </div>
          )}

          {viewMode === 'preview' && (
            <div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/20 p-6 min-h-[480px]">
              <div
                className="prose-notion text-sm leading-relaxed max-w-4xl"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          )}

          {viewMode === 'edit' && (
            <div className="border border-zinc-800 rounded-2xl bg-zinc-900/40 p-5 min-h-[480px]">
              <textarea
                value={note.content}
                onChange={handleContentChange}
                placeholder="Ketik catatan di sini..."
                className="w-full min-h-[480px] bg-transparent text-sm text-zinc-200 font-mono resize-none focus:outline-none leading-relaxed placeholder-zinc-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
