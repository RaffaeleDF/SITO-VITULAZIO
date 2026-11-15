import * as THREE from 'three'
import { Builder, type V3, archPoints, archY, leafPoints, roundedRectShape, shapeFrom } from './builder'
import { C, M } from './materials'

/*
 * Elementi architettonici riutilizzabili.
 * Convenzione per gli elementi di facciata: origine sulla superficie del muro,
 * +Z verso l'esterno, +Y verso l'alto, +X a destra guardando la facciata.
 */

const HALF_PI = Math.PI / 2

// ---------------------------------------------------------------------------
// Finestre

export interface WindowOpts {
  w: number
  h: number
  arch?: boolean
  shutters?: boolean
  shutterColor?: string
  lit?: boolean
  sill?: boolean
  flowers?: boolean
  grille?: boolean
  frame?: string
}

/** Finestra centrata nell'origine. */
export function windowPart(b: Builder, o: WindowOpts) {
  const { w, h } = o
  const frame = M.trim(o.frame ?? C.trim)
  const ft = 0.09
  // vetro leggermente arretrato rispetto alla cornice
  b.box(M.glass(o.lit), [w - 0.04, h - 0.04, 0.04], [0, 0, 0.0])
  b.box(frame, [w + ft * 2, ft, 0.1], [0, h / 2 + ft / 2, 0.04])
  b.box(frame, [ft, h, 0.1], [-w / 2 - ft / 2, 0, 0.04])
  b.box(frame, [ft, h, 0.1], [w / 2 + ft / 2, 0, 0.04])
  // traversi
  b.box(frame, [0.045, h, 0.05], [0, 0, 0.03])
  b.box(frame, [w, 0.045, 0.05], [0, h * 0.18, 0.03])
  if (o.arch) {
    const r = w / 2 + ft
    const g = new THREE.CylinderGeometry(w / 2, w / 2, 0.04, 16, 1, false, -HALF_PI, Math.PI)
    b.add(M.glass(o.lit), g, [0, h / 2, 0], [HALF_PI, 0, 0])
    b.add(frame, new THREE.TorusGeometry(r - ft / 2, ft / 2, 4, 16, Math.PI), [0, h / 2, 0.05])
  } else {
    b.box(frame, [w + ft * 2 + 0.06, 0.07, 0.14], [0, h / 2 + ft + 0.03, 0.06])
  }
  if (o.sill !== false) b.box(M.stone(), [w + 0.3, 0.08, 0.2], [0, -h / 2 - 0.05, 0.09])
  if (o.shutters) {
    const sc = o.shutterColor ?? C.shutter
    const sw = w / 2 + 0.02
    for (const s of [-1, 1]) {
      const x = s * (w / 2 + ft + sw / 2 + 0.02)
      b.box(M.matte(sc), [sw, h, 0.05], [x, 0, 0.03])
      const slats = Math.max(4, Math.round(h / 0.22))
      for (let i = 0; i < slats; i++) {
        const y = -h / 2 + 0.1 + ((h - 0.2) * (i + 0.5)) / slats
        b.box(M.matte(C.shutterDark), [sw - 0.1, 0.035, 0.02], [x, y, 0.065])
      }
    }
  }
  if (o.grille) {
    const bars = Math.max(3, Math.round(w / 0.2))
    for (let i = 1; i < bars; i++) b.box(M.iron(), [0.025, h - 0.06, 0.025], [-w / 2 + (w * i) / bars, 0, 0.08])
    b.box(M.iron(), [w, 0.025, 0.025], [0, -h * 0.15, 0.08])
  }
  if (o.flowers) flowerBox(b, w + 0.1, [0, -h / 2 - 0.2, 0.17])
}

export function flowerBox(b: Builder, w: number, pos: V3) {
  b.box(M.wood(C.woodDark), [w, 0.2, 0.24], pos)
  const n = Math.max(3, Math.round(w / 0.28))
  for (let i = 0; i < n; i++) {
    const x = pos[0] - w / 2 + 0.14 + ((w - 0.28) * i) / (n - 1)
    b.sphere(M.foliage(C.hedge), 0.12, [x, pos[1] + 0.13, pos[2]], 0, [1.2, 0.8, 1])
    b.sphere(M.foliage(i % 2 ? C.red : '#c8453a'), 0.075, [x + 0.03, pos[1] + 0.21, pos[2] + 0.04], 0)
  }
}

