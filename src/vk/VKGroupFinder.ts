import type { VKGroup } from "./VKConnector";
import { VKConnector, VKApiError } from "./VKConnector";

export interface GroupCandidate {
  source_id: string;
  platform: "VK";
  source_name: string;
  source_url_or_public_id: string;
  vk_group_id: number;
  screen_name: string;
  detected_language: "RU" | "KK" | "MIXED";
  matched_keyword: string;
  target_subtype: "HATE_AND_DISCRIMINATION";
  date_found: string;
  members_count: number;
  is_closed: number;
  recent_posts: number;
  recent_comments: number;
  score: number;
  review_status: "PENDING";
  review_comment: string;
}

export interface GroupFinderOptions {
  queryLimit?: number;
  candidatesLimit?: number;
  recentPostsToCheck?: number;
}

const KAZAKH_LETTERS = /[ӘәҒғҚқҢңӨөҰұҮүҺһІі]/;
const CYRILLIC_LETTERS = /[А-Яа-яЁё]/;

export class VKGroupFinder {
  public constructor(
    private readonly vk: VKConnector,
    private readonly options: GroupFinderOptions = {},
  ) {}

  public async find(queries: readonly string[]): Promise<GroupCandidate[]> {
    const uniqueGroups = new Map<number, { group: VKGroup; query: string }>();
    const queryLimit = Math.min(this.options.queryLimit ?? 40, 100);

    for (const query of queries) {
      const response = await this.vk.groupsSearch(query, 0, queryLimit);
      for (const group of response.items) {
        if (!uniqueGroups.has(group.id)) uniqueGroups.set(group.id, { group, query });
      }
    }

    const candidates: GroupCandidate[] = [];
    for (const { group, query } of uniqueGroups.values()) {
      if (group.is_closed !== 0 || group.type === "event") continue;
      const activity = await this.inspectActivity(group.id);
      if (activity.recentPosts === 0 || activity.recentComments === 0) continue;
      const language = detectGroupLanguage(
        `${group.name} ${group.description ?? ""} ${activity.sampleText}`,
      );
      const membersCount = group.members_count ?? 0;
      const score = activity.recentComments * 10
        + activity.recentPosts * 2
        + Math.min(Math.log10(Math.max(membersCount, 1)) * 5, 30)
        + (language === "MIXED" ? 10 : 0);

      candidates.push({
        source_id: "",
        platform: "VK",
        source_name: group.name,
        source_url_or_public_id: `https://vk.com/${group.screen_name}`,
        vk_group_id: group.id,
        screen_name: group.screen_name,
        detected_language: language,
        matched_keyword: query,
        target_subtype: "HATE_AND_DISCRIMINATION",
        date_found: new Date().toISOString().slice(0, 10),
        members_count: membersCount,
        is_closed: group.is_closed,
        recent_posts: activity.recentPosts,
        recent_comments: activity.recentComments,
        score: Number(score.toFixed(2)),
        review_status: "PENDING",
        review_comment: "Requires manual source review before collection",
      });
    }

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.candidatesLimit ?? 30)
      .map((candidate, index) => ({
        ...candidate,
        source_id: `SRC_${String(index + 1).padStart(6, "0")}`,
      }));
  }

  private async inspectActivity(groupId: number): Promise<{
    recentPosts: number;
    recentComments: number;
    sampleText: string;
  }> {
    try {
      const page = await this.vk.wallGet(
        -groupId,
        0,
        Math.min(this.options.recentPostsToCheck ?? 10, 20),
      );
      let recentComments = 0;
      const sampleText: string[] = [];
      for (const post of page.items) {
        sampleText.push(post.text);
        const comments = await this.vk.wallGetComments(-groupId, post.id, 0, 10);
        recentComments += comments.items.length;
        sampleText.push(...comments.items.map((comment) => comment.text));
      }
      return {
        recentPosts: page.items.length,
        recentComments,
        sampleText: sampleText.join(" ").slice(0, 20_000),
      };
    } catch (error) {
      if (error instanceof VKApiError) {
        return { recentPosts: 0, recentComments: 0, sampleText: "" };
      }
      throw error;
    }
  }
}

function detectGroupLanguage(text: string): "RU" | "KK" | "MIXED" {
  const hasKazakh = KAZAKH_LETTERS.test(text);
  const hasRussian = CYRILLIC_LETTERS.test(text.replace(KAZAKH_LETTERS, ""));
  if (hasKazakh && hasRussian) return "MIXED";
  return hasKazakh ? "KK" : "RU";
}
