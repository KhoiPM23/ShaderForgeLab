import { ShaderPreset } from './types';

// 1. Cosmic / Nebula: Domain-warped volumetric gas clouds & stellar glow
export const COSMIC_NEBULA_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;

in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed * 0.15;
  vec2 p = uv * u_scale * 1.5;

  // Domain warping for turbulent cosmic gas filaments
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t), fbm(p + vec2(5.2, 1.3) + t * 0.8));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.4), fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.3));
  float f = fbm(p + 4.0 * r);

  // Stellar clouds color palette
  vec3 nebulaColor = mix(
    vec3(0.05, 0.02, 0.12),
    u_color,
    clamp(f * f * 2.5, 0.0, 1.0)
  );

  nebulaColor = mix(
    nebulaColor,
    vec3(1.0, 0.8, 0.5),
    clamp(length(q) * 0.6, 0.0, 1.0)
  );

  // Bright core & star dust
  float star = pow(hash(floor(uv * 80.0) + floor(t * 0.05)), 18.0) * 1.2;
  float centerGlow = 0.18 / (length(uv) + 0.15);

  vec3 finalColor = nebulaColor * u_intensity;
  finalColor += vec3(1.0, 0.9, 0.8) * star * u_intensity;
  finalColor += u_color * centerGlow * 0.4 * u_intensity;

  fragColor = vec4(finalColor, 1.0);
}
`;

// 2. Fluid / Liquid Distortion: Chromatic refraction & caustic ripples
export const FLUID_DISTORTION_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * u_speed * 0.8;

  // Multi-frequency liquid wave interference
  vec2 warp = p * u_scale * 3.0;
  for (int i = 1; i <= 4; i++) {
    float fi = float(i);
    warp.x += 0.3 / fi * sin(fi * 2.0 * warp.y + t + 0.3 * fi);
    warp.y += 0.3 / fi * cos(fi * 2.0 * warp.x + t + 0.3 * fi);
  }

  // Caustic highlight calculation
  float caustic = pow(abs(sin(warp.x + warp.y)), 8.0);
  float depth = 0.5 + 0.5 * sin(warp.x * 0.8 + warp.y * 0.5);

  // Chromatic dispersion (RGB split refraction)
  vec3 col;
  col.r = 0.5 + 0.5 * sin(warp.x + t * 0.2);
  col.g = 0.5 + 0.5 * sin(warp.x + warp.y * 0.8 + 2.0);
  col.b = 0.5 + 0.5 * sin(warp.y + 4.0);

  col *= u_color * depth;
  col += vec3(1.0, 1.0, 1.0) * caustic * 1.8 * u_intensity;

  // Specular sheen
  float rim = smoothstep(0.7, 0.0, length(p));
  col *= rim;

  fragColor = vec4(col, 1.0);
}
`;

// 3. Neon / Cyber Grid: 3D perspective synthwave wireframe highway
export const CYBER_GRID_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed * 2.5;

  vec3 col = vec3(0.01, 0.02, 0.04);

  // Split screen at horizon (y = 0)
  if (uv.y < 0.02) {
    // 3D perspective plane projection
    float depth = -0.5 / (uv.y - 0.05);
    vec2 gridP = vec2(uv.x * depth * u_scale * 0.8, depth + t);

    // Antialiased grid lines
    vec2 grid = abs(fract(gridP - 0.5) - 0.5) / fwidth(gridP);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    // Glow and distance fog
    float fog = exp(-depth * 0.12);
    vec3 gridCol = u_color * line * 1.5;
    col = mix(col, gridCol * u_intensity, fog);
  } else {
    // Cyber sky with gradient & glowing horizon sun
    float sunY = uv.y - 0.25;
    float sunDist = length(vec2(uv.x, sunY));
    float sun = smoothstep(0.4, 0.38, sunDist);

    // Horizontal sun raster lines
    float scanline = sin(uv.y * 60.0);
    if (scanline > 0.3 && sunDist < 0.4) sun *= 0.15;

    vec3 sunCol = mix(vec3(1.0, 0.2, 0.5), vec3(1.0, 0.9, 0.3), clamp(uv.y * 2.0, 0.0, 1.0));
    col = mix(col, sunCol * u_intensity, sun);

    // Horizon neon glow
    float horizonGlow = 0.04 / (abs(uv.y - 0.02) + 0.02);
    col += u_color * horizonGlow * 0.6 * u_intensity;
  }

  fragColor = vec4(col, 1.0);
}
`;

// 4. Aurora / Flowing Gradients: Luminous northern lights curtains
export const FLOWING_AURORA_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;

in vec2 v_uv;
out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n = p.x + p.y * 57.0;
  return mix(
    mix(hash(n), hash(n + 1.0), f.x),
    mix(hash(n + 57.0), hash(n + 58.0), f.x),
    f.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * u_speed * 0.4;

  vec3 col = vec3(0.01, 0.015, 0.03); // Deep night sky

  // Multi-layered aurora curtain ribbons
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float offset = fi * 0.15;
    vec2 p = vec2(uv.x * u_scale * 2.0 + offset, t * 0.5 + fi * 1.5);
    float wave = sin(p.x * 2.0 + t + sin(p.y * 1.5)) * 0.18 + 0.45;

    // Vertical curtain striations
    float ray = noise(vec2(uv.x * 25.0 + t * 0.2, uv.y * 4.0));
    float dist = abs(uv.y - wave);
    float glow = exp(-dist * 12.0) * (0.6 + 0.4 * ray);

    // Spectral emission gradient: emerald green transitioning to violet
    vec3 ribbonCol = mix(
      u_color,
      vec3(0.5, 0.1, 0.9),
      clamp(uv.y * 1.4, 0.0, 1.0)
    );

    col += ribbonCol * glow * u_intensity * (0.8 - fi * 0.15);
  }

  // Starfield backdrop
  float stars = pow(hash(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))), 35.0) * 1.5;
  col += vec3(0.9, 0.95, 1.0) * stars * (1.0 - uv.y * 0.5);

  fragColor = vec4(col, 1.0);
}
`;

