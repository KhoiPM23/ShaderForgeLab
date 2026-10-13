export interface GlslSnippet {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const GLSL_SNIPPETS: GlslSnippet[] = [
  {
    id: 'rot2d',
    name: '2D Rotation Matrix',
    description: 'Transform coordinates by an angle in radians',
    code: `mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}
`,
  },
  {
    id: 'smin',
    name: 'Smooth Minimum (SDF Blend)',
    description: 'Polynomial smooth union for organic shape blending',
    code: `float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
`,
  },
  {
    id: 'value_noise',
    name: '2D Value Noise',
    description: 'Smooth interpolated pseudo-random lattice noise',
    code: `float hash(vec2 p) {
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
`,
  },
  {
    id: 'palette',
    name: 'Cosine Palette Generator',
    description: 'Procedural periodic color spectrum generator',
    code: `vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}
`,
  },
  {
    id: 'tonemap',
    name: 'Reinhard Tonemapping',
    description: 'Compress high dynamic range highlights gracefully',
    code: `vec3 tonemap(vec3 col) {
  return col / (1.0 + col);
}
`,
  },
];
