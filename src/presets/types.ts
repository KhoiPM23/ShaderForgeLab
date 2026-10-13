import { UniformValues } from '../parameters/types';

export interface ShaderPreset {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
  category?: string;
  tags?: string[];
  shaderCode: string;
  uniforms: UniformValues;
  schemaVersion?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ShaderExportBundle {
  version: number;
  exportedAt: string;
  source: 'ShaderForgeLab';
  experiments: ShaderPreset[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
  importedPresets: ShaderPreset[];
}
