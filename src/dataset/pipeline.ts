import { writeCsv, readKeywords, candidateColumns } from "./csv";
import { preprocess } from "../preprocessing/preprocess";
import { generateCandidates } from "../keywords/keywordMatcher";
import type { RawRecord } from "./types/dataset.type";

export async function runPipeline(
  raw: RawRecord[],
  keywordPath: string,
  outputDir: string,
): Promise<{ cleaned: number; candidates: number }> {
  const keywords = await readKeywords(keywordPath);
  const cleaned = preprocess(raw);
  const candidates = generateCandidates(cleaned, keywords);
  await writeCsv(`${outputDir}/cleaned.csv`, cleaned);
  await writeCsv(`${outputDir}/candidates.csv`, candidateColumns(candidates));
  return { cleaned: cleaned.length, candidates: candidates.length };
}
