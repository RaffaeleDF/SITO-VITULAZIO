import * as THREE from 'three'
import { Builder, type BuiltPart, type V3, seeded } from './build/builder'
import { C, M, MURI, PORTONI } from './build/materials'
import { STAND_BODY, STAND_FOOTPRINT, STAND_MODELS, fillerEave, fillerHouse } from './build/houses'
import { bench, bicycle, bigTree, church, hedge, kiosk, lamp, lightString, pine, shrub } from './build/decor'
import {
  type Lato, type Lotto, type Postazione, type Strada, LATO_NORMALE, PUNTI, STRADE, axisPoint, computeLayout, lati, rotFromNormal,
} from './layout'

/*
 * Assemblaggio della scena: strade, casette, punti di interesse, decorazioni e plinto.
 * Tutta la geometria statica finisce in un unico Builder (fusa per materiale);
 * le ante dei portoni restano separate per poterle evidenziare.
 */

/** direzione orizzontale verso la telecamera nella vista generale (azimut 30°) */
const VIEW_DIR: [number, number] = [0.5, 0.866]

export const PLINTH_SOIL = 0.45
export const PLINTH_BASE = 1.5
export const MARKER_HEIGHT = 9.8

export interface StandRender {
  stand: Postazione
  doorParts: BuiltPart[]
  origin: [number, number]
  normal: [number, number]
  rotY: number
  plaque: { pos: V3; size: number } | null
  marker: V3
  strada: Strada
}

export interface Label {
  text: string
  pos: V3
  rotY: number
  size: number
  color: string
  /** testo disteso a terra lungo la strada (angolo nel piano) */
  ground?: number
  font?: 'serif' | 'sans'
}

export interface HitBox {
  id?: string
  center: V3
  size: V3
  rotY: number
}

export interface SceneData {
  parts: BuiltPart[]
  hitBoxes: HitBox[]
  stands: StandRender[]
  labels: Label[]
  outline: [number, number][]
  bounds: { x0: number; x1: number; z0: number; z1: number }
  fitPoints: V3[]
}

type Rect = { x0: number; x1: number; z0: number; z1: number }

const expand = (r: Rect, m: number): Rect => ({ x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m })
const inside = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
const union = (a: Rect, b: Rect): Rect => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) })

/** Rettangolo (in coordinate mondo) di un'area locale [x0,x1] x [z0,z1] posta in `origin` con rotazione `rotY`. */
function worldRect(origin: [number, number], rotY: number, x0: number, x1: number, z0: number, z1: number): Rect {
  const c = Math.cos(rotY), s = Math.sin(rotY)
  const xs: number[] = [], zs: number[] = []
  for (const x of [x0, x1])
    for (const z of [z0, z1]) {
      xs.push(origin[0] + x * c + z * s)
      zs.push(origin[1] - x * s + z * c)
    }
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) }
}

/** Progressiva lungo la strada degli estremi locali x0, x1 di un lotto. */
function lotSpan(l: Lotto, x0: number, x1: number): [number, number] {
  const lx = [Math.cos(l.rotY), -Math.sin(l.rotY)]
  const sgn = Math.sign(lx[0] * l.strada.dir[0] + lx[1] * l.strada.dir[1]) || 1
  const a = l.p + sgn * x0, b = l.p + sgn * x1
  return [Math.min(a, b), Math.max(a, b)]
}

/** Strada da cui `s` si dirama (se parte dal bordo di un'altra). */
function parentOf(s: Strada) {
  for (const t of STRADE) {
    if (t === s) continue
    const rel = [s.a[0] - t.a[0], s.a[1] - t.a[1]]
    const along = rel[0] * t.dir[0] + rel[1] * t.dir[1]
    const across = Math.abs(rel[0] * -t.dir[1] + rel[1] * t.dir[0])
    if (along >= 0 && along <= t.len && Math.abs(across - t.larghezza / 2) < 0.6) return { t, along }
  }
  return null
}

/** Strade che si diramano da `s` sul lato indicato, con la loro progressiva su `s`. */
function branchesOn(s: Strada, lato: Lato) {
  const out: { t: Strada; along: number }[] = []
  for (const t of STRADE) {
    const p = parentOf(t)
    if (!p || p.t !== s) continue
    const n = LATO_NORMALE[lato]
    if (t.dir[0] * n[0] + t.dir[1] * n[1] < -0.5) out.push({ t, along: p.along })
  }
  return out
}

