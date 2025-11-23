export const APP_ADMIN_EMAILS = ['nerves.admin.com'];

export const DEFAULT_ACCOUNT_TIER = 'free' as const;
export const ADMIN_ACCOUNT_TIER = 'plus' as const;

export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
export const GEMINI_VISION_MODEL = 'gemini-1.5-flash';

// OpenAI Configuration
export const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
export const OPENAI_VISION_MODEL = 'gpt-4o'; // Using GPT-4o for vision tasks (latest and most capable)