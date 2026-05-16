'use client';

export const SUPPORTED_TRANSLATE_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو' },
] as const;

const LANGUAGE_COOKIE_KEY = 'googtrans';
const LOCAL_STORAGE_KEY = 'parivartan:language';

function setTranslateCookie(languageCode: string) {
  document.cookie = `${LANGUAGE_COOKIE_KEY}=/en/${languageCode};path=/;max-age=31536000`;
}

export function getStoredLanguage() {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LOCAL_STORAGE_KEY) ?? 'en';
}

export function saveLanguage(languageCode: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, languageCode);
  setTranslateCookie(languageCode);
}

export const triggerTranslation = (lang: string, retries = 6) => {
  if (typeof window === 'undefined') return;

  saveLanguage(lang);

  const attempt = (remaining: number) => {
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;

    if (!select) {
      if (remaining > 0) {
        window.setTimeout(() => attempt(remaining - 1), 500);
      }
      return;
    }

    if (select.value !== lang) {
      select.value = lang;
      select.dispatchEvent(new Event('change'));
    }
  };

  attempt(retries);
};