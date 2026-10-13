import { describe, it, expect } from 'vitest';
import { parseGlslInfoLog } from '../src/renderer/glslParser';

describe('parseGlslInfoLog', () => {
  it('returns empty array on empty or whitespace log', () => {
    expect(parseGlslInfoLog('')).toEqual([]);
    expect(parseGlslInfoLog('   \n  ')).toEqual([]);
  });

  it('correctly parses single standard WebGL error line', () => {
    const log = "ERROR: 0:15: 'foo' : undeclared identifier";
    const result = parseGlslInfoLog(log);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      line: 15,
      column: undefined,
      message: "'foo' : undeclared identifier",
      severity: 'error',
    });
  });

  it('correctly parses line with column number', () => {
    const log = "ERROR: 0:42:10: syntax error";
    const result = parseGlslInfoLog(log);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      line: 42,
      column: 10,
      message: 'syntax error',
      severity: 'error',
    });
  });

  it('correctly parses warnings and multiple diagnostics', () => {
    const log = `
WARNING: 0:3: macro redefinition
ERROR: 0:18: '=' : cannot convert from 'const int' to 'mediump float'
    `;
    const result = parseGlslInfoLog(log);

    expect(result).toHaveLength(2);
    expect(result[0].severity).toBe('warning');
    expect(result[0].line).toBe(3);
    expect(result[1].severity).toBe('error');
    expect(result[1].line).toBe(18);
  });

  it('handles unstructured linker errors gracefully without crashing', () => {
    const log = 'Fragment shader failed to link with vertex shader';
    const result = parseGlslInfoLog(log);

    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(1);
    expect(result[0].severity).toBe('error');
    expect(result[0].message).toBe(log);
  });
});
