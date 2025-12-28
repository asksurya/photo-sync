// services/gateway/src/services/redis.ts
import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

export interface TokenValidation {
  userId: string;
  email: string;
}

export class RedisCache {
  public client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
    this.client.connect();
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async setTokenValidation(
    token: string,
    validation: TokenValidation,
    ttlSeconds: number
  ): Promise<void> {
    const key = `auth:token:${this.hashToken(token)}`;
    await this.client.setEx(key, ttlSeconds, JSON.stringify(validation));
  }

  async getTokenValidation(token: string): Promise<TokenValidation | null> {
    try {
      const key = `auth:token:${this.hashToken(token)}`;
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to get token validation: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}
