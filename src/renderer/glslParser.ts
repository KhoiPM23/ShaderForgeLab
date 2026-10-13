import { ShaderDiagnostic } from './types';

/**
 * Parses WebGL compiler info logs into structured diagnostics.
 * Standard format: "ERROR: <source_id>:<line>: <message>" or "WARNING: ..."
 */
export function parseGlslInfoLog(log: string): ShaderDiagnostic[] {
  if (!log || !log.trim()) {
    return [];
  }

  const diagnostics: ShaderDiagnostic[] = [];
  const lines = log.split('\n');

  // Matches "ERROR: 0:12: 'foo' : syntax error" or "ERROR: 12: message"
  const regex = /^(ERROR|WARNING):\s*(?:\d+:)?(\d+)(?::(\d+))?:\s*(.*)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(regex);
    if (match) {
      const type = match[1].toUpperCase() === 'WARNING' ? 'warning' : 'error';
      const lineNum = parseInt(match[2], 10);
      const colNum = match[3] ? parseInt(match[3], 10) : undefined;
      const message = match[4] || trimmed;

      diagnostics.push({
        line: isNaN(lineNum) ? 1 : lineNum,
        column: colNum && !isNaN(colNum) ? colNum : undefined,
        message,
        severity: type,
      });
    } else {
      // Unstructured line, e.g. general linker error
      diagnostics.push({
        line: 1,
        message: trimmed,
        severity: trimmed.toLowerCase().includes('warning') ? 'warning' : 'error',
      });
    }
  }

  return diagnostics;
}
