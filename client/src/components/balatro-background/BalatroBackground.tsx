// Modified from https://reactbits.dev/backgrounds/balatro
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import styles from './BalatroBackground.module.css';
import { flipAnimationDuration, useStartFlipListener } from '../../state/coinAtoms';
import { animate } from 'motion/react';

interface BalatroProps {
  spinRotation?: number;
  spinSpeed?: number;
  offset?: [number, number];
  contrast?: number;
  lighting?: number;
  spinAmount?: number;
  pixelFilter?: number;
  spinEase?: number;
  isRotate?: boolean;
  mouseInteraction?: boolean;
}

function hexToVec4(hex: string): [number, number, number, number] {
  let hexStr = hex.replace('#', '');
  let r = 0,
    g = 0,
    b = 0,
    a = 1;
  if (hexStr.length === 6) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
  } else if (hexStr.length === 8) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
    a = parseInt(hexStr.slice(6, 8), 16) / 255;
  }
  return [r, g, b, a];
}

function vec4ToHex(vec: [number, number, number, number]): string {
  const r = Math.round(vec[0] * 255)
    .toString(16)
    .padStart(2, '0');
  const g = Math.round(vec[1] * 255)
    .toString(16)
    .padStart(2, '0');
  const b = Math.round(vec[2] * 255)
    .toString(16)
    .padStart(2, '0');
  const a = Math.round(vec[3] * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

/**
 * Motion interpolates based on css colors, so we take these and convert to vec4, used in shader
 * Supports hex (#rrggbb or #rrggbbaa), rgb(...), rgba(...), and plain 6 or 8 char hex without '#'
 */
function cssColorToVec4(color: string): [number, number, number, number] {
  const str = color.trim();
  // rgb(...) or rgba(...)
  const rgbRegex = /rgba?\(([^)]+)\)/i;
  const rgbMatch = str.match(rgbRegex);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((p) => p.trim());
    let r = 0,
      g = 0,
      b = 0,
      a = 1;

    const parseComponent = (c: string) => {
      if (c.endsWith('%')) {
        // percent -> 0-255
        return (parseFloat(c) / 100) * 255;
      }
      return parseFloat(c);
    };

    if (parts.length >= 3) {
      r = parseComponent(parts[0]) / 255;
      g = parseComponent(parts[1]) / 255;
      b = parseComponent(parts[2]) / 255;
    }
    if (parts.length === 4) {
      const alpha = parts[3];
      a = alpha.endsWith('%') ? parseFloat(alpha) / 100 : parseFloat(alpha);
    }

    return [r, g, b, a];
  }

  // plain 6 or 8 char hex without leading '#'
  const bareHex = str.replace('#', '');
  if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(bareHex)) {
    return hexToVec4('#' + bareHex);
  }

  // fallback to black if we can't parse (should be rare)
  return [0, 0, 0, 1];
}

// --- OKLab helpers (lightweight conversions) ---
// Source reference: https://bottosson.github.io/posts/oklab/
function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbVecToOklab([r, g, b]: [number, number, number]) {
  // convert sRGB [0,1] to linear
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return [L, a, b_];
}

function oklabToRgbVec([L, a, b]: [number, number, number]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

#define PI 3.14159265359

uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;

varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / uPixelFilter;
    vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
    float uv_len = length(uv);
    
    float speed = (uSpinRotation * uSpinEase * 0.2);
    if(uIsRotate){
       speed = iTime * speed;
    }
    speed += 302.2;
    
    float mouseInfluence = (uMouse.x * 2.0 - 1.0);
    speed += mouseInfluence * 0.1;
    
    float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
    vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
    uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
    
    uv *= 30.0;
    float baseSpeed = iTime * uSpinSpeed;
    speed = baseSpeed + mouseInfluence * 2.0;
    
    vec2 uv2 = vec2(uv.x + uv.y);
    
    for(int i = 0; i < 5; i++) {
        uv2 += sin(max(uv.x, uv.y)) + uv;
        uv += 0.5 * vec2(
            cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
            sin(uv2.x - 0.113 * speed)
        );
        uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
    }
    
    float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);
    float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
    
    return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
}

