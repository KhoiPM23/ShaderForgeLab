export const DEFAULT_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const DEFAULT_FRAGMENT_SHADER = `#version 300 es
precision highp float;

// Built-in automatic uniforms
uniform float u_time;        // Time elapsed in seconds
uniform vec2  u_resolution;  // Viewport dimensions (width, height in px)
uniform vec2  u_mouse;       // Mouse position (x, y in px)
uniform int   u_frame;       // Frame counter

// User-editable parameters
uniform vec3  u_color;       // Base tint modulation
uniform float u_scale;       // Spatial zoom & pattern frequency
uniform float u_intensity;   // Luminance and glow power
uniform float u_speed;       // Temporal progression multiplier

in vec2 v_uv;
out vec4 fragColor;

void main() {
  // Aspect-corrected coordinate space centered at (0, 0)
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  uv *= u_scale;

  float t = u_time * u_speed;
  float dist = length(uv);
  float angle = atan(uv.y, uv.x);

  // Palette modulated by user tint
  vec3 col = u_color * (0.6 + 0.4 * cos(t * 0.75 + uv.xyx * 1.5 + vec3(0.0, 2.0, 4.2)));

  // Concentric radial waves with angular distortion
  float wave = sin(dist * 10.0 - t * 2.2 + sin(angle * 5.0 + t * 0.5));
  float rings = smoothstep(0.02, 0.12, abs(wave));

  // Central glow boosted by user intensity
  float glow = (0.12 / (dist + 0.08)) * u_intensity;

  // Composite final color
  vec3 finalColor = mix(col, vec3(1.0, 0.75, 0.4) * u_intensity, clamp(glow, 0.0, 1.0));
  finalColor *= mix(1.0, 0.65, rings);

  // Soft vignette
  float vignette = smoothstep(2.0, 0.3, dist);
  finalColor *= vignette;

  fragColor = vec4(finalColor, 1.0);
}
`;
