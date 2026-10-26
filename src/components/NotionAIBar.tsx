import React, { useState } from 'react';
import { Sparkles, Check, Copy, X, Loader2, ArrowDown, RefreshCw, Send, ChevronDown, ListChecks, FileText, Maximize2, Wand2, Table, Languages } from 'lucide-react';

interface NotionAIBarProps {
  noteTitle: string;
  noteContent: string;
  onInsertBelow: (text: string) => void;
  onReplaceContent: (text: string) => void;
  onTriggerCalendarScan: () => void;
}

export const NotionAIBar: React.FC<NotionAIBarProps> = ({
  noteTitle,
  noteContent,
  onInsertBelow,
  onReplaceContent,
  onTriggerCalendarScan,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAIAction = async (action: string, prompt?: string) => {
    setIsLoading(true);
    setError(null);
    setAiResult(null);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteTitle,
          noteContent,
          action,
          customPrompt: prompt || customPrompt,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memproses Notion AI');
      }

      const data = await response.json();
      if (data.success && data.text) {
        setAiResult(data.text);
      } else {
        throw new Error('Hasil AI kosong');
      }
    } catch (err: any) {
      console.error('Notion AI error:', err);
      setError(err?.message || 'Terjadi kesalahan saat memproses dengan Gemini');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 shadow-lg backdrop-blur-md transition-all">
      {/* Top Bar / Trigger */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">Notion AI Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">Gemini 3.8</span>
        </div>

        {/* Quick preset chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              runAIAction('summarize');
            }}
            disabled={isLoading || !noteContent}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-40 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ringkas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              runAIAction('action_items');
            }}
            disabled={isLoading || !noteContent}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-40 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
            <span>Action Items</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              runAIAction('polish');
            }}
            disabled={isLoading || !noteContent}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-40 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Rapikan Kalimat</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              runAIAction('format_table');
            }}
            disabled={isLoading || !noteContent}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 disabled:opacity-40 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Table className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tabel</span>
          </button>

          <button
            type="button"
            onClick={onTriggerCalendarScan}
            disabled={!noteContent}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span>📅 Deteksi Kalender</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <span>Tanya Bebas</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded Prompt input */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customPrompt.trim()) runAIAction('custom', customPrompt);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ketik instruksi AI, misal: 'Tulis draf email dari catatan ini' atau 'Perluas bagian kesimpulan'..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isLoading || !customPrompt.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Jalankan</span>
            </button>
          </form>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center gap-2.5 text-zinc-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Gemini sedang berpikir dan menyusun catatan...</span>
            </div>
          )}

          {/* AI Result Card */}
          {aiResult && !isLoading && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-indigo-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Saran Notion AI
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiResult(null)}
                    className="text-zinc-500 hover:text-zinc-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text Preview */}
              <div className="max-h-48 overflow-y-auto text-xs text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-900/60 p-3 rounded-lg border border-zinc-800">
                {aiResult}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onReplaceContent(aiResult);
                    setAiResult(null);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors"
                >
                  Ganti Seluruh Catatan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInsertBelow(aiResult);
                    setAiResult(null);
                    setIsOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Sisipkan di Bawah
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