// ---------------------------------------------------------------------------
// Portone: il protagonista di ogni postazione

export interface PortoneOpts {
  w: number
  h: number
  rise: number
  color: string
  frameW?: number
  frameColor?: string
  wreath?: boolean
  studs?: boolean
  lanterns?: boolean
  keystone?: boolean
  transom?: boolean
  festoon?: boolean
  step?: boolean
  /** builder dedicato alle ante interattive (se assente le ante vanno nel builder statico) */
  door?: Builder
}

/**
 * Portone con cornice in pietra, ante a pannelli, battenti dorati e ghirlanda.
 * Origine: centro della soglia sulla superficie del muro.
 * Restituisce la quota superiore della cornice.
 */
export function portone(b: Builder, o: PortoneOpts) {
  const { w, h, rise } = o
  const f = o.frameW ?? 0.3
  const door = o.door ?? b
  const stone = M.stone(o.frameColor ?? C.stone)
  const leafSpec = M.door(o.color)

  // cornice in pietra (estrusione con foro)
  const outer = archPoints(w + f * 2, h + f, rise > 0 ? rise + f : 0)
  const inner = archPoints(w, h, rise)
  b.extrude(stone, shapeFrom(outer, [inner]), 0.12, [0, 0, 0], [0, 0, 0], 0.025)
  // zoccoli alla base degli stipiti
  for (const s of [-1, 1]) b.box(M.stone(C.stoneDark), [f + 0.08, 0.42, 0.2], [s * (w / 2 + f / 2), 0.21, 0.08])
  // chiave di volta
  if (o.keystone !== false && rise > 0) {
    const ks = new THREE.Shape([
      new THREE.Vector2(-0.14, 0),
      new THREE.Vector2(0.14, 0),
      new THREE.Vector2(0.2, 0.46),
      new THREE.Vector2(-0.2, 0.46),
    ])
    b.extrude(stone, ks, 0.2, [0, h - 0.12, 0], [0, 0, 0], 0.02)
  }

  // sguincio scuro dietro le ante (profondità del vano)
  b.extrude(M.matte('#3a2d24'), shapeFrom(inner), 0.02, [0, 0, -0.01])

  // ante
  const leafH = o.transom ? h - 0.55 : h
  const leafRise = o.transom ? 0 : rise
  for (const s of [-1, 1] as const) {
    door.extrude(leafSpec, shapeFrom(leafPoints(w, leafH, leafRise, s)), 0.09, [0, 0, 0.01])
    // specchiature in rilievo
    const lw = w / 2 - 0.26
    const cx = (s * w) / 4
    const lowH = leafH * 0.26
    const panel = (pw: number, ph: number, y: number) =>
      door.extrude(leafSpec, roundedRectShape(pw, ph, 0.04), 0.03, [cx, y, 0.1], [0, 0, 0], 0.02)
    panel(lw, lowH, 0.22 + lowH / 2)
    const topLimit = archY(cx, w, leafH, leafRise) - 0.3
    const upY0 = 0.22 + lowH + 0.18
    const upH = Math.max(0.3, topLimit - upY0 - (leafRise > 0 ? 0.25 : 0.05))
    panel(lw, upH, upY0 + upH / 2)
    // battente ad anello e pomolo
    b.add(M.gold(), new THREE.TorusGeometry(0.085, 0.02, 6, 14), [s * 0.2, leafH * 0.47, 0.17])
    b.sphere(M.gold(), 0.035, [s * 0.2, leafH * 0.47 + 0.1, 0.16], 1)
    if (o.studs) {
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 2; j++)
          b.sphere(M.gold(), 0.026, [cx + (j - 0.5) * lw * 0.75, 0.3 + i * (lowH * 0.38), 0.15], 0)
    }
  }
  // battuta centrale
  b.box(M.matte('#2a211b'), [0.035, leafH - 0.04, 0.04], [0, leafH / 2, 0.11])
  if (o.transom) {
    b.box(stone, [w, 0.12, 0.16], [0, leafH + 0.06, 0.06])
    b.box(M.glass(true), [w - 0.1, 0.38, 0.04], [0, leafH + 0.31, 0.02])
    for (let i = 1; i < 4; i++) b.box(M.iron(), [0.03, 0.38, 0.03], [-w / 2 + (w * i) / 4, leafH + 0.31, 0.06])
  }

  // ghirlanda
  if (o.wreath !== false) wreath(b, [0, Math.min(leafH * 0.66, leafH - 0.7), 0.17], 0.3)

  // gradino
  if (o.step !== false) b.box(M.stone(C.stoneDark), [w + f * 2 + 0.3, 0.12, 0.5], [0, 0.06, 0.25])

  // lanterne a muro
  if (o.lanterns) for (const s of [-1, 1]) wallLantern(b, [s * (w / 2 + f + 0.42), h * 0.78, 0])

  if (o.festoon) {
    // festone appeso sotto la targa, davanti alla lunetta del portone
    const y = h + f - 0.16
    const x = w / 2 + f + 0.22
    garland(b, [[-x, y, 0.14], [-x * 0.5, y - 0.36, 0.22], [0, y - 0.46, 0.24], [x * 0.5, y - 0.36, 0.22], [x, y, 0.14]], 0.08)
    for (const s of [-1, 1]) bow(b, [s * x, y + 0.02, 0.2], 0.7)
  }
  return h + f
}