// 5. Fractal / Procedural: Hypnotic Kaleidoscopic Julia orbit trap
export const FRACTAL_ORBIT_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed * 0.3;

  // Zoom and rotation
  vec2 z = uv * (1.8 / u_scale);
  mat2 rot = mat2(cos(t * 0.2), sin(t * 0.2), -sin(t * 0.2), cos(t * 0.2));
  z = rot * z;

  // Dynamic complex constant c
  vec2 c = vec2(
    -0.7 + 0.15 * cos(t * 0.7),
     0.27 + 0.15 * sin(t * 0.5)
  );

  float trap = 1e10;
  float n = 0.0;

  // Iterated Julia mapping: z = z^2 + c with orbit trap
  for (int i = 0; i < 48; i++) {
    // z = z^2 + c: (x^2 - y^2 + cx, 2xy + cy)
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    trap = min(trap, abs(length(z) - 0.5));
    if (dot(z, z) > 8.0) {
      n = float(i);
      break;
    }
  }

  // Orbit trap coloring & glow
  vec3 col = vec3(0.0);
  if (n > 0.0) {
    float smoothN = n - log2(max(1.0, log(dot(z, z)) * 0.5));
    vec3 pal = 0.5 + 0.5 * cos(smoothN * 0.25 + u_color * 3.0 + vec3(0.0, 1.5, 3.0));
    col = pal * (1.2 / (trap * 10.0 + 1.0));
  } else {
    col = u_color * (1.0 / (trap * 15.0 + 1.0)) * 0.5;
  }

  col *= u_intensity * 1.4;
  fragColor = vec4(col, 1.0);
}
`;

// 6. Striking Experimental: Relativistic Black Hole with Gravitational Lensing
export const GRAVITATIONAL_LENSING_SHADER = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform vec3  u_color;
uniform float u_scale;
uniform float u_intensity;
uniform float u_speed;

in vec2 v_uv;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float t = u_time * u_speed * 1.2;

  // Gravitational light bending distortion around event horizon
  float r = length(uv);
  float rs = 0.35 * u_scale; // Schwarzschild radius
  
  // Curved geodesic coordinate offset
  float bend = rs / max(r - rs * 0.8, 0.01);
  vec2 lensedUv = uv + normalize(uv) * bend * 0.25;

  // Accretion disk geometry in inclined 3D perspective
  vec2 diskCoord = vec2(lensedUv.x, lensedUv.y * 2.6);
  float diskR = length(diskCoord);
  float diskAngle = atan(diskCoord.y, diskCoord.x) + t;

  vec3 col = vec3(0.0);

  // Background starfield warped by lensing
  float stars = pow(hash(floor(lensedUv * 60.0)), 28.0) * 1.5;
  col += vec3(0.8, 0.9, 1.0) * stars;

  // Accretion Disk emission with Doppler beaming
  if (diskR > rs * 1.1 && diskR < rs * 3.5) {
    float diskNorm = (diskR - rs * 1.1) / (rs * 2.4);
    float spiral = sin(diskR * 30.0 - diskAngle * 4.0);
    float glow = smoothstep(0.0, 0.3, diskNorm) * smoothstep(1.0, 0.4, diskNorm);
    
    // Relativistic Doppler beaming: approaching side is much brighter and bluer
    float doppler = 1.0 + 0.8 * cos(diskAngle);
    
    vec3 diskCol = mix(u_color * 1.5, vec3(1.0, 0.9, 0.6), diskNorm);
    col += diskCol * (glow + spiral * 0.25) * doppler * u_intensity * 2.0;
  }

  // Black Hole Event Horizon Shadow
  if (r < rs) {
    col = vec3(0.0); // Absolute darkness
  } else {
    // Photon sphere ring glow
    float photonRing = exp(-abs(r - rs * 1.05) * 40.0);
    col += vec3(1.0, 0.95, 0.8) * photonRing * 1.8 * u_intensity;
  }

  fragColor = vec4(col, 1.0);
}
`;

