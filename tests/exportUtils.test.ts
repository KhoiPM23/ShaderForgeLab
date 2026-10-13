import { describe, it, expect } from 'vitest';
import { GLSL_SNIPPETS } from '../src/snippets/snippetsLibrary';

describe('GLSL Snippets Library', () => {
  it('contains expected standard utility snippets', () => {
    expect(GLSL_SNIPPETS.length).toBeGreaterThanOrEqual(4);

    const ids = GLSL_SNIPPETS.map((s) => s.id);
    expect(ids).toContain('rot2d');
    expect(ids).toContain('smin');
    expect(ids).toContain('value_noise');
    expect(ids).toContain('palette');
  });

  it('ensures each snippet is non-empty and well-formed', () => {
    for (const snip of GLSL_SNIPPETS) {
      expect(snip.id).toBeTruthy();
      expect(snip.name).toBeTruthy();
      expect(snip.description).toBeTruthy();
      expect(snip.code).toContain('{');
      expect(snip.code).toContain('}');
    }
  });
});
