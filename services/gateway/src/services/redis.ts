// services/gateway/src/services/redis.ts
import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';
import { createLogger, format, transports } from 'winston';

const TOKEN_PREFIX = 'auth:token:';

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});

export interface TokenValidation {
  userId: string;
  email: string;
}

export class RedisCache {
  private client: RedisClientType;

  constructor(url: string) {
    this.client = createClient({ url });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Connected to Redis successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw new Error(`Failed to connect to Redis: ${error}`);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async setTokenValidation(
    token: string,
    validation: TokenValidation,
    ttlSeconds: number
  ): Promise<void> {
    // Input validation
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be greater than 0');
    }
    if (!validation.userId || !validation.email) {
      throw new Error('Validation must include userId and email');
    }

    try {
      const key = `${TOKEN_PREFIX}${this.hashToken(token)}`;
      await this.client.setEx(key, ttlSeconds, JSON.stringify(validation));
      logger.debug('Token validation stored', { ttl: ttlSeconds });
    } catch (error) {
      logger.error('Failed to set token validation', { error });
      throw new Error(`Failed to set token validation: ${error}`);
    }
  }

  async getTokenValidation(token: string): Promise<TokenValidation | null> {
    // Input validation
    if (!token || token.trim().length === 0) {
      throw new Error('Token cannot be empty');
    }

    try {
      const key = `${TOKEN_PREFIX}${this.hashToken(token)}`;
      const data = await this.client.get(key);
      if (!data) return null;

      try {
        return JSON.parse(data);
      } catch (parseError) {
        logger.error('Failed to parse token validation data', { parseError });
        throw new Error('Failed to parse token validation data');
      }
    } catch (error) {
      // If it's already our parse error, re-throw it
      if (error instanceof Error && error.message === 'Failed to parse token validation data') {
        throw error;
      }
      // Otherwise, it's a Redis error
      logger.error('Failed to get token validation from Redis', { error });
      throw new Error('Failed to get token validation from Redis');
    }
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    logger.info('Disconnected from Redis');
  }
}
