import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = ['#6E6E80', '#FFFFFF'];

const SURFACE_GLSL = `
#define WAVES 14
#define MAX_RIPPLES 4

uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uSpread;
uniform float uSpreadBase;
uniform vec4 uWave[WAVES];
uniform vec4 uWaveMotion[WAVES];
uniform float uHeight;
uniform vec4 uCursor;
uniform float uCursorRadius;
uniform vec4 uRipple[MAX_RIPPLES];

float gridDepth(float v) {
  float inverse = 1.0 / uFar + (1.0 / uNear - 1.0 / uFar) * pow(clamp(1.0 - v, 0.0, 1.0), 1.8);
  return 1.0 / inverse;
}

vec3 surfacePoint(vec2 ground, out vec3 normal, out float fold, out float swell) {
  vec3 offset = vec3(0.0);
  normal = vec3(0.0, 1.0, 0.0);
  fold = 1.0;
  float calm = mix(0.3, 1.0, smoothstep(uNear * 0.9, uNear * 4.0, -ground.y));
  for (int i = 0; i < WAVES; i++) {
    vec4 wave = uWave[i];
    vec4 motion = uWaveMotion[i];
    float phase = wave.z * dot(wave.xy, ground) - motion.x * uTime + motion.y;
    float s = sin(phase);
    float c = cos(phase);
    float amplitude = wave.w * uHeight * calm;
    float steep = motion.z;
    offset.x += steep * amplitude * wave.x * c;
    offset.z += steep * amplitude * wave.y * c;
    offset.y += amplitude * s;
    float ka = wave.z * amplitude;
    normal.x -= wave.x * ka * c;
    normal.z -= wave.y * ka * c;
    normal.y -= steep * ka * s;
    fold -= steep * ka * s;
  }

  vec2 toCursor = ground - uCursor.xy;
  float radius2 = max(uCursorRadius * uCursorRadius, 1e-4);
  swell = uCursor.z * exp(-dot(toCursor, toCursor) / radius2);
  offset.y += swell;
  normal.x += swell * 2.0 * toCursor.x / radius2;
  normal.z += swell * 2.0 * toCursor.y / radius2;

  for (int k = 0; k < MAX_RIPPLES; k++) {
    vec4 ripple = uRipple[k];
    if (ripple.w <= 0.001) continue;
    vec2 away = ground - ripple.xy;
    float r = max(length(away), 1e-4);
    float band = r - ripple.z;
    float envelope = exp(-band * band * 3.0) * ripple.w * 0.26;
    offset.y += sin(band * 9.0) * envelope;
    float slope = (9.0 * cos(band * 9.0) - 6.0 * band * sin(band * 9.0)) * envelope;
    normal.x -= slope * away.x / r;
    normal.z -= slope * away.y / r;
  }

  return vec3(ground.x + offset.x, offset.y, ground.y + offset.z);
}
`;

const OCCLUDER_VERTEX_SHADER = `
${SURFACE_GLSL}

attribute vec2 aGrid;

void main() {
  float depth = gridDepth(aGrid.y);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2(aGrid.x * halfWidth * 1.03, -depth);
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  world.y -= 0.035 + depth * 0.004;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const OCCLUDER_FRAGMENT_SHADER = `
void main() {
  gl_FragColor = vec4(0.0);
}
`;

const POINTS_VERTEX_SHADER = `
${SURFACE_GLSL}

attribute vec2 aGrid;
attribute vec2 aJitter;

uniform float uRows;
uniform float uColumns;
uniform vec3 uSun;
uniform float uFogDistance;
uniform float uFoam;
uniform float uSize;
uniform float uFocal;
uniform float uPixelRatio;
uniform float uGlow;

varying float vBright;
varying float vTone;

