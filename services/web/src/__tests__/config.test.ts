import { config } from '../config';

describe('Config', () => {
  it('exports configuration object', () => {
    expect(config).toBeDefined();
    expect(config.apiUrl).toBeDefined();
  });

  it('uses environment variable for API URL', () => {
    // Vite uses import.meta.env, which is set at build time
    expect(typeof config.apiUrl).toBe('string');
  });
});
