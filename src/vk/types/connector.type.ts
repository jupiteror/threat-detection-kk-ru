export interface CollectorOptions {
  perRequest?: number;
  includeComments?: boolean;
  maxCommentsPerPost?: number;
  maxRepliesPerComment?: number;
}
export interface VKResponse<T> {
  response?: T;
  error?: { error_msg: string; error_code: number };
}
export interface VKWallGetResponse {
  count: number;
  items: Array<{
    id: number;
    owner_id: number;
    date: number;
    text: string;
    from_id?: number;
  }>;
}
export interface VKWallGetCommentsResponse {
  count: number;
  items: Array<{
    id: number;
    post_id: number;
    from_id?: number;
    date: number;
    text: string;
    thread?: {
      count: number;
      items: Array<{
        id: number;
        from_id?: number;
        date: number;
        text: string;
      }>;
    };
  }>;
}

export interface VKGroup {
  id: number;
  name: string;
  screen_name: string;
  is_closed: 0 | 1 | 2;
  type: "group" | "page" | "event";
  members_count?: number;
  activity?: string;
  description?: string;
  city?: { id: number; title: string };
  country?: { id: number; title: string };
}

export interface VKGroupsSearchResponse {
  count: number;
  items: VKGroup[];
}
