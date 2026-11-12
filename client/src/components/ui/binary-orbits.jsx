import React, { useEffect, useRef } from 'react';

/**
 * BinaryOrbits - A tilted spiral galaxy of stars streaming through its arms.
 * React Bits Pro compatible component.
 *
 * Supports WebGL hardware acceleration, OKLab color blending,
 * logarithmic spiral arms, differential Keplerian rotation,
 * interactive pointer hover wake, and click ripple density waves.
 */
export function BinaryOrbits({
  colors = ['#6366f1', '#22d3ee'], // Outer arms & inner disc
  backgroundColor = '#020617',     // Cosmic dark
  mode = 'glow',                  // 'auto' | 'glow' | 'ink'
  stars = 55000,                  // Total stars
  starSize = 1.8,                 // Pixel size of stars
  sparkle = 0.5,                  // Sparkle star fraction (0 to 1)
  arms = 3,                       // Number of spiral arms (1 to 8)
  twist = 3.6,                    // Tightness of arm winding
  armStrength = 0.65,             // Crowding into arms (0 = uniform, 1 = dense arms)
  dust = 0.45,                    // Dust lane darkness (0 to 1)
  core = 1.2,                     // Core brightness multiplier
  coreSize = 0.08,                // Core radius fraction
  innerVoid = 0.0,                // Center hole radius
  thickness = 0.025,              // Disc thickness
  tilt = 62,                      // Viewing angle in degrees (0 = face-on, 85 = edge-on)
  roll = -12,                     // Screen roll in degrees
  scale = 1.05,                   // Galaxy scale
  centerX = 0.5,                  // Center X (0 to 1)
  centerY = 0.52,                 // Center Y (0 to 1)
  speed = 1.0,                    // Rotation speed factor
  interactive = true,             // Enable pointer responsiveness
  hoverWake = true,               // Sweep pointer to gather tidal filaments
  clickRipple = true,             // Click triggers expanding density wave
  className = '',
  style = {}
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect WebGL context
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true }) ||
               canvas.getContext('webgl', { alpha: true, antialias: true });
    if (!gl) {
      console.warn('WebGL not supported for BinaryOrbits canvas.');
      return;
    }

    // Optional derivative extension for older WebGL implementations
    gl.getExtension('OES_standard_derivatives');

    // Convert HEX to RGB [0..1]
    const hexToRgb = (hex) => {
      const clean = hex.replace('#', '');
      const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
      return [
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
      ];
    };

    const colorOuter = hexToRgb(colors[0] || '#6366f1');
    const colorInner = hexToRgb(colors[1] || '#22d3ee');

    // Vertex Shader
    const vsSource = `
      attribute float aRadius;
      attribute float aArmIndex;
      attribute float aPhaseOffset;
      attribute float aZ;
      attribute float aSeed;
      attribute float aType;

      uniform float uTime;
      uniform float uAspect;
      uniform float uTilt;
      uniform float uRoll;
      uniform float uScale;
      uniform vec2 uCenter;
      uniform float uStarSize;
      uniform float uTwist;
      uniform float uArms;
      uniform float uArmStrength;
      uniform float uCoreSize;
      uniform float uSpeed;
      uniform vec2 uPointer;
      uniform float uPointerActive;
      uniform vec4 uRipple; // x, y, startTime, active

      varying float vRadius;
      varying float vSeed;
      varying float vType;
      varying float vDust;
      varying float vDepth;
      varying float vRippleBoost;

      const float PI = 3.14159265359;

      void main() {
        vRadius = aRadius;
        vSeed = aSeed;
        vType = aType;

        // Differential Keplerian & flat rotation
        // Core rotates more rapidly, outer disc streams gracefully
        float omega = (uSpeed * 0.45) / sqrt(aRadius * aRadius + 0.035);
        float currentAngle = omega * uTime;

        // Logarithmic spiral arm geometry: theta = armAngle + twist * ln(r)
        float armBaseAngle = aArmIndex * (2.0 * PI / uArms);
        float spiralAngle = armBaseAngle + uTwist * log(max(aRadius, 0.015) + 0.08);

        // Interpolate between spiral arm position and uniform disc dispersion
        float blendedTheta = spiralAngle + aPhaseOffset * (1.0 - uArmStrength * 0.72) + currentAngle;

        // 3D Disc Coordinates
        float r = aRadius;
        float xDisc = r * cos(blendedTheta);
        float yDisc = r * sin(blendedTheta);
        float zDisc = aZ * (0.35 + aRadius * 0.65);

        // Interactive Pointer Hover Wake: Soft tidal filament pull
        if (uPointerActive > 0.01) {
          vec2 pDir = vec2(xDisc, yDisc) - uPointer;
          float pDist = length(pDir);
          if (pDist < 0.45 && pDist > 0.001) {
            float pull = (1.0 - pDist / 0.45) * 0.065 * uPointerActive;
            // Shear filament trailing with rotation
            vec2 tangent = vec2(-yDisc, xDisc) * 0.03;
            xDisc -= (pDir.x / pDist) * pull - tangent.x * pull;
            yDisc -= (pDir.y / pDist) * pull - tangent.y * pull;
          }
        }

        // Click Ripple Density Wave: expanding shockwave
        float rippleBoost = 0.0;
        if (uRipple.w > 0.5) {
          float elapsed = uTime - uRipple.z;
          float waveRadius = elapsed * 0.75;
          float distToClick = length(vec2(xDisc, yDisc) - uRipple.xy);
          float ringDist = abs(distToClick - waveRadius);
          if (ringDist < 0.08 && elapsed < 2.0) {
            float strength = (1.0 - ringDist / 0.08) * max(0.0, 1.0 - elapsed * 0.5);
            vec2 push = normalize(vec2(xDisc, yDisc) - uRipple.xy + 0.0001);
            xDisc += push.x * strength * 0.035;
            yDisc += push.y * strength * 0.035;
            rippleBoost = strength;
          }
        }
        vRippleBoost = rippleBoost;

        // Dust lane calculation: trailing inner edge of arms
        float armPhase = fract((blendedTheta - spiralAngle) / (2.0 * PI / uArms));
        vDust = smoothstep(0.0, 0.18, armPhase) * (1.0 - smoothstep(0.18, 0.45, armPhase));

        // 3D Projection: Tilt around X-axis
        float cosTilt = cos(uTilt);
        float sinTilt = sin(uTilt);
        float yTilted = yDisc * cosTilt - zDisc * sinTilt;
        float zTilted = yDisc * sinTilt + zDisc * cosTilt;
        float xTilted = xDisc;

        // Screen Roll rotation in 2D plane
        float cosRoll = cos(uRoll);
        float sinRoll = sin(uRoll);
        float xScreen = (xTilted * cosRoll - yTilted * sinRoll) * uScale;
        float yScreen = (xTilted * sinRoll + yTilted * cosRoll) * uScale;

        // Correct for canvas aspect ratio
        if (uAspect > 1.0) {
          xScreen /= uAspect;
        } else {
          yScreen *= uAspect;
        }

        // Apply galaxy center offset
        vec2 finalPos = vec2(xScreen, yScreen) + (uCenter * 2.0 - 1.0);
        gl_Position = vec4(finalPos, 0.0, 1.0);

        vDepth = (zTilted + 1.0) * 0.5;

        // Dynamic star sizing & twinkling
        float basePtSize = uStarSize;
        if (aType > 1.5) {
          // Core star
          basePtSize *= 1.45;
        } else if (aType > 0.5) {
          // Sparkle star
          float twinkle = sin(uTime * 3.5 + aSeed * 25.0) * 0.45 + 0.55;
          basePtSize *= (1.5 + twinkle * 0.9);
        } else {
          // Regular star
          basePtSize *= (0.75 + aSeed * 0.5);
        }

        // Perspective depth scale
        basePtSize *= (0.7 + vDepth * 0.6);
        gl_PointSize = max(1.0, basePtSize);
      }
    `;

    // Fragment Shader
    const fsSource = `
      #ifdef GL_ES
      precision highp float;
      #endif

      varying float vRadius;
      varying float vSeed;
      varying float vType;
      varying float vDust;
      varying float vDepth;
      varying float vRippleBoost;

      uniform vec3 uColorOuter;
      uniform vec3 uColorInner;
      uniform float uCoreSize;
      uniform float uCoreBrightness;
      uniform float uDustAmount;
      uniform float uTime;
      uniform int uMode; // 0 = glow, 1 = ink

      // OKLab color blending functions
      vec3 rgbToOklab(vec3 c) {
        float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
        float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
        float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
        float l_ = pow(max(l, 0.0), 0.3333333333);
        float m_ = pow(max(m, 0.0), 0.3333333333);
        float s_ = pow(max(s, 0.0), 0.3333333333);
        return vec3(
          0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
          1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
          0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
        );
      }

      vec3 oklabToRgb(vec3 c) {
        float l_ = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
        float m_ = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
        float s_ = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
        float l = l_ * l_ * l_;
        float m = m_ * m_ * m_;
        float s = s_ * s_ * s_;
        return vec3(
          +4.0767434720 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
        );
      }

      void main() {
        // Point sprite circular profile with soft glowing corona
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;

        // Radiant star intensity: gaussian falloff
        float intensity = exp(-dist * dist * 12.0);

        // OKLab interpolation across galaxy radius
        vec3 labOuter = rgbToOklab(uColorOuter);
        vec3 labInner = rgbToOklab(uColorInner);
        float mixT = clamp(vRadius * 1.35, 0.0, 1.0);
        vec3 starColor = oklabToRgb(mix(labInner, labOuter, mixT));

        // Core bulge burns luminous white-gold
        float coreFactor = smoothstep(uCoreSize * 2.5, 0.0, vRadius);
        vec3 coreWhite = vec3(1.0, 0.98, 0.95);
        starColor = mix(starColor, coreWhite, coreFactor * 0.85);

        // Dust lane absorption
        float dustDamp = 1.0 - (vDust * uDustAmount * 0.65);
        starColor *= dustDamp;

        // Sparkle diamond stars & ripple boost
        if (vType > 0.5 && vType < 1.5) {
          starColor = mix(starColor, vec3(1.0), 0.5);
          intensity *= 1.35;
        }

        if (vRippleBoost > 0.01) {
          starColor += vec3(0.3, 0.5, 1.0) * vRippleBoost;
          intensity *= (1.0 + vRippleBoost * 1.5);
        }

        // Alpha calculation
        float alpha = intensity * (0.65 + 0.35 * vDepth);
        if (vType > 1.5) {
          alpha *= uCoreBrightness;
        }

        gl_FragColor = vec4(starColor * alpha, alpha);
      }
    `;

    // Compile Shader Helper
    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Star Particle Buffer Generation
    const numStars = Math.max(2000, Math.min(stars, 120000));
    const aRadius = new Float32Array(numStars);
    const aArmIndex = new Float32Array(numStars);
    const aPhaseOffset = new Float32Array(numStars);
    const aZ = new Float32Array(numStars);
    const aSeed = new Float32Array(numStars);
    const aType = new Float32Array(numStars); // 0 = disc, 1 = sparkle, 2 = core

    for (let i = 0; i < numStars; i++) {
      const isCore = i < numStars * 0.12;
      const isSparkle = !isCore && Math.random() < sparkle;

      let r;
      if (isCore) {
        // High density inside core bulge
        r = Math.pow(Math.random(), 1.8) * (coreSize * 2.2);
        aType[i] = 2.0;
      } else {
        // Exponential galaxy disc distribution
        r = innerVoid + Math.pow(Math.random(), 0.72) * (1.0 - innerVoid);
        aType[i] = isSparkle ? 1.0 : 0.0;
      }

      aRadius[i] = r;
      aArmIndex[i] = Math.floor(Math.random() * arms);

      // Normal distribution around spiral arm
      const u1 = Math.random() || 0.0001;
      const u2 = Math.random();
      const gaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      // Arms become wider with radius
      aPhaseOffset[i] = gaussian * (0.16 + r * 0.22);

      // Disc thickness: thicker near core, thinner towards rim
      const zGaussian = Math.sqrt(-2.0 * Math.log(Math.random() || 0.0001)) * Math.sin(2.0 * Math.PI * Math.random());
      aZ[i] = zGaussian * thickness * (1.8 - r * 0.8);
      aSeed[i] = Math.random();
    }

    // Bind Attributes Helper
    const bindBuffer = (attrName, data, size) => {
      const loc = gl.getAttribLocation(program, attrName);
      if (loc === -1) return;
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return buf;
    };

    const buffers = [
      bindBuffer('aRadius', aRadius, 1),
      bindBuffer('aArmIndex', aArmIndex, 1),
      bindBuffer('aPhaseOffset', aPhaseOffset, 1),
      bindBuffer('aZ', aZ, 1),
      bindBuffer('aSeed', aSeed, 1),
      bindBuffer('aType', aType, 1),
    ];

    // Uniform Locations
    const uLoc = {
      time: gl.getUniformLocation(program, 'uTime'),
      aspect: gl.getUniformLocation(program, 'uAspect'),
      tilt: gl.getUniformLocation(program, 'uTilt'),
      roll: gl.getUniformLocation(program, 'uRoll'),
      scale: gl.getUniformLocation(program, 'uScale'),
      center: gl.getUniformLocation(program, 'uCenter'),
      starSize: gl.getUniformLocation(program, 'uStarSize'),
      twist: gl.getUniformLocation(program, 'uTwist'),
      arms: gl.getUniformLocation(program, 'uArms'),
      armStrength: gl.getUniformLocation(program, 'uArmStrength'),
      coreSize: gl.getUniformLocation(program, 'uCoreSize'),
      speed: gl.getUniformLocation(program, 'uSpeed'),
      pointer: gl.getUniformLocation(program, 'uPointer'),
      pointerActive: gl.getUniformLocation(program, 'uPointerActive'),
      ripple: gl.getUniformLocation(program, 'uRipple'),
      colorOuter: gl.getUniformLocation(program, 'uColorOuter'),
      colorInner: gl.getUniformLocation(program, 'uColorInner'),
      coreBrightness: gl.getUniformLocation(program, 'uCoreBrightness'),
      dustAmount: gl.getUniformLocation(program, 'uDustAmount'),
      mode: gl.getUniformLocation(program, 'uMode')
    };

    // State
    let dpr = 1;
    let width = 0;
    let height = 0;
    let rafId = null;
    let startTime = performance.now();
    let isVisible = true;

    const pointer = { x: 0, y: 0, active: 0, targetActive: 0 };
    const ripple = { x: 0, y: 0, startTime: -999, active: 0 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.floor(rect.width * dpr);
      height = Math.floor(rect.height * dpr);
      if (width === 0 || height === 0) return;

      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    resize();

    // Mouse / Touch Handlers
    const onPointerMove = (e) => {
      if (!interactive || !hoverWake) return;
      const rect = canvas.getBoundingClientRect();
      // Normalized coords [-1, 1]
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      pointer.x = nx;
      pointer.y = ny;
      pointer.targetActive = 1;
    };

    const onPointerLeave = () => {
      pointer.targetActive = 0;
    };

    const onClick = (e) => {
      if (!interactive || !clickRipple) return;
      const rect = canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      ripple.x = nx;
      ripple.y = ny;
      ripple.startTime = (performance.now() - startTime) * 0.001;
      ripple.active = 1;
    };

    if (interactive) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      canvas.addEventListener('pointerleave', onPointerLeave);
      canvas.addEventListener('click', onClick);
    }
    window.addEventListener('resize', resize);

    // Setup WebGL Blending: Additive luminous blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.disable(gl.DEPTH_TEST);

    // Render Loop
    const tiltRad = (tilt * Math.PI) / 180;
    const rollRad = (roll * Math.PI) / 180;

    const render = (now) => {
      if (!isVisible) {
        rafId = requestAnimationFrame(render);
        return;
      }

      const elapsed = (now - startTime) * 0.001;

      // Smooth pointer activity
      pointer.active += (pointer.targetActive - pointer.active) * 0.06;

      // Clear Canvas
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Update uniforms
      const aspect = width > 0 && height > 0 ? width / height : 1.0;
      gl.uniform1f(uLoc.time, elapsed);
      gl.uniform1f(uLoc.aspect, aspect);
      gl.uniform1f(uLoc.tilt, tiltRad);
      gl.uniform1f(uLoc.roll, rollRad);
      gl.uniform1f(uLoc.scale, scale);
      gl.uniform2f(uLoc.center, centerX, centerY);
      gl.uniform1f(uLoc.starSize, starSize * dpr);
      gl.uniform1f(uLoc.twist, twist);
      gl.uniform1f(uLoc.arms, arms);
      gl.uniform1f(uLoc.armStrength, armStrength);
      gl.uniform1f(uLoc.coreSize, coreSize);
      gl.uniform1f(uLoc.speed, speed);
      gl.uniform2f(uLoc.pointer, pointer.x, pointer.y);
      gl.uniform1f(uLoc.pointerActive, pointer.active);
      gl.uniform4f(uLoc.ripple, ripple.x, ripple.y, ripple.startTime, ripple.active);

      gl.uniform3fv(uLoc.colorOuter, colorOuter);
      gl.uniform3fv(uLoc.colorInner, colorInner);
      gl.uniform1f(uLoc.coreBrightness, core);
      gl.uniform1f(uLoc.dustAmount, dust);
      gl.uniform1i(uLoc.mode, mode === 'ink' ? 1 : 0);

      // Draw all stars
      gl.drawArrays(gl.POINTS, 0, numStars);

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    // Intersection Observer to pause when off-screen
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      if (interactive) {
        window.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        canvas.removeEventListener('click', onClick);
      }
      window.removeEventListener('resize', resize);
      buffers.forEach(b => b && gl.deleteBuffer(b));
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [
    colors,
    backgroundColor,
    mode,
    stars,
    starSize,
    sparkle,
    arms,
    twist,
    armStrength,
    dust,
    core,
    coreSize,
    innerVoid,
    thickness,
    tilt,
    roll,
    scale,
    centerX,
    centerY,
    speed,
    interactive,
    hoverWake,
    clickRipple
  ]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ backgroundColor, ...style }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-auto"
        aria-hidden="true"
      />
    </div>
  );
}

export default BinaryOrbits;
