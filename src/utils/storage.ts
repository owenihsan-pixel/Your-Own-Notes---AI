import { Note } from '../types/note';

const STORAGE_KEY = 'auranotes_data_v1';

export const INITIAL_NOTES: Note[] = [
  {
    id: 'note-sample-voice',
    title: 'Rapat Sinkronisasi Sprint & Implementasi Fitur Gemini AI',
    icon: '🎙️',
    category: 'voice',
    tags: ['Rapat', 'Sprint', 'AI', 'VoiceNote'],
    summary: 'Diskusi sinkronisasi sprint mengenai integrasi API Gemini 3.8 Flash untuk modul audio summarization dan screenshot vision. Pembagian tugas backend dan frontend telah disepakati.',
    keyPoints: [
      'Model Gemini 3.8 Flash dipilih untuk audio multimodal dan vision OCR latency rendah.',
      'Auto-summarize audio menghasilkan transkrip lengkap, poin kunci, dan checklist to-do.',
      'Fitur screenshot mendukung direct screen capture browser dan drag & drop.',
      'Batas waktu rilis versi alpha ditetapkan akhir pekan ini.'
    ],
    actionItems: [
      'Konfigurasi endpoint Express /api/ai/voice-summarize',
      'Implementasikan visualizer gelombang audio Web Audio API',
      'Uji coba parsing format markdown checklist pada note editor',
      'Siapkan dokumentasi panduan penggunaan untuk tim QA'
    ],
    transcription: 'Halo rekan-rekan, dalam sinkronisasi sprint pagi ini kita sepakat bahwa fitur voice summarization dan screenshot analysis harus bekerja secepat dan semulus mungkin seperti Notion AI. Gemini 3.8 Flash akan menangani baik audio maupun gambar. Owen tolong pimpin implementasi UI frontend dan audio recorder-nya, sementara backend Express akan menangani proxy server-side ke Gemini API. Target kita adalah menyelesaikan MVP dan mengujinya sebelum rilis akhir pekan.',
    content: `# Rapat Sinkronisasi Sprint & Implementasi Fitur Gemini AI

> 🎙️ **Voice Note AI Summary**: Diskusi sinkronisasi sprint mengenai integrasi API Gemini 3.8 Flash untuk modul audio summarization dan screenshot vision. Pembagian tugas backend dan frontend telah disepakati.

## 📌 Poin-Poin Kunci (Key Takeaways)
- **Model Utama**: Menggunakan Gemini 3.8 Flash untuk pemrosesan audio suara dan visual screenshot secara komprehensif.
- **Pengalaman Pengguna**: Auto-summarize bekerja instan begitu rekaman selesai, langsung membentuk catatan terstruktur ala Notion.
- **Fitur Screenshot**: Mendukung tangkap layar layar langsung (*screen capture*) dan paste dari clipboard (Ctrl+V).
- **Target Rilis**: MVP selesai dan teruji akhir pekan ini.

## ✅ Action Items & Tindak Lanjut
- [x] Konfigurasi endpoint Express \`/api/ai/voice-summarize\`
- [ ] Implementasikan visualizer gelombang audio Web Audio API
- [ ] Uji coba parsing format markdown checklist pada note editor
- [ ] Siapkan dokumentasi panduan penggunaan untuk tim QA

## 📝 Transkrip Suara Lengkap
*"Halo rekan-rekan, dalam sinkronisasi sprint pagi ini kita sepakat bahwa fitur voice summarization dan screenshot analysis harus bekerja secepat dan semulus mungkin seperti Notion AI. Gemini 3.8 Flash akan menangani baik audio maupun gambar. Owen tolong pimpin implementasi UI frontend dan audio recorder-nya, sementara backend Express akan menangani proxy server-side ke Gemini API. Target kita adalah menyelesaikan MVP dan mengujinya sebelum rilis akhir pekan."*
`,
    isPinned: true,
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'note-sample-screenshot',
    title: 'Analisis Mockup Dashboard Metrik & UX Flow',
    icon: '📸',
    category: 'screenshot',
    tags: ['Screenshot', 'UI/UX', 'Dashboard', 'VisionAI'],
    summary: 'Tangkapan layar dashboard metrik analitik menunjukkan kenaikan konversi 24% namun terdapat bounce rate tinggi pada alur onboarding.',
    keyPoints: [
      'Dashboard analitik menampilkan 4 kartu KPI utama di bagian atas.',
      'Grafik garis menunjukkan lonjakan traffic signifikan pada hari Selasa.',
      'Tingkat retensi mingguan stabil pada 68%.',
      'Komponen CTA pada alur pendaftaran perlu kontras warna lebih tinggi.'
    ],
    actionItems: [
      'Redesain kartu onboarding agar lebih ringkas',
      'Tingkatkan kontras tombol konfirmasi menjadi minimal rasio 4.5:1',
      'Tambahkan tooltip penjelasan pada grafik conversion funnel'
    ],
    ocrText: `ANALYTICS OVERVIEW
Active Users: 12,480 (+18.2%)
Conversion Rate: 4.8% (+24%)
Avg. Session Duration: 3m 42s
Bounce Rate: 42.1% (Attention Needed)
WEEKLY RETENTION
Week 1: 68% | Week 2: 54% | Week 3: 49% | Week 4: 45%`,
    content: `# Analisis Mockup Dashboard Metrik & UX Flow

> 📸 **Screenshot AI Analysis**: Tangkapan layar dashboard analitik SaaS menunjukkan pertumbuhan metrik aktif 18.2% dan konversi 24%, namun bounce rate 42.1% memerlukan penyesuaian alur.

## 📊 Wawasan Visual & Analisis
1. **Performa Metrik Positif**:
   - Total *Active Users*: 12.480 pengguna (pertumbuhan +18.2%).
   - *Conversion Rate*: 4.8% (naik +24% dibanding bulan lalu).
2. **Area Perhatian (*Bottleneck*)**:
   - *Bounce Rate* berada pada 42.1%, terindikasi akibat alur onboarding yang terlalu panjang.
   - Retensi mingguan turun dari 68% ke 45% pada minggu keempat.

## ✅ Action Items & Rekomendasi UX
- [ ] Redesain kartu onboarding agar langkah verifikasi lebih ringkas
- [ ] Tingkatkan kontras warna tombol utama CTA
- [ ] Tambahkan tooltip penjelasan interaktif pada metrik retensi

## 🔍 Teks Terekstraksi (OCR)
\`\`\`text
ANALYTICS OVERVIEW
Active Users: 12,480 (+18.2%)
Conversion Rate: 4.8% (+24%)
Avg. Session Duration: 3m 42s
Bounce Rate: 42.1% (Attention Needed)
WEEKLY RETENTION: W1: 68% | W2: 54% | W3: 49% | W4: 45%
\`\`\`
`,
    isPinned: false,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 12,
  },
];

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveNotes(INITIAL_NOTES);
      return INITIAL_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_NOTES;
  } catch (err) {
    console.error('Failed to load notes from localStorage:', err);
    return INITIAL_NOTES;
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save notes to localStorage:', err);
  }
}
