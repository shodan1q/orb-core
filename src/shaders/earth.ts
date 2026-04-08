export const earthVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const earthFragmentShader = /* glsl */ `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D bumpTexture;
uniform sampler2D specularTexture;
uniform vec3 sunDirection;
uniform float time;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main() {
  vec4 dayColor = texture2D(dayTexture, vUv);
  vec4 nightColor = texture2D(nightTexture, vUv);

  // Boost night city lights
  nightColor.rgb *= 1.8;

  // Sun illumination factor
  float sunDot = dot(normalize(vWorldNormal), normalize(sunDirection));
  // Smooth terminator with wider twilight zone
  float dayFactor = smoothstep(-0.15, 0.2, sunDot);

  // Blend day and night
  vec3 color = mix(nightColor.rgb, dayColor.rgb, dayFactor);

  // Diffuse lighting on day side
  float diffuse = max(sunDot, 0.0);
  color *= mix(0.3, 1.0, diffuse * dayFactor) + 0.05;

  // Specular highlight on oceans
  vec4 specMask = texture2D(specularTexture, vUv);
  if (specMask.r > 0.5) {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 reflectDir = reflect(-normalize(sunDirection), normalize(vWorldNormal));
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    color += vec3(0.4, 0.5, 0.6) * spec * dayFactor * 0.5;
  }

  // Atmosphere rim glow
  float rimDot = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
  float atmosphere = pow(rimDot, 3.0) * 0.6;

  // Atmosphere color: blue on day side, slight orange on terminator
  float terminator = 1.0 - smoothstep(0.0, 0.15, abs(sunDot));
  vec3 atmoColor = mix(
    vec3(0.3, 0.6, 1.0),
    vec3(0.8, 0.4, 0.2),
    terminator
  );
  color += atmoColor * atmosphere * (dayFactor * 0.6 + 0.15);

  // Bump shading (subtle)
  float bump = texture2D(bumpTexture, vUv).r;
  color *= 0.95 + bump * 0.05;

  // Slight color grade: warm highlights, cool shadows
  color = mix(color, color * vec3(1.05, 1.02, 0.98), dayFactor);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const atmosphereVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragmentShader = /* glsl */ `
uniform vec3 sunDirection;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);

  // Brighter on the sun-facing side
  float sunFacing = max(dot(normalize(vPosition), normalize(sunDirection)), 0.0);
  float sunGlow = pow(sunFacing, 3.0) * 0.5 + 0.5;

  vec3 color = mix(
    vec3(0.1, 0.3, 0.8),
    vec3(0.3, 0.6, 1.0),
    sunGlow
  );

  gl_FragColor = vec4(color, intensity * sunGlow * 0.7);
}
`;
