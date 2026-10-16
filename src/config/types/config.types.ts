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
