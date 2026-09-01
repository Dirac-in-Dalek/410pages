import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('service worker cache policy', () => {
  it('awaits only cacheable full responses and retains a navigation shell fallback', () => {
    const source = readFileSync(resolve(import.meta.dirname, '..', 'public', 'sw.js'), 'utf8');

    expect(source).toContain('networkResponse.status === 200');
    expect(source).toContain('await cache.put(request, networkResponse.clone())');
    expect(source).toContain("cache.match('/')");
    expect(source).toContain("const shellResponse = await fetch('/')");
    expect(source).toContain('html.matchAll');
  });
});
