import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { type MatSpec, specKey } from './materials'

export type V3 = [number, number, number]

export interface BuiltPart {
  key: string
  spec: MatSpec
  geometry: THREE.BufferGeometry
}

const compose = (pos: V3, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'YXZ')),
    new THREE.Vector3(...scale),
  )

/**
 * Accumula geometrie trasformate raggruppandole per materiale.
 * Alla fine `build()` restituisce una geometria fusa per ogni materiale:
 * l'intero villaggio statico diventa così poche decine di draw call.
 */
export class Builder {
  private groups = new Map<string, { spec: MatSpec; geos: THREE.BufferGeometry[] }>()
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()]
  private linked: Builder[] = []

  /** Un builder collegato segue le stesse trasformazioni (usato per i portoni interattivi). */
  link(other: Builder) {
    other.stack = [this.matrix.clone()]
    this.linked.push(other)
  }

  unlink(other: Builder) {
    this.linked = this.linked.filter((b) => b !== other)
  }

  private get matrix() {
    return this.stack[this.stack.length - 1]
  }

  /** Esegue `fn` in un sistema di riferimento locale (traslato e ruotato). */
  at(pos: V3, rotY: number, fn: () => void, rotX = 0, rotZ = 0) {
    const m = this.matrix.clone().multiply(compose(pos, [rotX, rotY, rotZ]))
    this.stack.push(m)
    for (const l of this.linked) l.stack.push(m)
    try {
      fn()
    } finally {
      this.stack.pop()
      for (const l of this.linked) l.stack.pop()
    }
  }

  /** Punto locale -> coordinate mondo del sistema corrente. */
  toWorld(p: V3): V3 {
    const v = new THREE.Vector3(...p).applyMatrix4(this.matrix)
    return [v.x, v.y, v.z]
  }

  /** Direzione locale -> mondo (solo rotazione). */
  dirToWorld(d: V3): V3 {
    const v = new THREE.Vector3(...d).transformDirection(this.matrix)
    return [v.x, v.y, v.z]
  }

  add(spec: MatSpec, source: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
    const g = source.index ? source.toNonIndexed() : source.clone()
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name)
    }
    if (!g.attributes.normal) g.computeVertexNormals()
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    }
    g.clearGroups()
    g.applyMatrix4(this.matrix.clone().multiply(compose(pos, rot, scale)))
    if (spec.uv === 'roof') roofUV(g)
    else if (spec.uv === 'planar') planarUV(g, spec.uvScale ?? 1)
    const key = specKey(spec)
    let entry = this.groups.get(key)
    if (!entry) this.groups.set(key, (entry = { spec, geos: [] }))
    entry.geos.push(g)
    source.dispose()
  }

  /** Parallelepipedo centrato in `pos`. */
  box(spec: MatSpec, size: V3, pos: V3, rot: V3 = [0, 0, 0]) {
    this.add(spec, new THREE.BoxGeometry(size[0], size[1], size[2]), pos, rot)
  }

  /** Parallelepipedo appoggiato: `pos[1]` è la quota della base. */
  boxOn(spec: MatSpec, size: V3, pos: V3, rotY = 0) {
    this.add(spec, new THREE.BoxGeometry(size[0], size[1], size[2]), [pos[0], pos[1] + size[1] / 2, pos[2]], [0, rotY, 0])
  }

  cyl(spec: MatSpec, rTop: number, rBottom: number, h: number, seg: number, pos: V3, rot: V3 = [0, 0, 0]) {
    this.add(spec, new THREE.CylinderGeometry(rTop, rBottom, h, seg), pos, rot)
  }

  sphere(spec: MatSpec, r: number, pos: V3, detail = 1, scale: V3 = [1, 1, 1]) {
    this.add(spec, new THREE.IcosahedronGeometry(r, detail), pos, [0, 0, 0], scale)
  }

  /** Tubo lungo una curva (ghirlande, fili delle luminarie, telai). */
  tube(spec: MatSpec, points: V3[], radius: number, radial = 5, segments?: number) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    this.add(spec, new THREE.TubeGeometry(curve, segments ?? Math.max(4, points.length * 4), radius, radial, false))
  }

  /** Cilindro tra due punti. */
  rod(spec: MatSpec, a: V3, b: V3, r: number, seg = 6) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
    const len = va.distanceTo(vb)
    const g = new THREE.CylinderGeometry(r, r, len, seg)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize())
    const m = new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))
    g.applyMatrix4(m)
    this.add(spec, g)
  }

  /** Estrusione di un profilo 2D (x, y) lungo +Z locale per `depth`, con origine sulla faccia posteriore. */
  extrude(spec: MatSpec, shape: THREE.Shape, depth: number, pos: V3, rot: V3 = [0, 0, 0], bevel = 0) {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      curveSegments: 12,
    })
    this.add(spec, g, pos, rot)
  }

  build(): BuiltPart[] {
    const out: BuiltPart[] = []
    for (const [key, { spec, geos }] of this.groups) {
      const geometry = mergeGeometries(geos, false)
      if (!geometry) continue
      geometry.computeBoundingSphere()
      geometry.computeBoundingBox()
      out.push({ key, spec, geometry })
      geos.forEach((g) => g.dispose())
    }
    this.groups.clear()
    return out
  }
}