export function wreath(b: Builder, pos: V3, r = 0.3) {
  b.add(M.foliage(C.pine), new THREE.TorusGeometry(r, r * 0.33, 5, 12), pos)
  b.add(M.foliage(C.pineLight), new THREE.TorusGeometry(r * 0.98, r * 0.18, 4, 10), [pos[0], pos[1], pos[2] + r * 0.18], [0, 0, 0.3])
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4
    b.sphere(M.matte(C.red), r * 0.1, [pos[0] + Math.cos(a) * r, pos[1] + Math.sin(a) * r, pos[2] + r * 0.3], 0)
  }
  bow(b, [pos[0], pos[1] - r, pos[2] + r * 0.32], r * 2.4)
}

export function bow(b: Builder, pos: V3, s = 1) {
  const red = M.matte(C.red)
  b.sphere(red, 0.06 * s, pos, 0, [1.4, 0.7, 0.6])
  b.sphere(red, 0.05 * s, [pos[0] - 0.08 * s, pos[1] + 0.02 * s, pos[2]], 0, [1.5, 0.9, 0.5])
  b.sphere(red, 0.05 * s, [pos[0] + 0.08 * s, pos[1] + 0.02 * s, pos[2]], 0, [1.5, 0.9, 0.5])
  b.box(red, [0.04 * s, 0.14 * s, 0.02 * s], [pos[0] - 0.04 * s, pos[1] - 0.09 * s, pos[2]], [0, 0, -0.3])
  b.box(red, [0.04 * s, 0.14 * s, 0.02 * s], [pos[0] + 0.04 * s, pos[1] - 0.09 * s, pos[2]], [0, 0, 0.3])
}

/** Festone di rami con piccole luci. */
export function garland(b: Builder, pts: V3[], r = 0.08, lights = true) {
  b.tube(M.foliage(C.pine), pts, r, 5, pts.length * 6)
  if (!lights) return
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
  const n = Math.round(curve.getLength() / 0.35)
  for (let i = 1; i < n; i++) {
    const p = curve.getPoint(i / n)
    b.sphere(i % 3 === 0 ? M.matte(C.red) : M.glow(2.4), i % 3 === 0 ? 0.045 : 0.035, [p.x, p.y + r * 0.6, p.z + r * 0.5], 0)
  }
}

