import React, { useState } from 'react';
import { Terminal, AlertCircle, CheckCircle, Info, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { ShaderCompileResult } from '../renderer/types';

interface DiagnosticsPanelProps {
  compileResult: ShaderCompileResult | null;
  isOpen: boolean;
  onToggle: () => void;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  compileResult,
  isOpen,
  onToggle,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'uniforms'>('diagnostics');

  if (!isOpen) {
    return (
      <div className="diagnostics-bar-collapsed" onClick={onToggle}>
        <div className="diag-bar-left">
          <Terminal size={14} />
          <span>Diagnostics Console</span>
          {compileResult && (
            <span
              className={`diag-pill ${compileResult.success ? 'pill-success' : 'pill-error'}`}
            >
              {compileResult.success
                ? `Compiled in ${compileResult.compileTimeMs}ms`
                : `${compileResult.diagnostics.length} Error(s)`}
            </span>
          )}
        </div>
        <div className="diag-bar-right">
          <ChevronUp size={15} />
        </div>
      </div>
    );
  }

  return (
    <div className="diagnostics-panel">
      <div className="diag-header">
        <div className="diag-tabs">
          <button
            className={`diag-tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            <Terminal size={13} />
            <span>Compiler Output</span>
            {compileResult && (
              <span className="tab-count">
                {compileResult.diagnostics.length > 0 ? compileResult.diagnostics.length : '0'}
              </span>
            )}
          </button>
          <button
            className={`diag-tab ${activeTab === 'uniforms' ? 'active' : ''}`}
            onClick={() => setActiveTab('uniforms')}
          >
            <Layers size={13} />
            <span>Built-in Uniforms</span>
          </button>
        </div>

        <button className="btn-ghost-sm" onClick={onToggle} title="Collapse diagnostics">
          <ChevronDown size={14} />
          <span>Hide</span>
        </button>
      </div>

      <div className="diag-content">
        {activeTab === 'diagnostics' && (
          <div className="diag-list">
            {!compileResult && (
              <div className="diag-empty">
                <Info size={16} />
                <span>No compilation events recorded yet.</span>
              </div>
            )}

            {compileResult && compileResult.success && compileResult.diagnostics.length === 0 && (
              <div className="diag-item success">
                <CheckCircle size={15} className="diag-icon success" />
                <div className="diag-text">
                  <span className="diag-title">Shader compiled and linked successfully</span>
                  <span className="diag-sub">Time taken: {compileResult.compileTimeMs} ms</span>
                </div>
              </div>
            )}

            {compileResult &&
              compileResult.diagnostics.map((diag, idx) => (
                <div
                  key={idx}
                  className={`diag-item ${diag.severity === 'error' ? 'error' : 'warning'}`}
                >
                  <AlertCircle size={15} className={`diag-icon ${diag.severity}`} />
                  <div className="diag-text">
                    <span className="diag-title">
                      Line {diag.line}
                      {diag.column !== undefined ? `:${diag.column}` : ''} — {diag.message}
                    </span>
                    {compileResult.rawLog && (
                      <pre className="diag-raw-log">{compileResult.rawLog}</pre>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === 'uniforms' && (
          <div className="uniforms-grid">
            <div className="uniform-card">
              <span className="uniform-name">uniform float u_time</span>
              <span className="uniform-desc">Total elapsed time in seconds since start/reset</span>
            </div>
            <div className="uniform-card">
              <span className="uniform-name">uniform vec2 u_resolution</span>
              <span className="uniform-desc">Viewport width and height in device physical pixels</span>
            </div>
            <div className="uniform-card">
              <span className="uniform-name">uniform vec2 u_mouse</span>
              <span className="uniform-desc">Mouse cursor position in viewport pixels</span>
            </div>
            <div className="uniform-card">
              <span className="uniform-name">uniform int u_frame</span>
              <span className="uniform-desc">Monotonically increasing integer frame counter</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
