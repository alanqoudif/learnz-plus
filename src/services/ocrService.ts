import * as FileSystem from 'expo-file-system/legacy';
import { GEMINI_API_KEY, GEMINI_VISION_MODEL } from '../config/appConfig';

export interface ParsedStudent {
  id: string;
  name: string;
  number?: string;
}

export interface SheetFileInput {
  uri: string;
  mimeType?: string | null;
  name?: string | null;
}

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const DEFAULT_MIME_TYPE = 'image/jpeg';
const OCR_UNAVAILABLE_MESSAGE =
  'ميزة استخراج الأسماء من الصور غير متاحة حالياً. تحقق من اتصال الإنترنت أو إعداد مفتاح Gemini.';
const OCR_CACHE_DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}students-ocr/` : null;
const GEMINI_PROMPT =
  'حلل كشف الحضور المرفوع وأعد الاستجابة بتنسيق JSON من الشكل {"students":["اسم1","اسم2", ...]}. ' +
  'احرص على أن تحتوي المصفوفة على الأسماء فقط بدون أرقام أو رموز أو شرح إضافي، ولا تُرجع أي نص آخر خارج JSON.';
const BASE64_ENCODING: any =
  (FileSystem as any)?.EncodingType?.Base64 ??
  (FileSystem as any)?.EncodingType?.BASE64 ??
  'base64';

function normalizeLine(line: string) {
  if (!line) return '';
  const noDigits = line.replace(/[0-9.,:;()\-_/\\]+/g, ' ');
  const normalized = noDigits.replace(/\s+/g, ' ').trim();
  return normalized;
}

function extractNames(text: string) {
  const containsLetters = /[A-Za-z\u0600-\u06FF]/;
  const candidates = text
    .split(/\r?\n/)
    .map(line => normalizeLine(line))
    .filter(line => line.length > 1 && containsLetters.test(line));

  const unique = new Map<string, string>();
  candidates.forEach(line => {
    const key = line.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, line);
    }
  });

  return Array.from(unique.values());
}

function guessMimeType(file: SheetFileInput) {
  if (file.mimeType) {
    return file.mimeType;
  }
  const name = file.name || file.uri;
  const extension = name?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return DEFAULT_MIME_TYPE;
  }
}

async function ensureCacheDirExists() {
  if (!OCR_CACHE_DIR) {
    return;
  }

  try {
    const dirInfo = await FileSystem.getInfoAsync(OCR_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(OCR_CACHE_DIR, { intermediates: true });
    }
  } catch (error) {
    console.warn('تعذر إنشاء مجلد تخزين مؤقت لملفات OCR:', error);
  }
}

async function prepareLocalUri(uri: string) {
  if (!uri) {
    throw new Error('تم تمرير ملف بدون مسار صالح.');
  }

  if (uri.startsWith('file://') || !OCR_CACHE_DIR) {
    return uri;
  }

  await ensureCacheDirExists();
  const destination = `${OCR_CACHE_DIR}${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.warn('تعذر نسخ الملف إلى مجلد التخزين المؤقت، سيتم استخدام الرابط الأصلي:', error);
    return uri;
  }
}

async function recognizeWithGemini(file: SheetFileInput) {
  if (!GEMINI_API_KEY) {
    throw new Error('لم يتم إعداد مفتاح Gemini API.');
  }

  const localUri = await prepareLocalUri(file.uri);
  let base64 = '';
  try {
    base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: BASE64_ENCODING,
    });
  } catch (fileError) {
    console.warn('تعذر قراءة الملف وتحويله إلى Base64:', fileError);
    throw new Error('تعذر تجهيز الملف للمعالجة. حاول اختيار صورة أخرى أو أعد المحاولة.');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: GEMINI_PROMPT },
          {
            inline_data: {
              mime_type: guessMimeType(file),
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  // 🔍 سجل كامل الاستجابة للتشخيص
  console.log('📥 Gemini Response:', JSON.stringify(data, null, 2));
  
  if (!response.ok || data?.error) {
    const message = data?.error?.message || 'تعذر الحصول على استجابة صالحة من Gemini.';
    console.error('❌ Gemini API Error:', message, data);
    throw new Error(message);
  }

  const recognizedText = extractTextFromGeminiResponse(data);
  console.log('📝 Extracted Text from Gemini:', recognizedText);
  return recognizedText;
}

function extractTextFromGeminiResponse(payload: any) {
  if (!payload?.candidates?.length) {
    return '';
  }

  for (const candidate of payload.candidates) {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) continue;

    const text = parts
      .map(part => part?.text)
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n')
      .trim();

    if (text) {
      return text;
    }
  }

  return '';
}

function normalizeSheetInputs(inputs: Array<string | SheetFileInput>): SheetFileInput[] {
  return inputs
    .map(input => {
      if (typeof input === 'string') {
        return { uri: input } as SheetFileInput;
      }
      return input;
    })
    .filter((file): file is SheetFileInput => !!file && typeof file.uri === 'string' && file.uri.length > 0);
}

function parseJsonNames(raw: string) {
  if (!raw) {
    return [];
  }

  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string');
    }
    if (Array.isArray(parsed?.students)) {
      return parsed.students.filter((item: any) => typeof item === 'string');
    }
    if (Array.isArray(parsed?.names)) {
      return parsed.names.filter((item: any) => typeof item === 'string');
    }
  } catch (error) {
    // ignore JSON parse errors and fallback
  }

  return [];
}

export const ocrService = {
  async processSheets(inputs: Array<string | SheetFileInput>) {
    if (!inputs.length) {
      throw new Error('يرجى اختيار ملف واحد على الأقل');
    }

    const files = normalizeSheetInputs(inputs);
    if (!files.length) {
      throw new Error('لم يتم توفير مسارات ملفات صالحة للمعالجة.');
    }

    const students: ParsedStudent[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      try {
        let text = '';
        try {
          text = await recognizeWithGemini(file);
        } catch (geminiError) {
          console.warn('فشل الاتصال بـ Gemini Vision', geminiError);
          throw geminiError;
        }

        if (!text) {
          console.warn('لم يتمكن Gemini من استخراج نص واضح من الملف:', file.name || file.uri);
          continue;
        }

        const structuredNames = parseJsonNames(text);
        const names = structuredNames.length ? structuredNames : extractNames(text);
        console.log(`📋 Extracted ${names.length} names from file:`, names);

        names.forEach((name) => {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            students.push({
              id: `${file.uri}-${students.length}`,
              name,
            });
          }
        });
      } catch (error) {
        console.warn('فشل التعرف على ملف مرفوع', file?.name || file?.uri, error);
      }
    }

    if (!students.length) {
      throw new Error('لم نتمكن من قراءة أسماء واضحة من الملفات المرفوعة. تأكد من وضوح النص وحاول مرة أخرى.');
    }

    return students;
  },
  async processRoster(file: string | SheetFileInput) {
    return this.processSheets([file]);
  }
};
