import { Config } from '../config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads configuration from environment variables', () => {
    process.env.IMMICH_API_URL = 'http://test-immich:3001';
    process.env.GROUPING_API_URL = 'http://test-grouping:8000';
    process.env.DEDUP_API_URL = 'http://test-dedup:8001';
    process.env.REDIS_URL = 'redis://test-redis:6379';

    const config = new Config();

    expect(config.immichApiUrl).toBe('http://test-immich:3001');
    expect(config.groupingApiUrl).toBe('http://test-grouping:8000');
    expect(config.dedupApiUrl).toBe('http://test-dedup:8001');
    expect(config.redisUrl).toBe('redis://test-redis:6379');
  });

  it('provides default values', () => {
    const config = new Config();

    expect(config.port).toBe(3000);
    expect(config.logLevel).toBe('info');
    expect(config.cacheExpiry).toBe(300);
  });
});
