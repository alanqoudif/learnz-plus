import TesseractOcr, { LANG_ARABIC } from 'react-native-tesseract-ocr';

export interface ParsedStudent {
  id: string;
  name: string;
  number?: string;
}

const OPTIONS = {
  whitelist: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي ءأآإىةABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  blacklist: '0123456789!@#$%^&*()_=+[]{};:\'",.<>/?|`~',
};

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

    const students: ParsedStudent[] = [];
    const seen = new Set<string>();

    for (const uri of localUris) {
      try {
        const text = await TesseractOcr.recognize(uri, LANG_ARABIC, OPTIONS);
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
      throw new Error('لم نتمكن من قراءة أسماء واضحة من الملفات المرفوعة.');
    }

    return students;
  },
  async processRoster(localUri: string) {
    return this.processSheets([localUri]);
  }
};