function buildStreet(b: Builder, s: Strada, blockers: Rect[]) {
  const road = s.larghezza - 2 * s.marciapiede
  const parent = parentOf(s)
  const ext = parent ? parent.t.marciapiede : 0
  const rot = Math.atan2(-s.dir[1], s.dir[0])
  // con X locale lungo la strada, la Z locale nel mondo è (sin rot, cos rot)
  const lz = [Math.sin(rot), Math.cos(rot)]
  b.at([s.a[0], 0, s.a[1]], rot, () => {
    const L = s.len + ext
    const cx = (s.len - ext) / 2
    b.boxOn(M.planar('#ffffff', 'cobble', 4), [L, 0.06, road], [cx, 0, 0])
    for (const k of [-1, 1]) b.boxOn(M.planar(C.track, 'slab', 3), [L, 0.075, 0.46], [cx, 0, k * 0.74])
    for (const lato of lati(s)) {
      const n = LATO_NORMALE[lato]
      const sg = Math.sign(-n[0] * lz[0] + -n[1] * lz[1])
      const gaps = branchesOn(s, lato).map(({ t, along }) => {
        const r = t.larghezza - 2 * t.marciapiede
        return [along - r / 2, along + r / 2] as [number, number]
      })
      const segs: [number, number][] = []
      let cur = 0
      for (const [g0, g1] of gaps.sort((a, b) => a[0] - b[0])) {
        if (g0 > cur) segs.push([cur, g0])
        cur = Math.max(cur, g1)
      }
      if (cur < s.len) segs.push([cur, s.len])
      for (const [p0, p1] of segs) {
        const len = p1 - p0
        const mid = (p0 + p1) / 2
        b.boxOn(M.planar('#ffffff', 'slab', 3), [len, 0.15, s.marciapiede - 0.14], [mid, 0, sg * (road / 2 + 0.14 + (s.marciapiede - 0.14) / 2)])
        b.boxOn(M.stone(C.curb), [len, 0.17, 0.14], [mid, 0, sg * (road / 2 + 0.07)])
      }
    }
  })
  const a = axisPoint(s, -ext), e = axisPoint(s, s.len)
  const hw = s.larghezza / 2
  blockers.push({
    x0: Math.min(a[0], e[0]) - (Math.abs(s.dir[1]) > 0.5 ? hw : 0),
    x1: Math.max(a[0], e[0]) + (Math.abs(s.dir[1]) > 0.5 ? hw : 0),
    z0: Math.min(a[1], e[1]) - (Math.abs(s.dir[0]) > 0.5 ? hw : 0),
    z1: Math.max(a[1], e[1]) + (Math.abs(s.dir[0]) > 0.5 ? hw : 0),
  })
}

function hitBox(origin: [number, number], rotY: number, x0: number, x1: number, z0: number, z1: number, h: number, id?: string): HitBox {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const c = Math.cos(rotY), sn = Math.sin(rotY)
  return {
    id,
    center: [origin[0] + cx * c + cz * sn, h / 2, origin[1] - cx * sn + cz * c],
    size: [x1 - x0, h, z1 - z0],
    rotY,
  }
}

function garden(b: Builder, L: number, seed: number) {
  const w = L - 0.5
  b.boxOn(M.stone(), [w, 0.62, 0.3], [0, 0, -0.2])
  b.boxOn(M.trim(), [w + 0.08, 0.08, 0.38], [0, 0.62, -0.2])
  for (const s of [-1, 1]) {
    b.boxOn(M.stone(C.stoneDark), [0.4, 0.95, 0.4], [s * (w / 2), 0, -0.2])
    b.sphere(M.gold(), 0.1, [s * (w / 2), 1.05, -0.2], 1)
  }
  hedge(b, [-w / 2 + 0.3, -0.8], [w / 2 - 0.3, -0.8], 0.9, 0.6)
  pine(b, [0, 0, -2.3], 3.2, seed, true)
}

