import entries from "./catalog.json";

export const languages = { ru: "Русский", en: "English", es: "Español", zh: "简体中文" } as const;
export type Lang = keyof typeof languages;
export type LocalizedText = { en: string; ru: string; es?: string; zh?: string };
const catalog: Record<string, string[]> = entries;

export function translate(lang: Lang, en: string, ru: string): string {
  if (lang === "ru") return ru;
  if (lang === "en") return en;
  return catalog[en]?.[lang === "es" ? 0 : 1] ?? en;
}

export function localized(lang: Lang, value: LocalizedText) {
  return value[lang] ?? translate(lang, value.en, value.ru);
}
