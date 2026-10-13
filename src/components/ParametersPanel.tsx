import React, { useState, useRef } from 'react';
import {
  Sliders,
  Sparkles,
  FolderHeart,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Copy,
  Edit2,
  Download,
  Upload,
  Search,
  Tag,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { SUPPORTED_USER_UNIFORMS, rgbToHex, hexToRgb } from '../parameters/definitions';
import { UniformValue, UniformValues } from '../parameters/types';
import { ShaderPreset } from '../presets/types';

interface ParametersPanelProps {
  uniforms: UniformValues;
  onUniformChange: (name: string, value: UniformValue) => void;
  onResetUniform: (name: string) => void;
  onResetAllUniforms: () => void;
  builtinPresets: ShaderPreset[];
  userPresets: ShaderPreset[];
  activePresetId?: string;
  onSelectPreset: (preset: ShaderPreset) => void;
  onSavePreset: (name: string, description: string, overwriteId?: string) => void;
  onDuplicatePreset: (id: string) => void;
  onRenamePreset: (id: string, newName: string) => void;
  onDeletePreset: (id: string) => void;
  onExportSinglePreset: (preset: ShaderPreset) => void;
  onExportAllPresets: () => void;
  onImportJsonFile: (file: File) => void;
  notification?: { type: 'success' | 'error' | 'info'; message: string } | null;
  onDismissNotification?: () => void;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({
  uniforms,
  onUniformChange,
  onResetUniform,
  onResetAllUniforms,
  builtinPresets,
  userPresets,
  activePresetId,
  onSelectPreset,
  onSavePreset,
  onDuplicatePreset,
  onRenamePreset,
  onDeletePreset,
  onExportSinglePreset,
  onExportAllPresets,
  onImportJsonFile,
  notification,
  onDismissNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'params' | 'gallery' | 'library'>('params');

  // Search & Filter state
  const [galleryCategory, setGalleryCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'update'>('new');
  const [presetNameInput, setPresetNameInput] = useState('');
  const [presetDescInput, setPresetDescInput] = useState('');

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<ShaderPreset | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<ShaderPreset | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeUserPreset = userPresets.find((p) => p.id === activePresetId);

  // Gallery categories list
  const categories = ['All', 'Cosmic', 'Fluid', 'Cyberpunk', 'Atmospheric', 'Fractal', 'Astrophysics'];

  const filteredBuiltinPresets = builtinPresets.filter((p) => {
    if (galleryCategory === 'All') return true;
    return p.category === galleryCategory;
  });

  const filteredUserPresets = userPresets.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = p.name.toLowerCase().includes(q);
    const matchDesc = p.description.toLowerCase().includes(q);
    const matchCategory = p.category?.toLowerCase().includes(q);
    const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q));
    return matchName || matchDesc || matchCategory || matchTags;
  });

  const handleOpenSaveModal = () => {
    if (activeUserPreset) {
      setSaveMode('update');
      setPresetNameInput(activeUserPreset.name);
      setPresetDescInput(activeUserPreset.description);
    } else {
      setSaveMode('new');
      setPresetNameInput('');
      setPresetDescInput('');
    }
    setShowSaveModal(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetNameInput.trim()) return;

    const overwriteId = saveMode === 'update' && activeUserPreset ? activeUserPreset.id : undefined;
    onSavePreset(presetNameInput.trim(), presetDescInput.trim(), overwriteId);
    setShowSaveModal(false);
  };

  const handleOpenRename = (preset: ShaderPreset) => {
    setRenameTarget(preset);
    setRenameInput(preset.name);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameInput.trim()) return;
    onRenamePreset(renameTarget.id, renameInput.trim());
    setRenameTarget(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onDeletePreset(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJsonFile(file);
      // Reset input value so re-importing the same file works
      e.target.value = '';
    }
  };

  return (
    <div className="parameters-panel">
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Panel Tab Bar */}
      <div className="params-tab-bar">
        <div className="params-tabs">
          <button
            className={`params-tab-btn ${activeTab === 'params' ? 'active' : ''}`}
            onClick={() => setActiveTab('params')}
            id="tab-params"
          >
            <Sliders size={13} />
            <span>Parameters</span>
          </button>

          <button
            className={`params-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
            id="tab-gallery"
          >
            <Sparkles size={13} />
            <span>Curated Gallery</span>
            <span className="preset-count-badge">{builtinPresets.length}</span>
          </button>

          <button
            className={`params-tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
            id="tab-library"
          >
            <FolderHeart size={13} />
            <span>My Library</span>
            <span className="preset-count-badge">{userPresets.length}</span>
          </button>
        </div>

        <div className="params-tab-actions">
          {activeTab === 'params' && (
            <>
              <button
                className="btn-ghost-sm"
                onClick={onResetAllUniforms}
                title="Reset all live parameters to preset defaults"
              >
                <RotateCcw size={12} />
                <span>Reset All</span>
              </button>
              <button
                className="btn-primary-sm"
                onClick={handleOpenSaveModal}
                title="Save current shader and parameters to My Library"
                id="btn-save-current"
              >
                <Plus size={12} />
                <span>Save to Library</span>
              </button>
            </>
          )}

          {activeTab === 'library' && (
            <>
              <button
                className="btn-ghost-sm"
                onClick={() => fileInputRef.current?.click()}
                title="Import experiments from JSON file"
                id="btn-import-json"
              >
                <Upload size={12} />
                <span>Import JSON</span>
              </button>

              {userPresets.length > 0 && (
                <button
                  className="btn-ghost-sm"
                  onClick={onExportAllPresets}
                  title="Export all saved experiments as JSON bundle"
                  id="btn-export-all-json"
                >
                  <Download size={12} />
                  <span>Export All</span>
                </button>
              )}

              <button
                className="btn-primary-sm"
                onClick={handleOpenSaveModal}
                title="Save current configuration as new experiment"
              >
                <Plus size={12} />
                <span>Save New</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notification banner if present */}
      {notification && (
        <div className={`params-notification notification-${notification.type}`}>
          <span>{notification.message}</span>
          {onDismissNotification && (
            <button className="btn-icon-xs" onClick={onDismissNotification}>
              ×
            </button>
          )}
        </div>
      )}

      {/* Tab Body */}
      <div className="params-body">
        {/* TAB 1: LIVE PARAMETERS */}
        {activeTab === 'params' && (
          <div className="uniforms-controls-list">
            {SUPPORTED_USER_UNIFORMS.map((def) => {
              const currentValue = uniforms[def.name] ?? def.defaultValue;

              if (def.type === 'color') {
                const rgb = (Array.isArray(currentValue) && currentValue.length === 3
                  ? currentValue
                  : def.defaultValue) as [number, number, number];
                const hex = rgbToHex(rgb);

                return (
                  <div key={def.name} className="control-row">
                    <div className="control-label-col">
                      <span className="control-name">{def.label}</span>
                      <span className="control-uniform-var">{def.name}</span>
                    </div>

                    <div className="control-input-col color-picker-group">
                      <input
                        type="color"
                        className="color-input"
                        value={hex}
                        onChange={(e) => onUniformChange(def.name, hexToRgb(e.target.value))}
                        title="Pick base tint"
                      />
                      <span className="color-hex-tag">{hex.toUpperCase()}</span>

                      <button
                        className="btn-icon-xs"
                        onClick={() => onResetUniform(def.name)}
                        title="Reset to default"
                      >
                        <RotateCcw size={11} />
                      </button>
                    </div>
                  </div>
                );
              }

              // Float Sliders
              const floatVal =
                typeof currentValue === 'number' ? currentValue : (def.defaultValue as number);
              const min = def.min ?? 0;
              const max = def.max ?? 10;
              const step = def.step ?? 0.1;

              return (
                <div key={def.name} className="control-row">
                  <div className="control-label-col">
                    <div className="label-with-val">
                      <span className="control-name">{def.label}</span>
                      <span className="control-val-display">{floatVal.toFixed(2)}</span>
                    </div>
                    <span className="control-uniform-var">{def.name}</span>
                  </div>

                  <div className="control-input-col slider-group">
                    <input
                      type="range"
                      className="param-slider"
                      min={min}
                      max={max}
                      step={step}
                      value={floatVal}
                      onChange={(e) => onUniformChange(def.name, parseFloat(e.target.value))}
                    />

                    <button
                      className="btn-icon-xs"
                      onClick={() => onResetUniform(def.name)}
                      title="Reset to default"
                    >
                      <RotateCcw size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: CURATED GALLERY */}
        {activeTab === 'gallery' && (
          <div className="curated-gallery-view">
            {/* Category Chips */}
            <div className="category-chips-bar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`chip-btn ${galleryCategory === cat ? 'active' : ''}`}
                  onClick={() => setGalleryCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="presets-grid">
              {filteredBuiltinPresets.map((preset) => {
                const isActive = activePresetId === preset.id;

                return (
                  <div
                    key={preset.id}
                    className={`preset-card builtin ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectPreset(preset)}
                  >
                    <div className="preset-card-top">
                      <div className="preset-title-group">
                        <Sparkles size={12} className="builtin-sparkle" />
                        <span className="preset-title">{preset.name}</span>
                      </div>
                      <span className="preset-badge badge-builtin">{preset.category || 'Curated'}</span>
                    </div>

                    <p className="preset-description">{preset.description}</p>

                    {preset.tags && preset.tags.length > 0 && (
                      <div className="preset-tags-list">
                        {preset.tags.map((t) => (
                          <span key={t} className="tag-chip">
                            <Tag size={9} />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="preset-card-footer">
                      <div className="preset-params-preview">
                        {Object.entries(preset.uniforms).map(([k, v]) => (
                          <span key={k} className="preset-param-tag">
                            {k.replace('u_', '')}: {Array.isArray(v) ? 'rgb' : Number(v).toFixed(1)}
                          </span>
                        ))}
                      </div>

                      <div className="preset-actions" onClick={(e) => e.stopPropagation()}>
                        {isActive ? (
                          <span className="active-pill">
                            <Check size={11} /> Active
                          </span>
                        ) : (
                          <button
                            className="btn-primary-xs"
                            onClick={() => onSelectPreset(preset)}
                            title="Load preset into editor and viewport"
                          >
                            <Play size={10} /> Load
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: MY PERSONAL LIBRARY */}
        {activeTab === 'library' && (
          <div className="personal-library-view">
            {/* Search Filter Bar */}
            <div className="library-toolbar">
              <div className="search-box">
                <Search size={13} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search experiments by name, description, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button className="btn-icon-xs" onClick={() => setSearchQuery('')}>
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Empty State */}
            {userPresets.length === 0 ? (
              <div className="library-empty-state">
                <FolderHeart size={32} className="empty-icon" />
                <h5>Your Personal Library is Empty</h5>
                <p>
                  Save your custom shader experiments here to revisit them anytime, or import an
                  exported JSON experiment file.
                </p>
                <div className="empty-actions">
                  <button className="btn-primary-sm" onClick={handleOpenSaveModal}>
                    <Plus size={12} /> Save Current Shader
                  </button>
                  <button
                    className="btn-ghost-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={12} /> Import JSON File
                  </button>
                </div>
              </div>
            ) : filteredUserPresets.length === 0 ? (
              <div className="library-no-match">
                <p>No experiments matched "{searchQuery}"</p>
              </div>
            ) : (
              <div className="presets-grid">
                {filteredUserPresets.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  const formattedDate = new Date(preset.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={preset.id}
                      className={`preset-card user-experiment ${isActive ? 'active' : ''}`}
                    >
                      <div className="preset-card-top">
                        <div className="preset-title-group">
                          <span className="preset-title">{preset.name}</span>
                          <span className="preset-date-text">{formattedDate}</span>
                        </div>
                        <span className="preset-badge badge-user">Personal</span>
                      </div>

                      {preset.description && (
                        <p className="preset-description">{preset.description}</p>
                      )}

                      <div className="preset-card-footer">
                        <div className="preset-params-preview">
                          {Object.entries(preset.uniforms).map(([k, v]) => (
                            <span key={k} className="preset-param-tag">
                              {k.replace('u_', '')}: {Array.isArray(v) ? 'rgb' : Number(v).toFixed(1)}
                            </span>
                          ))}
                        </div>

                        <div className="experiment-card-actions">
                          {/* Restore / Load Button */}
                          <button
                            className={`btn-action-pill ${isActive ? 'active' : ''}`}
                            onClick={() => onSelectPreset(preset)}
                            title={isActive ? 'Currently active' : 'Restore this experiment into editor'}
                          >
                            {isActive ? <Check size={11} /> : <Play size={10} />}
                            <span>{isActive ? 'Active' : 'Restore'}</span>
                          </button>

                          {/* Duplicate */}
                          <button
                            className="btn-icon-xs"
                            onClick={() => onDuplicatePreset(preset.id)}
                            title="Duplicate experiment"
                          >
                            <Copy size={11} />
                          </button>

                          {/* Rename */}
                          <button
                            className="btn-icon-xs"
                            onClick={() => handleOpenRename(preset)}
                            title="Rename experiment"
                          >
                            <Edit2 size={11} />
                          </button>

                          {/* Export JSON */}
                          <button
                            className="btn-icon-xs"
                            onClick={() => onExportSinglePreset(preset)}
                            title="Export as JSON file"
                          >
                            <Download size={11} />
                          </button>

                          {/* Delete */}
                          <button
                            className="btn-icon-xs delete-btn"
                            onClick={() => setDeleteTarget(preset)}
                            title="Delete experiment"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SAVE EXPERIMENT MODAL (Explicit Overwrite / New Copy Safety) */}
      {showSaveModal && (
        <div className="save-modal-backdrop" onClick={() => setShowSaveModal(false)}>
          <div className="save-modal-card" onClick={(e) => e.stopPropagation()}>
            <h4>Save to Personal Library</h4>
            <p className="modal-sub">
              Persist your shader source and current parameter values to local storage.
            </p>

            <form onSubmit={handleSaveSubmit}>
              {activeUserPreset && (
                <div className="save-mode-selector">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="saveMode"
                      checked={saveMode === 'update'}
                      onChange={() => setSaveMode('update')}
                    />
                    <span>Update active experiment (<strong>{activeUserPreset.name}</strong>)</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="saveMode"
                      checked={saveMode === 'new'}
                      onChange={() => setSaveMode('new')}
                    />
                    <span>Save as a new independent experiment</span>
                  </label>
                </div>
              )}

              <div className="form-group">
                <label>Experiment Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Neon Horizon"
                  value={presetNameInput}
                  onChange={(e) => setPresetNameInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. High intensity plasma with audio responsive pulses"
                  value={presetDescInput}
                  onChange={(e) => setPresetDescInput(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSaveModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" id="btn-modal-save-confirm">
                  {saveMode === 'update' ? 'Update Experiment' : 'Save New Experiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME EXPERIMENT MODAL */}
      {renameTarget && (
        <div className="save-modal-backdrop" onClick={() => setRenameTarget(null)}>
          <div className="save-modal-card" onClick={(e) => e.stopPropagation()}>
            <h4>Rename Experiment</h4>
            <p className="modal-sub">Update the title of "{renameTarget.name}".</p>

            <form onSubmit={handleRenameSubmit}>
              <div className="form-group">
                <label>New Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameInput}
                  onChange={(e) => setRenameInput(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRenameTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (Explicit Destructive Action Safety) */}
      {deleteTarget && (
        <div className="save-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="save-modal-card danger-modal" onClick={(e) => e.stopPropagation()}>
            <div className="danger-header">
              <AlertTriangle size={20} className="danger-icon" />
              <h4>Delete Experiment?</h4>
            </div>

            <p className="danger-warning">
              Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>? This will
              remove it from your local personal library and cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                id="btn-confirm-delete"
              >
                Delete Experiment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

