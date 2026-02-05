import { rateLimiter, withRateLimit } from '../../../lib/security/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clear();
  });

  it('allows requests within limit and blocks after exceeding', () => {
    const key = 'k1';
    for (let i = 0; i < 10; i++) {
      expect(rateLimiter.isAllowed(key)).toBe(true);
    }
    expect(rateLimiter.isAllowed(key)).toBe(false);
  });

  it('reports remaining requests correctly', () => {
    const key = 'k2';
    expect(rateLimiter.getRemaining(key)).toBe(10);
    rateLimiter.isAllowed(key);
    expect(rateLimiter.getRemaining(key)).toBe(9);
  });

  it('decorator blocks when rate limit exceeded', async () => {
    const key = 'k3';
    const fn = withRateLimit(key)(async (x: number) => x * 2);
    for (let i = 0; i < 10; i++) {
      await expect(fn(i)).resolves.toBe(i * 2);
    }
    await expect(fn(11)).rejects.toThrow(/Rate limit exceeded/);
  });
});