void main() {
    vec2 uv = vUv * iResolution.xy;
    gl_FragColor = effect(iResolution.xy, uv);
}
`;

const baseMouseInfluence: Array<number> = [0.5, 0.5];
const palettes: Array<[string, string, string]> = [
  ['#476952', '#404040', '#142021'], // original dark
  ['#DE443B', '#006BB4', '#162325'], // original warm/cool/dark
  ['#FF6B6B', '#4ECDC4', '#1A535C'], // coral / mint / deep
  ['#F2D388', '#C98474', '#874C62'], // warm muted
  ['#9B5DE5', '#1e4552ff', '#015c50ff'], // vibrant neons
];

export default function BalatroBackground({
  spinRotation = -2.0,
  spinSpeed = 7.0,
  offset = [0.0, 0.0],
  contrast = 3.5,
  lighting = 0.4,
  spinAmount = 0.25,
  pixelFilter = 745.0,
  spinEase = 1.0,
  isRotate = false,
  mouseInteraction = true,
}: BalatroProps) {
  // TODO: Find a way to modify props inside this component without fully rerendering the component.
  // Possible solution is to add event listeners for different props we want to change.
  // Another option is to move the cleanup code into a separate function
  const containerRef = useRef<HTMLDivElement>(null);

  // When the startFlip atom changes, dispatch the 'spinActivation' event on
  // this component's container so the existing handler inside the effect
  // that listens for 'spinActivation' will run the spin animation.
  useStartFlipListener((_, __, newVal) => {
    if (newVal && containerRef.current) {
      containerRef.current.dispatchEvent(new Event('spinActivation'));
    }
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const renderer = new Renderer();
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    let program: Program;

    function resize() {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      if (program) {
        program.uniforms.iResolution.value = [
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height,
        ];
      }
    }
    window.addEventListener('resize', resize);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height],
        },
        uSpinRotation: { value: spinRotation },
        uSpinSpeed: { value: spinSpeed },
        uOffset: { value: offset },
        uColor1: { value: hexToVec4(palettes[0][0]) },
        uColor2: { value: hexToVec4(palettes[0][1]) },
        uColor3: { value: hexToVec4(palettes[0][2]) },
        uContrast: { value: contrast },
        uLighting: { value: lighting },
        uSpinAmount: { value: spinAmount },
        uPixelFilter: { value: pixelFilter },
        uSpinEase: { value: spinEase },
        uIsRotate: { value: isRotate },
        uMouse: { value: baseMouseInfluence },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animationFrameId: number;
    // curated palettes (each palette is [color1, color2, color3])
    const paletteIndex = { current: 0 } as { current: number };

    function update(time: number) {
      animationFrameId = requestAnimationFrame(update);
      program.uniforms.iTime.value = time * 0.001;
      renderer.render({ scene: mesh });
    }
    animationFrameId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);

    function handleMouseMove(e: MouseEvent) {
      if (!mouseInteraction) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      program.uniforms.uMouse.value = [x, y];
    }
    container.addEventListener('mousemove', handleMouseMove);

    function animateColor(color1: string, color2: string, colorNum: string) {
      // the conversions here are kind of ai slop but they work. Not super sure that converting to okLab is req here.
      // Convert endpoints to vec4
      const v1 = cssColorToVec4(color1);
      const v2 = cssColorToVec4(color2);
      // Convert RGB -> OKLab
      const lab1 = rgbVecToOklab([v1[0], v1[1], v1[2]]);
      const lab2 = rgbVecToOklab([v2[0], v2[1], v2[2]]);

      // We'll animate L, a, b, and alpha as numbers (Motion will provide numeric updates)
      const state = { L: lab1[0], a: lab1[1], b: lab1[2], A: v1[3] };
      animate(
        state,
        { L: lab2[0], a: lab2[1], b: lab2[2], A: v2[3] },
        {
          type: 'tween',
          duration: flipAnimationDuration,
          onUpdate: () => {
            const rgb = oklabToRgbVec([state.L, state.a, state.b]).map((c) =>
              Math.max(0, Math.min(1, c))
            );
            program.uniforms['uColor' + colorNum].value = [rgb[0], rgb[1], rgb[2], state.A];
          },
        }
      );
    }

    function handleSpinActivation() {
      // animate the spin
      animate(program.uniforms.uMouse.value[0], program.uniforms.uMouse.value[0] + 15, {
        type: 'tween',
        duration: flipAnimationDuration,
        onUpdate: (value: number) => {
          program.uniforms.uMouse.value = [value, program.uniforms.uMouse.value[1]];
        },
      });
      // cycle to next palette and animate all three colors
      const nextIndex = (paletteIndex.current + 1) % palettes.length;
      const nextPalette = palettes[nextIndex];
      animateColor(vec4ToHex(program.uniforms.uColor1.value), nextPalette[0], '1');
      animateColor(vec4ToHex(program.uniforms.uColor2.value), nextPalette[1], '2');
      animateColor(vec4ToHex(program.uniforms.uColor3.value), nextPalette[2], '3');
      paletteIndex.current = nextIndex;
    }
    container.addEventListener('spinActivation', handleSpinActivation);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('spinActivation', handleSpinActivation);
      container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [
    spinRotation,
    spinSpeed,
    offset,
    contrast,
    lighting,
    spinAmount,
    pixelFilter,
    spinEase,
    isRotate,
    mouseInteraction,
  ]);

  return <div ref={containerRef} className={styles.balatroContainer} />;
}
