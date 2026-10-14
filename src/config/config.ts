import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export class TelegramConnector {
  private client: TelegramClient;

  constructor(apiId: number, apiHash: string, session: string = "") {
    const stringSession = new StringSession(session);

    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();

    console.log("Telegram connected");
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();

    console.log("Telegram disconnected");
  }

  getClient(): TelegramClient {
    return this.client;
  }

  getSession(): string {
    return this.client.session.save() as unknown as string;
  }
}


