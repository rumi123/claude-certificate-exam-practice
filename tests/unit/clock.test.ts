import { afterEach, describe, expect, it } from 'vitest';
import { DAY_MS, now, setClockOffsetProvider } from '@/lib/clock';

afterEach(() => setClockOffsetProvider(() => 0));

describe('clock', () => {
  it('adds the provider offset to Date.now()', () => {
    setClockOffsetProvider(() => 1000);
    expect(Math.abs(now() - Date.now() - 1000)).toBeLessThanOrEqual(5);
  });

  it('defaults to no offset', () => {
    expect(Math.abs(now() - Date.now())).toBeLessThanOrEqual(5);
  });

  it('exposes DAY_MS', () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});
