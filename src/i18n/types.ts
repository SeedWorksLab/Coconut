export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hu', label: 'Hungarian', nativeLabel: 'Magyar' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.code === value);
}
