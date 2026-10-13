export type RendererStatus = 'idle' | 'compiling' | 'ready' | 'error' | 'context_lost';

export interface ShaderDiagnostic {
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface ShaderCompileResult {
  success: boolean;
  diagnostics: ShaderDiagnostic[];
  rawLog: string;
  compileTimeMs: number;
}

export interface RendererStats {
  fps: number;
  frameTimeMs: number;
  frameCount: number;
  resolution: [number, number];
  dpr: number;
}

export interface RendererCallbacks {
  onStatusChange?: (status: RendererStatus, details?: string) => void;
  onDiagnostics?: (result: ShaderCompileResult) => void;
  onStats?: (stats: RendererStats) => void;
}
