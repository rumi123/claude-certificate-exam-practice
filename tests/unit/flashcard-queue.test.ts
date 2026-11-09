import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DAY_MS } from '@/lib/clock';
import { importContent } from '@/lib/content/import';
import { loadContent } from '@/lib/content/load';
import { closeDb, getDb } from '@/lib/db/client';
import * as t from '@/lib/db/schema';
import { getCardQueue, getCardStats, rateCard } from '@/lib/db/queries/flashcards';

let dir: string;
const DAY0 = new Date(2026, 0, 10, 9, 0, 0).getTime();

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccaf-cards-'));
  process.env.DATABASE_PATH = path.join(dir, 'test.db');
  importContent(getDb(), structuredClone(loadContent('content')));
});

afterEach(() => {
  closeDb();
  delete process.env.DATABASE_PATH;
  fs.rmSync(dir, { recursive: true, force: true });
});

const ids = (cards: { id: string }[]) => cards.map((c) => c.id);

describe('flashcard queue', () => {
  it('starts with 10 new concept cards in id order', () => {
    const q = getCardQueue({ deck: 'concepts', now: DAY0 });
    expect(ids(q)).toEqual(
      Array.from({ length: 10 }, (_, i) => `FC-C-${String(i + 1).padStart(3, '0')}`),
    );
    expect(getCardStats(DAY0).newAvailableToday).toBe(10);
  });

  it('is empty after rating all 10 the same day', () => {
    for (const c of getCardQueue({ deck: 'concepts', now: DAY0 })) rateCard(c.id, 'good', DAY0);
    expect(getCardQueue({ deck: 'concepts', now: DAY0 + 1000 })).toEqual([]);
  });

  it('next day: Again cards are due and 10 more new cards arrive', () => {
    const first = getCardQueue({ deck: 'concepts', now: DAY0 });
    first.forEach((c, i) => rateCard(c.id, i < 3 ? 'again' : 'good', DAY0));
    const q = getCardQueue({ deck: 'concepts', now: DAY0 + DAY_MS });
    const againIds = ids(first.slice(0, 3));
    expect(ids(q).slice(0, 3).sort()).toEqual(againIds);
    expect(q.filter((c) => !ids(first).includes(c.id))).toHaveLength(10);
  });

  it('Easy from new goes to box 2, due in 3 days', () => {
    const { dueAt } = rateCard('FC-C-001', 'easy', DAY0);
    expect(dueAt).toBe(DAY0 + 3 * DAY_MS);
    const row = getDb()
      .select()
      .from(t.flashcardState)
      .where(eq(t.flashcardState.cardId, 'FC-C-001'))
      .get();
    expect(row).toMatchObject({ box: 2, firstSeenAt: DAY0, lastRatedAt: DAY0 });
  });

  it('keeps first_seen_at on a later rating', () => {
    rateCard('FC-C-001', 'good', DAY0);
    rateCard('FC-C-001', 'good', DAY0 + DAY_MS);
    const row = getDb()
      .select()
      .from(t.flashcardState)
      .where(eq(t.flashcardState.cardId, 'FC-C-001'))
      .get();
    expect(row).toMatchObject({ box: 2, firstSeenAt: DAY0, lastRatedAt: DAY0 + DAY_MS });
  });

  it('filters by domain', () => {
    const q = getCardQueue({ deck: 'concepts', domain: 'D3', now: DAY0 });
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((c) => c.domainId === 'D3')).toBe(true);
  });
});
