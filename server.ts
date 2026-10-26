import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Body parser with 50mb limit for screenshots and audio recordings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to sanitize base64 strings
function sanitizeBase64(dataUrlOrBase64: string): { data: string; mimeType?: string } {
  if (dataUrlOrBase64.includes(';base64,')) {
    const parts = dataUrlOrBase64.split(';base64,');
    const mimeMatch = parts[0].match(/data:(.*)/);
    return {
      mimeType: mimeMatch ? mimeMatch[1] : undefined,
      data: parts[1],
    };
  }
  return { data: dataUrlOrBase64 };
}

// 1. Voice Summarize Endpoint
app.post('/api/ai/voice-summarize', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm', language = 'auto', userContext } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Data audio diperlukan' });
    }

    const { data: cleanAudioBase64, mimeType: extractedMime } = sanitizeBase64(audioData);
    const resolvedMime = extractedMime || mimeType;

    const audioPart = {
      inlineData: {
        mimeType: resolvedMime,
        data: cleanAudioBase64,
      },
    };

    const promptText = `
Anda adalah Notion AI Notes Assistant tingkat lanjut. Dengarkan rekaman suara berikut dengan cermat.
Tugas Anda:
1. Lakukan transkripsi yang akurat dan rapi (perbaiki ucapan terpotong, filler words seperti 'umm/eh' jika perlu, berikan tanda baca yang tepat).
2. Buat ringkasan eksekutif yang tajam dan informatif.
3. Ekstrak poin-poin penting (key takeaways).
4. Buat daftar to-do / action items nyata jika terdapat instruksi, tugas, atau janji dalam audio.
5. Susun catatan lengkap dalam format Markdown bergaya Notion (gunakan judul, callout ringkasan, bullet points, checklist to-do [- [ ]], dan bagian transkripsi).
Bahasa utama catatan: ${language === 'en' ? 'English' : language === 'id' ? 'Bahasa Indonesia' : 'Sesuai bahasa dominan pada rekaman (utamakan Bahasa Indonesia jika diucapkan dalam Bahasa Indonesia)'}.
${userContext ? `Konteks tambahan dari pengguna: ${userContext}` : ''}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          audioPart,
          { text: promptText },
        ],
      },
      config: {
        thinkingConfig: {
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Judul catatan yang ringkas dan deskriptif (3-7 kata)',
            },
            summary: {
              type: Type.STRING,
              description: 'Ringkasan eksekutif 2-4 kalimat yang padat dan jelas',
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Daftar poin-poin utama atau ide kunci yang dibicarakan',
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Daftar to-do atau langkah tindak lanjut konkret',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-5 label/kategori yang relevan, contoh: Rapat, Ide, Keuangan, Proyek',
            },
            transcription: {
              type: Type.STRING,
              description: 'Transkripsi lengkap rekaman audio',
            },
            markdownContent: {
              type: Type.STRING,
              description: 'Isi catatan lengkap dalam format Markdown rapi ala Notion siap pakai',
            },
          },
          required: ['title', 'summary', 'keyPoints', 'actionItems', 'tags', 'transcription', 'markdownContent'],
        },
      },
    });

    const resultText = response.text || '{}';
    const parsed = JSON.parse(resultText);

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/voice-summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memproses rekaman suara dengan Gemini',
    });
  }
});

// 2. Screenshot Summarize Endpoint
app.post('/api/ai/screenshot-summarize', async (req, res) => {
  try {
    const { imageData, mimeType = 'image/png', userInstruction } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Data screenshot / gambar diperlukan' });
    }

    const { data: cleanImageBase64, mimeType: extractedMime } = sanitizeBase64(imageData);
    const resolvedMime = extractedMime || mimeType;

    const imagePart = {
      inlineData: {
        mimeType: resolvedMime,
        data: cleanImageBase64,
      },
    };

    const promptText = `
