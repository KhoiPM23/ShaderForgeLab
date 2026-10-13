import { describe, it, expect } from 'vitest';
import { BUILTIN_PRESETS } from '../src/presets/builtinPresets';

describe('Built-in Presets Collection', () => {
  it('contains at least 6 unique presets', () => {
    expect(BUILTIN_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it('ensures each preset has distinct IDs, names, and non-empty shader code', () => {
    const ids = new Set<string>();
    const names = new Set<string>();
    const shaderCodes = new Set<string>();

    for (const preset of BUILTIN_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.shaderCode.length).toBeGreaterThan(100);

      // Verify no duplicates
      expect(ids.has(preset.id)).toBe(false);
      expect(names.has(preset.name)).toBe(false);
      expect(shaderCodes.has(preset.shaderCode)).toBe(false);

      ids.add(preset.id);
      names.add(preset.name);
      shaderCodes.add(preset.shaderCode);
    }
  });

  it('verifies all expected themes are represented', () => {
    const names = BUILTIN_PRESETS.map((p) => p.name.toLowerCase());

    const hasCosmic = names.some((n) => n.includes('cosmic') || n.includes('nebula'));
    const hasFluid = names.some((n) => n.includes('fluid') || n.includes('liquid'));
    const hasCyber = names.some((n) => n.includes('cyber') || n.includes('grid'));
    const hasAurora = names.some((n) => n.includes('aurora') || n.includes('borealis'));
    const hasFractal = names.some((n) => n.includes('fractal'));
    const hasBlackHole = names.some((n) => n.includes('hole') || n.includes('lensing'));

    expect(hasCosmic).toBe(true);
    expect(hasFluid).toBe(true);
    expect(hasCyber).toBe(true);
    expect(hasAurora).toBe(true);
    expect(hasFractal).toBe(true);
    expect(hasBlackHole).toBe(true);
  });

  it('ensures all presets declare required standard uniforms', () => {
    for (const preset of BUILTIN_PRESETS) {
      expect(preset.uniforms).toHaveProperty('u_color');
      expect(preset.uniforms).toHaveProperty('u_scale');
      expect(preset.uniforms).toHaveProperty('u_intensity');
      expect(preset.uniforms).toHaveProperty('u_speed');
    }
  });
});