// ---------------------------------------------------------------------------
// Coordinate UV calcolate nello spazio mondo, così texture e tegole hanno
// sempre la stessa scala qualunque sia la dimensione del pezzo.

const TILE_W = 0.3 * 8
const TILE_H = 0.4 * 8

function roofUV(g: THREE.BufferGeometry) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i)
    b.fromBufferAttribute(pos, i + 1)
    c.fromBufferAttribute(pos, i + 2)
    n.subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize()
    const hl = Math.hypot(n.x, n.z)
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c
      if (n.y > 0.15 && hl > 1e-3) {
        const hx = n.x / hl, hz = n.z / hl // direzione di discesa della falda
        const sinP = hl, cosP = n.y
        const along = p.x * -hz + p.z * hx
        const up = p.y * sinP - (p.x * hx + p.z * hz) * cosP
        uv.setXY(i + k, along / TILE_W, up / TILE_H)
      } else {
        uv.setXY(i + k, (p.x + p.z) / TILE_W, p.y / TILE_H)
      }
    }
  }
  uv.needsUpdate = true
}

function planarUV(g: THREE.BufferGeometry, scale: number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const uv = g.attributes.uv as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / scale, -pos.getZ(i) / scale)
  uv.needsUpdate = true
}

// ---------------------------------------------------------------------------
// Profili 2D

/** Quota del bordo superiore di un'apertura ad arco nel punto x (arco a tutto sesto o ribassato). */
export function archY(x: number, w: number, h: number, rise: number) {
  if (rise <= 0.001) return h
  const half = w / 2
  const R = (rise * rise + half * half) / (2 * rise)
  const cy = h - R
  return cy + Math.sqrt(Math.max(0, R * R - x * x))
}

/** Contorno di un'apertura ad arco, con base a y = 0. */
export function archPoints(w: number, h: number, rise: number, seg = 18): THREE.Vector2[] {
  const pts = [new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0)]
  if (rise <= 0.001) {
    pts.push(new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h))
    return pts
  }
  for (let i = 0; i <= seg; i++) {
    const x = w / 2 - (w * i) / seg
    pts.push(new THREE.Vector2(x, archY(x, w, h, rise)))
  }
  return pts
}

/** Metà sinistra (side = -1) o destra (side = 1) di un'apertura ad arco, per le ante del portone. */
export function leafPoints(w: number, h: number, rise: number, side: -1 | 1, gap = 0.012, seg = 10): THREE.Vector2[] {
  const outer = (side * w) / 2
  const inner = side * gap
  const pts = [new THREE.Vector2(inner, 0), new THREE.Vector2(outer, 0)]
  if (rise <= 0.001) {
    pts.push(new THREE.Vector2(outer, h), new THREE.Vector2(inner, h))
  } else {
    for (let i = 0; i <= seg; i++) {
      const x = outer + ((inner - outer) * i) / seg
      pts.push(new THREE.Vector2(x, archY(x, w, h, rise)))
    }
  }
  return side === 1 ? pts : pts.reverse()
}

export function shapeFrom(points: THREE.Vector2[], holes: THREE.Vector2[][] = []) {
  const s = new THREE.Shape(points)
  for (const h of holes) s.holes.push(new THREE.Path(h))
  return s
}

export function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

export function starShape(outer: number, inner: number, points = 5) {
  const s = new THREE.Shape()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = Math.PI / 2 + (i * Math.PI) / points
    const x = Math.cos(a) * r, y = Math.sin(a) * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

/** Generatore pseudo-casuale deterministico (stessa scena a ogni caricamento). */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