void main() {
  float depth = gridDepth(aGrid.y + aJitter.y / uRows);
  float halfWidth = uSpreadBase + depth * uSpread;
  vec2 ground = vec2((aGrid.x + aJitter.x / uColumns) * halfWidth, -depth);
  float side = 1.0 - smoothstep(0.9, 1.0, abs(aGrid.x));
  vec3 normal;
  float fold;
  float swell;
  vec3 world = surfacePoint(ground, normal, fold, swell);
  vec3 offset = vec3(world.x - ground.x, world.y, world.z - ground.y);
  vec4 view = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * view;

  vec3 n = normalize(normal);
  vec3 toEye = normalize(cameraPosition - world);
  float lit = max(dot(n, uSun), 0.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(n, toEye), 0.0), 5.0);
  float glint = pow(max(dot(reflect(-uSun, n), toEye), 0.0), 40.0) * (0.04 + 3.6 * fresnel);
  float crest = smoothstep(0.25, 1.0, offset.y / max(uHeight * 0.5, 0.01));
  float froth = smoothstep(0.7, 0.2, fold) * uFoam;
  float near = smoothstep(uNear * 0.95, uNear * 1.2, depth) * side;
  float distant = smoothstep(uNear * 1.1, uNear * 5.0, depth);
  float far = exp(-depth / max(uFogDistance, 0.5)) * smoothstep(uFar, uFar * 0.9, depth);

  float edgeOn = clamp(abs(dot(n, toEye)) / 0.35, 0.06, 1.0);
  float pileUp = mix(edgeOn, 1.0, smoothstep(uNear * 3.0, uNear * 14.0, depth));
  float brightness = (0.24 + 0.05 * lit + 0.9 * fresnel * distant + (glint * 2.6 + 2.4 * crest * crest * crest + froth * 2.6) * mix(0.3, 1.0, distant)) * pileUp * near * far;
  vTone = clamp(glint * 0.9 + crest * 0.6 + froth, 0.0, 1.0);

  float pixels = uSize * uFocal / max(-view.z, 0.05) * (1.0 + crest * 0.35) * uPixelRatio;
  float coverage = min(pixels, 1.0);
  vBright = brightness * coverage;
  gl_PointSize = clamp(pixels, 1.0, 6.0 * uPixelRatio) * (1.0 + uGlow * 1.6);
}
`;

const POINTS_FRAGMENT_SHADER = `
precision highp float;

uniform vec3 uTrough;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uInk;
uniform float uIntensity;