Anda adalah Notion AI Vision Assistant tingkat lanjut. Analisis screenshot atau gambar ini secara mendalam.
Tugas Anda:
1. Kenali tipe screenshot (misal: UI Mockup / Desain, Dokumen / Artikel, Tabel Data / Spreadsheet, Dashboard / Metrik, Kode Pemrograman, Chat / Percakapan, Diagram Arsitektur, Resi / Dokumen Keuangan).
2. Ekstraksi semua teks yang ada di gambar (OCR) secara terstruktur.
3. Buat ringkasan cerdas yang menjelaskan apa isi tangkapan layar ini, konteksnya, dan tujuan utamanya.
4. Temukan wawasan utama (key insights), angka penting, atau analisis visual (elemen antarmuka, alur kerja, dsb).
5. Tentukan daftar tugas atau action items jika ada (misal: hal yang perlu diperbaiki pada UI, tindak lanjut chat, review data, implementasi kode).
6. Format keseluruhan menjadi catatan Markdown Notion-style yang sangat rapi dan siap disimpan sebagai catatan kerja.
${userInstruction ? `Catatan/Pertanyaan khusus pengguna: ${userInstruction}` : ''}
Bahasa: Bahasa Indonesia (dengan istilah teknis yang wajar).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          imagePart,
          { text: promptText },
        ],
      },
      config: {
        thinkingConfig: {
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Judul catatan yang relevan dengan isi gambar',
            },
            detectedType: {
              type: Type.STRING,
              description: 'Kategori konten visual (misal: UI Mockup, Kode, Tabel Data, Chat, Dokumen)',
            },
            summary: {
              type: Type.STRING,
              description: 'Ringkasan komprehensif dari tangkapan layar',
            },
            keyInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Poin-poin penting, wawasan, atau temuan dari screenshot',
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Tindakan lanjutan atau to-do list yang disarankan',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-5 tags yang relevan',
            },
            ocrText: {
              type: Type.STRING,
              description: 'Seluruh teks yang diekstraksi dari gambar',
            },
            markdownContent: {
              type: Type.STRING,
              description: 'Catatan terstruktur dalam format Markdown ala Notion lengkap dengan visual breakdown',
            },
          },
          required: ['title', 'detectedType', 'summary', 'keyInsights', 'actionItems', 'tags', 'ocrText', 'markdownContent'],
        },
      },
    });

    const resultText = response.text || '{}';
    const parsed = JSON.parse(resultText);

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/screenshot-summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal menganalisis screenshot dengan Gemini',
    });
  }
});

// 3. Notion-Style AI Assistant for Existing Notes
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { noteTitle, noteContent, action, customPrompt } = req.body;

    if (!noteContent && !customPrompt) {
      return res.status(400).json({ error: 'Isi catatan atau prompt diperlukan' });
    }

    let instruction = '';
    switch (action) {
      case 'summarize':
        instruction = 'Buat ringkasan eksekutif padat dalam 2-3 paragraf beserta 3-5 poin kunci (bullet points) dari catatan berikut:';
        break;
      case 'action_items':
        instruction = 'Ekstrak semua kemungkinan to-do, tenggat waktu, dan action items dari catatan ini dalam format checklist Markdown (- [ ] Tugas):';
        break;
      case 'expand':
        instruction = 'Kembangkan dan perluas catatan berikut dengan menambahkan penjelasan detail, contoh konkret, dan elaborasi argumen yang relevan tanpa mengubah esensi aslinya:';
        break;
      case 'polish':
        instruction = 'Perbaiki tata bahasa, ejaan, struktur kalimat, dan tingkatkan profesionalitas nada bahasa catatan ini agar enak dibaca seperti dokumentasi Notion:';
        break;
      case 'translate_id':
        instruction = 'Terjemahkan seluruh catatan berikut ke dalam Bahasa Indonesia yang alami, baku, dan mudah dimengerti:';
        break;
      case 'translate_en':
        instruction = 'Translate the following note into clear, natural, and idiomatic English:';
        break;
      case 'format_table':
        instruction = 'Susun data atau informasi utama dalam catatan ini ke dalam tabel Markdown yang rapi dan terorganisir:';
        break;
      case 'generate_faqs':
        instruction = 'Buat daftar tanya-jawab (FAQ) 4-6 pertanyaan umum yang paling relevan berdasarkan catatan ini:';
        break;
      case 'custom':
      default:
        instruction = customPrompt || 'Bantu tingkatkan catatan ini.';
        break;
    }

    const fullPrompt = `
Anda adalah Notion AI Assistant.
Judul Catatan: "${noteTitle || 'Untitled'}"
Instruksi Pengguna:
${instruction}

Isi Catatan Saat Ini:
\`\`\`markdown
${noteContent || ''}
\`\`\`

Berikan output langsung dalam format Markdown yang rapi, bersih, tanpa meta-komentar pembuka seperti "Tentu, ini hasilnya:".
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        thinkingConfig: {
        },
      },
    });

    return res.json({ success: true, text: response.text || '' });
  } catch (error: any) {
    console.error('Error in /api/ai/assistant:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal memproses permintaan asisten AI',
    });
  }
});

// 4. Calendar Event & Task Detection Endpoint
app.post('/api/ai/detect-calendar-events', async (req, res) => {
  try {
    const { noteTitle, noteContent } = req.body;

    if (!noteContent && !noteTitle) {
      return res.status(400).json({ error: 'Judul atau isi catatan diperlukan' });
    }

    const currentDateISO = new Date().toISOString();
    const currentDayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());

    const promptText = `
