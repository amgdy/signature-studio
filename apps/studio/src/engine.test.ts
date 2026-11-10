import { STYLE_KEYS, STYLE_SHOW } from '@signature-studio/engine';
import { describe, expect, test } from 'vitest';
import {
  CancelledError,
  DESIGNS,
  ResultCache,
  STYLE_KEY_LIST,
  STYLE_SHOW_LIST,
  createQueue,
  fingerprint,
  pickStyle,
  themeSettings,
  toState,
} from './engine.ts';

const now = (): Promise<void> => Promise.resolve();

describe('engine wrapper', () => {
  test('the typed style lists match the engine', () => {
    expect(STYLE_KEY_LIST.toSorted()).toEqual(STYLE_KEYS.toSorted());
    expect(STYLE_SHOW_LIST.toSorted()).toEqual(STYLE_SHOW.toSorted());
  });

  test('has 36 designs', () => {
    expect(DESIGNS).toHaveLength(36);
  });

  test('toState drops unknown keys and fixes bad values', () => {
    const s = toState({ template: 'nope', junk: 1, fullName: 42, title: { x: 1 }, show: { email: 0 } });
    expect(DESIGNS.some((d) => d.id === s.template)).toBe(true);
    expect('junk' in s).toBe(false);
    expect(s.fullName).toBe('42');
    expect(typeof s.title).toBe('string');
    expect(s.show.email).toBe(false);
  });

  test('pickStyle keeps only the look', () => {
    const s = pickStyle({ template: 'aurora', cols: '2', fullName: 'X', show: { logo: false, email: false } });
    expect(s).toEqual({ template: 'aurora', cols: 2, show: { logo: false } });
  });

  test('legacy style ids expand once into the shared colour settings', () => {
    expect(pickStyle({ theme: 'copilot' })).toEqual(themeSettings('copilot'));
    expect(pickStyle({ theme: 'custom', customColors: ['#ffb900'] })).toEqual({
      colors: ['#FFB900'],
      gradient: false,
    });
    expect(pickStyle({ gradient: false })).toEqual({ gradient: false });
  });
});

describe('build queue', () => {
  test('runs jobs one at a time, in order', async () => {
    const q = createQueue(now);
    const log: string[] = [];
    let active = 0;
    const job = (id: string) => async () => {
      active++;
      expect(active).toBe(1);
      await new Promise((r) => setTimeout(r, 2));
      log.push(id);
      active--;
      return id;
    };
    const a = q.enqueue(job('a'));
    const b = q.enqueue(job('b'));
    const c = q.enqueue(job('c'), { first: true });
    expect(await Promise.all([a.promise, b.promise, c.promise])).toEqual(['a', 'b', 'c']);
    expect(log[0]).toBe('a');
    expect(log).toContain('c');
  });

  test('a cancelled job never runs', async () => {
    const q = createQueue(now);
    let ran = false;
    const first = q.enqueue(() => new Promise((r) => setTimeout(() => r(1), 5)));
    const second = q.enqueue(async () => {
      ran = true;
    });
    second.cancel();
    await expect(second.promise).rejects.toBeInstanceOf(CancelledError);
    await first.promise;
    await new Promise((r) => setTimeout(r, 5));
    expect(ran).toBe(false);
  });

  test('keeps running after a job that throws straight away', async () => {
    const q = createQueue(now);
    const broken = q.enqueue((): Promise<number> => {
      throw new Error('broken');
    });
    const next = q.enqueue(async () => 2);
    await expect(broken.promise).rejects.toThrow('broken');
    expect(await next.promise).toBe(2);
  });

  test('the cache keeps the most recent entries', () => {
    const c = new ResultCache<number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a');
    c.set('c', 3);
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe(1);
  });

  test('fingerprints differ for different strings', () => {
    expect(fingerprint('abc')).not.toBe(fingerprint('abd'));
    expect(fingerprint('abc')).toBe(fingerprint('abc'));
  });
});