varying float vBright;
varying float vTone;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float edge = 1.0 / (1.0 + uGlow * 1.6);
  float core = 1.0 - smoothstep(edge * 0.45, edge, r);
  float halo = exp(-r * r * 7.0) * uGlow * 0.28;
  float amount = (core + halo) * vBright * uIntensity;
  if (amount < 0.002) discard;
  vec3 color = mix(uTrough, uCrest, vTone);
  if (uInk > 0.5) {
    float alpha = clamp(amount * 1.6, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    float alpha = clamp(amount, 0.0, 1.0);
    gl_FragColor = vec4(color * amount, alpha);
  }
}
`;

const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
const degToRad = (deg) => (deg * Math.PI) / 180;

const isTransparentColor = (str) => {
  const t = (str || '').trim().toLowerCase();
  if (t === 'transparent') return true;
  if (/^#[0-9a-f]{8}$/.test(t)) return t.endsWith('00');
  if (/^#[0-9a-f]{4}$/.test(t)) return t.endsWith('0');
  return /^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/.test(t);
};

const tempColor = new THREE.Color();
const setShaderColor = (targetVec3, colorStr, fallbackStr) => {
  const raw = (colorStr || fallbackStr).trim();
  try {
    tempColor.set(/^#[0-9a-f]{8}$/i.test(raw) ? raw.slice(0, 7) : raw);
  } catch {
    tempColor.set(fallbackStr);
  }
  const out = { r: 0, g: 0, b: 0 };
  tempColor.getRGB(out, THREE.SRGBColorSpace);
  return targetVec3.set(out.r, out.g, out.b);
};

const createSeededRng = (seed) => {
  let state = (0x9e3779b9 ^ Math.floor(9973 * seed)) >>> 0;
  return () => {
    let e = (state = (state + 0x6d2b79f5) >>> 0);
    e = Math.imul(e ^ (e >>> 15), 1 | e);
    return (((e ^= e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ (e >>> 14)) >>> 0) / 0x100000000;
  };
};

const buildPointsGeometry = (columns, rows, seed) => {
  const count = columns * rows;
  const grid = new Float32Array(2 * count);
  const jitter = new Float32Array(2 * count);
  const positions = new Float32Array(3 * count);
  const rng = createSeededRng(seed + 0.5);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      grid[2 * idx] = (c / (columns - 1)) * 2 - 1;
      grid[2 * idx + 1] = 1 - r / (rows - 1);
      jitter[2 * idx] = (rng() - 0.5) * 0.7;
      jitter[2 * idx + 1] = (rng() - 0.5) * 0.7;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2));
  geometry.setAttribute('aJitter', new THREE.BufferAttribute(jitter, 2));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return geometry;
};

const buildOccluderGeometry = () => {
  const grid = new Float32Array(60000);
  for (let r = 0; r < 150; r++) {
    for (let c = 0; c < 200; c++) {
      const idx = 200 * r + c;
      grid[2 * idx] = (c / 199) * 2 - 1;
      grid[2 * idx + 1] = r / 149;
    }
  }
  const indices = [];
  for (let r = 0; r < 149; r++) {
    for (let c = 0; c < 199; c++) {
      const a = 200 * r + c;
      const o = a + 1;
      const l = a + 200;
      const n = l + 1;
      indices.push(a, l, o, o, l, n);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90000), 3));
  geometry.setAttribute('aGrid', new THREE.BufferAttribute(grid, 2));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return geometry;
};

export function ContourTide({
  colors = DEFAULT_COLORS,
  backgroundColor = '#0a0a0a',
  density = 1,
  particleSize = 1,
  waveHeight = 1,
  choppiness = 0.8,
  wavelength = 1,
  windAngle = 0,
  horizon = 0.1,
  fog = 1,
  glow = 0.35,
  foam = 1,
  speed = 1,
  interactive = true,
  parallax = 1,
  swell = 1,
  swellRadius = 0.9,
  clickRipples = true,
  seed = 0,
  paused = false,
  dpr = 1.5,
  className,
  style,
  children
}) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const pointerRef = useRef({
    x: 0.5,
    y: 0.5,
    inside: false,
    presses: 0,
    pressX: 0.5,
    pressY: 0.5
  });

  const color0 = colors?.[0] ?? DEFAULT_COLORS[0];
  const color1 = colors?.[1] ?? color0 ?? DEFAULT_COLORS[1];

  const settingsRef = useRef({
    color0,
    color1,
    backgroundColor,
    density,
    particleSize,
    waveHeight,
    choppiness,
    wavelength,
    windAngle,
    horizon,
    fog,
    glow,
    foam,
    speed,
    interactive,
    parallax,
    swell,
    swellRadius,
    clickRipples,
    seed,
    paused,
    dpr
  });

  useEffect(() => {
    settingsRef.current = {
      color0,
      color1,
      backgroundColor,
      density,
      particleSize,
      waveHeight,
      choppiness,
      wavelength,
      windAngle,
      horizon,
      fog,
      glow,
      foam,
      speed,
      interactive,
      parallax,
      swell,
      swellRadius,
      clickRipples,
      seed,
      paused,
      dpr
    };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvasHost = container.querySelector('[data-contour-canvas]');
    if (!canvasHost) return;

    const clampedDensity = clamp(settingsRef.current.density, 0.3, 2);
    const columns = Math.round(1000 * clampedDensity);
    const rows = Math.round(380 * clampedDensity);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    canvasHost.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    camera.position.set(0, 1.35, 0);

    const uniforms = {
      uTime: { value: 0 },
      uNear: { value: 1.5 },
      uFar: { value: 36 },
      uSpread: { value: 0.85 },
      uSpreadBase: { value: 0.85 },
      uRows: { value: rows },
      uColumns: { value: columns },
      uWave: { value: Array.from({ length: 14 }, () => new THREE.Vector4()) },
      uWaveMotion: { value: Array.from({ length: 14 }, () => new THREE.Vector4()) },
      uHeight: { value: 1 },
      uSun: { value: new THREE.Vector3(0.06, 0.07, -1).normalize() },
      uFogDistance: { value: 22 },
      uFoam: { value: 1 },
      uSize: { value: 0.006 },
      uFocal: { value: 900 },
      uPixelRatio: { value: 1 },
      uGlow: { value: 1 },
      uCursor: { value: new THREE.Vector4(0, -8, 0, 0) },
      uCursorRadius: { value: 1.2 },
      uRipple: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
      uTrough: { value: new THREE.Vector3() },
      uCrest: { value: new THREE.Vector3() },
      uInk: { value: 0 },
      uIntensity: { value: 1 }
    };

    const occluderGeometry = buildOccluderGeometry();
    const occluderMaterial = new THREE.ShaderMaterial({
      vertexShader: OCCLUDER_VERTEX_SHADER,
      fragmentShader: OCCLUDER_FRAGMENT_SHADER,
      uniforms,
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide
    });
    const occluderMesh = new THREE.Mesh(occluderGeometry, occluderMaterial);
    occluderMesh.frustumCulled = false;
    occluderMesh.renderOrder = 0;
    scene.add(occluderMesh);

    const pointsGeometry = buildPointsGeometry(columns, rows, settingsRef.current.seed);
    const pointsMaterial = new THREE.ShaderMaterial({
      vertexShader: POINTS_VERTEX_SHADER,
      fragmentShader: POINTS_FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthTest: true,
      depthWrite: false
    });
    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    pointsMesh.frustumCulled = false;
    pointsMesh.renderOrder = 1;
    scene.add(pointsMesh);

    const updateColorsAndBlending = () => {
      const s = settingsRef.current;
      setShaderColor(uniforms.uTrough.value, s.color0, DEFAULT_COLORS[0]);
      setShaderColor(uniforms.uCrest.value, s.color1, DEFAULT_COLORS[1]);

      const transparentBg = isTransparentColor(s.backgroundColor);
      tempColor.set(transparentBg ? '#000000' : s.backgroundColor);
      const lum = 0.2126 * tempColor.r + 0.7152 * tempColor.g + 0.0722 * tempColor.b;
      const isInk = !transparentBg && lum > 0.35;

      uniforms.uInk.value = isInk ? 1 : 0;
      pointsMaterial.blending = THREE.CustomBlending;
      pointsMaterial.blendEquation = THREE.AddEquation;
      pointsMaterial.blendSrc = THREE.OneFactor;
      pointsMaterial.blendDst = isInk ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
      pointsMaterial.blendSrcAlpha = THREE.OneFactor;
      pointsMaterial.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
      pointsMaterial.needsUpdate = true;
    };

    const updateWaves = () => {
      const s = settingsRef.current;
      const rng = createSeededRng(s.seed + 1.7);
      const windRad = degToRad(s.windAngle);
      const wl = clamp(s.wavelength, 0.2, 5);
      const maxWl = 11 * wl;
      const minWl = 0.4 * wl;
      const chop = clamp(s.choppiness, 0, 1.5);
      let ampSum = 0;
      const rawAmps = [];

      for (let i = 0; i < 14; i++) {
        const t = i / 13;
        const n = maxWl * Math.pow(minWl / maxWl, t) * (0.85 + 0.3 * rng());
        const dir = windRad + (rng() - 0.5) * degToRad(150) * (0.45 + 0.55 * t);
        const k = (2 * Math.PI) / n;
        const a = 0.012 * Math.pow(n, 1.2) * (0.7 + 0.6 * rng());
        rawAmps.push(a);
        ampSum += a;
        uniforms.uWave.value[i].set(Math.sin(dir), Math.cos(dir), k, a);
        uniforms.uWaveMotion.value[i].set(0.55 * Math.sqrt(9.8 * k), rng() * Math.PI * 2, 0, 0);
      }

      for (let i = 0; i < 14; i++) {
        const wave = uniforms.uWave.value[i];
        wave.w = 0.8 * (rawAmps[i] / Math.max(ampSum, 1e-5));
        const k = wave.z;
        uniforms.uWaveMotion.value[i].z = Math.min((0.9 * chop) / Math.max(k * wave.w * 14, 1e-4), 4);
      }
    };

    updateColorsAndBlending();
    updateWaves();

    engineRef.current = {
      updateColorsAndBlending,
      updateWaves,
      pointsMesh,
      uniforms,
      rows,
      columns
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();

    const simState = {
      time: 30,
      lookX: 0,
      lookY: 0,
      cursorX: 0,
      cursorZ: -8,
      cursorLift: 0,
      seeded: false,
      presses: pointerRef.current.presses,
      ripples: Array.from({ length: 4 }, () => ({ x: 0, z: 0, age: 99 })),
      next: 0
    };

    let width = 1;
    let height = 1;
    let currentDpr = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      currentDpr = Math.min(window.devicePixelRatio || 1, Math.max(settingsRef.current.dpr, 0.5));
      renderer.setPixelRatio(currentDpr);
      renderer.setSize(width, height, false);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const updatePointerCoords = (ev) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const isInside =
        ev.clientX >= rect.left &&
        ev.clientX <= rect.right &&
        ev.clientY >= rect.top &&
        ev.clientY <= rect.bottom;

      const p = pointerRef.current;
      if (isInside) {
        p.x = (ev.clientX - rect.left) / Math.max(rect.width, 1);
        p.y = 1 - (ev.clientY - rect.top) / Math.max(rect.height, 1);
        p.inside = true;
      } else {
        p.inside = false;
      }
      return isInside;
    };

    const onPointerMove = (ev) => {
      updatePointerCoords(ev);
    };

    const onPointerDown = (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('a, button, input, select, textarea')) {
        return;
      }
      if (updatePointerCoords(ev)) {
        const p = pointerRef.current;
        p.pressX = p.x;
        p.pressY = p.y;
        p.presses += 1;
      }
    };

    const onPointerLeave = () => {
      pointerRef.current.inside = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave, { passive: true });

    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { rootMargin: '80px' }
    );
    intersectionObserver.observe(container);

    let rafId = null;
    let prevTime = performance.now();

    const animate = (now) => {
      rafId = requestAnimationFrame(animate);
      if (!isVisible) {
        prevTime = now;
        return;
      }

      const rawDelta = (now - prevTime) * 0.001;
      prevTime = now;
      const dt = Math.min(Math.max(rawDelta, 0), 0.05);

      const s = settingsRef.current;
      const p = pointerRef.current;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const running = !s.paused && !reduced && s.speed > 0;

      if (running) {
        simState.time += dt * clamp(s.speed, 0, 4);
      }

      const aspect = width / Math.max(height, 1);
      const halfFovTan = Math.tan(degToRad(50) / 2);
      const pitchAngle = Math.atan((1 - 2 * clamp(s.horizon, 0.02, 0.45)) * halfFovTan);

      const activeHover = s.interactive && !reduced && p.inside;
      const targetLookX = activeHover ? (p.x - 0.5) * 2 : 0;
      const targetLookY = activeHover ? (p.y - 0.5) * 2 : 0;
      const lookEase = 1 - Math.exp(-2.2 * dt);

      simState.lookX += (targetLookX - simState.lookX) * lookEase;
      simState.lookY += (targetLookY - simState.lookY) * lookEase;

      const parallaxAmt = clamp(s.parallax, 0, 3);
      camera.fov = 50;
      camera.near = 0.05;
      camera.far = 200;
      camera.aspect = aspect;
      camera.position.set(
        0.12 * simState.lookX * parallaxAmt,
        1.35 + 0.04 * Math.sin(0.35 * simState.time),
        0
      );
      camera.rotation.set(
        -pitchAngle + 0.025 * simState.lookY * parallaxAmt,
        -0.045 * simState.lookX * parallaxAmt,
        0.006 * Math.sin(0.27 * simState.time),
        'YXZ'
      );
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      let targetLift = 0;
      if (activeHover) {
        pointerNdc.set(2 * p.x - 1, 2 * p.y - 1);
        raycaster.setFromCamera(pointerNdc, camera);
        const hit = raycaster.ray.intersectPlane(waterPlane, hitPoint);
        if (hit && hit.z < -0.5 && hit.z > -21.6) {
          if (!simState.seeded) {
            simState.cursorX = hit.x;
            simState.cursorZ = hit.z;
            simState.seeded = true;
          }
          const cursorEase = 1 - Math.exp(-5 * dt);
          simState.cursorX += (hit.x - simState.cursorX) * cursorEase;
          simState.cursorZ += (hit.z - simState.cursorZ) * cursorEase;
          targetLift = 1;
        }
      }

      simState.cursorLift +=
        (targetLift - simState.cursorLift) *
        (1 - Math.exp(-dt * (targetLift > simState.cursorLift ? 3 : 1.6)));
      if (simState.cursorLift < 0.002 && !targetLift) {
        simState.seeded = false;
      }

      if (p.presses !== simState.presses) {
        const count = Math.min(p.presses - simState.presses, 4);
        simState.presses = p.presses;
        if (s.clickRipples && !reduced) {
          pointerNdc.set(2 * p.pressX - 1, 2 * p.pressY - 1);
          raycaster.setFromCamera(pointerNdc, camera);
          const hit = raycaster.ray.intersectPlane(waterPlane, hitPoint);
          if (hit && hit.z < -0.5) {
            for (let a = 0; a < count; a++) {
              const ripple = simState.ripples[simState.next];
              ripple.x = hit.x;
              ripple.z = hit.z;
              ripple.age = 0;
              simState.next = (simState.next + 1) % 4;
            }
          }
        }
      }

      for (let i = 0; i < 4; i++) {
        const r = simState.ripples[i];
        if (r.age < 6) {
          r.age += dt;
        }
        const amp = r.age < 6 ? Math.exp(-0.75 * r.age) : 0;
        uniforms.uRipple.value[i].set(r.x, r.z, 2.2 * r.age, amp);
      }

      const nearDist =
        (1.35 / Math.tan(pitchAngle + degToRad(50) / 2 + 0.025 * parallaxAmt + 0.03)) * 0.8;
      const spreadFactor = aspect * halfFovTan * 1.2;

      uniforms.uTime.value = simState.time;
      uniforms.uNear.value = nearDist;
      uniforms.uFar.value = 36;
      uniforms.uSpread.value = Math.cos(pitchAngle) * spreadFactor + Math.tan(0.06 * parallaxAmt);
      uniforms.uSpreadBase.value =
        1.35 * Math.sin(pitchAngle) * spreadFactor + 0.14 * parallaxAmt + 0.35;
      uniforms.uRows.value = engineRef.current.rows;
      uniforms.uColumns.value = engineRef.current.columns;
      uniforms.uHeight.value = clamp(s.waveHeight, 0, 3);
      uniforms.uFogDistance.value = 140 / clamp(s.fog, 0.1, 4);
      uniforms.uFoam.value = clamp(s.foam, 0, 3);
      uniforms.uSize.value = 0.0028 * clamp(s.particleSize, 0.2, 4);
      uniforms.uFocal.value = height / 2 / halfFovTan;
      uniforms.uPixelRatio.value = currentDpr;
      uniforms.uGlow.value = clamp(s.glow, 0, 2);
      uniforms.uCursor.value.set(
        simState.cursorX,
        simState.cursorZ,
        simState.cursorLift * clamp(s.swell, 0, 3) * 0.14,
        0
      );
      uniforms.uCursorRadius.value = clamp(s.swellRadius, 0.1, 5);

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerleave', onPointerLeave);
      occluderGeometry.dispose();
      occluderMaterial.dispose();
      if (pointsMesh.geometry) pointsMesh.geometry.dispose();
      pointsMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === canvasHost) {
        canvasHost.removeChild(renderer.domElement);
      }
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateColorsAndBlending();
  }, [color0, color1, backgroundColor]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateWaves();
  }, [seed, windAngle, wavelength, choppiness]);

  useEffect(() => {
    if (!engineRef.current) return;
    const clampedDensity = clamp(density, 0.3, 2);
    const columns = Math.round(1000 * clampedDensity);
    const rows = Math.round(380 * clampedDensity);
    if (
      engineRef.current.columns === columns &&
      engineRef.current.rows === rows &&
      engineRef.current.seed === seed
    ) {
      return;
    }
    const oldGeom = engineRef.current.pointsMesh.geometry;
    const newGeom = buildPointsGeometry(columns, rows, seed);
    engineRef.current.pointsMesh.geometry = newGeom;
    engineRef.current.columns = columns;
    engineRef.current.rows = rows;
    engineRef.current.seed = seed;
    if (oldGeom) oldGeom.dispose();
  }, [density, seed]);

  const transparentBg = isTransparentColor(backgroundColor);

  return (
    <div
      ref={containerRef}
      className={cn('relative isolate overflow-hidden', className)}
      style={{
        backgroundColor: transparentBg ? undefined : backgroundColor,
        ...style
      }}
    >
      <div data-contour-canvas className="absolute inset-0" aria-hidden="true" />
      {children ? <div className="relative z-10 h-full w-full">{children}</div> : null}
    </div>
  );
}

export default ContourTide;