Anda adalah AI Calendar & Task Assistant. Analisis teks catatan berikut untuk mendeteksi potensi acara, rapat, tenggat waktu (deadline), janji temu, atau tugas terjadwal yang memerlukan pengingat di Google Calendar.

Waktu saat ini (Reference Date): ${currentDateISO} (${currentDayName}).
Gunakan waktu ini untuk mengonversi istilah relatif seperti "besok", "lusa", "Senin depan jam 10", "akhir pekan", "tanggal 28", dsb menjadi tanggal ISO yang tepat.
Jika waktu/jam spesifik tidak disebutkan, tentukan jam default yang masuk akal (misal rapat jam 09:00 atau deadline jam 17:00, atau set isAllDay: true).

Judul Catatan: "${noteTitle || ''}"
Isi Catatan:
"""
${noteContent || ''}
"""

Tugas Anda:
1. Temukan semua komitmen waktu, rapat, deadline tugas, atau janji temu.
2. Jika tidak ada acara atau tenggat waktu terdeteksi, kembalikan events kosong [] dan hasEvents: false.
3. Untuk setiap acara, tentukan judul yang jelas, deskripsi singkat, waktu mulai dan selesai dalam format ISO (contoh: "2026-10-26T10:00:00"), apakah all-day, menit pengingat (default 15 atau 30 menit), dan kutipan kalimat sumber dari catatan.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        thinkingConfig: {
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasEvents: {
              type: Type.BOOLEAN,
              description: 'True jika terdapat acara, rapat, atau deadline yang terdeteksi',
            },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Nama acara atau tugas kalender',
                  },
                  description: {
                    type: Type.STRING,
                    description: 'Deskripsi ringkas konteks acara dari catatan',
                  },
                  startDate: {
                    type: Type.STRING,
                    description: 'Waktu mulai ISO 8601 (YYYY-MM-DDTHH:mm:ss)',
                  },
                  endDate: {
                    type: Type.STRING,
                    description: 'Waktu selesai ISO 8601 (YYYY-MM-DDTHH:mm:ss)',
                  },
                  isAllDay: {
                    type: Type.BOOLEAN,
                    description: 'True jika acara berlangsung seharian penuh tanpa jam spesifik',
                  },
                  type: {
                    type: Type.STRING,
                    description: 'Kategori: meeting, deadline, reminder, task',
                  },
                  suggestedReminderMinutes: {
                    type: Type.INTEGER,
                    description: 'Rekomendasi waktu pengingat sebelum acara dimulai dalam menit (misal 15, 30, 60)',
                  },
                  sourceSnippet: {
                    type: Type.STRING,
                    description: 'Kalimat atau teks dalam catatan tempat acara ini ditemukan',
                  },
                },
                required: ['title', 'startDate', 'endDate', 'isAllDay', 'type', 'suggestedReminderMinutes', 'sourceSnippet'],
              },
            },
          },
          required: ['hasEvents', 'events'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"hasEvents":false,"events":[]}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/detect-calendar-events:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal mendeteksi acara kalender dari catatan',
    });
  }
});