export function wallLantern(b: Builder, pos: V3) {
  const [x, y, z] = pos
  b.box(M.iron(), [0.06, 0.06, 0.3], [x, y + 0.25, z + 0.15])
  b.box(M.iron(), [0.24, 0.04, 0.24], [x, y + 0.2, z + 0.3])
  b.box(M.glow(1.6), [0.17, 0.26, 0.17], [x, y + 0.05, z + 0.3])
  b.cyl(M.iron(), 0.02, 0.17, 0.12, 4, [x, y + 0.27, z + 0.3], [0, Math.PI / 4, 0])
  b.box(M.iron(), [0.2, 0.03, 0.2], [x, y - 0.1, z + 0.3])
}

/** Targa per il numero della postazione (il numero è un testo 3D posizionato dal componente React). */
export function plaque(b: Builder, pos: V3, w = 0.72, h = 0.46, enamel: string = C.pine) {
  b.extrude(M.gold(), roundedRectShape(w, h, 0.09), 0.04, [pos[0], pos[1], pos[2]], [0, 0, 0], 0.015)
  b.extrude(M.matte(enamel), roundedRectShape(w - 0.1, h - 0.1, 0.06), 0.03, [pos[0], pos[1], pos[2] + 0.04])
  return [pos[0], pos[1], pos[2] + 0.085] as V3
}

// ---------------------------------------------------------------------------
// Volumi e finiture

export function zoccolo(b: Builder, w: number, d: number, h = 0.5, color: string = C.stoneDark) {
  b.boxOn(M.stone(color), [w + 0.08, h, d + 0.08], [0, 0, -d / 2])
}

/** Cantonali: blocchi alternati sugli spigoli. */
export function quoins(b: Builder, w: number, d: number, y0: number, y1: number, color: string = C.stone) {
  const spec = M.stone(color)
  const bh = 0.36, gap = 0.06
  const n = Math.floor((y1 - y0) / (bh + gap))
  for (let i = 0; i < n; i++) {
    const y = y0 + i * (bh + gap) + bh / 2
    const long = i % 2 === 0
    const lf = long ? 0.62 : 0.4
    const ls = long ? 0.4 : 0.62
    for (const sx of [-1, 1])
      for (const zf of [0, -d]) {
        const dz = zf === 0 ? 1 : -1
        b.box(spec, [lf, bh, 0.06], [sx * (w / 2 - lf / 2 + 0.03), y, zf + dz * 0.03])
        b.box(spec, [0.06, bh, ls], [sx * (w / 2 + 0.03), y, zf - dz * (ls / 2 - 0.03)])
      }
  }
}

/** Lesene: fasce verticali sugli spigoli. */
export function pilasters(b: Builder, w: number, d: number, y0: number, y1: number, color: string = C.trim) {
  const spec = M.trim(color)
  const h = y1 - y0
  for (const sx of [-1, 1])
    for (const zf of [0, -d]) {
      const dz = zf === 0 ? 1 : -1
      b.box(spec, [0.46, h, 0.07], [sx * (w / 2 - 0.2), y0 + h / 2, zf + dz * 0.035])
      b.box(spec, [0.07, h, 0.46], [sx * (w / 2 + 0.035), y0 + h / 2, zf - dz * 0.2])
    }
}

/** Marcapiano (fascia orizzontale tra i piani) su tutti e quattro i lati. */
export function band(b: Builder, w: number, d: number, y: number, h = 0.16, out = 0.07, color: string = C.trim) {
  const spec = M.trim(color)
  b.box(spec, [w + out * 2, h, out * 2], [0, y, 0])
  b.box(spec, [w + out * 2, h, out * 2], [0, y, -d])
  b.box(spec, [out * 2, h, d], [-w / 2, y, -d / 2])
  b.box(spec, [out * 2, h, d], [w / 2, y, -d / 2])
}

