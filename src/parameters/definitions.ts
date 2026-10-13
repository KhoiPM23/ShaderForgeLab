import { UniformDefinition, UniformValues } from './types';

export const SUPPORTED_USER_UNIFORMS: UniformDefinition[] = [
  {
    name: 'u_color',
    label: 'Base Tint',
    type: 'color',
    description: 'Primary RGB color tone modulation',
    defaultValue: [0.55, 0.45, 1.0],
    min: 0.0,
    max: 1.0,
  },
  {
    name: 'u_scale',
    label: 'Spatial Scale',
    type: 'float',
    description: 'Zoom and pattern frequency',
    defaultValue: 1.0,
    min: 0.1,
    max: 8.0,
    step: 0.1,
  },
  {
    name: 'u_intensity',
    label: 'Intensity',
    type: 'float',
    description: 'Central glow & luminance power',
    defaultValue: 1.0,
    min: 0.0,
    max: 2.5,
    step: 0.05,
  },
  {
    name: 'u_speed',
    label: 'Animation Speed',
    type: 'float',
    description: 'Temporal progression multiplier',
    defaultValue: 1.0,
    min: 0.0,
    max: 4.0,
    step: 0.1,
  },
];

export function getDefaultUniformValues(): UniformValues {
  const values: UniformValues = {};
  for (const def of SUPPORTED_USER_UNIFORMS) {
    values[def.name] = def.defaultValue;
  }
  return values;
}

export function rgbToHex(rgb: [number, number, number]): string {
  const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
  const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
  const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  if (isNaN(intVal) || clean.length !== 6) {
    return [1.0, 1.0, 1.0];
  }
  const r = ((intVal >> 16) & 255) / 255.0;
  const g = ((intVal >> 8) & 255) / 255.0;
  const b = (intVal & 255) / 255.0;
  return [Math.round(r * 100) / 100, Math.round(g * 100) / 100, Math.round(b * 100) / 100];
}