// 5. Live Meeting Assistant - Interim Highlights Endpoint
app.post('/api/ai/live-interim-summary', async (req, res) => {
  try {
    const { liveTranscript } = req.body;
    if (!liveTranscript || liveTranscript.trim().length < 20) {
      return res.json({ success: true, bullets: [] });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Berikut adalah penggalan transkrip langsung dari rapat/percakapan yang sedang berlangsung:
"""${liveTranscript}"""
Ekstrak maksimal 3 poin penting paling segar yang sedang dibahas saat ini secara sangat singkat (maksimal 10 kata per poin).
Keluarkan dalam format JSON: {"bullets": ["poin 1", "poin 2"]}`,
      config: {
        thinkingConfig: {
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bullets: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['bullets'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"bullets":[]}');
    return res.json({ success: true, bullets: parsed.bullets || [] });
  } catch (error: any) {
    console.error('Error in /api/ai/live-interim-summary:', error);
    return res.json({ success: false, bullets: [] });
  }
});

// 6. Live Meeting Assistant - Final Synthesis Endpoint (When mic is turned off)
app.post('/api/ai/live-meeting-summarize', async (req, res) => {
  try {
    const { liveTranscript, audioData, mimeType = 'audio/webm', meetingContext } = req.body;

    if (!liveTranscript && !audioData) {
      return res.status(400).json({ error: 'Transkrip atau audio diperlukan' });
    }

    const parts: any[] = [];

    // Optimization: If live transcript is already available, summarize directly from text for instant 1-2s response
    // Only upload full audio to Gemini if no live transcript exists
    const hasLiveText = Boolean(liveTranscript && liveTranscript.trim().length > 15);
    if (!hasLiveText && audioData) {
      const { data: cleanAudioBase64, mimeType: extractedMime } = sanitizeBase64(audioData);
      parts.push({
        inlineData: {
          mimeType: extractedMime || mimeType,
          data: cleanAudioBase64,
        },
      });
    }

    const promptText = `
Anda adalah AI Live Meeting Assistant kelas dunia (seperti Notion AI Meeting Notes).
Sesi rapat baru saja selesai dan mikrofon dimatikan.
${liveTranscript ? `Transkrip langsung yang tercatat selama rapat:\n"""${liveTranscript}"""` : ''}
${meetingContext ? `Konteks/Agenda Rapat: ${meetingContext}` : ''}

Tugas Anda:
1. Rapikan transkrip suara menjadi teks yang terstruktur, hilangkan ucapan berulang/filler words tanpa menghilangkan informasi penting.
2. Tentukan Judul Rapat yang profesional dan spesifik (misal: "Rapat Perencanaan Sprint 14 & Integrasi Live AI").
3. Buat Ringkasan Eksekutif 2-4 kalimat yang menangkap inti dari seluruh pertemuan.
4. Buat Poin Keputusan Utama (Key Decisions).
5. Buat Daftar Tindak Lanjut / Action Items yang sangat jelas dengan format checklist (- [ ] ...).
6. Tentukan 3-5 tags yang relevan.
7. Susun seluruh catatan ke dalam format Markdown Notion Meeting Minutes yang elegan (ada banner callout ringkasan, bagian Agenda & Keputusan, checklist To-Do, dan Transkrip Bersih).
`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        thinkingConfig: {
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Judul rapat yang jelas dan deskriptif',
            },
            summary: {
              type: Type.STRING,
              description: 'Ringkasan eksekutif pertemuan',
            },
            keyDecisions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Keputusan atau kesimpulan penting yang disepakati',
            },
            actionItems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Daftar tugas konkret tindak lanjut',
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Tags label rapat',
            },
            cleanedTranscript: {
              type: Type.STRING,
              description: 'Transkrip lengkap yang sudah dirapikan',
            },
            markdownContent: {
              type: Type.STRING,
              description: 'Format Markdown lengkap ala Notion Meeting Minutes siap pakai',
            },
          },
          required: ['title', 'summary', 'keyDecisions', 'actionItems', 'tags', 'cleanedTranscript', 'markdownContent'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/live-meeting-summarize:', error);
    return res.status(500).json({
      error: error?.message || 'Gagal merangkum rapat langsung dengan Gemini',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
