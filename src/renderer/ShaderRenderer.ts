import {
  RendererCallbacks,
  RendererStatus,
  ShaderCompileResult,
} from './types';
import { parseGlslInfoLog } from './glslParser';
import { DEFAULT_FRAGMENT_SHADER, DEFAULT_VERTEX_SHADER } from './defaultShaders';
import { UniformValue, UniformValues } from '../parameters/types';
import { SUPPORTED_USER_UNIFORMS } from '../parameters/definitions';

export interface RendererOptions {
  maxDpr?: number;
  initialShader?: string;
  initialUniforms?: UniformValues;
}

export class ShaderRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private callbacks: RendererCallbacks;
  private maxDpr: number;

  // GPU Resources
  private vao: WebGLVertexArrayObject | null = null;
  private vbo: WebGLBuffer | null = null;
  private vertexShader: WebGLShader | null = null;
  private activeProgram: WebGLProgram | null = null;
  private activeFragmentShader: WebGLShader | null = null;

  // Automatic uniform locations (Standard u_* and Shadertoy i* aliases)
  private uTimeLoc: WebGLUniformLocation | null = null;
  private iTimeLoc: WebGLUniformLocation | null = null;

  private uResolutionLoc: WebGLUniformLocation | null = null;
  private iResolutionLoc: WebGLUniformLocation | null = null;

  private uMouseLoc: WebGLUniformLocation | null = null;
  private iMouseLoc: WebGLUniformLocation | null = null;

  private uFrameLoc: WebGLUniformLocation | null = null;
  private iFrameLoc: WebGLUniformLocation | null = null;

  private uDeltaLoc: WebGLUniformLocation | null = null;
  private iDeltaLoc: WebGLUniformLocation | null = null;

  // User-defined uniforms cache and values
  private userUniformValues: UniformValues = {};
  private userUniformLocs: Map<string, WebGLUniformLocation | null> = new Map();

  // Runtime State
  private status: RendererStatus = 'idle';
  private lastValidFragmentSource: string;
  private animationFrameId: number | null = null;
  private startTime = 0;
  private lastFrameTime = 0;
  private frameCount = 0;
  private isPaused = false;
  private isDestroyed = false;

  // Stats calculation
  private fpsFrames = 0;
  private fpsLastSampleTime = 0;
  private currentFps = 0;
  private currentFrameTimeMs = 0;

  // Pre-allocated variables for zero per-frame GC allocations
  private mouseX = 0;
  private mouseY = 0;
  private mouseClickX = 0;
  private mouseClickY = 0;
  private isMouseDown = false;

  private canvasWidth = 0;
  private canvasHeight = 0;
  private currentDpr = 1;

  // Listeners & Observers
  private resizeObserver: ResizeObserver | null = null;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnContextLost: (e: Event) => void;
  private boundOnContextRestored: (e: Event) => void;
  private boundOnVisibilityChange: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: RendererCallbacks = {},
    options: RendererOptions = {}
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.maxDpr = options.maxDpr ?? 2.0;
    this.lastValidFragmentSource = options.initialShader ?? DEFAULT_FRAGMENT_SHADER;

    // Initialize user uniforms
    if (options.initialUniforms) {
      this.userUniformValues = { ...options.initialUniforms };
    } else {
      for (const def of SUPPORTED_USER_UNIFORMS) {
        this.userUniformValues[def.name] = def.defaultValue;
      }
    }

    // Bind event handlers
    this.boundOnMouseMove = this.handleMouseMove.bind(this);
    this.boundOnMouseDown = this.handleMouseDown.bind(this);
    this.boundOnMouseUp = this.handleMouseUp.bind(this);
    this.boundOnContextLost = this.handleContextLost.bind(this);
    this.boundOnContextRestored = this.handleContextRestored.bind(this);
    this.boundOnVisibilityChange = this.handleVisibilityChange.bind(this);

    this.init();
  }

  private setStatus(newStatus: RendererStatus, details?: string) {
    this.status = newStatus;
    this.callbacks.onStatusChange?.(newStatus, details);
  }

  private init() {
    this.setStatus('compiling', 'Initializing WebGL2 context...');

    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      this.setStatus(
        'error',
        'WebGL 2.0 is not supported or was disabled by browser/driver settings.'
      );
      return;
    }

    this.gl = gl;

    this.canvas.addEventListener('webglcontextlost', this.boundOnContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.boundOnContextRestored, false);
    this.canvas.addEventListener('mousemove', this.boundOnMouseMove, { passive: true });
    this.canvas.addEventListener('mousedown', this.boundOnMouseDown, { passive: true });
    window.addEventListener('mouseup', this.boundOnMouseUp, { passive: true });
    document.addEventListener('visibilitychange', this.boundOnVisibilityChange);

    if (!this.setupBuffersAndVertexShader()) {
      return;
    }

    this.setupResizeObserver();

    const compileResult = this.compileShader(this.lastValidFragmentSource);
    if (!compileResult.success) {
      this.setStatus('error', 'Failed to compile default shader.');
      return;
    }

    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.fpsLastSampleTime = this.startTime;
    this.startLoop();
  }

  private setupBuffersAndVertexShader(): boolean {
    const gl = this.gl;
    if (!gl) return false;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) {
      this.setStatus('error', 'Failed to create vertex shader object.');
      return false;
    }

    gl.shaderSource(vs, DEFAULT_VERTEX_SHADER);
    gl.compileShader(vs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(vs) || 'Unknown vertex shader error';
      gl.deleteShader(vs);
      this.setStatus('error', `Vertex shader compilation failed: ${log}`);
      return false;
    }

    this.vertexShader = vs;

    const quadVertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();

    if (!vao || !vbo) {
      this.setStatus('error', 'Failed to allocate vertex buffers.');
      return false;
    }

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.vao = vao;
    this.vbo = vbo;

    return true;
  }

  public compileShader(fragmentSource: string): ShaderCompileResult {
    const gl = this.gl;
    const startMs = performance.now();

    if (!gl || !this.vertexShader) {
      return {
        success: false,
        diagnostics: [{ line: 1, message: 'WebGL2 context unavailable', severity: 'error' }],
        rawLog: 'Context is null or vertex shader is missing',
        compileTimeMs: 0,
      };
    }

    this.setStatus('compiling');

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) {
      return {
        success: false,
        diagnostics: [{ line: 1, message: 'Failed to create GL fragment shader', severity: 'error' }],
        rawLog: 'createShader returned null',
        compileTimeMs: performance.now() - startMs,
      };
    }

    gl.shaderSource(fs, fragmentSource);
    gl.compileShader(fs);

    const compiled = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
    const compileLog = gl.getShaderInfoLog(fs) || '';

    if (!compiled) {
      gl.deleteShader(fs);
      const diagnostics = parseGlslInfoLog(compileLog);
      const compileTimeMs = Math.round((performance.now() - startMs) * 10) / 10;

      const result: ShaderCompileResult = {
        success: false,
        diagnostics,
        rawLog: compileLog,
        compileTimeMs,
      };

      this.callbacks.onDiagnostics?.(result);
      this.setStatus('error', `Compilation error: ${diagnostics[0]?.message || 'Syntax error'}`);
      return result;
    }

    const newProgram = gl.createProgram();
    if (!newProgram) {
      gl.deleteShader(fs);
      return {
        success: false,
        diagnostics: [{ line: 1, message: 'Failed to create GL program', severity: 'error' }],
        rawLog: 'createProgram returned null',
        compileTimeMs: performance.now() - startMs,
      };
    }

    gl.attachShader(newProgram, this.vertexShader);
    gl.attachShader(newProgram, fs);
    gl.linkProgram(newProgram);

    const linked = gl.getProgramParameter(newProgram, gl.LINK_STATUS);
    const linkLog = gl.getProgramInfoLog(newProgram) || '';

    if (!linked) {
      gl.deleteProgram(newProgram);
      gl.deleteShader(fs);

      const diagnostics = parseGlslInfoLog(linkLog);
      const compileTimeMs = Math.round((performance.now() - startMs) * 10) / 10;

      const result: ShaderCompileResult = {
        success: false,
        diagnostics,
        rawLog: linkLog,
        compileTimeMs,
      };

      this.callbacks.onDiagnostics?.(result);
      this.setStatus('error', `Program link error: ${diagnostics[0]?.message || 'Linker failure'}`);
      return result;
    }

    // Success: Dispose old GPU resources
    if (this.activeProgram) {
      if (this.activeFragmentShader) {
        gl.detachShader(this.activeProgram, this.activeFragmentShader);
        gl.deleteShader(this.activeFragmentShader);
      }
      if (this.vertexShader) {
        gl.detachShader(this.activeProgram, this.vertexShader);
      }
      gl.deleteProgram(this.activeProgram);
    }

    this.activeProgram = newProgram;
    this.activeFragmentShader = fs;
    this.lastValidFragmentSource = fragmentSource;

    // Cache standard and Shadertoy-compatible uniform locations
    this.uTimeLoc = gl.getUniformLocation(newProgram, 'u_time');
    this.iTimeLoc = gl.getUniformLocation(newProgram, 'iTime');

    this.uResolutionLoc = gl.getUniformLocation(newProgram, 'u_resolution');
    this.iResolutionLoc = gl.getUniformLocation(newProgram, 'iResolution');

    this.uMouseLoc = gl.getUniformLocation(newProgram, 'u_mouse');
    this.iMouseLoc = gl.getUniformLocation(newProgram, 'iMouse');

    this.uFrameLoc = gl.getUniformLocation(newProgram, 'u_frame');
    this.iFrameLoc = gl.getUniformLocation(newProgram, 'iFrame');

    this.uDeltaLoc = gl.getUniformLocation(newProgram, 'u_delta');
    this.iDeltaLoc = gl.getUniformLocation(newProgram, 'iTimeDelta');

    // Cache user uniform locations
    this.cacheUserUniformLocations(newProgram);

    const compileTimeMs = Math.round((performance.now() - startMs) * 10) / 10;
    const result: ShaderCompileResult = {
      success: true,
      diagnostics: parseGlslInfoLog(compileLog),
      rawLog: compileLog,
      compileTimeMs,
    };

    this.callbacks.onDiagnostics?.(result);
    this.setStatus('ready');

    return result;
  }

  private cacheUserUniformLocations(program: WebGLProgram) {
    const gl = this.gl;
    if (!gl) return;

    this.userUniformLocs.clear();

    for (const def of SUPPORTED_USER_UNIFORMS) {
      const loc = gl.getUniformLocation(program, def.name);
      if (loc !== null) {
        this.userUniformLocs.set(def.name, loc);
      }
    }

    for (const name of Object.keys(this.userUniformValues)) {
      if (!this.userUniformLocs.has(name)) {
        const loc = gl.getUniformLocation(program, name);
        if (loc !== null) {
          this.userUniformLocs.set(name, loc);
        }
      }
    }
  }

  public setUserUniform(name: string, value: UniformValue) {
    this.userUniformValues[name] = value;
    if (this.gl && this.activeProgram && !this.userUniformLocs.has(name)) {
      const loc = this.gl.getUniformLocation(this.activeProgram, name);
      if (loc !== null) {
        this.userUniformLocs.set(name, loc);
      }
    }
  }

  public setUserUniforms(values: UniformValues) {
    this.userUniformValues = { ...this.userUniformValues, ...values };
    if (this.gl && this.activeProgram) {
      for (const name of Object.keys(values)) {
        if (!this.userUniformLocs.has(name)) {
          const loc = this.gl.getUniformLocation(this.activeProgram, name);
          if (loc !== null) {
            this.userUniformLocs.set(name, loc);
          }
        }
      }
    }
  }

  public getUserUniforms(): UniformValues {
    return { ...this.userUniformValues };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private setupResizeObserver() {
    const parent = this.canvas.parentElement || this.canvas;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.updateDimensions(width, height);
      }
    });

    this.resizeObserver.observe(parent);
    const rect = parent.getBoundingClientRect();
    this.updateDimensions(rect.width, rect.height);
  }

  private updateDimensions(cssWidth: number, cssHeight: number) {
    if (cssWidth <= 0 || cssHeight <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const pixelWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.floor(cssHeight * dpr));

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.canvasWidth = pixelWidth;
      this.canvasHeight = pixelHeight;
      this.currentDpr = dpr;

      if (this.gl) {
        this.gl.viewport(0, 0, pixelWidth, pixelHeight);
      }
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.currentDpr;
    this.mouseX = (e.clientX - rect.left) * dpr;
    this.mouseY = (rect.bottom - e.clientY) * dpr;
  }

  private handleMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.currentDpr;
    this.isMouseDown = true;
    this.mouseClickX = (e.clientX - rect.left) * dpr;
    this.mouseClickY = (rect.bottom - e.clientY) * dpr;
  }

  private handleMouseUp() {
    this.isMouseDown = false;
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  private handleContextLost(e: Event) {
    e.preventDefault();
    this.stopLoop();
    this.setStatus('context_lost', 'GPU context was lost. Waiting for restoration...');
  }

  private handleContextRestored() {
    this.setStatus('compiling', 'GPU context restored. Re-initializing engine...');
    this.activeProgram = null;
    this.activeFragmentShader = null;
    this.vertexShader = null;
    this.vao = null;
    this.vbo = null;

    if (this.setupBuffersAndVertexShader()) {
      this.compileShader(this.lastValidFragmentSource);
      this.startLoop();
    }
  }

  private startLoop() {
    if (this.animationFrameId !== null) return;

    const render = (now: number) => {
      if (this.isDestroyed) return;

      const deltaMs = now - this.lastFrameTime;
      this.currentFrameTimeMs = deltaMs;
      this.lastFrameTime = now;

      if (!this.isPaused && this.gl && this.activeProgram && this.vao) {
        this.renderFrame(now, deltaMs / 1000.0);
      }

      this.updateStats(now);
      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  private stopLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderFrame(now: number, deltaSec: number) {
    const gl = this.gl;
    if (!gl || !this.activeProgram || !this.vao) return;

    const elapsedSeconds = (now - this.startTime) / 1000.0;

    gl.useProgram(this.activeProgram);

    // Time uniforms
    if (this.uTimeLoc) gl.uniform1f(this.uTimeLoc, elapsedSeconds);
    if (this.iTimeLoc) gl.uniform1f(this.iTimeLoc, elapsedSeconds);

    // Delta uniforms
    if (this.uDeltaLoc) gl.uniform1f(this.uDeltaLoc, deltaSec);
    if (this.iDeltaLoc) gl.uniform1f(this.iDeltaLoc, deltaSec);

    // Resolution uniforms
    if (this.uResolutionLoc) gl.uniform2f(this.uResolutionLoc, this.canvasWidth, this.canvasHeight);
    if (this.iResolutionLoc) gl.uniform3f(this.iResolutionLoc, this.canvasWidth, this.canvasHeight, this.currentDpr);

    // Mouse uniforms (vec2 or vec4)
    const mouseZ = this.isMouseDown ? this.mouseClickX : -Math.abs(this.mouseClickX);
    const mouseW = this.isMouseDown ? this.mouseClickY : -Math.abs(this.mouseClickY);

    if (this.uMouseLoc) gl.uniform2f(this.uMouseLoc, this.mouseX, this.mouseY);
    if (this.iMouseLoc) gl.uniform4f(this.iMouseLoc, this.mouseX, this.mouseY, mouseZ, mouseW);

    // Frame uniforms
    if (this.uFrameLoc) gl.uniform1i(this.uFrameLoc, this.frameCount);
    if (this.iFrameLoc) gl.uniform1i(this.iFrameLoc, this.frameCount);

    // User parameters
    for (const [name, loc] of this.userUniformLocs.entries()) {
      if (!loc) continue;
      const val = this.userUniformValues[name];
      if (val === undefined) continue;

      if (typeof val === 'number') {
        gl.uniform1f(loc, val);
      } else if (Array.isArray(val) && val.length === 3) {
        gl.uniform3f(loc, val[0], val[1], val[2]);
      }
    }

    // Fullscreen quad
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);

    this.frameCount++;
  }

  private updateStats(now: number) {
    this.fpsFrames++;
    const delta = now - this.fpsLastSampleTime;

    if (delta >= 250) {
      this.currentFps = Math.round((this.fpsFrames * 1000) / delta);
      this.fpsFrames = 0;
      this.fpsLastSampleTime = now;

      this.callbacks.onStats?.({
        fps: this.currentFps,
        frameTimeMs: Math.round(this.currentFrameTimeMs * 10) / 10,
        frameCount: this.frameCount,
        resolution: [this.canvasWidth, this.canvasHeight],
        dpr: this.currentDpr,
      });
    }
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public resetTime() {
    this.startTime = performance.now();
    this.frameCount = 0;
  }

  public getStatus(): RendererStatus {
    return this.status;
  }

  public getLastValidShader(): string {
    return this.lastValidFragmentSource;
  }

  public dispose() {
    this.isDestroyed = true;
    this.stopLoop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.canvas.removeEventListener('webglcontextlost', this.boundOnContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.boundOnContextRestored);
    this.canvas.removeEventListener('mousemove', this.boundOnMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundOnMouseDown);
    window.removeEventListener('mouseup', this.boundOnMouseUp);
    document.removeEventListener('visibilitychange', this.boundOnVisibilityChange);

    const gl = this.gl;
    if (gl) {
      if (this.activeProgram) {
        if (this.activeFragmentShader) {
          gl.detachShader(this.activeProgram, this.activeFragmentShader);
          gl.deleteShader(this.activeFragmentShader);
        }
        if (this.vertexShader) {
          gl.detachShader(this.activeProgram, this.vertexShader);
          gl.deleteShader(this.vertexShader);
        }
        gl.deleteProgram(this.activeProgram);
      }

      if (this.vbo) gl.deleteBuffer(this.vbo);
      if (this.vao) gl.deleteVertexArray(this.vao);
    }

    this.gl = null;
    this.userUniformLocs.clear();
    this.setStatus('idle');
  }
}
