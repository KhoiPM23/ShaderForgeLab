import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Maximize2, Minimize2, Eye, ShieldAlert, Cpu } from 'lucide-react';
import { ShaderRenderer } from '../renderer/ShaderRenderer';
import { RendererCallbacks, RendererStatus, ShaderDiagnostic } from '../renderer/types';

interface ViewportProps {
  shaderCode: string;
  triggerCompile: number;
  callbacks: RendererCallbacks;
  status: RendererStatus;
  statusDetails?: string;
  diagnostics: ShaderDiagnostic[];
  isPaused: boolean;
  onRendererReady?: (renderer: ShaderRenderer) => void;
}

export const Viewport: React.FC<ViewportProps> = ({
  shaderCode,
  triggerCompile,
  callbacks,
  status,
  statusDetails,
  diagnostics,
  isPaused,
  onRendererReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize ShaderRenderer once on canvas mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new ShaderRenderer(canvas, callbacks, {
      maxDpr: 2.0,
      initialShader: shaderCode,
    });

    rendererRef.current = renderer;
    onRendererReady?.(renderer);

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Handle shader code compilation triggers
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.compileShader(shaderCode);
  }, [triggerCompile]);

  // Handle Pause / Resume
  useEffect(() => {
    if (!rendererRef.current) return;
    if (isPaused) {
      rendererRef.current.pause();
    } else {
      rendererRef.current.resume();
    }
  }, [isPaused]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const primaryError = diagnostics.find((d) => d.severity === 'error');

  return (
    <div className={`viewport-container ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      {/* Viewport Sub-header */}
      <div className="viewport-header">
        <div className="viewport-header-left">
          <Eye size={15} className="viewport-icon" />
          <span className="viewport-title">WebGL2 Viewport</span>
          <span className="viewport-engine-tag">
            <Cpu size={12} />
            Raw WebGL2
          </span>
        </div>
        <div className="viewport-header-right">
          <button
            className="btn-ghost-sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="viewport-canvas-wrapper">
        <canvas ref={canvasRef} className="viewport-canvas" id="shader-canvas" />

        {/* Floating Paused Overlay */}
        {isPaused && (
          <div className="viewport-pause-indicator">
            <span>PAUSED</span>
          </div>
        )}

        {/* Floating Compilation Error Banner (preserves last valid frame!) */}
        {status === 'error' && primaryError && (
          <div className="viewport-error-overlay">
            <div className="error-card">
              <div className="error-card-header">
                <AlertTriangle size={16} className="error-icon" />
                <span className="error-title">Compilation Error (Line {primaryError.line})</span>
                <span className="error-badge">Frame Preserved</span>
              </div>
              <p className="error-message">{primaryError.message}</p>
            </div>
          </div>
        )}

        {/* Critical GPU Context Lost Modal */}
        {status === 'context_lost' && (
          <div className="viewport-critical-overlay">
            <div className="critical-card">
              <ShieldAlert size={36} className="critical-icon" />
              <h3>GPU Context Lost</h3>
              <p>{statusDetails || 'The graphics device was lost or reset by the system.'}</p>
              <span className="reconnecting-text">Listening for context restoration event...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