export const BUILTIN_PRESETS: ShaderPreset[] = [
  {
    id: 'preset-cosmic-nebula',
    name: 'Cosmic Nebula',
    description: 'Turbulent domain-warped interstellar gas clouds and stellar core radiation.',
    isBuiltin: true,
    category: 'Cosmic',
    tags: ['Space', 'fBm Noise', 'Stars'],
    shaderCode: COSMIC_NEBULA_SHADER,
    uniforms: {
      u_color: [0.65, 0.25, 1.0], // Deep violet/magenta
      u_scale: 1.2,
      u_intensity: 1.1,
      u_speed: 1.0,
    },
    schemaVersion: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'preset-fluid-distortion',
    name: 'Fluid Distortion',
    description: 'Dynamic viscous liquid interference with caustic highlights and chromatic dispersion.',
    isBuiltin: true,
    category: 'Fluid',
    tags: ['Liquid', 'Caustics', 'Dispersion'],
    shaderCode: FLUID_DISTORTION_SHADER,
    uniforms: {
      u_color: [0.2, 0.75, 1.0], // Azure liquid
      u_scale: 1.4,
      u_intensity: 1.2,
      u_speed: 1.1,
    },
    schemaVersion: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'preset-cyber-grid',
    name: 'Neon Cyber Grid',
    description: 'Retro-futuristic 3D perspective synthwave highway with infinite glowing wireframe.',
    isBuiltin: true,
    category: 'Cyberpunk',
    tags: ['Retro', '3D Perspective', 'Synthwave'],
    shaderCode: CYBER_GRID_SHADER,
    uniforms: {
      u_color: [1.0, 0.1, 0.6], // Hot neon pink
      u_scale: 1.0,
      u_intensity: 1.3,
      u_speed: 1.2,
    },
    schemaVersion: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'preset-flowing-aurora',
    name: 'Borealis Aurora',
    description: 'Luminous northern lights curtains with vertical atmospheric ray striations.',
    isBuiltin: true,
    category: 'Atmospheric',
    tags: ['Curtains', 'Gradients', 'Nature'],
    shaderCode: FLOWING_AURORA_SHADER,
    uniforms: {
      u_color: [0.1, 0.95, 0.55], // Emerald green
      u_scale: 1.3,
      u_intensity: 1.2,
      u_speed: 0.9,
    },
    schemaVersion: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'preset-fractal-orbit',
    name: 'Fractal Julia Orbit',
    description: 'Hypnotic complex polynomial Julia fractal with dynamic orbit-trap spectrums.',
    isBuiltin: true,
    category: 'Fractal',
    tags: ['Julia Set', 'Orbit Trap', 'Complex Math'],
    shaderCode: FRACTAL_ORBIT_SHADER,
    uniforms: {
      u_color: [0.95, 0.45, 0.1], // Fiery amber
      u_scale: 1.5,
      u_intensity: 1.2,
      u_speed: 0.8,
    },
    schemaVersion: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'preset-gravitational-lensing',
    name: 'Black Hole Lensing',
    description: 'Relativistic gravitational lensing event horizon with Doppler-beamed accretion disk.',
    isBuiltin: true,
    category: 'Astrophysics',
    tags: ['Geodesic', 'Relativity', 'Accretion Disk'],
    shaderCode: GRAVITATIONAL_LENSING_SHADER,
    uniforms: {
      u_color: [1.0, 0.6, 0.2], // Coronal plasma
      u_scale: 1.1,
      u_intensity: 1.4,
      u_speed: 1.3,
    },
    schemaVersion: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];
