import { ShaderPreset, ShaderExportBundle, ImportResult } from './types';
import { SUPPORTED_USER_UNIFORMS, getDefaultUniformValues } from '../parameters/definitions';
import { validateAndClampUniform, UniformValues } from '../parameters/types';

export const CURRENT_SCHEMA_VERSION = 1;
export const USER_PRESETS_STORAGE_KEY = 'shaderforgelab_user_presets_v1';

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Validates and sanitizes a raw object into a valid ShaderPreset.
 * Returns null if the structure is fundamentally invalid or schema version is unsupported.
 */
export function validatePreset(raw: unknown): ShaderPreset | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Check schema version if specified
  if (typeof obj.schemaVersion === 'number' && obj.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return null;
  }

  if (typeof obj.id !== 'string' || !obj.id.trim()) {
    return null;
  }

  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    return null;
  }

  const shaderCode =
    typeof obj.shaderCode === 'string' && obj.shaderCode.trim() ? obj.shaderCode : '';

  if (!shaderCode) {
    return null;
  }

  // Sanitize uniforms
  const sanitizedUniforms: UniformValues = getDefaultUniformValues();
  if (obj.uniforms && typeof obj.uniforms === 'object') {
    const rawUniforms = obj.uniforms as Record<string, unknown>;
    for (const def of SUPPORTED_USER_UNIFORMS) {
      if (def.name in rawUniforms) {
        sanitizedUniforms[def.name] = validateAndClampUniform(def, rawUniforms[def.name]);
      }
    }
  }

  const now = Date.now();
  const createdAt = typeof obj.createdAt === 'number' && !isNaN(obj.createdAt) ? obj.createdAt : now;
  const updatedAt = typeof obj.updatedAt === 'number' && !isNaN(obj.updatedAt) ? obj.updatedAt : now;
  const description = typeof obj.description === 'string' ? obj.description.trim() : '';
  const category = typeof obj.category === 'string' ? obj.category.trim() : undefined;
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((t): t is string => typeof t === 'string' && !!t.trim())
    : undefined;

  return {
    id: obj.id.trim(),
    name: obj.name.trim(),
    description,
    category,
    tags,
    isBuiltin: false,
    shaderCode,
    uniforms: sanitizedUniforms,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt,
    updatedAt,
  };
}

/**
 * Safely loads user presets from local storage.
 * Gracefully ignores corrupted items without throwing errors.
 */
