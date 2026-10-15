export interface AppConfig {
  port: number;
  vk: {
    accessToken: string;
    apiVersion: string;
    groupOwners: number[];
    targetRawCount: number;
    includeComments: boolean;
    maxCommentsPerPost: number;
    maxRepliesPerComment: number;
  };
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  throw new Error("VK_INCLUDE_COMMENTS must be true or false");
}

export function parseGroupOwners(value: string | undefined): number[] {
  if (!value?.trim()) return [];

  const owners = value.split(",").map((rawValue) => {
    const groupId = Number(rawValue.trim());
    if (!Number.isSafeInteger(groupId) || groupId === 0) {
      throw new Error(`Invalid VK group ID: ${rawValue}`);
    }

    // Для wall.get идентификатор сообщества передаётся со знаком минус.
    return groupId > 0 ? -groupId : groupId;
  });

  return [...new Set(owners)];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: parseInteger(env.PORT, 3000, "PORT", 1, 65_535),
    vk: {
      accessToken: env.VK_ACCESS_TOKEN?.trim() ?? "",
      apiVersion: env.VK_API_VERSION?.trim() || "5.199",
      groupOwners: parseGroupOwners(env.VK_GROUP_IDS),
      targetRawCount: parseInteger(
        env.VK_TARGET_RAW_COUNT,
        10_000,
        "VK_TARGET_RAW_COUNT",
        1,
        100_000,
      ),
      includeComments: parseBoolean(env.VK_INCLUDE_COMMENTS, true),
      maxCommentsPerPost: parseInteger(
        env.VK_MAX_COMMENTS_PER_POST,
        100,
        "VK_MAX_COMMENTS_PER_POST",
        0,
        10_000,
      ),
      maxRepliesPerComment: parseInteger(
        env.VK_MAX_REPLIES_PER_COMMENT,
        100,
        "VK_MAX_REPLIES_PER_COMMENT",
        0,
        10_000,
      ),
    },
  };
}
