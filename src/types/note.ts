export type NoteCategory = 'all' | 'voice' | 'screenshot' | 'manual' | 'favorites';

export interface Note {
  id: string;
  title: string;
  icon?: string;
  category: 'voice' | 'screenshot' | 'manual';
  tags: string[];
  summary: string;
  keyPoints?: string[];
  actionItems?: string[];
  transcription?: string; // For voice notes
  ocrText?: string; // For screenshot notes
  mediaUrl?: string; // Base64 or object URL of audio / screenshot
  mediaMimeType?: string;
  content: string; // Markdown formatted content
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AISummarizeVoiceResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  tags: string[];
  transcription: string;
  markdownContent: string;
}

export interface AISummarizeScreenshotResult {
  title: string;
  detectedType: string;
  summary: string;
  keyInsights: string[];
  actionItems: string[];
  tags: string[];
  ocrText: string;
  markdownContent: string;
}
