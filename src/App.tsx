import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Viewport } from './components/Viewport';
import { ParametersPanel } from './components/ParametersPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import {
  RendererCallbacks,
  RendererStats,
  RendererStatus,
  ShaderCompileResult,
  ShaderDiagnostic,
} from './renderer/types';
import { ShaderRenderer } from './renderer/ShaderRenderer';
import { debounce } from './utils/debounce';
import { getDefaultUniformValues, SUPPORTED_USER_UNIFORMS } from './parameters/definitions';
import { UniformValue, UniformValues } from './parameters/types';
import { BUILTIN_PRESETS } from './presets/builtinPresets';
import {
  loadUserPresets,
  saveOrUpdateUserPreset,
  duplicateUserPreset,
  renameUserPreset,
  deleteUserPreset,
  exportExperimentAsJson,
  exportAllExperimentsAsJson,
  importExperiments,
} from './presets/storage';
import { ShaderPreset } from './presets/types';
import { captureCanvasSnapshot, exportStandaloneHtml } from './utils/exportUtils';
import './App.css';

export function App() {
  const initialPreset = BUILTIN_PRESETS[0];

  const [shaderCode, setShaderCode] = useState<string>(initialPreset.shaderCode);
  const [status, setStatus] = useState<RendererStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<RendererStats | null>(null);
  const [compileResult, setCompileResult] = useState<ShaderCompileResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<ShaderDiagnostic[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoCompile, setAutoCompile] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [triggerCompile, setTriggerCompile] = useState<number>(0);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  // Uniform parameters state (synchronized with active preset)
  const [uniforms, setUniforms] = useState<UniformValues>(() => ({
    ...getDefaultUniformValues(),
    ...initialPreset.uniforms,
  }));

  // Presets state (Built-in + LocalStorage User Presets)
  const [userPresets, setUserPresets] = useState<ShaderPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);

  const rendererInstanceRef = useRef<ShaderRenderer | null>(null);

  // Load user presets on initial mount
  useEffect(() => {
    const loaded = loadUserPresets();
    setUserPresets(loaded);
  }, []);

  const allPresets = useMemo(() => {
    return [...BUILTIN_PRESETS, ...userPresets];
  }, [userPresets]);

  // Trigger actual compilation on the renderer
  const performCompile = useCallback((codeToCompile: string) => {
    if (!rendererInstanceRef.current) return;
    const result = rendererInstanceRef.current.compileShader(codeToCompile);
    setCompileResult(result);
    setDiagnostics(result.diagnostics);
  }, []);

  // Debounced compile for typing (350ms)
  const debouncedCompile = useMemo(() => {
    return debounce((code: string) => {
      performCompile(code);
    }, 350);
  }, [performCompile]);

  const handleCodeChange = (newCode: string) => {
    setShaderCode(newCode);
    if (autoCompile) {
      debouncedCompile(newCode);
    }
  };

  const handleManualCompile = () => {
    debouncedCompile.cancel();
    performCompile(shaderCode);
  };

  // Uniform adjustments in real-time (no recompile needed!)
  const handleUniformChange = (name: string, value: UniformValue) => {
    setUniforms((prev) => ({ ...prev, [name]: value }));
    rendererInstanceRef.current?.setUserUniform(name, value);
  };

  const handleResetUniform = (name: string) => {
    const def = SUPPORTED_USER_UNIFORMS.find((u) => u.name === name);
    if (def) {
      handleUniformChange(name, def.defaultValue);
    }
  };

  const handleResetAllUniforms = () => {
    const active = allPresets.find((p) => p.id === activePresetId) || BUILTIN_PRESETS[0];
    const resetVals = { ...getDefaultUniformValues(), ...active.uniforms };
    setUniforms(resetVals);
    rendererInstanceRef.current?.setUserUniforms(resetVals);
  };

  // Fast preset switching with full state synchronization
  const handleSelectPreset = (preset: ShaderPreset) => {
    debouncedCompile.cancel();
    setActivePresetId(preset.id);
    setShaderCode(preset.shaderCode);

    const mergedUniforms = { ...getDefaultUniformValues(), ...preset.uniforms };
    setUniforms(mergedUniforms);

    if (rendererInstanceRef.current) {
      rendererInstanceRef.current.setUserUniforms(mergedUniforms);
      rendererInstanceRef.current.compileShader(preset.shaderCode);
    }
  };

  // Preset saving & library actions
  const handleSavePreset = (name: string, description: string, overwriteId?: string) => {
    const res = saveOrUpdateUserPreset(name, description, shaderCode, uniforms, overwriteId);
    if (res.success && res.preset) {
      setUserPresets(loadUserPresets());
      setActivePresetId(res.preset.id);
      showNotification('success', `Saved experiment "${res.preset.name}" to library.`);
    } else {
      showNotification('error', res.error || 'Failed to save experiment.');
    }
  };

  const handleDuplicatePreset = (id: string) => {
    const res = duplicateUserPreset(id);
    if (res.success && res.preset) {
      setUserPresets(loadUserPresets());
      setActivePresetId(res.preset.id);
      showNotification('success', `Duplicated "${res.preset.name}".`);
    } else {
      showNotification('error', res.error || 'Failed to duplicate experiment.');
    }
  };

  const handleRenamePreset = (id: string, newName: string) => {
    const res = renameUserPreset(id, newName);
    if (res.success && res.preset) {
      setUserPresets(loadUserPresets());
      showNotification('success', `Renamed experiment to "${res.preset.name}".`);
    } else {
      showNotification('error', res.error || 'Failed to rename experiment.');
    }
  };

  const handleDeletePreset = (id: string) => {
    const res = deleteUserPreset(id);
    if (res.success) {
      setUserPresets(loadUserPresets());
      if (activePresetId === id) {
        handleSelectPreset(BUILTIN_PRESETS[0]);
      }
      showNotification('info', 'Deleted experiment from personal library.');
    } else {
      showNotification('error', res.error || 'Failed to delete experiment.');
    }
  };

  const handleExportSinglePreset = (preset: ShaderPreset) => {
    exportExperimentAsJson(preset);
    showNotification('success', `Exported "${preset.name}" as JSON.`);
  };

  const handleExportAllPresets = () => {
    if (userPresets.length === 0) return;
    exportAllExperimentsAsJson(userPresets);
    showNotification('success', `Exported library bundle (${userPresets.length} experiments).`);
  };

  const handleImportJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== 'string') {
        showNotification('error', 'Unable to read file content.');
        return;
      }

      const res = importExperiments(content);
      if (res.success && res.importedPresets.length > 0) {
        setUserPresets(loadUserPresets());
        handleSelectPreset(res.importedPresets[0]);
        showNotification('success', `Imported ${res.importedCount} experiment(s) successfully.`);
      } else {
        showNotification(
          'error',
          res.errors.join(' ') || 'Failed to import experiments from JSON.'
        );
      }
    };
    reader.onerror = () => {
      showNotification('error', 'Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleTogglePause = () => {
    if (rendererInstanceRef.current) {
      const paused = rendererInstanceRef.current.togglePause();
      setIsPaused(paused);
    }
  };

  const handleResetTime = () => {
    rendererInstanceRef.current?.resetTime();
  };

  const handleResetDefault = () => {
    debouncedCompile.cancel();
    const defaultPreset = BUILTIN_PRESETS[0];
    handleSelectPreset(defaultPreset);
  };

  // Snapshot & Standalone HTML Exports
  const handleTakeSnapshot = () => {
    if (rendererInstanceRef.current) {
      captureCanvasSnapshot(rendererInstanceRef.current.getCanvas());
    }
  };

  const handleExportHtml = () => {
    exportStandaloneHtml(shaderCode, uniforms);
  };

  // Stable callbacks for renderer
  const rendererCallbacks: RendererCallbacks = useMemo(
    () => ({
      onStatusChange: (newStatus: RendererStatus, details?: string) => {
        setStatus(newStatus);
        setStatusDetails(details);
      },
      onDiagnostics: (result: ShaderCompileResult) => {
        setCompileResult(result);
        setDiagnostics(result.diagnostics);
      },
      onStats: (newStats: RendererStats) => {
        setStats(newStats);
      },
    }),
    []
  );

  return (
    <div className="app-layout">
      <Header
        status={status}
        stats={stats}
        isPaused={isPaused}
        onCompile={handleManualCompile}
        onTogglePause={handleTogglePause}
        onResetTime={handleResetTime}
        onResetDefault={handleResetDefault}
        onTakeSnapshot={handleTakeSnapshot}
        onExportHtml={handleExportHtml}
        showDiagnostics={showDiagnostics}
        onToggleDiagnostics={() => setShowDiagnostics((prev) => !prev)}
        compileTimeMs={compileResult?.compileTimeMs}
      />

      <main className="main-content">
        <div className="workspace-split">
          {/* Left: Code Editor (CodeMirror 6) */}
          <div className="split-pane pane-editor">
            <Editor
              code={shaderCode}
              onChange={handleCodeChange}
              onManualCompile={handleManualCompile}
              diagnostics={diagnostics}
              autoCompile={autoCompile}
              onToggleAutoCompile={() => setAutoCompile((prev) => !prev)}
            />
          </div>

          {/* Right: Viewport + Parameters & Presets Panel */}
          <div className="split-pane pane-right">
            <div className="pane-right-viewport">
              <Viewport
                shaderCode={shaderCode}
                triggerCompile={triggerCompile}
                callbacks={rendererCallbacks}
                status={status}
                statusDetails={statusDetails}
                diagnostics={diagnostics}
                isPaused={isPaused}
                onRendererReady={(renderer) => {
                  rendererInstanceRef.current = renderer;
                  renderer.setUserUniforms(uniforms);
                  setTriggerCompile((c) => c + 1);
                }}
              />
            </div>

            <div className="pane-right-params">
              <ParametersPanel
                uniforms={uniforms}
                onUniformChange={handleUniformChange}
                onResetUniform={handleResetUniform}
                onResetAllUniforms={handleResetAllUniforms}
                builtinPresets={BUILTIN_PRESETS}
                userPresets={userPresets}
                activePresetId={activePresetId}
                onSelectPreset={handleSelectPreset}
                onSavePreset={handleSavePreset}
                onDuplicatePreset={handleDuplicatePreset}
                onRenamePreset={handleRenamePreset}
                onDeletePreset={handleDeletePreset}
                onExportSinglePreset={handleExportSinglePreset}
                onExportAllPresets={handleExportAllPresets}
                onImportJsonFile={handleImportJsonFile}
                notification={notification}
                onDismissNotification={() => setNotification(null)}
              />
            </div>
          </div>
        </div>
      </main>

      <DiagnosticsPanel
        compileResult={compileResult}
        isOpen={showDiagnostics}
        onToggle={() => setShowDiagnostics((prev) => !prev)}
      />
    </div>
  );
}
