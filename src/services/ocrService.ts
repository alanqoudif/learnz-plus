import TesseractOcr, { LANG_ARABIC } from 'react-native-tesseract-ocr';

type MlKitModule = typeof import('expo-mlkit-ocr').default;

let MlKitOcr: MlKitModule | null = null;
try {
  // Lazy require so the app keeps working on builds that don't bundle the native module (Expo Go, etc.)
  MlKitOcr = require('expo-mlkit-ocr').default;
} catch (error: any) {
  console.warn('Expo ML Kit OCR module not available in this build:', error?.message);
}

export interface ParsedStudent {
  id: string;
  name: string;
  number?: string;
}

const OPTIONS = {
  whitelist: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي ءأآإىةABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  blacklist: '0123456789!@#$%^&*()_=+[]{};:\'",.<>/?|`~',
};

const isTesseractAvailable = !!TesseractOcr && typeof TesseractOcr.recognize === 'function';
const isMlKitAvailable = !!MlKitOcr && typeof MlKitOcr.recognizeText === 'function';
const OCR_UNAVAILABLE_MESSAGE =
  'ميزة استخراج الأسماء من الصور غير متاحة في هذه النسخة. يرجى التحديث إلى آخر إصدار (خارج Expo Go) لتفعيل OCR.';

async function recognizeWithMlKit(uri: string) {
  if (!isMlKitAvailable || !MlKitOcr) {
    return '';
  }
  const result = await MlKitOcr.recognizeText(uri);
  if (!result) return '';
  if (result.text?.trim()) {
    return result.text;
  }
  const blockText = result.blocks?.map(block => block.text).filter(Boolean).join('\n');
  return blockText || '';
}

async function recognizeWithTesseract(uri: string) {
  if (!isTesseractAvailable) {
    return '';
  }
  return await TesseractOcr.recognize(uri, LANG_ARABIC, OPTIONS);
}

function normalizeLine(line: string) {
  if (!line) return '';
  const noDigits = line.replace(/[0-9.,:;()\-_/\\]+/g, ' ');
  const normalized = noDigits.replace(/\s+/g, ' ').trim();
  return normalized;
}

function extractNames(text: string) {
  const candidates = text
    .split(/\r?\n/)
    .map(line => normalizeLine(line))
    .filter(line => line.length > 1 && /[اأإآء-ي]/.test(line));

  const unique = new Map<string, string>();
  candidates.forEach(line => {
    const key = line.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, line);
    }
  });

  return Array.from(unique.values());
}

export const ocrService = {
  async processSheets(localUris: string[]) {
    if (!localUris.length) {
      throw new Error('يرجى اختيار ملف واحد على الأقل');
    }
    if (!isMlKitAvailable && !isTesseractAvailable) {
      console.warn(
        'ميزة OCR غير متوفرة: لا يتوفر أي محرك OCR مثبت في هذه البناية. تأكد من تثبيت build يدعم expo-mlkit-ocr أو مكتبة Tesseract.'
      );
      throw new Error(OCR_UNAVAILABLE_MESSAGE);
    }

    const students: ParsedStudent[] = [];
    const seen = new Set<string>();

    for (const uri of localUris) {
      try {
        let text = '';
        if (isMlKitAvailable) {
          try {
            text = await recognizeWithMlKit(uri);
          } catch (mlError) {
            console.warn('🔁 فشل OCR باستخدام ML Kit - سيتم استخدام Tesseract كحل احتياطي', mlError);
          }
        }

        if (!text && isTesseractAvailable) {
          text = await recognizeWithTesseract(uri);
        }

        if (!text) {
          console.warn('لم يتمكن OCR من استخراج نص واضح من الملف:', uri);
          continue;
        }

        const names = extractNames(text);
        names.forEach((name) => {
          const key = name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            students.push({
              id: `${uri}-${students.length}`,
              name,
            });
          }
        });
      } catch (error) {
        console.warn('فشل التعرف على ملف مرفوع', uri, error);
      }
    }

    if (!students.length) {
      throw new Error('لم نتمكن من قراءة أسماء واضحة من الملفات المرفوعة. تأكد من وضوح النص وحاول مرة أخرى.');
    }

    return students;
  },
  async processRoster(localUri: string) {
    return this.processSheets([localUri]);
  }
};
