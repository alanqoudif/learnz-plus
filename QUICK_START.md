# دليل البدء السريع - تطبيق الحضور والغياب مع Supabase

## الخطوات السريعة

### 1. إعداد Supabase (5 دقائق)

1. **أنشئ مشروع Supabase جديد:**
   - اذهب إلى [supabase.com](https://supabase.com)
   - اضغط "New Project"
   - اختر اسم المشروع: `maanstuden-app`
   - اختر كلمة مرور قوية
   - اختر المنطقة الأقرب لك

2. **احصل على مفاتيح API:**
   - اذهب إلى Settings > API
   - انسخ Project URL و anon key

3. **أنشئ ملف .env:**
   ```bash
   # في المجلد الجذر للمشروع
   EXPO_PUBLIC_SUPABASE_URL=your_project_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### 2. إنشاء قاعدة البيانات (2 دقيقة)

1. **اذهب إلى SQL Editor في Supabase**
2. **انسخ والصق هذا الكود:**

```sql
-- إنشاء الجداول
CREATE TABLE IF NOT EXISTS teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    section VARCHAR(10) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, section, teacher_id)
);

CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, class_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id, date)
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, session_id)
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);

-- تفعيل الأمان
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Allow all operations on teachers" ON teachers FOR ALL USING (true);
CREATE POLICY "Allow all operations on classes" ON classes FOR ALL USING (true);
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true);
CREATE POLICY "Allow all operations on attendance_sessions" ON attendance_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on attendance_records" ON attendance_records FOR ALL USING (true);
```

3. **اضغط "Run"**

### 3. تشغيل التطبيق (1 دقيقة)

```bash
# تثبيت المكتبات
npm install

# تشغيل التطبيق
npm start
```

## الميزات الجديدة

### ✅ تسجيل الدخول بالرقم والاسم
- كل معلم له رقم هاتف فريد
- تسجيل دخول تلقائي للمعلمين الموجودين
- إنشاء حساب جديد للمعلمين الجدد

### ✅ إدارة الفصول الدراسية
- إنشاء فصول جديدة
- حذف الفصول مع جميع البيانات المرتبطة
- عرض جميع الفصول للمعلم

### ✅ إدارة الطلاب
- إضافة طلاب جدد للفصول
- حذف الطلاب
- عرض قائمة الطلاب مع أرقامهم

### ✅ نظام الحضور والغياب
- إنشاء جلسات حضور جديدة
- تسجيل حضور/غياب الطلاب
- عرض تاريخ الحضور
- إحصائيات مفصلة

## كيفية الاستخدام

### 1. تسجيل الدخول
- أدخل اسمك ورقم هاتفك
- إذا كنت معلم جديد، سيتم إنشاء حساب لك
- إذا كنت موجود، سيتم تسجيل دخولك

### 2. إضافة فصل دراسي
- اضغط "إضافة فصل"
- أدخل اسم الفصل (مثل: الخامس)
- أدخل الشعبة (مثل: أ)
- اضغط "إضافة الفصل"

### 3. إضافة الطلاب
- اختر الفصل
- اضغط "إدارة الطلاب"
- اضغط "إضافة طالب"
- أدخل اسم الطالب

### 4. تسجيل الحضور
- اختر الفصل
- اضغط "تسجيل الحضور"
- اضغط "بدء التسجيل"
- اسحب الكارت لليمين للحضور أو لليسار للغياب
- أو استخدم الأزرار اليدوية

### 5. عرض التاريخ
- اختر الفصل
- اضغط "عرض تاريخ الحضور"
- اضغط على أي جلسة لرؤية التفاصيل

## استكشاف الأخطاء

### خطأ في الاتصال
```
Error: Invalid API key
```
**الحل:** تأكد من صحة API key في ملف .env

### خطأ في قاعدة البيانات
```
Error: relation "teachers" does not exist
```
**الحل:** تأكد من تشغيل SQL schema في Supabase

### خطأ في التطبيق
```
Error: Cannot read property 'map' of undefined
```
**الحل:** امسح cache: `npx expo start --clear`

## نصائح مهمة

1. **احتفظ بنسخة احتياطية** من مفاتيح API
2. **لا تشارك** مفاتيح API مع أحد
3. **اختبر التطبيق** بعد كل تغيير
4. **استخدم أرقام هواتف حقيقية** للاختبار

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من ملف `.env`
2. تأكد من تشغيل SQL schema
3. امسح cache التطبيق
4. أعد تشغيل التطبيق

---

**مبروك! 🎉** تطبيقك الآن متصل بقاعدة بيانات Supabase ويعمل بالكامل!

