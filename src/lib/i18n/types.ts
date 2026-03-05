export type Locale = 'en' | 'es';

export type TranslationKey = string;

// Nested object of translations
export type Translations = {
  [key: string]: string | Translations;
};
