import { VKConnector } from "./VKConnector";
import type { RawRecord } from "../dataset/types/dataset.type";
import { CollectorOptions } from "./types/connector.type";

export class VKCollector {
  public constructor(
    private readonly vk: VKConnector,
    private readonly options: CollectorOptions = {},
  ) {}
  public async collect(
    ownerIds: readonly number[],
    target: number,
  ): Promise<RawRecord[]> {
    const result: RawRecord[] = [];
    if (!Number.isInteger(target) || target < 1) {
      throw new Error("Collection target must be a positive integer");
    }
    if (ownerIds.length === 0) {
      throw new Error("At least one VK group ID is required");
    }

    const perRequest = Math.min(
      Math.max(this.options.perRequest ?? 100, 1),
      100,
    );
    const collectedAt = new Date().toISOString();
    for (const ownerId of ownerIds) {
      for (let offset = 0; result.length < target; offset += perRequest) {
        const page = await this.vk.wallGet(ownerId, offset, perRequest);
        for (const item of page.items) {
          if (item.text.trim() && result.length < target)
            result.push({
              record_id: `vk-post-${ownerId}-${item.id}`,
              source: "vk",
              source_type: "post",
              source_url: `https://vk.com/wall${ownerId}_${item.id}`,
              source_group_id: ownerId,
              source_item_id: item.id,
              published_at: new Date(item.date * 1_000).toISOString(),
              collected_at: collectedAt,
              text: item.text,
            });
          if (this.options.includeComments && result.length < target) {
            const maxComments = this.options.maxCommentsPerPost ?? 100;
            for (
              let commentOffset = 0;
              commentOffset < maxComments && result.length < target;
              commentOffset += 100
            ) {
              const commentCount = Math.min(100, maxComments - commentOffset);
              const comments = await this.vk.wallGetComments(
                ownerId,
                item.id,
                commentOffset,
                commentCount,
              );
              for (const comment of comments.items) {
                if (comment.text.trim() && result.length < target) {
                  result.push({
                    record_id: `vk-comment-${ownerId}-${item.id}-${comment.id}`,
                    source: "vk",
                    source_type: "comment",
                    source_url: `https://vk.com/wall${ownerId}_${item.id}?reply=${comment.id}`,
                    source_group_id: ownerId,
                    source_item_id: comment.id,
                    source_parent_id: item.id,
                    published_at: new Date(comment.date * 1_000).toISOString(),
                    collected_at: collectedAt,
                    text: comment.text,
                  });
                }

                for (const reply of comment.thread?.items ?? []) {
                  if (!reply.text.trim() || result.length >= target) continue;
                  result.push({
                    record_id: `vk-reply-${ownerId}-${item.id}-${comment.id}-${reply.id}`,
                    source: "vk",
                    source_type: "reply",
                    source_url: `https://vk.com/wall${ownerId}_${item.id}?reply=${reply.id}`,
                    source_group_id: ownerId,
                    source_item_id: reply.id,
                    source_parent_id: comment.id,
                    published_at: new Date(reply.date * 1_000).toISOString(),
                    collected_at: collectedAt,
                    text: reply.text,
                  });
                }

                const inlineReplyCount = comment.thread?.items.length ?? 0;
                const threadReplyCount = comment.thread?.count ?? 0;
                const maxReplies = this.options.maxRepliesPerComment ?? 100;
                const replyLimit = Math.min(threadReplyCount, maxReplies);
                for (
                  let replyOffset = inlineReplyCount;
                  replyOffset < replyLimit && result.length < target;
                  replyOffset += 100
                ) {
                  const replyCount = Math.min(100, replyLimit - replyOffset);
                  const replies = await this.vk.wallGetThreadReplies(
                    ownerId,
                    item.id,
                    comment.id,
                    replyOffset,
                    replyCount,
                  );
                  for (const reply of replies.items) {
                    if (!reply.text.trim() || result.length >= target) continue;
                    result.push({
                      record_id: `vk-reply-${ownerId}-${item.id}-${comment.id}-${reply.id}`,
                      source: "vk",
                      source_type: "reply",
                      source_url: `https://vk.com/wall${ownerId}_${item.id}?reply=${reply.id}`,
                      source_group_id: ownerId,
                      source_item_id: reply.id,
                      source_parent_id: comment.id,
                      published_at: new Date(reply.date * 1_000).toISOString(),
                      collected_at: collectedAt,
                      text: reply.text,
                    });
                  }
                  if (replies.items.length < replyCount) break;
                }
              }
              if (comments.items.length < commentCount) break;
            }
          }
        }
        if (page.items.length < perRequest) break;
      }
      if (result.length >= target) break;
    }
    return result.slice(0, target);
  }
}
