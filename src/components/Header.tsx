import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Terminal,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Camera,
  Download,
} from 'lucide-react';
import { RendererStats, RendererStatus } from '../renderer/types';

interface HeaderProps {
  status: RendererStatus;
  stats: RendererStats | null;
  isPaused: boolean;
  onCompile: () => void;
  onTogglePause: () => void;
  onResetTime: () => void;
  onResetDefault: () => void;
  onTakeSnapshot?: () => void;
  onExportHtml?: () => void;
  showDiagnostics: boolean;
  onToggleDiagnostics: () => void;
  compileTimeMs?: number;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  stats,
  isPaused,
  onCompile,
  onTogglePause,
  onResetTime,
  onResetDefault,
  onTakeSnapshot,
  onExportHtml,
  showDiagnostics,
  onToggleDiagnostics,
  compileTimeMs,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={13} className="badge-icon" />
            <span>Ready</span>
            {compileTimeMs !== undefined && <span className="compile-time">{compileTimeMs}ms</span>}
          </span>
        );
      case 'compiling':
        return (
          <span className="badge badge-warning">
            <RefreshCw size={13} className="badge-icon spin" />
            <span>Compiling...</span>
          </span>
        );
      case 'error':
        return (
          <span className="badge badge-error">
            <AlertCircle size={13} className="badge-icon" />
            <span>Error</span>
          </span>
        );
      case 'context_lost':
        return (
          <span className="badge badge-error">
            <AlertCircle size={13} className="badge-icon" />
            <span>Context Lost</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-neutral">
            <span>Idle</span>
          </span>
        );
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand">
          <div className="logo-icon">
            <Zap size={18} />
          </div>
          <div className="brand-text">
            <span className="brand-title">ShaderForgeLab</span>
            <span className="brand-version">v0.2.0-b2</span>
          </div>
        </div>

        <div className="status-container">{getStatusBadge()}</div>
      </div>

      <div className="header-center">
        {stats && (
          <div className="metrics-strip">
            <div className="metric-item">
              <span className="metric-label">FPS</span>
              <span className={`metric-val ${stats.fps < 30 ? 'warn' : ''}`}>{stats.fps}</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <span className="metric-label">Frame</span>
              <span className="metric-val">{stats.frameTimeMs} ms</span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <span className="metric-label">Res</span>
              <span className="metric-val">
                {stats.resolution[0]}×{stats.resolution[1]}
              </span>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <span className="metric-label">DPR</span>
              <span className="metric-val">{stats.dpr}x</span>
            </div>
          </div>
        )}
      </div>

      <div className="header-right">
        <button
          className="btn btn-secondary"
          onClick={onTogglePause}
          title={isPaused ? 'Resume animation' : 'Pause animation'}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onResetTime}
          title="Reset elapsed time (u_time = 0)"
        >
          <RotateCcw size={14} />
          <span>Reset Time</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onResetDefault}
          title="Restore default animated shader"
        >
          <span>Default</span>
        </button>

        {onTakeSnapshot && (
          <button
            className="btn btn-secondary"
            onClick={onTakeSnapshot}
            title="Capture PNG screenshot of current frame"
          >
            <Camera size={14} />
            <span>Snapshot</span>
          </button>
        )}

        {onExportHtml && (
          <button
            className="btn btn-secondary"
            onClick={onExportHtml}
            title="Export standalone offline HTML file"
          >
            <Download size={14} />
            <span>Export HTML</span>
          </button>
        )}

        <button
          className="btn btn-primary"
          onClick={onCompile}
          title="Compile shader (Ctrl+Enter / Ctrl+S)"
        >
          <Zap size={14} />
          <span>Compile</span>
          <span className="key-hint">Ctrl+↵</span>
        </button>

        <button
          className={`btn btn-icon ${showDiagnostics ? 'active' : ''}`}
          onClick={onToggleDiagnostics}
          title="Toggle diagnostics output"
        >
          <Terminal size={15} />
        </button>
      </div>
    </header>
  );
};
