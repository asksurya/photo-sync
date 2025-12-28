/**
 * Configuration management for API Gateway
 */
export class Config {
  public readonly immichApiUrl: string;
  public readonly groupingApiUrl: string;
  public readonly dedupApiUrl: string;
  public readonly redisUrl: string;
  public readonly port: number;
  public readonly logLevel: string;
  public readonly cacheExpiry: number;

  constructor() {
    this.immichApiUrl = process.env.IMMICH_API_URL || 'http://immich:2283';
    this.groupingApiUrl = process.env.GROUPING_API_URL || 'http://grouping:8000';
    this.dedupApiUrl = process.env.DEDUPLICATION_API_URL || 'http://deduplication:8001';
    this.redisUrl = process.env.REDIS_URL || 'redis://redis-cache:6379';
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.cacheExpiry = parseInt(process.env.CACHE_EXPIRY || '300', 10);
  }
}
