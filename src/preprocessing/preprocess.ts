import type {
  CleanRecord,
  Language,
  RawRecord,
} from "../dataset/types/dataset.type";

// Большая часть букв у русского и казахского языков общая, поэтому общий
// кириллический диапазон нельзя использовать как признак русского языка.
const KAZAKH_SPECIFIC_LETTERS = /[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const RUSSIAN_SPECIFIC_LETTERS = /[ЁёЦцЩщЪъЭэ]/;

export function detectLanguage(text: string): Language {
  const hasKazakhSpecificLetters = KAZAKH_SPECIFIC_LETTERS.test(text);
  const hasRussianSpecificLetters = RUSSIAN_SPECIFIC_LETTERS.test(text);

  if (hasKazakhSpecificLetters && hasRussianSpecificLetters) return "MIXED";
  return hasKazakhSpecificLetters ? "KK" : "RU";
}
export function anonymize(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "[URL]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[PHONE]")
    .replace(/(^|\s)@[A-Za-z0-9_]+/g, "$1[USER]");
}
export function cleanText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function preprocess(records: readonly RawRecord[]): CleanRecord[] {
  return records
    .filter((r) => r.text.trim())
    .map((r) => {
      const clean_text = cleanText(r.text);
      return {
        ...r,
        clean_text,
        anonymized_text: anonymize(clean_text),
        language: detectLanguage(clean_text),
      };
    });
}
