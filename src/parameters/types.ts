export type UniformType = 'float' | 'vec3' | 'color';

export interface UniformDefinition {
  name: string;
  label: string;
  type: UniformType;
  description: string;
  defaultValue: number | [number, number, number];
  min?: number;
  max?: number;
  step?: number;
}

export type UniformValue = number | [number, number, number];
export type UniformValues = Record<string, UniformValue>;

/**
 * Validates and clamps a uniform value according to its definition.
 */
export function validateAndClampUniform(
  def: UniformDefinition,
  val: unknown
): UniformValue {
  if (def.type === 'float') {
    if (typeof val !== 'number' || isNaN(val)) {
      return def.defaultValue;
    }
    const min = def.min ?? -Infinity;
    const max = def.max ?? Infinity;
    return Math.max(min, Math.min(max, val));
  }

  if (def.type === 'vec3' || def.type === 'color') {
    if (!Array.isArray(val) || val.length !== 3) {
      return def.defaultValue;
    }
    const r = typeof val[0] === 'number' && !isNaN(val[0]) ? val[0] : 1.0;
    const g = typeof val[1] === 'number' && !isNaN(val[1]) ? val[1] : 1.0;
    const b = typeof val[2] === 'number' && !isNaN(val[2]) ? val[2] : 1.0;

    const min = def.min ?? 0.0;
    const max = def.max ?? 1.0;

    return [
      Math.max(min, Math.min(max, r)),
      Math.max(min, Math.min(max, g)),
      Math.max(min, Math.min(max, b)),
    ];
  }

  return def.defaultValue;
}
