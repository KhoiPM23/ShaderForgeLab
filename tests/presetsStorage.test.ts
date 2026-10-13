import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePreset,
  loadUserPresets,
  saveOrUpdateUserPreset,
  deleteUserPreset,
  duplicateUserPreset,
  renameUserPreset,
  persistUserPresets,
  validateAndParseImportJson,
  USER_PRESETS_STORAGE_KEY,
} from '../src/presets/storage';
import { DEFAULT_FRAGMENT_SHADER } from '../src/renderer/defaultShaders';

// Mock localStorage for Node test runner
const memoryStorage: Record<string, string> = {};
const mockLocalStorage: Storage = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
  },
  clear: () => {
    for (const key of Object.keys(memoryStorage)) {
      delete memoryStorage[key];
    }
  },
  key: (index: number) => Object.keys(memoryStorage)[index] ?? null,
  length: 0,
};

globalThis.localStorage = mockLocalStorage;

describe('Presets Persistence & Safe Validation', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('rejects completely invalid preset structures', () => {
    expect(validatePreset(null)).toBeNull();
    expect(validatePreset(undefined)).toBeNull();
    expect(validatePreset('string')).toBeNull();
    expect(validatePreset({})).toBeNull();
    expect(validatePreset({ id: '', name: 'Test' })).toBeNull();
    expect(validatePreset({ id: '123', name: '', shaderCode: 'code' })).toBeNull();
    expect(validatePreset({ id: '123', name: 'Test', shaderCode: '' })).toBeNull();
  });

  it('sanitizes valid presets and fixes out-of-range uniform values', () => {
    const raw = {
      id: 'custom-1',
      name: 'My Cool Preset',
      description: 'A test preset',
      shaderCode: DEFAULT_FRAGMENT_SHADER,
      uniforms: {
        u_scale: 999.0, // should clamp to 8.0
        u_color: [-1, 2, 0.5], // should clamp to [0, 1, 0.5]
      },
    };

    const validated = validatePreset(raw);
    expect(validated).not.toBeNull();
    expect(validated!.name).toBe('My Cool Preset');
    expect(validated!.uniforms.u_scale).toBe(8.0);
    expect(validated!.uniforms.u_color).toEqual([0.0, 1.0, 0.5]);
  });

  it('safely recovers from malformed JSON in localStorage without throwing', () => {
    globalThis.localStorage.setItem(USER_PRESETS_STORAGE_KEY, '{ invalid: json ]]]');
    const presets = loadUserPresets();
    expect(presets).toEqual([]);
  });

  it('safely filters corrupted items from array in localStorage', () => {
    const corruptedArray = [
      { id: 'valid-1', name: 'Valid 1', shaderCode: 'code', uniforms: {} },
      { broken: 'no id or name' },
      null,
      { id: 'valid-2', name: 'Valid 2', shaderCode: 'code2', uniforms: {} },
    ];
    globalThis.localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(corruptedArray));

    const presets = loadUserPresets();
    expect(presets).toHaveLength(2);
    expect(presets[0].id).toBe('valid-1');
    expect(presets[1].id).toBe('valid-2');
  });

  it('saves, updates, and deletes user presets correctly', () => {
    // 1. Save new
    const saved = saveOrUpdateUserPreset(
      'Test Glow',
      'Test Description',
      'code 1',
      { u_scale: 2.0 }
    );
    expect(saved.preset).toBeDefined();
    expect(saved.preset!.id).toBeDefined();

    let loaded = loadUserPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Test Glow');
    expect(loaded[0].uniforms.u_scale).toBe(2.0);

    // 2. Update existing
    saveOrUpdateUserPreset(
      'Test Glow Updated',
      'Updated Desc',
      'code 2',
      { u_scale: 3.5 },
      saved.preset!.id
    );

    loaded = loadUserPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Test Glow Updated');
    expect(loaded[0].uniforms.u_scale).toBe(3.5);

    // 3. Delete
    const deleted = deleteUserPreset(saved.preset!.id);
    expect(deleted.success).toBe(true);
    expect(loadUserPresets()).toHaveLength(0);
  });

  it('duplicates user presets as an independent copy', () => {
    const saved = saveOrUpdateUserPreset('Original Experiment', 'Original', 'code', { u_scale: 1.5 });
    expect(saved.preset).toBeDefined();

    const dupe = duplicateUserPreset(saved.preset!.id);
    expect(dupe.success).toBe(true);
    expect(dupe.preset).toBeDefined();
    expect(dupe.preset!.id).not.toBe(saved.preset!.id);
    expect(dupe.preset!.name).toBe('Original Experiment (Copy)');
    expect(dupe.preset!.uniforms.u_scale).toBe(1.5);

    const all = loadUserPresets();
    expect(all).toHaveLength(2);
  });

  it('renames user presets safely without mutating id or shader code', () => {
    const saved = saveOrUpdateUserPreset('Old Name', 'Desc', 'code', { u_scale: 1.0 });
    const renamed = renameUserPreset(saved.preset!.id, 'New Shiny Name');

    expect(renamed.success).toBe(true);
    expect(renamed.preset!.name).toBe('New Shiny Name');
    expect(renamed.preset!.id).toBe(saved.preset!.id);

    // Rejects empty name
    const invalidRename = renameUserPreset(saved.preset!.id, '   ');
    expect(invalidRename.success).toBe(false);
  });

  it('rejects unsupported future schema versions', () => {
    const futurePreset = {
      id: 'future-1',
      name: 'Future Experiment',
      shaderCode: 'code',
      schemaVersion: 999, // unsupported future version
      uniforms: {},
    };

    expect(validatePreset(futurePreset)).toBeNull();

    const futureImport = JSON.stringify({
      version: 999,
      experiments: [futurePreset],
    });
    const importRes = validateAndParseImportJson(futureImport);
    expect(importRes.success).toBe(false);
    expect(importRes.errors[0]).toContain('Unsupported schema version 999');
  });

  it('gracefully handles and reports storage quota errors', () => {
    const originalSetItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    };

    const res = persistUserPresets([
      {
        id: 'test',
        name: 'test',
        description: '',
        isBuiltin: false,
        shaderCode: 'code',
        uniforms: {},
        createdAt: 0,
        updatedAt: 0,
      },
    ]);

    expect(res.success).toBe(false);
    expect(res.error).toContain('Storage quota exceeded');

    // Restore mock setItem
    globalThis.localStorage.setItem = originalSetItem;
  });

  it('validates and imports single and bundle JSON files safely', () => {
    // 1. Single experiment JSON
    const singleJson = JSON.stringify({
      version: 1,
      source: 'ShaderForgeLab',
      experiment: {
        id: 'exp-single',
        name: 'Imported Single',
        shaderCode: 'void main() {}',
        uniforms: { u_scale: 3.0 },
      },
    });

    const parsedSingle = validateAndParseImportJson(singleJson);
    expect(parsedSingle.success).toBe(true);
    expect(parsedSingle.importedCount).toBe(1);
    expect(parsedSingle.importedPresets[0].name).toBe('Imported Single');

    // 2. Bundle JSON
    const bundleJson = JSON.stringify({
      version: 1,
      source: 'ShaderForgeLab',
      experiments: [
        { id: 'b1', name: 'Bundle Item 1', shaderCode: 'code1', uniforms: {} },
        { id: 'b2', name: 'Bundle Item 2', shaderCode: 'code2', uniforms: {} },
      ],
    });

    const parsedBundle = validateAndParseImportJson(bundleJson);
    expect(parsedBundle.success).toBe(true);
    expect(parsedBundle.importedCount).toBe(2);

    // 3. Collision safety: importing item with existing name appends (Imported)
    saveOrUpdateUserPreset('Existing Item', 'Desc', 'code', {});
    const collidingJson = JSON.stringify({
      name: 'Existing Item',
      shaderCode: 'code',
      uniforms: {},
    });

    const collisionRes = validateAndParseImportJson(collidingJson);
    expect(collisionRes.success).toBe(true);
    expect(collisionRes.importedPresets[0].name).toBe('Existing Item (Imported)');
  });
});