/** Cornicione di gronda a due gradini. */
export function cornice(b: Builder, w: number, d: number, y: number, sides = true, color: string = C.trim) {
  const spec = M.trim(color)
  for (const z of [0, -d]) {
    b.box(spec, [w + 0.16, 0.14, 0.16], [0, y - 0.24, z])
    b.box(spec, [w + 0.34, 0.16, 0.34], [0, y - 0.08, z])
  }
  if (sides)
    for (const x of [-w / 2, w / 2]) {
      b.box(spec, [0.16, 0.14, d + 0.16], [x, y - 0.24, -d / 2])
      b.box(spec, [0.34, 0.16, d + 0.34], [x, y - 0.08, -d / 2])
    }
}

/** Corpo con tetto a capanna inglobato: profilo a "casetta" estruso. */
export function gableBody(b: Builder, wall: string, w: number, d: number, H: number, pitch: number, axis: 'x' | 'z') {
  const span = axis === 'x' ? d : w
  const len = axis === 'x' ? w : d
  const apex = H + (span / 2) * Math.tan(pitch)
  const s = new THREE.Shape([
    new THREE.Vector2(-span / 2, 0),
    new THREE.Vector2(span / 2, 0),
    new THREE.Vector2(span / 2, H),
    new THREE.Vector2(0, apex),
    new THREE.Vector2(-span / 2, H),
  ])
  if (axis === 'x') b.extrude(M.wall(wall), s, len, [-len / 2, 0, -d / 2], [0, HALF_PI, 0])
  else b.extrude(M.wall(wall), s, len, [0, 0, -d], [0, 0, 0])
  return apex
}

export interface GableRoofOpts {
  span: number
  length: number
  eaveY: number
  pitch: number
  axis: 'x' | 'z'
  center: [number, number]
  overhang?: number
  gableOverhang?: number
  thick?: number
  color?: string
  barge?: string | false
  snow?: boolean
}

/** Tetto a capanna con spessore, colmo, tegole e bordi di finitura. */
export function gableRoof(b: Builder, o: GableRoofOpts) {
  const ov = o.overhang ?? 0.42
  const gov = o.gableOverhang ?? 0.32
  const th = o.thick ?? 0.2
  const t = Math.tan(o.pitch)
  const half = o.span / 2 + ov
  const L = o.length + gov * 2
  const yb = (u: number) => o.eaveY + (o.span / 2 - Math.abs(u)) * t
  const tv = th / Math.cos(o.pitch)
  const profile = (thick: number, inset = 0) => {
    const hh = half - inset
    return new THREE.Shape([
      new THREE.Vector2(-hh, yb(hh)),
      new THREE.Vector2(0, yb(0)),
      new THREE.Vector2(hh, yb(hh)),
      new THREE.Vector2(hh, yb(hh) + thick),
      new THREE.Vector2(0, yb(0) + thick),
      new THREE.Vector2(-hh, yb(hh) + thick),
    ])
  }
  const [cx, cz] = o.center
  const pos: V3 = o.axis === 'x' ? [cx - L / 2, 0, cz] : [cx, 0, cz - L / 2]
  const rotY = o.axis === 'x' ? HALF_PI : 0
  b.at(pos, rotY, () => {
    b.extrude(M.roof(o.color ?? C.roof), profile(tv), L, [0, 0, 0])
    b.box(M.ridge(), [0.3, 0.16, L + 0.04], [0, yb(0) + tv + 0.04, L / 2])
    if (o.snow) {
      b.extrude(M.matte(C.white), profile(0.14, 0.22), L - 0.3, [0, tv - 0.02, 0.15])
      b.box(M.matte(C.white), [0.42, 0.2, L - 0.3], [0, yb(0) + tv + 0.12, L / 2])
    }
    if (o.barge !== false) {
      const spec = M.trim(o.barge ?? C.trim)
      const len = half / Math.cos(o.pitch) + 0.06
      for (const e of [-0.04, L + 0.04])
        for (const s of [-1, 1]) {
          const u = (s * half) / 2
          b.box(spec, [len, tv + 0.08, 0.08], [u, yb(u) + tv / 2, e], [0, 0, -s * o.pitch])
        }
    }
  })
  return yb(0) + tv
}

export interface HipRoofOpts {
  w: number
  d: number
  eaveY: number
  pitch: number
  center: [number, number]
  overhang?: number
  color?: string
}

