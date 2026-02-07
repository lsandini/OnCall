import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, Translations } from './types';
import { en } from './locales/en';
import { fi } from './locales/fi';

const locales: Record<Locale, Translations> = { en, fi };

// Dot-notation path type for nested keys
type PathKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? PathKeys<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = PathKeys<Translations>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  translations: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [loaded, setLoaded] = useState(false);

  // Load language from backend settings on mount
  useEffect(() => {
    fetch('/api/config/settings')
      .then(res => res.json())
      .then((settings: Record<string, string>) => {
        if (settings.language === 'fi' || settings.language === 'en') {
          setLocaleState(settings.language);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    // Persist to backend
    fetch('/api/config/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLocale }),
    }).catch(() => {});
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const parts = key.split('.');
    let value: unknown = locales[locale];
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return typeof value === 'string' ? value : key;
  }, [locale]);

  if (!loaded) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, translations: locales[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

export type { Locale, Translations };
