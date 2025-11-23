import * as FileSystem from 'expo-file-system/legacy';
import { OPENAI_API_KEY, OPENAI_VISION_MODEL } from '../config/appConfig';

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

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MIME_TYPE = 'image/jpeg';
const OCR_UNAVAILABLE_MESSAGE =
  'ميزة استخراج الأسماء من الصور غير متاحة حالياً. تحقق من اتصال الإنترنت أو إعداد مفتاح OpenAI.';
const OCR_CACHE_DIR = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}students-ocr/` : null;
const OCR_PROMPT =
  'أنت مساعد متخصص في قراءة وتحليل كشوف الحضور والجداول. مهمتك هي استخراج جميع أسماء الطلاب من الصورة بدقة عالية.\n\n' +
  'تعليمات صارمة:\n' +
  '1. اقرأ كل النص الموجود في الصورة بعناية فائقة\n' +
  '2. استخرج فقط الأسماء الشخصية للطلاب (مثل: أحمد، محمد، فاطمة، خالد)\n' +
  '3. تجاهل تماماً:\n' +
  '   - الأرقام (1، 2، 3...)\n' +
  '   - التواريخ (2024، 1445...)\n' +
  '   - العناوين (اسم الطالب، الرقم، الحضور...)\n' +
  '   - الكلمات الشائعة (طالب، طالبة، حاضر، غائب، ملاحظات...)\n' +
  '   - الرموز والعلامات\n' +
  '   - أي نص ليس اسماً شخصياً\n' +
  '4. إذا كان هناك جدول، اقرأ فقط عمود الأسماء وتجاهل باقي الأعمدة\n' +
  '5. نظف الأسماء: أزل أي أرقام أو رموز ملتصقة بالأسماء\n' +
  '6. إذا كانت الصورة فارغة أو لا تحتوي على أسماء، أعد {"students":[]}\n\n' +
  'مهم جداً:\n' +
  '- استخرج فقط الأسماء الشخصية الحقيقية\n' +
  '- لا تستخرج كلمات مثل: "طالب"، "اسم"، "الرقم"، "الحضور"، "الغياب"\n' +
  '- أعد الاستجابة بتنسيق JSON فقط بدون أي نص إضافي\n\n' +
  'التنسيق المطلوب:\n' +
  '{"students":["الاسم الأول","الاسم الثاني","الاسم الثالث"]}\n\n' +
  'أمثلة صحيحة:\n' +
  'إذا رأيت: "1. أحمد محمد علي" و "2. فاطمة حسن" و "3. خالد"\n' +
  'أعد: {"students":["أحمد محمد علي","فاطمة حسن","خالد"]}\n\n' +
  'إذا رأيت: "اسم الطالب: محمد" و "الرقم: 5"\n' +
  'أعد: {"students":["محمد"]} فقط (تجاهل "اسم الطالب" و "الرقم")\n\n' +
  'الآن اقرأ الصورة واستخرج فقط الأسماء الشخصية للطلاب:';
const BASE64_ENCODING: any =
  (FileSystem as any)?.EncodingType?.Base64 ??
  (FileSystem as any)?.EncodingType?.BASE64 ??
  'base64';

// قائمة الكلمات الشائعة التي يجب تجاهلها
const COMMON_WORDS_TO_REMOVE = [
  'طالب', 'طالبة', 'طلاب', 'طلبة',
  'اسم', 'أسماء', 'الاسم', 'الأسماء',
  'رقم', 'الرقم', 'أرقام',
  'حاضر', 'حضور', 'الحضور',
  'غائب', 'غياب', 'الغياب',
  'ملاحظات', 'ملاحظة',
  'الصف', 'الفصل', 'الشعبة',
  'التاريخ', 'تاريخ',
  'م', 'م.', 'مثال',
  'من', 'في', 'على', 'إلى', 'عن', 'مع',
  'هو', 'هي', 'هم', 'هن',
  'الذي', 'التي', 'الذين', 'اللاتي',
  'student', 'name', 'number', 'attendance', 'absent',
  'class', 'grade', 'section', 'date',
];

function normalizeLine(line: string) {
  if (!line) return '';
  
  // إزالة الأرقام والرموز
  let cleaned = line.replace(/[0-9.,:;()\-_/\\\[\]{}"']+/g, ' ');
  
  // إزالة الكلمات الشائعة
  COMMON_WORDS_TO_REMOVE.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  });
  
  // تنظيف المسافات المتعددة
  const normalized = cleaned.replace(/\s+/g, ' ').trim();
  
  // إزالة الأسطر التي تبدأ بكلمات شائعة أو قصيرة جداً
  if (normalized.length < 2) {
    return '';
  }
  
  return normalized;
}

function extractNames(text: string) {
  // تجاهل JSON الفارغ أو النصوص التي تبدو كـ JSON فقط
  const trimmedText = text.trim();
  if (/^\s*\{\s*"students"\s*:\s*\[\s*\]\s*\}\s*$/i.test(trimmedText) ||
      /^\s*\{\s*"names"\s*:\s*\[\s*\]\s*\}\s*$/i.test(trimmedText)) {
    return [];
  }

  const containsLetters = /[A-Za-z\u0600-\u06FF]/;
  const candidates = text
    .split(/\r?\n/)
    .map(line => normalizeLine(line))
    .filter(line => {
      // تجاهل الأسطر التي تبدو كـ JSON structure
      if (/^\s*[\{\[\}\]",:\s]+\s*$/i.test(line)) {
        return false;
      }
      return line.length > 1 && containsLetters.test(line);
    });

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

async function extractRawTextFromImage(file: SheetFileInput): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('لم يتم إعداد مفتاح OpenAI API.');
  }

  const localUri = await prepareLocalUri(file.uri);
  let base64 = '';
  try {
    base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: BASE64_ENCODING,
    });
  } catch (fileError) {
    throw new Error('تعذر تجهيز الملف للمعالجة.');
  }

  const mimeType = guessMimeType(file);
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const payload = {
    model: OPENAI_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'اقرأ كل النص الموجود في هذه الصورة وأعد النص كما هو بدون أي تعديل. إذا كانت الصورة تحتوي على جدول أو قائمة، أعد كل النص الموجود.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || 'فشل استخراج النص');
  }

  return extractTextFromOpenAIResponse(data);
}

async function recognizeWithOpenAI(file: SheetFileInput) {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.trim() === '') {
    console.error('❌ مفتاح OpenAI API غير موجود أو فارغ');
    throw new Error('لم يتم إعداد مفتاح OpenAI API. يرجى إضافة EXPO_PUBLIC_OPENAI_API_KEY في ملف .env');
  }
  
  console.log(`🔑 استخدام مفتاح API: ${OPENAI_API_KEY.substring(0, 10)}...`);
  console.log(`🤖 استخدام النموذج: ${OPENAI_VISION_MODEL}`);

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

  const mimeType = guessMimeType(file);
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const payload = {
    model: OPENAI_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: OCR_PROMPT,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high', // استخدام دقة عالية لقراءة أفضل
            },
          },
        ],
      },
    ],
    max_tokens: 4096, // زيادة الحد الأقصى للتوكنز
    temperature: 0.1, // تقليل temperature للحصول على نتائج أكثر دقة
  };

  console.log(`📤 إرسال طلب إلى OpenAI (حجم الصورة: ${base64.length} حرف)`);
  
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  // 🔍 سجل كامل الاستجابة للتشخيص
  console.log('📥 OpenAI Response Status:', response.status);
  console.log('📥 OpenAI Response:', JSON.stringify(data, null, 2));
  
  if (!response.ok || data?.error) {
    const message = data?.error?.message || 'تعذر الحصول على استجابة صالحة من OpenAI.';
    console.error('❌ OpenAI API Error:', message);
    console.error('❌ Error Details:', data?.error);
    
    // رسائل خطأ أكثر وضوحاً
    if (data?.error?.code === 'invalid_api_key' || message.includes('API key')) {
      throw new Error('مفتاح OpenAI API غير صالح. يرجى التحقق من المفتاح في ملف .env');
    } else if (data?.error?.code === 'insufficient_quota') {
      throw new Error('تم تجاوز الحد المسموح به لـ OpenAI API. يرجى التحقق من رصيد حسابك');
    } else if (response.status === 401) {
      throw new Error('مفتاح OpenAI API غير صالح أو منتهي الصلاحية');
    } else if (response.status === 429) {
      throw new Error('تم تجاوز معدل الطلبات المسموح به. يرجى المحاولة لاحقاً');
    }
    
    throw new Error(`خطأ من OpenAI: ${message}`);
  }

  const recognizedText = extractTextFromOpenAIResponse(data);
  console.log('📝 Extracted Text from OpenAI:', recognizedText);
  return recognizedText;
}

function extractTextFromOpenAIResponse(payload: any) {
  if (!payload?.choices?.length) {
    return '';
  }

  for (const choice of payload.choices) {
    const message = choice?.message;
    if (!message) continue;

    const content = message?.content;
    if (typeof content === 'string' && content.trim().length > 0) {
      return content.trim();
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

function cleanStudentName(name: string): string {
  if (!name) return '';
  
  let cleaned = name.trim();
  
  // إزالة الأرقام في البداية أو النهاية
  cleaned = cleaned.replace(/^[0-9.\-]+\s*/, '').replace(/\s*[0-9.\-]+$/, '');
  
  // إزالة الكلمات الشائعة
  COMMON_WORDS_TO_REMOVE.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, ' ').trim();
  });
  
  // إزالة الرموز والعلامات
  cleaned = cleaned.replace(/[.,:;()\-_/\\\[\]{}"'•\-\s]+/g, ' ').trim();
  
  // تنظيف المسافات المتعددة
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
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
    let names: string[] = [];
    
    if (Array.isArray(parsed)) {
      names = parsed.filter(item => typeof item === 'string');
    } else if (Array.isArray(parsed?.students)) {
      names = parsed.students.filter((item: any) => typeof item === 'string');
    } else if (Array.isArray(parsed?.names)) {
      names = parsed.names.filter((item: any) => typeof item === 'string');
    }
    
    // تنظيف الأسماء المستخرجة
    return names
      .map(name => cleanStudentName(name))
      .filter(name => name.length > 0);
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
        console.log(`🔄 بدء معالجة الملف: ${file.name || file.uri}`);
        let text = '';
        try {
          text = await recognizeWithOpenAI(file);
          console.log(`✅ تم استلام استجابة من OpenAI (${text.length} حرف)`);
        } catch (openaiError: any) {
          console.error('❌ فشل الاتصال بـ OpenAI Vision:', openaiError);
          // إذا كان الخطأ متعلق بمفتاح API، ارمي الخطأ مباشرة
          if (openaiError?.message?.includes('مفتاح OpenAI API') || 
              openaiError?.message?.includes('API key') ||
              !OPENAI_API_KEY) {
            throw new Error('لم يتم إعداد مفتاح OpenAI API. يرجى إضافة EXPO_PUBLIC_OPENAI_API_KEY في ملف .env');
          }
          // للأخطاء الأخرى، حاول مرة أخرى مع استخراج النص الخام
          console.log('🔄 محاولة استخراج النص الخام كبديل...');
          try {
            text = await extractRawTextFromImage(file);
            console.log(`✅ تم استخراج النص الخام (${text.length} حرف)`);
          } catch (fallbackError) {
            console.error('❌ فشل استخراج النص الخام أيضاً:', fallbackError);
            throw new Error(`فشل معالجة الصورة: ${openaiError?.message || 'خطأ غير معروف'}`);
          }
        }

        if (!text || text.trim().length === 0) {
          console.warn('⚠️ OpenAI لم يعيد أي نص من الملف:', file.name || file.uri);
          // حاول استخراج النص الخام كبديل
          try {
            text = await extractRawTextFromImage(file);
            console.log(`✅ تم استخراج النص الخام كبديل (${text.length} حرف)`);
          } catch (fallbackError) {
            console.warn('⚠️ فشل استخراج النص الخام أيضاً');
            continue;
          }
        }

        console.log(`📄 النص المستخرج من OpenAI (${text.length} حرف):`, text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        
        const structuredNames = parseJsonNames(text);
        let names: string[] = [];
        
        if (structuredNames.length > 0) {
          names = structuredNames;
          console.log(`✅ تم العثور على ${names.length} اسم من بنية JSON`);
        } else {
          // إذا كان JSON فارغ أو غير صالح، حاول استخراج الأسماء من النص مباشرة
          const isLikelyEmptyJson = /^\s*\{\s*"students"\s*:\s*\[\s*\]\s*\}\s*$/i.test(text.trim());
          
          if (isLikelyEmptyJson) {
            console.warn('⚠️ OpenAI أعاد مصفوفة طلاب فارغة. محاولة استخراج النص الخام...');
            // إذا كان JSON فارغ، حاول مرة أخرى مع prompt مختلف يطلب استخراج النص الخام
            try {
              const rawText = await extractRawTextFromImage(file);
              if (rawText && rawText.trim().length > 0) {
                names = extractNames(rawText);
                console.log(`📝 تم استخراج ${names.length} اسم من النص الخام`);
              } else {
                console.warn('⚠️ النص الخام أيضاً فارغ');
              }
            } catch (fallbackError) {
              console.warn('⚠️ فشل استخراج النص الخام:', fallbackError);
            }
          } else {
            names = extractNames(text);
            console.log(`📝 تم استخراج ${names.length} اسم من تحليل النص`);
          }
        }
        
        // تنظيف جميع الأسماء المستخرجة
        names = names
          .map(name => cleanStudentName(name))
          .filter(name => name.length > 1); // إزالة الأسماء القصيرة جداً
        
        console.log(`📋 العدد النهائي للأسماء المستخرجة: ${names.length}`, names);

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
      } catch (error: any) {
        console.error('❌ فشل التعرف على ملف مرفوع', file?.name || file?.uri, error);
        // إذا كان الخطأ متعلق بمفتاح API، ارمي الخطأ مباشرة
        if (error?.message?.includes('مفتاح OpenAI API') || error?.message?.includes('API key')) {
          throw error;
        }
        // للأخطاء الأخرى، استمر في معالجة الملفات الأخرى
        console.warn('⚠️ سيتم تخطي هذا الملف ومتابعة الملفات الأخرى');
      }
    }

    if (!students.length) {
      throw new Error('لم نتمكن من قراءة أسماء واضحة من الملفات المرفوعة. تأكد من:\n1. وضوح الصورة وجودتها\n2. وجود مفتاح OpenAI API في ملف .env\n3. اتصال الإنترنت يعمل بشكل صحيح');
    }

    return students;
  },
  async processRoster(file: string | SheetFileInput) {
    return this.processSheets([file]);
  }
};
