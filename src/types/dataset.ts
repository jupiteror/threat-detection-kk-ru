export type Language = "RU" | "KK" | "MIXED";
export type ThreatSubtype =
  | "ETHNIC_HATE"
  | "RACIAL_HATE"
  | "RELIGIOUS_HATE"
  | "GENDER_HATE"
  | "SEXUAL_ORIENTATION_HATE"
  | "DISABILITY_HATE"
  | "SOCIAL_CLASS_HATE"
  | "DEHUMANIZATION"
  | "GROUP_EXCLUSION"
  | "GROUP_VIOLENCE_INCITEMENT";

export interface RawRecord {
  record_id: string;
  source: "vk";
  source_type: "post" | "comment" | "reply";
  source_url: string;
  source_group_id: number;
  source_item_id: number;
  source_parent_id?: number;
  published_at: string;
  collected_at: string;
  text: string;
  language_hint?: Language;
}
export interface CleanRecord extends RawRecord { clean_text: string; anonymized_text: string; language: Language; }
export type KeywordType =
  | "EXACT"
  | "PHRASE"
  | "SLANG"
  | "MISSPELLING"
  | "OBFUSCATED"
  | "TRANSLITERATION"
  | "MIXED"
  | "ANTONYM_CONTEXT";

export type ReviewStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "AMBIGUOUS";

export interface Keyword {
  keyword_id: string;
  threat_family: "HATE_AND_DISCRIMINATION";
  target_subtype: ThreatSubtype;
  language: Language;
  keyword: string;
  keyword_type: KeywordType;
  source: string;
  review_status: ReviewStatus;
  review_comment: string;
}
export interface CandidateRecord extends CleanRecord { candidate_id: string; matched_keyword_ids: string[]; target_subtypes: ThreatSubtype[]; candidate_status: "candidate" | "reviewed"; }
