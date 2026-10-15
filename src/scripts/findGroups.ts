import "dotenv/config";
import { loadConfig } from "../config/env";
import { writeCsv } from "../dataset/csv";
import { VKConnector } from "../vk/VKConnector";
import { VKGroupFinder } from "../vk/VKGroupFinder";

const DEFAULT_QUERIES = [
  "Казахстан",
  "Қазақстан",
  "Новости Казахстана",
  "Қазақстан жаңалықтары",
  "Алматы",
  "Астана",
  "Шымкент",
  "қазақ тілі",
  "русские в Казахстане",
  "религия Казахстан",
];

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.vk.accessToken) throw new Error("VK_ACCESS_TOKEN is not configured");

  const finder = new VKGroupFinder(
    new VKConnector(config.vk.accessToken, config.vk.apiVersion),
    { queryLimit: 30, candidatesLimit: 30, recentPostsToCheck: 5 },
  );
  const candidates = await finder.find(DEFAULT_QUERIES);
  await writeCsv("data/sources/04_source_candidates.csv", candidates);
  console.log(`Found ${candidates.length} active public VK source candidates`);
  for (const candidate of candidates.slice(0, 10)) {
    console.log(
      `${candidate.source_id}\t${candidate.vk_group_id}\t${candidate.detected_language}\t${candidate.score}\t${candidate.source_name}`,
    );
  }
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
    if (error.cause instanceof Error) console.error(error.cause.message);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
