import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import 'dayjs/locale/hu';

import { de } from './de';
import { en, type TranslationKey } from './en';
import { hu } from './hu';
import { DEFAULT_LANGUAGE, type Language } from './types';

export type { Language, TranslationKey };
export { DEFAULT_LANGUAGE, isLanguage, LANGUAGES } from './types';

type TranslationParams = Record<string, string | number>;

const DICTIONARIES: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en,
  hu,
  de,
};

export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslationParams
): string {
  const template = DICTIONARIES[language][key] ?? en[key];
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name])
  );
}

interface I18nContextValue {
  language: Language;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: DEFAULT_LANGUAGE,
  t: (key, params) => translate(DEFAULT_LANGUAGE, key, params),
});

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  useEffect(() => {
    dayjs.locale(language);
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language]
  );

  const value = useMemo(() => ({ language, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
