import { UniformValues } from '../parameters/types';

/**
 * Captures a full-resolution PNG image from the WebGL canvas and triggers a browser download.
 */
export function captureCanvasSnapshot(
  canvas: HTMLCanvasElement,
  filename = `shader-snapshot-${Date.now()}.png`
): boolean {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to capture canvas snapshot:', err);
    return false;
  }
}

/**
 * Generates and downloads a self-contained, zero-dependency offline HTML file
 * containing the active GLSL fragment shader, WebGL2 runner, and current parameters.
 */
export function exportStandaloneHtml(
  shaderSource: string,
  uniforms: UniformValues,
  filename = `shader-export-${Date.now()}.html`
): void {
  const uniformsJson = JSON.stringify(uniforms);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShaderForgeLab Standalone Export</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    canvas { width: 100%; height: 100%; display: block; }
    #badge {
      position: absolute; bottom: 12px; right: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      font-size: 11px; color: rgba(255, 255, 255, 0.6);
      background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px);
      padding: 4px 8px; border-radius: 4px; pointer-events: none;
    }
  </style>
</head>
<body>
  <canvas id="glcanvas"></canvas>
  <div id="badge">ShaderForgeLab Standalone</div>
  <script>
    const fragmentSource = ${JSON.stringify(shaderSource)};
    const initialUniforms = ${uniformsJson};

    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) {
      document.body.innerHTML = '<h2 style="color:#fff;text-align:center;padding:40px;">WebGL 2.0 Not Supported</h2>';
    }

    const vsSource = \`#version 300 es
    in vec2 a_position;
    void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    \`;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
      }
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time') || gl.getUniformLocation(prog, 'iTime');
    const uRes = gl.getUniformLocation(prog, 'u_resolution') || gl.getUniformLocation(prog, 'iResolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse') || gl.getUniformLocation(prog, 'iMouse');

    // Apply user uniforms
    for (const [k, v] of Object.entries(initialUniforms)) {
      const loc = gl.getUniformLocation(prog, k);
      if (loc) {
        if (typeof v === 'number') gl.uniform1f(loc, v);
        else if (Array.isArray(v) && v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      }
    }

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX * window.devicePixelRatio;
      mouseY = (window.innerHeight - e.clientY) * window.devicePixelRatio;
    });

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    const t0 = performance.now();
    function loop(now) {
      const t = (now - t0) / 1000.0;
      if (uTime) gl.uniform1f(uTime, t);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouseX, mouseY);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
