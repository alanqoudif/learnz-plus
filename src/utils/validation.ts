// وظائف التحقق من صحة البيانات

import { VALIDATION_LIMITS } from './constants';

// التحقق من صحة الاسم
export const validateName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  const trimmedName = name.trim();
  if (trimmedName.length < VALIDATION_LIMITS.NAME_MIN_LENGTH || 
      trimmedName.length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    return false;
  }
  
  // التحقق من أن الاسم يحتوي على حروف فقط (عربية وإنجليزية)
  const nameRegex = /^[\u0600-\u06FF\s\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s]+$/;
  return nameRegex.test(trimmedName);
};

// التحقق من صحة رقم الهاتف
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleanedPhone = phone.replace(/\s/g, '');
  if (cleanedPhone.length < VALIDATION_LIMITS.PHONE_MIN_LENGTH || 
      cleanedPhone.length > VALIDATION_LIMITS.PHONE_MAX_LENGTH) {
    return false;
  }
  
  // التحقق من أن رقم الهاتف يحتوي على أرقام فقط
  const phoneRegex = /^[0-9]+$/;
  return phoneRegex.test(cleanedPhone);
};

// التحقق من صحة اسم الفصل
export const validateClassName = (className: string): boolean => {
  if (!className || typeof className !== 'string') return false;
  
  const trimmedClassName = className.trim();
  if (trimmedClassName.length < VALIDATION_LIMITS.CLASS_NAME_MIN_LENGTH || 
      trimmedClassName.length > VALIDATION_LIMITS.CLASS_NAME_MAX_LENGTH) {
    return false;
  }
  
  return true;
};

// التحقق من صحة الشعبة
export const validateSection = (section: string): boolean => {
  if (!section || typeof section !== 'string') return false;
  
  const trimmedSection = section.trim();
  if (trimmedSection.length < VALIDATION_LIMITS.SECTION_MIN_LENGTH || 
      trimmedSection.length > VALIDATION_LIMITS.SECTION_MAX_LENGTH) {
    return false;
  }
  
  return true;
};

// التحقق من صحة اسم الطالب
export const validateStudentName = (studentName: string): boolean => {
  return validateName(studentName);
};

// تنسيق الاسم (إزالة المسافات الزائدة)
export const formatName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

// تنسيق رقم الهاتف
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 8) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{2})/, '$1 $2 $3');
  }
  return cleaned;
};

// تنسيق اسم الفصل
export const formatClassName = (className: string): string => {
  return className.trim();
};

// تنسيق الشعبة
export const formatSection = (section: string): string => {
  return section.trim();
};

// التحقق من صحة البيانات المدخلة
export const validateInput = (field: string, value: string): boolean => {
  switch (field) {
    case 'name':
      return validateName(value);
    case 'phone':
      return validatePhoneNumber(value);
    case 'className':
      return validateClassName(value);
    case 'section':
      return validateSection(value);
    case 'studentName':
      return validateStudentName(value);
    default:
      return false;
  }
};

// الحصول على رسالة الخطأ المناسبة
export const getValidationMessage = (field: string, value: string): string => {
  if (!value || value.trim() === '') {
    switch (field) {
      case 'name':
        return 'يرجى إدخال الاسم';
      case 'phone':
        return 'يرجى إدخال رقم الهاتف';
      case 'className':
        return 'يرجى إدخال اسم الفصل';
      case 'section':
        return 'يرجى إدخال الشعبة';
      case 'studentName':
        return 'يرجى إدخال اسم الطالب';
      default:
        return 'يرجى إدخال البيانات المطلوبة';
    }
  }

  if (!validateInput(field, value)) {
    switch (field) {
      case 'name':
        return 'يرجى إدخال اسم صحيح (حروف فقط)';
      case 'phone':
        return 'يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل)';
      case 'className':
        return 'يرجى إدخال اسم فصل صحيح';
      case 'section':
        return 'يرجى إدخال شعبة صحيحة';
      case 'studentName':
        return 'يرجى إدخال اسم طالب صحيح';
      default:
        return 'يرجى إدخال بيانات صحيحة';
    }
  }

  return '';
};

