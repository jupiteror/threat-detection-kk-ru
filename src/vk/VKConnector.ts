import { VKGroupsSearchResponse, VKResponse, VKWallGetCommentsResponse, VKWallGetResponse } from "./types/connector.type";

export class VKApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "VKApiError";
  }
}

export class VKConnector {
  private lastRequestAt = 0;

  public constructor(
    private readonly token: string,
    private readonly apiVersion = "5.199",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}
  public async call<T>(
    method: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    await this.waitForRateLimit();
    const url = new URL(`https://api.vk.com/method/${method}`);
    url.search = new URLSearchParams({
      access_token: this.token,
      v: this.apiVersion,
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ),
    }).toString();
    const response = await this.fetchImpl(url);
    this.lastRequestAt = Date.now();
    if (!response.ok) throw new VKApiError(`VK HTTP ${response.status}`);
    const body = (await response.json()) as VKResponse<T>;
    if (body.error)
      throw new VKApiError(body.error.error_msg, body.error.error_code);
    if (!body.response)
      throw new VKApiError(`VK response is empty for ${method}`);
    return body.response;
  }

  private async waitForRateLimit(): Promise<void> {
    const delayMs = 350 - (Date.now() - this.lastRequestAt);
    if (delayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }
  public wallGet(
    ownerId: number,
    offset: number,
    count: number,
  ): Promise<VKWallGetResponse> {
    return this.call("wall.get", {
      owner_id: ownerId,
      offset,
      count,
      extended: 0,
    });
  }
  public wallGetComments(
    ownerId: number,
    postId: number,
    offset: number,
    count: number,
  ): Promise<VKWallGetCommentsResponse> {
    return this.call("wall.getComments", {
      owner_id: ownerId,
      post_id: postId,
      offset,
      count,
      extended: 0,
      thread_items_count: 10,
    });
  }

  public wallGetThreadReplies(
    ownerId: number,
    postId: number,
    commentId: number,
    offset: number,
    count: number,
  ): Promise<VKWallGetCommentsResponse> {
    return this.call("wall.getComments", {
      owner_id: ownerId,
      post_id: postId,
      comment_id: commentId,
      offset,
      count,
      extended: 0,
    });
  }

  public groupsSearch(
    query: string,
    offset: number,
    count: number,
    countryId = 4,
  ): Promise<VKGroupsSearchResponse> {
    return this.call("groups.search", {
      q: query,
      offset,
      count,
      country_id: countryId,
      sort: 0,
      fields: "members_count,activity,description,city,country",
    });
  }
}