export function buildScene(): SceneData {
  const layout = computeLayout()
  const b = new Builder()
  const blockers: Rect[] = []
  const stands: StandRender[] = []
  const labels: Label[] = []
  const fitPoints: V3[] = []
  const hitBoxes: HitBox[] = []
  let bar: Rect | null = null
  let stem: Rect | null = null
  const isBar = (s: Strada) => Math.abs(s.dir[0]) >= Math.abs(s.dir[1])

  for (const s of STRADE) {
    buildStreet(b, s, blockers)
    // nome della via scritto sul selciato, a metà del tratto più lungo libero da postazioni
    const at = isBar(s) ? s.len * 0.24 : s.len * 0.55
    const c = axisPoint(s, at)
    // spostato nella metà di carreggiata che resta visibile dalla vista generale
    const vis = lati(s).find((l) => LATO_NORMALE[l][0] * VIEW_DIR[0] + LATO_NORMALE[l][1] * VIEW_DIR[1] > 0)!
    const off = (s.larghezza - 2 * s.marciapiede) * 0.2
    labels.push({
      text: s.nome.toUpperCase(),
      pos: [c[0] - LATO_NORMALE[vis][0] * off, 0.085, c[1] - LATO_NORMALE[vis][1] * off],
      rotY: 0,
      size: 1.25,
      color: '#7a6347',
      ground: Math.atan2(-s.dir[1], s.dir[0]),
      font: 'serif',
    })
  }

  // ---- casette
  for (const l of layout.lotti) {
    let rect: Rect
    if (l.kind === 'stand') {
      const st = l.stand!
      const model = st.casetta.modello
      const fp = STAND_FOOTPRINT[model]
      rect = worldRect(l.origin, l.rotY, fp.x0, fp.x1, -fp.d, 0.6)
      hitBoxes.push(hitBox(l.origin, l.rotY, fp.x0, fp.x1, -fp.d, 1.4, STAND_BODY[model].eave + 2.4, st.id))
      const render: StandRender = {
        stand: st,
        doorParts: [],
        origin: l.origin,
        normal: l.normal,
        rotY: l.rotY,
        plaque: null,
        // il segnaposto sta sopra il tetto della propria casetta (non sulla strada),
        // così non si sovrappone alle case del lato opposto
        marker: [l.origin[0] - l.normal[0] * fp.d * 0.42, MARKER_HEIGHT, l.origin[1] - l.normal[1] * fp.d * 0.42],
        strada: l.strada,
      }
      if (!st.modello3d) {
        const door = new Builder()
        b.link(door)
        b.at([l.origin[0], 0, l.origin[1]], l.rotY, () => {
          const info = STAND_MODELS[model](b, {
            wall: (MURI as Record<string, string>)[st.casetta.muro] ?? st.casetta.muro,
            door: (PORTONI as Record<string, string>)[st.casetta.portone] ?? st.casetta.portone,
            enamel: st.categoria === 'evento' ? C.pineDark : st.categoria === 'associazione' ? C.goldDeep : C.redDark,
            doorBuilder: door,
          })
          render.plaque = { pos: b.toWorld(info.plaque), size: info.plaqueSize }
          render.marker[1] = info.top + 1.5
        })
        b.unlink(door)
        render.doorParts = door.build()
      }
      stands.push(render)
    } else if (l.kind === 'landmark') {
      // edificio senza numero (es. campanile): stesso modello delle casette, portone non interattivo
      const m = l.monumento!
      const fp = STAND_FOOTPRINT[m.modello]
      rect = worldRect(l.origin, l.rotY, fp.x0, fp.x1, -fp.d, 0.6)
      let top = 8.5
      b.at([l.origin[0], 0, l.origin[1]], l.rotY, () => {
        top = STAND_MODELS[m.modello](b, {
          wall: (MURI as Record<string, string>)[m.muro] ?? m.muro,
          door: (PORTONI as Record<string, string>)[m.portone] ?? m.portone,
          enamel: C.redDark,
          numbered: false,
        }).top
      })
      hitBoxes.push(hitBox(l.origin, l.rotY, fp.x0, fp.x1, -fp.d, 0, top))
      fitPoints.push([l.origin[0], top, l.origin[1]])
    } else if (l.kind === 'filler') {
      const f = l.filler!
      rect = worldRect(l.origin, l.rotY, -f.w / 2, f.w / 2, -f.d, 0.3)
      hitBoxes.push(hitBox(l.origin, l.rotY, -f.w / 2, f.w / 2, -f.d, 0, fillerEave(f) + 1.6))
      b.at([l.origin[0], 0, l.origin[1]], l.rotY, () => fillerHouse(b, f))
    } else {
      const L = l.span[1] - l.span[0]
      rect = worldRect(l.origin, l.rotY, -L / 2, L / 2, -3.6, 0.2)
      b.at([l.origin[0], 0, l.origin[1]], l.rotY, () => garden(b, L, Math.round(l.p * 10)))
    }
    blockers.push(rect)
    if (isBar(l.strada)) bar = bar ? union(bar, rect) : rect
    else stem = stem ? union(stem, rect) : rect
    const top = l.kind === 'garden' ? 3.5 : 8.5
    for (const [x, z] of [[rect.x0, rect.z0], [rect.x1, rect.z0], [rect.x0, rect.z1], [rect.x1, rect.z1]]) fitPoints.push([x, top, z])
  }

  // ---- punti di interesse
  const FACING: Record<Lato, [number, number]> = { nord: [0, -1], sud: [0, 1], est: [1, 0], ovest: [-1, 0] }
  for (const poi of PUNTI) {
    const rot = rotFromNormal(FACING[poi.orientamento])
    const o = poi.posizione
    let rect: Rect
    if (poi.tipo === 'chiesa') {
      b.at([o[0], 0, o[1]], rot, () => {
        const info = church(b)
        fitPoints.push(b.toWorld([6.2, info.top, -4.7]))
        // sagrato con il grande albero
        b.boxOn(M.planar('#ffffff', 'slab', 3), [23.5, 0.05, 9.5], [0, 0, -3.25])
        bigTree(b, [-8.3, 0.05, -3.0], 8.6)
        bench(b, [-8.4, 0.05, 1.0], 0.15)
        bench(b, [9.4, 0.05, -1.2], -0.6)
        lamp(b, [-5.4, 0.05, 1.0])
        lamp(b, [5.4, 0.05, 1.0])
        fitPoints.push(b.toWorld([-8.3, 10, -3]))
      })
      rect = worldRect(o, rot, -11.8, 11.8, -12.4, 1.6)
      hitBoxes.push(hitBox(o, rot, -4.6, 4.6, -12, 0, 10))
      hitBoxes.push(hitBox(o, rot, 4.6, 7.6, -4.7, -1.7, 12.2))
    } else {
      b.at([o[0], 0, o[1]], rot, () => {
        const pl = kiosk(b)
        labels.push({ text: 'WC', pos: b.toWorld(pl), rotY: rot, size: 0.3, color: '#f6efe2' })
      })
      rect = worldRect(o, rot, -1.9, 1.9, -2.8, 0.5)
      hitBoxes.push(hitBox(o, rot, -1.8, 1.8, -2.7, 0, 3.8))
    }
    blockers.push(rect)
    stem = stem ? union(stem, rect) : rect
  }

  // ---- lampioni e luminarie
  const rnd = seeded(77)
  for (const s of STRADE) {
    const road = s.larghezza - 2 * s.marciapiede
    const doors = (lato: Lato) => layout.stands.filter((l) => l.strada === s && l.lato === lato).map((l) => l.p)
    const blockedP = (lato: Lato, p: number) =>
      branchesOn(s, lato).some(({ t, along }) => Math.abs(p - along) < t.larghezza / 2 + 0.8) ||
      (parentOf(s) !== null && p < 1.2)
    lati(s).forEach((lato, i) => {
      const n = LATO_NORMALE[lato]
      const step = isBar(s) ? 12 : 10
      for (let p = 5 + i * (step / 2); p < s.len - 1.5; p += step) {
        let q = p
        const near = doors(lato).find((d) => Math.abs(d - q) < 2.4)
        if (near !== undefined) q = near + Math.sign(q - near || 1) * 2.6
        if (blockedP(lato, q) || q > s.len - 1) continue
        const ax = axisPoint(s, q)
        lamp(b, [ax[0] - n[0] * (road / 2 + 0.32), 0.15, ax[1] - n[1] * (road / 2 + 0.32)])
      }
    })
    // luminarie tra le facciate opposte
    const [l1, l2] = lati(s)
    const eaveAt = (lato: Lato, p: number) => {
      for (const l of layout.occupati.get(`${s.id}:${lato}`) ?? []) {
        if (l.kind === 'garden') continue
        let span: [number, number], eave: number
        if (l.kind === 'stand' || l.kind === 'landmark') {
          const body = STAND_BODY[l.stand ? l.stand.casetta.modello : l.monumento!.modello]
          span = lotSpan(l, body.x0, body.x1)
          eave = body.eave
        } else {
          span = l.span
          eave = fillerEave(l.filler!)
        }
        if (p > span[0] + 0.6 && p < span[1] - 0.6) return eave
      }
      return null
    }
    let k = 0
    const step = isBar(s) ? 8.5 : 8
    for (let p = isBar(s) ? 6 : 10; p < s.len - 2; p += step) {
      const e1 = eaveAt(l1, p), e2 = eaveAt(l2, p)
      if (e1 === null || e2 === null) continue
      const h = Math.min(5.2, Math.max(3.25, Math.min(e1, e2) - 0.5))
      const ax = axisPoint(s, p)
      const n1 = LATO_NORMALE[l1], n2 = LATO_NORMALE[l2]
      const hw = s.larghezza / 2 - 0.05
      lightString(
        b,
        [ax[0] - n1[0] * hw, h, ax[1] - n1[1] * hw],
        [ax[0] - n2[0] * hw, h + (rnd() - 0.5) * 0.1, ax[1] - n2[1] * hw],
        0.55,
        k++ % 2 === 0,
        Math.PI / 6,
      )
    }
  }

  // ---- biciclette decorative appoggiate ad alcune case di contorno
  const fillers = layout.lotti.filter((l) => l.kind === 'filler')
  const bikeColors = ['#e4d6b8', C.red, '#3f6d5a']
  const picks = [
    fillers.find((l) => l.strada.id === STRADE[0].id && l.lato === lati(STRADE[0])[0]),
    fillers.find((l) => l.strada.id !== STRADE[0].id),
    fillers.filter((l) => l.strada.id === STRADE[0].id && l.lato === lati(STRADE[0])[1])[1],
  ]
  picks.forEach((l, i) => {
    if (!l) return
    const f = l.filler!
    const x = (f.doorX > 0 ? -1 : 1) * Math.min(1.7, f.w / 2 - 1.1)
    b.at([l.origin[0], 0.15, l.origin[1]], l.rotY, () => bicycle(b, [x, 0, 0.42], 0, bikeColors[i % bikeColors.length]))
  })

  // ---- plinto a T
  if (!bar || !stem) throw new Error('Il percorso deve avere una strada principale e una diramazione')
  const main = STRADE.find(isBar)!
  const barR: Rect = {
    x0: Math.min(main.a[0], main.b[0]),
    x1: Math.max(main.a[0], main.b[0]),
    z0: bar.z0 - 1.3,
    z1: bar.z1 + 3.0,
  }
  const stemR: Rect = { x0: stem.x0 - 1.4, x1: stem.x1 + 1.4, z0: stem.z0 - 1.6, z1: barR.z0 }
  const outline = tOutline(barR, stemR)
  for (const [x, z] of outline) {
    fitPoints.push([x, 0, z])
    fitPoints.push([x, -(PLINTH_SOIL + PLINTH_BASE), z])
  }

  // ---- vegetazione sparsa negli spazi liberi
  const veg = seeded(2024)
  const free = (x: number, z: number) =>
    (inside(expand(barR, -0.9), x, z) || inside(expand(stemR, -0.9), x, z)) && !blockers.some((r) => inside(expand(r, 0.7), x, z))
  const STEP = 2.3
  for (let x = Math.min(barR.x0, stemR.x0); x <= Math.max(barR.x1, stemR.x1); x += STEP)
    for (let z = stemR.z0; z <= barR.z1; z += STEP) {
      const px = x + (veg() - 0.5) * 1.2, pz = z + (veg() - 0.5) * 1.2
      if (!free(px, pz)) continue
      const r = veg()
      if (r < 0.42) pine(b, [px, 0, pz], 2.2 + veg() * 2.2, Math.floor(veg() * 100))
      else if (r < 0.66) shrub(b, [px, 0, pz], 0.45 + veg() * 0.35, Math.floor(veg() * 100))
    }

  const all = [barR, stemR].reduce(union)
  return { parts: b.build(), hitBoxes, stands, labels, outline, bounds: all, fitPoints }
}

