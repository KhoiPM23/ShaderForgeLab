import { describe, it, expect } from 'vitest';
import { validateAndClampUniform } from '../src/parameters/types';
import {
  SUPPORTED_USER_UNIFORMS,
  getDefaultUniformValues,
  rgbToHex,
  hexToRgb,
} from '../src/parameters/definitions';

describe('Uniform Parameter Validation & Clamping', () => {
  const floatDef = SUPPORTED_USER_UNIFORMS.find((u) => u.name === 'u_scale')!;
  const colorDef = SUPPORTED_USER_UNIFORMS.find((u) => u.name === 'u_color')!;

  it('clamps float within configured min and max', () => {
    expect(validateAndClampUniform(floatDef, 5.0)).toBe(5.0);
    expect(validateAndClampUniform(floatDef, 999.0)).toBe(floatDef.max);
    expect(validateAndClampUniform(floatDef, -50.0)).toBe(floatDef.min);
  });

  it('safely recovers float defaults on NaN or non-number input', () => {
    expect(validateAndClampUniform(floatDef, NaN)).toBe(floatDef.defaultValue);
    expect(validateAndClampUniform(floatDef, 'invalid')).toBe(floatDef.defaultValue);
    expect(validateAndClampUniform(floatDef, null)).toBe(floatDef.defaultValue);
  });

  it('validates color/vec3 and clamps each channel between 0.0 and 1.0', () => {
    const validColor = [0.2, 0.4, 0.8];
    expect(validateAndClampUniform(colorDef, validColor)).toEqual(validColor);

    const outOfBounds = [-0.5, 1.8, 0.5];
    expect(validateAndClampUniform(colorDef, outOfBounds)).toEqual([0.0, 1.0, 0.5]);
  });

  it('safely recovers color defaults on malformed array', () => {
    expect(validateAndClampUniform(colorDef, [1, 2])).toEqual(colorDef.defaultValue);
    expect(validateAndClampUniform(colorDef, 'not an array')).toEqual(colorDef.defaultValue);
    expect(validateAndClampUniform(colorDef, null)).toEqual(colorDef.defaultValue);
  });

  it('provides default values for all supported uniforms', () => {
    const defaults = getDefaultUniformValues();
    expect(defaults).toHaveProperty('u_color');
    expect(defaults).toHaveProperty('u_scale');
    expect(defaults).toHaveProperty('u_intensity');
    expect(defaults).toHaveProperty('u_speed');
  });

  it('converts rgb to hex and back accurately', () => {
    const whiteHex = rgbToHex([1.0, 1.0, 1.0]);
    expect(whiteHex.toLowerCase()).toBe('#ffffff');
    expect(hexToRgb('#ffffff')).toEqual([1.0, 1.0, 1.0]);

    const redHex = rgbToHex([1.0, 0.0, 0.0]);
    expect(redHex.toLowerCase()).toBe('#ff0000');
    expect(hexToRgb('#ff0000')).toEqual([1.0, 0.0, 0.0]);

    // Handles shorthand hex (#fff)
    expect(hexToRgb('#fff')).toEqual([1.0, 1.0, 1.0]);
  });
});
