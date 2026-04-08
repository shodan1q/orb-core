export const lightRayVertexShader = /* glsl */ `
attribute float lineProgress;
varying float vLineProgress;
varying vec2 vUv;

void main() {
  vLineProgress = lineProgress;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const lightRayFragmentShader = /* glsl */ `
uniform vec3 color;
uniform float time;
uniform float progress;
uniform float opacity;
varying float vLineProgress;

void main() {
  if (vLineProgress > progress) discard;

  float flow = sin(vLineProgress * 40.0 - time * 5.0) * 0.3 + 0.7;
  float fadeEdge = smoothstep(0.0, 0.05, vLineProgress) * (1.0 - smoothstep(progress - 0.05, progress, vLineProgress));

  gl_FragColor = vec4(color * flow, opacity * fadeEdge);
}
`;

export const scanConeVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const scanConeFragmentShader = /* glsl */ `
uniform float time;
uniform vec3 color;
uniform float opacity;
varying vec2 vUv;

void main() {
  float alpha = vUv.y * 0.3;
  float scanLine = step(0.97, fract(vUv.y * 20.0 - time * 2.0));
  alpha += scanLine * 0.5;
  alpha *= opacity;
  gl_FragColor = vec4(color, alpha);
}
`;

export const groundSpotVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const groundSpotFragmentShader = /* glsl */ `
uniform float intensity;
uniform float time;
uniform vec3 color;
varying vec2 vUv;

void main() {
  float dist = length(vUv - 0.5) * 2.0;
  float brightness = (1.0 - smoothstep(0.0, 1.0, dist)) * intensity;
  brightness *= 0.9 + 0.1 * sin(time * 3.0 + dist * 10.0);
  gl_FragColor = vec4(color * brightness, brightness * 0.8);
}
`;
