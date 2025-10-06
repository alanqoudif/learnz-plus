# إعداد Supabase للتطبيق

## الخطوات المطلوبة لإعداد Supabase

### 1. إنشاء مشروع Supabase جديد

1. اذهب إلى [Supabase](https://supabase.com)
2. سجل دخولك أو أنشئ حساب جديد
3. اضغط على "New Project"
4. اختر منظمة أو أنشئ منظمة جديدة
5. أدخل اسم المشروع (مثل: maanstuden-app)
6. اختر كلمة مرور قوية لقاعدة البيانات
7. اختر المنطقة الأقرب لك
8. اضغط على "Create new project"

### 2. الحصول على مفاتيح API

1. بعد إنشاء المشروع، اذهب إلى Settings > API
2. انسخ:
   - Project URL
   - anon/public key

### 3. إنشاء ملف .env

أنشئ ملف `.env` في المجلد الجذر للمشروع وأضف:

```env
EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

مثال:
```env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. إنشاء جداول قاعدة البيانات

1. اذهب إلى SQL Editor في لوحة تحكم Supabase
2. انسخ محتوى ملف `database/schema.sql`
3. الصق الكود واضغط على "Run"

أو يمكنك تشغيل الأوامر التالية في SQL Editor:

```sql
-- إنشاء جدول المعلمين
CREATE TABLE IF NOT EXISTS teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الفصول الدراسية
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(10) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, section, teacher_id)
);

-- إنشاء جدول الطلاب
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, class_id)
);

-- إنشاء جدول جلسات الحضور
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, date)
);

-- إنشاء جدول سجلات الحضور
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, session_id)
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class_id ON attendance_records(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);

-- تفعيل Row Level Security (RLS)
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان - السماح بالوصول الكامل للجميع
CREATE POLICY "Allow all operations on teachers" ON teachers FOR ALL USING (true);
CREATE POLICY "Allow all operations on classes" ON classes FOR ALL USING (true);
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true);
CREATE POLICY "Allow all operations on attendance_sessions" ON attendance_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on attendance_records" ON attendance_records FOR ALL USING (true);
```

### 5. تشغيل التطبيق

```bash
npm install
npm start
```

## الميزات الجديدة

### 1. تسجيل الدخول بالرقم والاسم
- كل معلم له رقم هاتف فريد
- يمكن للمعلم تسجيل الدخول برقم هاتفه
- إذا كان المعلم موجود، يتم تحديث اسمه إذا كان مختلفاً
- إذا لم يكن موجود، يتم إنشاء حساب جديد

### 2. إدارة الفصول الدراسية
- إنشاء فصول جديدة مع الحفظ في قاعدة البيانات
- حذف الفصول مع جميع البيانات المرتبطة
- عرض جميع الفصول للمعلم

### 3. إدارة الطلاب
- إضافة طلاب جدد للفصول
- حذف الطلاب
- عرض قائمة الطلاب مع أرقامهم

### 4. نظام الحضور والغياب
- إنشاء جلسات حضور جديدة
- تسجيل حضور/غياب الطلاب
- عرض تاريخ الحضور

## هيكل قاعدة البيانات

```
teachers (المعلمون)
├── id (UUID)
├── name (VARCHAR)
├── phone_number (VARCHAR, UNIQUE)
└── created_at (TIMESTAMP)

classes (الفصول الدراسية)
├── id (UUID)
├── name (VARCHAR)
├── section (VARCHAR)
├── teacher_id (UUID, FK)
└── created_at (TIMESTAMP)

students (الطلاب)
├── id (UUID)
├── name (VARCHAR)
├── class_id (UUID, FK)
└── created_at (TIMESTAMP)

attendance_sessions (جلسات الحضور)
├── id (UUID)
├── class_id (UUID, FK)
├── date (DATE)
└── created_at (TIMESTAMP)

attendance_records (سجلات الحضور)
├── id (UUID)
├── student_id (UUID, FK)
├── class_id (UUID, FK)
├── session_id (UUID, FK)
├── status (VARCHAR: 'present' | 'absent')
└── created_at (TIMESTAMP)
```

## ملاحظات مهمة

1. **الأمان**: تم تفعيل Row Level Security (RLS) ولكن مع سياسات مفتوحة للجميع. في الإنتاج، يجب تخصيص هذه السياسات.

2. **النسخ الاحتياطي**: Supabase يوفر نسخ احتياطية تلقائية، ولكن يُنصح بإنشاء نسخ احتياطية إضافية.

3. **الأداء**: تم إنشاء فهارس لتحسين أداء الاستعلامات.

4. **البيانات**: جميع البيانات محفوظة في السحابة ويمكن الوصول إليها من أي جهاز.

## استكشاف الأخطاء

### خطأ في الاتصال
- تأكد من صحة URL و API Key في ملف .env
- تأكد من أن المشروع نشط في Supabase

### خطأ في قاعدة البيانات
- تأكد من تشغيل SQL schema
- تحقق من سياسات RLS

### خطأ في التطبيق
- تأكد من تثبيت جميع المكتبات: `npm install`
- امسح cache: `npx expo start --clear`