// التحقق من صحة جميع البيانات
export const validateAllFields = (fields: { [key: string]: string }): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const [field, value] of Object.entries(fields)) {
    const error = getValidationMessage(field, value);
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة
export const validateRequiredFields = (fields: { [key: string]: string }, requiredFields: string[]): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    } else if (!validateInput(field, fields[field])) {
      errors[field] = getValidationMessage(field, fields[field]);
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة فقط
export const validateRequiredFieldsOnly = (fields: { [key: string]: string }, requiredFields: string[]): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة مع التحقق من الصيغة
export const validateRequiredFieldsWithFormat = (fields: { [key: string]: string }, requiredFields: string[]): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    } else if (!validateInput(field, fields[field])) {
      errors[field] = getValidationMessage(field, fields[field]);
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة مع التحقق من الصيغة والطول
export const validateRequiredFieldsWithFormatAndLength = (fields: { [key: string]: string }, requiredFields: string[]): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    } else if (!validateInput(field, fields[field])) {
      errors[field] = getValidationMessage(field, fields[field]);
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة مع التحقق من الصيغة والطول والقيم المسموحة
export const validateRequiredFieldsWithFormatLengthAndValues = (fields: { [key: string]: string }, requiredFields: string[], allowedValues?: { [key: string]: string[] }): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    } else if (!validateInput(field, fields[field])) {
      errors[field] = getValidationMessage(field, fields[field]);
      isValid = false;
    } else if (allowedValues && allowedValues[field] && !allowedValues[field].includes(fields[field])) {
      errors[field] = `يرجى اختيار قيمة صحيحة من القائمة`;
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة مع التحقق من الصيغة والطول والقيم المسموحة والقيم الفريدة
export const validateRequiredFieldsWithFormatLengthValuesAndUniqueness = (fields: { [key: string]: string }, requiredFields: string[], allowedValues?: { [key: string]: string[] }, uniqueValues?: { [key: string]: string[] }): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    } else if (!validateInput(field, fields[field])) {
      errors[field] = getValidationMessage(field, fields[field]);
      isValid = false;
    } else if (allowedValues && allowedValues[field] && !allowedValues[field].includes(fields[field])) {
      errors[field] = `يرجى اختيار قيمة صحيحة من القائمة`;
      isValid = false;
    } else if (uniqueValues && uniqueValues[field] && uniqueValues[field].includes(fields[field])) {
      errors[field] = `هذه القيمة موجودة بالفعل`;
      isValid = false;
    }
  }

  return { isValid, errors };
};

// التحقق من صحة البيانات المطلوبة مع التحقق من الصيغة والطول والقيم المسموحة والقيم الفريدة والقيم المطلوبة
export const validateRequiredFieldsWithFormatLengthValuesUniquenessAndRequired = (fields: { [key: string]: string }, requiredFields: string[], allowedValues?: { [key: string]: string[] }, uniqueValues?: { [key: string]: string[] }, requiredValues?: { [key: string]: string[] }): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};
  let isValid = true;

  for (const field of requiredFields) {
    if (!fields[field] || fields[field].trim() === '') {
      errors[field] = getValidationMessage(field, '');
      isValid = false;
    } else if (!validateInput(field, fields[field])) {
      errors[field] = getValidationMessage(field, fields[field]);
      isValid = false;
    } else if (allowedValues && allowedValues[field] && !allowedValues[field].includes(fields[field])) {
      errors[field] = `يرجى اختيار قيمة صحيحة من القائمة`;
      isValid = false;
    } else if (uniqueValues && uniqueValues[field] && uniqueValues[field].includes(fields[field])) {
      errors[field] = `هذه القيمة موجودة بالفعل`;
      isValid = false;
    } else if (requiredValues && requiredValues[field] && !requiredValues[field].includes(fields[field])) {
      errors[field] = `هذه القيمة مطلوبة`;
      isValid = false;
    }
  }

  return { isValid, errors };
};