/** Tetto a padiglione (quattro falde). */
export function hipRoof(b: Builder, o: HipRoofOpts) {
  const ov = o.overhang ?? 0.45
  const t = Math.tan(o.pitch)
  const W = o.w + ov * 2, D = o.d + ov * 2
  const y0 = o.eaveY - ov * t
  const h = (Math.min(W, D) / 2) * t
  const A: V3 = [-W / 2, y0, -D / 2], B: V3 = [W / 2, y0, -D / 2], Cc: V3 = [W / 2, y0, D / 2], Dd: V3 = [-W / 2, y0, D / 2]
  let tris: V3[][]
  let R1: V3, R2: V3
  if (W >= D) {
    R1 = [-(W - D) / 2, y0 + h, 0]
    R2 = [(W - D) / 2, y0 + h, 0]
    tris = [[Dd, Cc, R2], [Dd, R2, R1], [B, A, R1], [B, R1, R2], [Cc, B, R2], [A, Dd, R1], [A, B, Cc], [A, Cc, Dd]]
  } else {
    R1 = [0, y0 + h, -(D - W) / 2]
    R2 = [0, y0 + h, (D - W) / 2]
    tris = [[Dd, Cc, R2], [B, A, R1], [Cc, B, R1], [Cc, R1, R2], [A, Dd, R2], [A, R2, R1], [A, B, Cc], [A, Cc, Dd]]
  }
  const arr = new Float32Array(tris.length * 9)
  tris.forEach((tri, i) => tri.forEach((p, k) => arr.set(p, i * 9 + k * 3)))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  g.computeVertexNormals()
  const [cx, cz] = o.center
  b.at([cx, 0, cz], 0, () => {
    b.add(M.roof(o.color ?? C.roof), g)
    // spessore della gronda
    const fs = M.ridge()
    b.box(fs, [W + 0.04, 0.2, 0.12], [0, y0 - 0.08, D / 2])
    b.box(fs, [W + 0.04, 0.2, 0.12], [0, y0 - 0.08, -D / 2])
    b.box(fs, [0.12, 0.2, D], [W / 2, y0 - 0.08, 0])
    b.box(fs, [0.12, 0.2, D], [-W / 2, y0 - 0.08, 0])
    // colmo e displuvi
    if (Math.abs(R1[0] - R2[0]) + Math.abs(R1[2] - R2[2]) > 0.01) b.rod(fs, R1, R2, 0.11, 6)
    for (const [c, r] of [[A, R1], [B, W >= D ? R2 : R1], [Cc, R2], [Dd, W >= D ? R1 : R2]] as [V3, V3][])
      b.rod(fs, [c[0], c[1] + 0.06, c[2]], [r[0], r[1] + 0.06, r[2]], 0.07, 5)
  })
  return y0 + h
}

export function chimney(b: Builder, pos: V3, h: number, wall: string) {
  const [x, y, z] = pos
  b.boxOn(M.wall(wall), [0.62, h, 0.62], [x, y, z])
  b.boxOn(M.trim(), [0.8, 0.12, 0.8], [x, y + h, z])
  b.boxOn(M.ridge(), [0.5, 0.18, 0.5], [x, y + h + 0.12, z])
  b.cyl(M.ridge(C.roofAlt), 0.08, 0.1, 0.22, 6, [x - 0.12, y + h + 0.4, z])
}

/** Tenda parasole a strisce. */
export function awning(b: Builder, w: number, depth: number, y: number, c1: string = C.red, c2: string = C.white) {
  const n = Math.max(5, Math.round(w / 0.38))
  const sw = w / n
  const drop = 0.42
  const slope = Math.atan2(drop, depth)
  const len = Math.hypot(depth, drop)
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sw * (i + 0.5)
    const col = i % 2 === 0 ? c1 : c2
    b.box(M.fabric(col), [sw + 0.002, 0.04, len], [x, y - drop / 2, depth / 2], [slope, 0, 0])
    // mantovana a festoni
    b.box(M.fabric(col), [sw, 0.22, 0.03], [x, y - drop - 0.09, depth + 0.01])
    b.cyl(M.fabric(col), sw / 2, sw / 2, 0.03, 8, [x, y - drop - 0.2, depth + 0.01], [HALF_PI, 0, 0])
  }
  b.box(M.iron(), [w + 0.1, 0.05, 0.05], [0, y + 0.03, 0.03])
  for (const s of [-1, 1]) b.rod(M.iron(), [s * (w / 2), y - 0.9, 0], [s * (w / 2), y - drop, depth], 0.02, 4)
}

