import type {
  CandidateRecord,
  CleanRecord,
  Keyword,
  ThreatSubtype,
} from "../dataset/types/dataset.type";
export function matchKeywords(
  record: CleanRecord,
  keywords: readonly Keyword[],
): CandidateRecord | undefined {
  const haystack = record.clean_text.toLocaleLowerCase();
  const hits = keywords.filter(
    (k) =>
      k.review_status === "APPROVED" &&
      (record.language === "MIXED" || k.language === record.language) &&
      haystack.includes(k.keyword.toLocaleLowerCase()),
  );
  if (!hits.length) return undefined;
  return {
    ...record,
    candidate_id: `candidate-${record.record_id}`,
    matched_keyword_ids: hits.map((k) => k.keyword_id),
    target_subtypes: [
      ...new Set(hits.map((k) => k.target_subtype)),
    ] as ThreatSubtype[],
    candidate_status: "candidate",
  };
}
export function generateCandidates(
  records: readonly CleanRecord[],
  keywords: readonly Keyword[],
): CandidateRecord[] {
  return records
    .map((r) => matchKeywords(r, keywords))
    .filter((x): x is CandidateRecord => x !== undefined);
}
