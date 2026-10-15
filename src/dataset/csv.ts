import { stringify } from "csv-stringify/sync";
import { parse } from "csv-parse/sync";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  CandidateRecord,
  Keyword,
  Language,
  RawRecord,
  ThreatSubtype,
} from "../types/dataset";

const LANGUAGES = new Set<Language>(["RU", "KK", "MIXED"]);
const THREAT_SUBTYPES = new Set<ThreatSubtype>([
  "ETHNIC_HATE",
  "RACIAL_HATE",
  "RELIGIOUS_HATE",
  "GENDER_HATE",
  "SEXUAL_ORIENTATION_HATE",
  "DISABILITY_HATE",
  "SOCIAL_CLASS_HATE",
  "DEHUMANIZATION",
  "GROUP_EXCLUSION",
  "GROUP_VIOLENCE_INCITEMENT",
]);
const KEYWORD_TYPES = new Set<Keyword["keyword_type"]>([
  "EXACT",
  "PHRASE",
  "SLANG",
  "MISSPELLING",
  "OBFUSCATED",
  "TRANSLITERATION",
  "MIXED",
  "ANTONYM_CONTEXT",
]);
const REVIEW_STATUSES = new Set<Keyword["review_status"]>([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "AMBIGUOUS",
]);


export async function writeCsv<T extends object>(
  path: string,
  rows: readonly T[],
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify([...rows], { header: true }));
}

export async function readKeywords(path: string): Promise<Keyword[]> {
  const text = await readFile(path, "utf8");
  const rows: unknown = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  if (!Array.isArray(rows)) throw new Error("Keywords CSV must contain rows");
  return rows.map((row, index) => parseKeyword(row, index + 2));
}

function parseKeyword(value: unknown, line: number): Keyword {
  if (typeof value !== "object" || value === null) {
    throw new Error(`Invalid keyword row at line ${line}`);
  }
  const row = value as Record<string, unknown>;
  const language = requiredString(row, "language", line);
  const targetSubtype = requiredString(row, "target_subtype", line);
  const keywordType = requiredString(row, "keyword_type", line);
  const reviewStatus = requiredString(row, "review_status", line);

  if (!LANGUAGES.has(language as Language)) {
    throw new Error(`Invalid language at keywords.csv line ${line}`);
  }
  if (!THREAT_SUBTYPES.has(targetSubtype as ThreatSubtype)) {
    throw new Error(`Invalid target_subtype at keywords.csv line ${line}`);
  }
  if (!KEYWORD_TYPES.has(keywordType as Keyword["keyword_type"])) {
    throw new Error(`Invalid keyword_type at keywords.csv line ${line}`);
  }
  if (!REVIEW_STATUSES.has(reviewStatus as Keyword["review_status"])) {
    throw new Error(`Invalid review_status at keywords.csv line ${line}`);
  }
  if (requiredString(row, "threat_family", line) !== "HATE_AND_DISCRIMINATION") {
    throw new Error(`Invalid threat_family at keywords.csv line ${line}`);
  }

  return {
    keyword_id: requiredString(row, "keyword_id", line),
    threat_family: "HATE_AND_DISCRIMINATION",
    target_subtype: targetSubtype as ThreatSubtype,
    language: language as Language,
    keyword: requiredString(row, "keyword", line),
    keyword_type: keywordType as Keyword["keyword_type"],
    source: requiredString(row, "source", line),
    review_status: reviewStatus as Keyword["review_status"],
    review_comment: optionalString(row, "review_comment"),
  };
}

function requiredString(
  row: Record<string, unknown>,
  key: string,
  line: number,
): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${key} at keywords.csv line ${line}`);
  }
  return value.trim();
}

function optionalString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

export const rawColumns = (rows: readonly RawRecord[]) => rows;

export const candidateColumns = (rows: readonly CandidateRecord[]) =>
  rows.map((r) => ({
    ...r,
    matched_keyword_ids: r.matched_keyword_ids.join("|"),
    target_subtypes: r.target_subtypes.join("|"),
  }));