/** Stendardo appeso a un'asta orizzontale, con filetti dorati. Origine: base del drappo sul muro. */
export function banner(b: Builder, pos: V3, color: string) {
  const [x, y, z] = pos
  const drape = new THREE.Shape([
    new THREE.Vector2(-0.3, 0), new THREE.Vector2(0, 0.22), new THREE.Vector2(0.3, 0),
    new THREE.Vector2(0.3, 1.9), new THREE.Vector2(-0.3, 1.9),
  ])
  b.extrude(M.fabric(color), drape, 0.03, [x, y, z])
  b.box(M.gold(), [0.6, 0.05, 0.04], [x, y + 1.55, z + 0.04])
  b.box(M.gold(), [0.05, 1.4, 0.04], [x, y + 0.9, z + 0.04])
  b.rod(M.iron(), [x - 0.4, y + 1.95, z + 0.02], [x + 0.4, y + 1.95, z + 0.02], 0.025, 5)
  for (const s of [-1, 1]) b.sphere(M.gold(), 0.05, [x + s * 0.42, y + 1.95, z + 0.02], 0)
}

/** Balcone con mensole e ringhiera in ferro. */
export function balcony(b: Builder, w: number, depth: number, y: number) {
  b.box(M.stone(), [w, 0.14, depth], [0, y, depth / 2])
  for (const s of [-1, 1]) {
    b.box(M.stone(C.stoneDark), [0.16, 0.36, depth * 0.8], [s * (w / 2 - 0.3), y - 0.24, depth * 0.4])
  }
  const rail = M.iron()
  const top = y + 0.95
  b.box(rail, [w, 0.05, 0.06], [0, top, depth - 0.05])
  for (const s of [-1, 1]) b.box(rail, [0.05, 0.05, depth], [s * (w / 2 - 0.03), top, depth / 2])
  const n = Math.round(w / 0.14)
  for (let i = 0; i <= n; i++) b.box(rail, [0.025, 0.88, 0.025], [-w / 2 + 0.03 + ((w - 0.06) * i) / n, y + 0.5, depth - 0.05])
  for (const s of [-1, 1]) {
    const m = Math.round(depth / 0.14)
    for (let i = 1; i < m; i++) b.box(rail, [0.025, 0.88, 0.025], [s * (w / 2 - 0.03), y + 0.5, (depth * i) / m])
  }
}

/** Colonna in pietra con base e capitello. */
export function column(b: Builder, pos: V3, h: number) {
  const [x, y, z] = pos
  b.boxOn(M.stone(C.stoneDark), [0.42, 0.18, 0.42], [x, y, z])
  b.cyl(M.stone(), 0.14, 0.16, h - 0.4, 10, [x, y + 0.18 + (h - 0.4) / 2, z])
  b.boxOn(M.stone(), [0.4, 0.22, 0.4], [x, y + h - 0.22, z])
}

/** Semplice porta di servizio per retri e case di contorno. */
export function plainDoor(b: Builder, w: number, h: number, color: string) {
  b.box(M.trim(), [w + 0.24, h + 0.12, 0.06], [0, h / 2 + 0.06, 0.02])
  b.box(M.wood(color), [w, h, 0.06], [0, h / 2, 0.05])
  b.box(M.matte('#2a211b'), [0.025, h - 0.1, 0.02], [0, h / 2, 0.09])
  b.sphere(M.gold(), 0.03, [w * 0.3, h * 0.48, 0.1], 0)
  b.box(M.stone(C.stoneDark), [w + 0.4, 0.1, 0.36], [0, 0.05, 0.18])
}