/** Contorno a T (unione di due rettangoli, il secondo appoggiato sul lato nord del primo) con angoli arrotondati. */
function tOutline(a: Rect, s: Rect): [number, number][] {
  const pts: [number, number][] = [
    [a.x0, a.z1], [a.x0, a.z0], [s.x0, a.z0], [s.x0, s.z0], [s.x1, s.z0], [s.x1, a.z0], [a.x1, a.z0], [a.x1, a.z1],
  ]
  return roundCorners(pts, 1.4, 6)
}

function roundCorners(pts: [number, number][], r: number, seg: number): [number, number][] {
  const out: [number, number][] = []
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n], v = pts[i], q = pts[(i + 1) % n]
    const d1 = norm([p[0] - v[0], p[1] - v[1]]), d2 = norm([q[0] - v[0], q[1] - v[1]])
    const c: [number, number] = [v[0] + (d1[0] + d2[0]) * r, v[1] + (d1[1] + d2[1]) * r]
    for (let k = 0; k <= seg; k++) {
      const t = (k / seg) * (Math.PI / 2)
      out.push([c[0] - d2[0] * r * Math.cos(t) - d1[0] * r * Math.sin(t), c[1] - d2[1] * r * Math.cos(t) - d1[1] * r * Math.sin(t)])
    }
  }
  return out
}

function norm(v: [number, number]): [number, number] {
  const l = Math.hypot(v[0], v[1])
  return [v[0] / l, v[1] / l]
}

export function outlineShape(outline: [number, number][]) {
  // lo Shape vive nel piano XY: y = -z, poi viene ruotato di -90° attorno a X
  return new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
}

