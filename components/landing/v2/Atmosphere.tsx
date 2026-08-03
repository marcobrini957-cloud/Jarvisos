'use client'

import { useEffect, useRef } from 'react'

/**
 * The hero's weather.
 *
 * The reference landing this direction came from carries one continuous
 * cinematic render behind the whole page — that single commitment is most of
 * why it reads as expensive rather than assembled. We can't ship a 40MB 3D
 * render, and a static gradient is exactly the look we're trying to get away
 * from, so this is a fragment shader: ridged, domain-warped noise lit from one
 * soft source, moving slowly enough that you notice it only if you stay.
 *
 * Rules it follows, all of which are why it doesn't read as generic:
 *  - monochrome. Depth comes from light, never from a second hue.
 *  - a narrow, dark value range. The brightest point is ~18% grey.
 *  - grain baked in per-pixel. Clean gradients are the tell of a cheap render;
 *    every premium surface has noise in it.
 *  - it never loops visibly — the time input drives warped noise, not a cycle.
 *
 * Degrades to a plain dark panel if WebGL is unavailable, and stops entirely
 * for prefers-reduced-motion and when scrolled out of view (a GPU loop running
 * behind three screens of copy is rude on a laptop battery).
 */

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2  uRes;
uniform float uTime;

// -- value noise + fbm ------------------------------------------------------
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

// Ridged fbm — the sharp creases are what make it read as a lit solid rather
// than fog. Plain fbm looks like smoke; folding it gives edges to catch light.
float ridged(vec2 p){
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 5; i++){
    float n = noise(p);
    n = 1.0 - abs(n * 2.0 - 1.0);
    sum += n * amp;
    p *= 2.02;
    amp *= 0.5;
  }
  return sum;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  // Aspect-corrected so the body stays circular on any monitor.
  vec2 st = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  float t = uTime * 0.02;

  // -- 1. The body -----------------------------------------------------------
  // One large sphere sitting off the bottom-right corner, so its limb sweeps
  // across the frame. Uniform noise alone read as mud; the page needs a form
  // with an edge for light to break on.
  vec2  c = vec2(0.62, -0.62);
  float R = 1.02;
  float d = length(st - c) - R;              // <0 inside the body

  // Surface coordinates on the body — angle around it, depth into it. Used so
  // the striations wrap the form instead of sliding across the screen flat.
  vec2  rel  = st - c;
  float ang  = atan(rel.y, rel.x);
  float dist = length(rel);

  // -- 2. Striations ---------------------------------------------------------
  // Fine fins running around the body, drifting slowly. This is the texture
  // that keeps it from looking like an airbrushed gradient.
  // Kept broad and low-contrast on purpose: at high angular frequency they
  // converge into a sunburst, which is a gimmick, not a surface. These read as
  // sheen on a solid instead.
  float fins = ridged(vec2(ang * 5.5 + t * 0.6, dist * 2.4 - t * 0.35));
  float finsFine = ridged(vec2(ang * 13.0, dist * 4.0 + t * 0.2));
  float surface = fins * 0.72 + finsFine * 0.28;

  // -- 3. Light --------------------------------------------------------------
  // A single source beyond the upper-left. Lambert against the sphere's own
  // normal, so the terminator falls where the geometry says it should.
  vec3  n = normalize(vec3(rel / max(R, 1e-4), sqrt(max(0.0, 1.0 - clamp(dist / R, 0.0, 1.0)))));
  vec3  L = normalize(vec3(-0.62, 0.52, 0.58));
  float lambert = clamp(dot(n, L), 0.0, 1.0);

  float inside = smoothstep(0.012, -0.05, d);
  // The limb: a thin bright band right at the edge, brightest where the light
  // grazes it. This single line does most of the work.
  float rim = smoothstep(0.075, 0.0, abs(d)) * pow(clamp(dot(n, L) * 0.5 + 0.62, 0.0, 1.0), 2.2);

  float bodyLum = inside * (0.14 + lambert * 0.62) * (0.78 + surface * 0.38);

  // -- 4. Backdrop -----------------------------------------------------------
  // Not flat: a soft wash from the light's side, plus the same fins ghosted in
  // so the empty two-thirds still has something to catch the eye.
  float wash  = smoothstep(1.35, 0.0, distance(uv, vec2(-0.05, 1.05)));
  float haze  = ridged(st * 1.15 + vec2(t * 0.25, -t * 0.18));
  float backLum = wash * (0.14 + haze * 0.30);

  float v = max(bodyLum, backLum * (1.0 - inside * 0.55)) + rim * 0.85;

  // -- 5. Grade --------------------------------------------------------------
  // Pulled 35% toward VELQUOR's own blue (--ac #4D8FFF, rgb 0.302/0.561/1.0)
  // rather than the reference's neutral blue-grey. Done by rotating the hue at
  // constant brightness — red and green come down, blue holds — so the frame
  // reads as our colour without the art getting any lighter. The headline still
  // has to be the brightest thing on the page.
  vec3 col = mix(vec3(0.010, 0.014, 0.026), vec3(0.255, 0.330, 0.480), clamp(v, 0.0, 1.0));
  col += vec3(0.085, 0.130, 0.225) * pow(rim, 2.0);    // rim carries the brand cast
  col *= 1.0 - 0.30 * smoothstep(0.25, 1.25, distance(uv, vec2(0.32, 0.62)));  // vignette

  // Film grain, animated. Clean gradients are the tell of a cheap render.
  float g = hash(gl_FragCoord.xy + fract(uTime) * 100.0);
  col += (g - 0.5) * 0.028;

  outColor = vec4(max(col, 0.0), 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[Atmosphere]', gl.getShaderInfoLog(s))
    gl.deleteShader(s)
    return null
  }
  return s
}

export function Atmosphere({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[Atmosphere]', gl.getProgramInfoLog(prog)); return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes  = gl.getUniformLocation(prog, 'uRes')
    const uTime = gl.getUniformLocation(prog, 'uTime')

    // Cap the pixel ratio: a full-screen 5-octave shader at DPR 3 on a phone
    // is a lot of fragments for a background nobody is looking at directly.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const resize = () => {
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    let raf = 0
    let visible = true
    const start = performance.now()

    const draw = (now: number) => {
      resize()
      gl.uniform1f(uTime, (now - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduced && visible) raf = requestAnimationFrame(draw)
    }
    draw(start)

    // Stop the loop when the hero scrolls away.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduced && !raf) raf = requestAnimationFrame(draw)
      if (!visible) { cancelAnimationFrame(raf); raf = 0 }
    }, { threshold: 0 })
    io.observe(canvas)

    const onResize = () => { if (reduced || !visible) draw(performance.now()) }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('resize', onResize)
      gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buf)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', background: '#05070a', ...style }}
    />
  )
}