export function loadUserPresets(): ShaderPreset[] {
  try {
    const storage = getStorage();
    if (!storage) {
      return [];
    }

    const stored = storage.getItem(USER_PRESETS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const validPresets: ShaderPreset[] = [];
    for (const item of parsed) {
      const validated = validatePreset(item);
      if (validated) {
        validPresets.push(validated);
      }
    }

    return validPresets;
  } catch (err) {
    console.warn('Failed to parse user presets from localStorage, falling back to empty list:', err);
    return [];
  }
}

/**
 * Persists an array of presets to local storage.
 * Catches QuotaExceededError and reports detailed failure.
 */
export function persistUserPresets(presets: ShaderPreset[]): { success: boolean; error?: string } {
  try {
    const storage = getStorage();
    if (!storage) {
      return { success: false, error: 'Storage is not accessible.' };
    }

    const serialized = JSON.stringify(presets);
    storage.setItem(USER_PRESETS_STORAGE_KEY, serialized);
    return { success: true };
  } catch (err: unknown) {
    const errorObj = err as Error;
    const isQuota =
      errorObj.name === 'QuotaExceededError' ||
      errorObj.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      ('code' in errorObj && (errorObj as { code: number }).code === 22);

    const errorMsg = isQuota
      ? 'Storage quota exceeded. Please export and delete older experiments.'
      : `Failed to save experiments: ${errorObj.message || 'Unknown storage error'}`;

    console.error(errorMsg, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Saves a new preset or updates an existing one.
 */
export function saveOrUpdateUserPreset(
  name: string,
  description: string,
  shaderCode: string,
  uniforms: UniformValues,
  existingId?: string,
  category?: string,
  tags?: string[]
): { success: boolean; preset?: ShaderPreset; error?: string } {
  const current = loadUserPresets();
  const now = Date.now();

  if (existingId) {
    const idx = current.findIndex((p) => p.id === existingId);
    if (idx !== -1) {
      const updated: ShaderPreset = {
        ...current[idx],
        name: name.trim(),
        description: description.trim(),
        category: category ?? current[idx].category,
        tags: tags ?? current[idx].tags,
        shaderCode,
        uniforms: { ...uniforms },
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: now,
      };
      current[idx] = updated;
      const res = persistUserPresets(current);
      if (!res.success) {
        return { success: false, error: res.error };
      }
      return { success: true, preset: updated };
    }
  }

  // Create new unique preset
  const id = `user-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const newPreset: ShaderPreset = {
    id,
    name: name.trim(),
    description: description.trim(),
    category: category || 'Custom',
    tags: tags || ['Personal'],
    isBuiltin: false,
    shaderCode,
    uniforms: { ...uniforms },
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };

  current.unshift(newPreset);
  const res = persistUserPresets(current);
  if (!res.success) {
    return { success: false, error: res.error };
  }
  return { success: true, preset: newPreset };
}

/**
 * Duplicates an existing experiment, producing an independent copy with a new ID.
 */
export function duplicateUserPreset(
  id: string
): { success: boolean; preset?: ShaderPreset; error?: string } {
  const current = loadUserPresets();
  const source = current.find((p) => p.id === id);

  if (!source) {
    return { success: false, error: 'Experiment to duplicate not found.' };
  }

  const now = Date.now();
  const newId = `user-${now}-${Math.random().toString(36).substring(2, 7)}`;
  const duplicated: ShaderPreset = {
    ...source,
    id: newId,
    name: `${source.name} (Copy)`,
    isBuiltin: false,
    createdAt: now,
    updatedAt: now,
  };

  current.unshift(duplicated);
  const res = persistUserPresets(current);
  if (!res.success) {
    return { success: false, error: res.error };
  }
  return { success: true, preset: duplicated };
}

/**
 * Renames an existing user experiment without altering its code or ID.
 */
export function renameUserPreset(
  id: string,
  newName: string
): { success: boolean; preset?: ShaderPreset; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) {
    return { success: false, error: 'Preset name cannot be empty.' };
  }

  const current = loadUserPresets();
  const idx = current.findIndex((p) => p.id === id);
  if (idx === -1) {
    return { success: false, error: 'Experiment not found.' };
  }

  current[idx].name = trimmed;
  current[idx].updatedAt = Date.now();

  const res = persistUserPresets(current);
  if (!res.success) {
    return { success: false, error: res.error };
  }
  return { success: true, preset: current[idx] };
}

/**
 * Deletes a user preset by ID.
 */
export function deleteUserPreset(id: string): { success: boolean; error?: string } {
  const current = loadUserPresets();
  const filtered = current.filter((p) => p.id !== id);
  if (filtered.length !== current.length) {
    const res = persistUserPresets(filtered);
    return res;
  }
  return { success: false, error: 'Experiment not found.' };
}

/**
 * Parses and validates an imported JSON string into valid experiments.
 * Never silently overwrites existing experiments.
 */
export function validateAndParseImportJson(jsonString: string): ImportResult {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      success: false,
      importedCount: 0,
      errors: ['Malformed JSON file. Please provide a valid JSON export.'],
      importedPresets: [],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      importedCount: 0,
      errors: ['Invalid root JSON object.'],
      importedPresets: [],
    };
  }

  const parsedObj = parsed as Record<string, unknown>;

  // Check bundle schema version
  if (typeof parsedObj.version === 'number' && parsedObj.version > CURRENT_SCHEMA_VERSION) {
    return {
      success: false,
      importedCount: 0,
      errors: [
        `Unsupported schema version ${parsedObj.version}. Maximum supported is ${CURRENT_SCHEMA_VERSION}.`,
      ],
      importedPresets: [],
    };
  }

  // Determine items list
  let rawItems: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (Array.isArray(parsedObj.experiments)) {
    rawItems = parsedObj.experiments;
  } else if (parsedObj.experiment && typeof parsedObj.experiment === 'object') {
    rawItems = [parsedObj.experiment];
  } else if (parsedObj.name && parsedObj.shaderCode) {
    // Single bare experiment
    rawItems = [parsedObj];
  } else {
    return {
      success: false,
      importedCount: 0,
      errors: ['No valid experiments found in the imported file.'],
      importedPresets: [],
    };
  }

  const existingPresets = loadUserPresets();
  const existingNames = new Set(existingPresets.map((p) => p.name.toLowerCase()));
  const existingIds = new Set(existingPresets.map((p) => p.id));

  const validPresets: ShaderPreset[] = [];
  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const rawObj = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    const itemWithId =
      rawObj && !rawObj.id
        ? { ...rawObj, id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` }
        : item;

    const validated = validatePreset(itemWithId);
    if (!validated) {
      errors.push(`Item #${i + 1} could not be validated (missing name or shaderCode).`);
      continue;
    }

    // Collision safety: Generate fresh ID if collision, and rename if name collides
    let finalId = validated.id;
    if (existingIds.has(finalId)) {
      finalId = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    let finalName = validated.name;
    if (existingNames.has(finalName.toLowerCase())) {
      finalName = `${finalName} (Imported)`;
    }

    validPresets.push({
      ...validated,
      id: finalId,
      name: finalName,
      isBuiltin: false,
      updatedAt: Date.now(),
    });
  }

  if (validPresets.length === 0) {
    return {
      success: false,
      importedCount: 0,
      errors: errors.length > 0 ? errors : ['No valid experiments found.'],
      importedPresets: [],
    };
  }

  return {
    success: true,
    importedCount: validPresets.length,
    errors,
    importedPresets: validPresets,
  };
}

/**
 * Imports experiments from JSON string and safely adds them to user library.
 */
export function importExperiments(jsonString: string): ImportResult {
  const parseResult = validateAndParseImportJson(jsonString);
  if (!parseResult.success || parseResult.importedPresets.length === 0) {
    return parseResult;
  }

  const current = loadUserPresets();
  const merged = [...parseResult.importedPresets, ...current];
  const saveRes = persistUserPresets(merged);

  if (!saveRes.success) {
    return {
      success: false,
      importedCount: 0,
      errors: [saveRes.error || 'Failed to persist imported experiments.'],
      importedPresets: [],
    };
  }

  return parseResult;
}

/**
 * Triggers a client-side download of a single experiment as JSON.
 */
export function exportExperimentAsJson(preset: ShaderPreset): void {
  const exportPayload = {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'ShaderForgeLab' as const,
    experiment: preset,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = preset.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  a.href = url;
  a.download = `${safeName}.shader.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a client-side download of all user experiments as a JSON bundle.
 */
export function exportAllExperimentsAsJson(presets: ShaderPreset[]): void {
  const exportPayload: ShaderExportBundle = {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'ShaderForgeLab',
    experiments: presets,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `shaderforgelab-library-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

