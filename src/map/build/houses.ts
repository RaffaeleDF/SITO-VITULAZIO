import * as THREE from 'three'
import { Builder, type V3, seeded, starShape } from './builder'
import { C, M, MURI } from './materials'
import {
  awning, balcony, band, banner, chimney, column, cornice, gableBody, gableRoof, garland, hipRoof,
  pilasters, plainDoor, plaque, portone, quoins, wallLantern, windowPart, zoccolo,
} from './parts'
import { gifts, potTree } from './props'
import { pine, santa, sleigh } from './decor'

/*
 * Modelli di casetta.
 * Sistema locale: origine al centro del portone, sulla linea di facciata, a quota 0.
 * La facciata principale guarda verso +Z (la strada), il corpo si estende verso -Z.
 */

export type StandModel =
  | 'corte' | 'timpano' | 'bottega' | 'torretta' | 'portico' | 'babbo' | 'oratorio' | 'mostra' | 'sede' | 'campanile'

export interface HouseParams {
  wall: string
  door: string
  /** colore smaltato della targa con il numero */
  enamel: string
  /** builder delle parti interattive del portone */
  doorBuilder?: Builder
  /** false per gli edifici senza numero (niente targa) */
  numbered?: boolean
}

export interface HouseInfo {
  /** posizione locale della faccia della targa, dove va scritto il numero */
  plaque: V3
  plaqueSize: number
  /** altezza massima del modello */
  top: number
}

/** Ingombro in pianta relativo al portone: x da x0 a x1, profondità d. */
export interface Footprint {
  x0: number
  x1: number
  d: number
}

export const STAND_FOOTPRINT: Record<StandModel, Footprint> = {
  corte: { x0: -3.6, x1: 3.6, d: 6.6 },
  timpano: { x0: -3.0, x1: 3.0, d: 7.0 },
  bottega: { x0: -3.3, x1: 3.3, d: 6.2 },
  torretta: { x0: -2.8, x1: 2.8, d: 6.0 },
  portico: { x0: -3.4, x1: 3.4, d: 6.4 },
  babbo: { x0: -9.0, x1: 3.3, d: 6.4 },
  oratorio: { x0: -7.6, x1: 3.2, d: 8.6 },
  mostra: { x0: -3.8, x1: 3.8, d: 6.6 },
  sede: { x0: -3.4, x1: 3.4, d: 7.0 },
  campanile: { x0: -2.1, x1: 2.1, d: 4.2 },
}

/** Parte edificata (senza cortili) e quota di gronda: servono per agganciare le luminarie. */
export const STAND_BODY: Record<StandModel, { x0: number; x1: number; eave: number }> = {
  corte: { x0: -3.6, x1: 3.6, eave: 6.85 },
  timpano: { x0: -3.0, x1: 3.0, eave: 6.6 },
  bottega: { x0: -3.3, x1: 3.3, eave: 4.45 },
  torretta: { x0: -2.8, x1: 2.8, eave: 6.55 },
  portico: { x0: -3.4, x1: 3.4, eave: 5.6 },
  babbo: { x0: -3.3, x1: 3.3, eave: 4.4 },
  oratorio: { x0: -3.2, x1: 3.2, eave: 6.4 },
  mostra: { x0: -3.8, x1: 3.8, eave: 6.9 },
  sede: { x0: -3.4, x1: 3.4, eave: 7.1 },
  campanile: { x0: -2.1, x1: 2.1, eave: 8.6 },
}

export const fillerEave = (f: FillerSpec) => (f.floors === 2 ? 5.9 : 3.5)

const HP = Math.PI / 2
const deg = (d: number) => (d * Math.PI) / 180

/** Applica `fn` su ciascun lato: retro (z = -d) e fianchi (x = ±w/2), con l'origine al centro del lato. */
function onBack(b: Builder, d: number, fn: () => void) {
  b.at([0, 0, -d], Math.PI, fn)
}
function onSide(b: Builder, side: -1 | 1, w: number, d: number, fn: () => void) {
  b.at([(side * w) / 2, 0, -d / 2], side * HP, fn)
}
function win(b: Builder, x: number, y: number, o: Parameters<typeof windowPart>[1]) {
  b.at([x, y, 0], 0, () => windowPart(b, o))
}

// ---------------------------------------------------------------------------

function corte(b: Builder, p: HouseParams): HouseInfo {
  const w = 7.2, d = 6.6, G = 3.95, H = G + 2.9, pitch = deg(27)
  gableBody(b, p.wall, w, d, H, pitch, 'x')
  zoccolo(b, w, d, 0.55)
  quoins(b, w, d, 0.55, H - 0.2)
  band(b, w, d, G)
  cornice(b, w, d, H, false)
  const top = portone(b, { w: 2.3, h: 3.05, rise: 1.15, color: p.door, studs: true, lanterns: true, door: p.doorBuilder })
  const pl = plaque(b, [0, top + 0.3, 0.02], 0.83, 0.47, p.enamel)
  for (const s of [-1, 1]) win(b, s * 2.55, 1.8, { w: 0.85, h: 1.2, grille: true })
  for (const x of [-2.2, 0, 2.2]) win(b, x, G + 1.35, { w: 0.85, h: 1.45, shutters: true, lit: x === 0, flowers: x !== 0 })
  const ridge = gableRoof(b, { span: d, length: w, eaveY: H, pitch, axis: 'x', center: [0, -d / 2] })
  chimney(b, [2.0, H + 0.6, -d * 0.74], 1.7, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.1, 2.3, C.wood)
    for (const x of [-2.2, 2.2]) win(b, x, 1.8, { w: 0.8, h: 1.1 })
    for (const x of [-2.2, 0, 2.2]) win(b, x, G + 1.35, { w: 0.8, h: 1.35, shutters: true, lit: x === 2.2 })
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      win(b, 0, G + 1.35, { w: 0.75, h: 1.3, shutters: true })
      win(b, 0, H + 0.75, { w: 0.5, h: 0.5, sill: false })
    })
  return { plaque: pl, plaqueSize: 0.38, top: ridge + 0.6 }
}

function timpano(b: Builder, p: HouseParams): HouseInfo {
  const w = 6.0, d = 7.0, G = 3.85, H = G + 2.75, pitch = deg(32)
  const apex = gableBody(b, p.wall, w, d, H, pitch, 'z')
  zoccolo(b, w, d, 0.5)
  pilasters(b, w, d, 0.5, H)
  band(b, w, d, G, 0.14, 0.06)
  for (const z of [0, -d]) b.box(M.trim(), [w + 0.36, 0.2, 0.3], [0, H - 0.04, z])
  for (const x of [-w / 2, w / 2]) b.box(M.trim(), [0.3, 0.2, d + 0.36], [x, H - 0.04, -d / 2])
  const ridge = gableRoof(b, { span: w, length: d, eaveY: H + 0.06, pitch, axis: 'z', center: [0, -d / 2], gableOverhang: 0.38 })
  const oculus = (z: number, flip: boolean) =>
    b.at([0, H + (apex - H) * 0.42, z], flip ? Math.PI : 0, () => {
      b.add(M.trim(), new THREE.TorusGeometry(0.36, 0.08, 6, 20), [0, 0, 0.04])
      b.cyl(M.glass(true), 0.34, 0.34, 0.04, 20, [0, 0, 0], [HP, 0, 0])
      b.box(M.trim(), [0.68, 0.04, 0.04], [0, 0, 0.04])
      b.box(M.trim(), [0.04, 0.68, 0.04], [0, 0, 0.04])
    })
  oculus(0, false)
  oculus(-d, true)
  const top = portone(b, { w: 2.2, h: 3.0, rise: 0.5, color: p.door, lanterns: false, festoon: true, door: p.doorBuilder })
  const pl = plaque(b, [0, top + 0.3, 0.02], 0.78, 0.45, p.enamel)
  for (const s of [-1, 1]) win(b, s * 2.05, 1.75, { w: 0.68, h: 1.1, grille: true })
  for (const s of [-1, 1]) win(b, s * 1.3, G + 1.3, { w: 0.84, h: 1.45, shutters: true, lit: s === 1, flowers: true })
  chimney(b, [-1.6, H + 0.5, -d * 0.7], 1.6, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.0, 2.2, C.wood)
    for (const s of [-1, 1]) win(b, s * 1.4, G + 1.3, { w: 0.8, h: 1.35, shutters: true })
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      for (const x of [-1.6, 1.6]) win(b, x, G + 1.3, { w: 0.78, h: 1.35, shutters: true, lit: x > 0 && s > 0 })
      win(b, 0, 1.8, { w: 0.78, h: 1.1, grille: true })
    })
  return { plaque: pl, plaqueSize: 0.35, top: ridge }
}

function bottega(b: Builder, p: HouseParams): HouseInfo {
  const w = 6.6, d = 6.2, H = 4.45, pitch = deg(27)
  zoccolo(b, w, d, 0.45)
  b.boxOn(M.wall(p.wall), [w, H, d], [0, 0, -d / 2])
  pilasters(b, w, d, 0.45, H - 0.3, C.trim)
  cornice(b, w, d, H)
  portone(b, { w: 2.3, h: 3.0, rise: 0, transom: true, color: p.door, door: p.doorBuilder, frameW: 0.26 })
  // insegna in legno con la targa
  b.box(M.wood(C.woodDark), [3.0, 0.52, 0.08], [0, 3.66, 0.05])
  b.box(M.gold(), [3.06, 0.04, 0.1], [0, 3.94, 0.05])
  b.box(M.gold(), [3.06, 0.04, 0.1], [0, 3.38, 0.05])
  const pl = plaque(b, [0, 3.66, 0.1], 0.78, 0.45, p.enamel)
  for (const s of [-1, 1]) {
    b.at([s * 2.2, 1.6, 0], 0, () => {
      windowPart(b, { w: 1.2, h: 1.7, lit: true, frame: p.door })
      awning(b, 1.75, 0.85, 1.42, s < 0 ? C.red : C.pine, C.white)
    })
  }
  const ridge = hipRoof(b, { w, d, eaveY: H, pitch, center: [0, -d / 2] })
  chimney(b, [-1.9, H + 0.4, -d * 0.62], 1.3, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.0, 2.2, C.wood)
    for (const x of [-2.1, 2.1]) win(b, x, 1.9, { w: 0.85, h: 1.15, shutters: true })
  })
  for (const s of [-1, 1] as const) onSide(b, s, w, d, () => win(b, 0, 1.9, { w: 0.85, h: 1.15, shutters: true, lit: s > 0 }))
  return { plaque: pl, plaqueSize: 0.35, top: ridge }
}

function torretta(b: Builder, p: HouseParams): HouseInfo {
  const w = 5.6, d = 6.0, G = 3.7, H = G + 2.85, pitch = deg(30)
  zoccolo(b, w, d, 0.5)
  b.boxOn(M.wall(p.wall), [w, H, d], [0, 0, -d / 2])
  quoins(b, w, d, 0.5, H - 0.3)
  band(b, w, d, G - 0.05)
  cornice(b, w, d, H)
  portone(b, { w: 2.1, h: 2.85, rise: 1.05, color: p.door, door: p.doorBuilder, lanterns: false, studs: true })
  balcony(b, 2.7, 0.9, G)
  b.at([0, G + 1.12, 0], 0, () => windowPart(b, { w: 1.0, h: 2.0, shutters: true, lit: true, sill: false }))
  const pl = plaque(b, [0, G + 0.6, 0.86], 0.78, 0.42, p.enamel)
  garland(b, [[-1.35, G + 0.98, 0.88], [-0.7, G + 0.72, 0.92], [0, G + 0.66, 0.93], [0.7, G + 0.72, 0.92], [1.35, G + 0.98, 0.88]], 0.07)
  for (const s of [-1, 1]) {
    win(b, s * 1.9, 1.7, { w: 0.62, h: 1.05, grille: true })
    win(b, s * 1.9, G + 1.3, { w: 0.62, h: 1.3, flowers: true })
  }
  const ridge = hipRoof(b, { w, d, eaveY: H, pitch, center: [0, -d / 2] })
  chimney(b, [1.5, H + 0.6, -d * 0.66], 1.5, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.0, 2.2, C.wood)
    for (const x of [-1.5, 1.5]) win(b, x, G + 1.3, { w: 0.8, h: 1.35, shutters: true, lit: x < 0 })
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      win(b, 0, G + 1.3, { w: 0.78, h: 1.35, shutters: true })
      win(b, 0, 1.75, { w: 0.7, h: 1.05, grille: true })
    })
  return { plaque: pl, plaqueSize: 0.33, top: ridge }
}

function portico(b: Builder, p: HouseParams): HouseInfo {
  const w = 6.8, d = 6.4, H = 5.6, pitch = deg(30)
  gableBody(b, p.wall, w, d, H, pitch, 'x')
  zoccolo(b, w, d, 0.5)
  pilasters(b, w, d, 0.5, H)
  cornice(b, w, d, H, false)
  portone(b, { w: 2.1, h: 2.8, rise: 1.05, color: p.door, door: p.doorBuilder, studs: true, keystone: true })
  // portico su due colonne
  const cz = 1.2, ch = 3.35
  b.boxOn(M.stone(C.stoneDark), [4.3, 0.12, 1.5], [0, 0, 0.72])
  for (const s of [-1, 1]) {
    column(b, [s * 1.8, 0.12, cz], ch)
    b.box(M.wood(C.woodDark), [0.22, 0.24, cz], [s * 1.8, 3.4, cz / 2])
  }
  b.box(M.wood(C.woodDark), [4.2, 0.3, 0.34], [0, 3.6, cz])
  const slope = Math.atan2(0.45, 1.55)
  b.box(M.roof(), [4.7, 0.14, Math.hypot(1.55, 0.45)], [0, 4.0, 0.76], [slope, 0, 0])
  b.box(M.ridge(), [4.7, 0.12, 0.16], [0, 4.26, 0.04])
  const pl = plaque(b, [0, 3.6, cz + 0.17], 0.73, 0.42, p.enamel)
  garland(b, [[-2.0, 3.78, cz + 0.2], [-1.1, 3.42, cz + 0.26], [-0.45, 3.36, cz + 0.26]], 0.07)
  garland(b, [[0.45, 3.36, cz + 0.26], [1.1, 3.42, cz + 0.26], [2.0, 3.78, cz + 0.2]], 0.07)
  for (const s of [-1, 1]) {
    win(b, s * 2.55, 1.75, { w: 0.68, h: 1.1, shutters: false, grille: true })
    win(b, s * 1.55, 4.8, { w: 0.62, h: 0.62, lit: s > 0 })
  }
  const ridge = gableRoof(b, { span: d, length: w, eaveY: H, pitch, axis: 'x', center: [0, -d / 2] })
  chimney(b, [-2.1, H + 0.5, -d * 0.72], 1.5, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.0, 2.2, C.wood)
    for (const x of [-2.2, 2.2]) win(b, x, 1.8, { w: 0.8, h: 1.1, shutters: true })
    for (const x of [-1.4, 1.4]) win(b, x, 4.6, { w: 0.7, h: 0.8, lit: x > 0 })
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      win(b, 0, 1.8, { w: 0.78, h: 1.1, shutters: true })
      b.at([0, H + 0.9, 0], 0, () => {
        b.add(M.trim(), new THREE.TorusGeometry(0.3, 0.07, 6, 18), [0, 0, 0.04])
        b.cyl(M.glass(false), 0.29, 0.29, 0.04, 18, [0, 0, 0], [HP, 0, 0])
      })
    })
  return { plaque: pl, plaqueSize: 0.33, top: ridge }
}

function babbo(b: Builder, p: HouseParams): HouseInfo {
  const w = 6.6, d = 6.4, H = 4.4, pitch = deg(40)
  const apex = gableBody(b, p.wall, w, d, H, pitch, 'z')
  zoccolo(b, w, d, 0.5, C.stone)
  pilasters(b, w, d, 0.5, H, C.white)
  for (const z of [0, -d]) b.box(M.trim(C.white), [w + 0.36, 0.2, 0.3], [0, H - 0.04, z])
  const ridge = gableRoof(b, { span: w, length: d, eaveY: H + 0.06, pitch, axis: 'z', center: [0, -d / 2], snow: true, barge: C.white })
  const top = portone(b, { w: 2.1, h: 2.85, rise: 1.05, color: p.door, door: p.doorBuilder, lanterns: true, festoon: true, studs: true })
  const pl = plaque(b, [0, top + 0.32, 0.02], 0.78, 0.45, p.enamel)
  for (const s of [-1, 1]) win(b, s * 2.15, 1.75, { w: 0.72, h: 1.15, shutters: false, lit: true, flowers: true })
  const gableWin = (z: number, flip: boolean) =>
    b.at([0, H + (apex - H) * 0.38, z], flip ? Math.PI : 0, () => windowPart(b, { w: 0.8, h: 0.95, arch: true, lit: true, shutters: true, shutterColor: C.red }))
  gableWin(0, false)
  gableWin(-d, true)
  // abeti in vaso ai lati del portone
  for (const s of [-1, 1]) potTree(b, [s * 1.95, 0, 0.6], 0.85)
  gifts(b, [1.35, 0, 0.75], 3, 0.8)
  const ch = H + 1.6
  chimney(b, [1.7, ch, -d * 0.7], 1.5, p.wall)
  b.boxOn(M.matte(C.white), [0.84, 0.14, 0.84], [1.7, ch + 1.62, -d * 0.7])
  onBack(b, d, () => {
    for (const s of [-1, 1]) win(b, s * 1.6, 1.8, { w: 0.82, h: 1.15, shutters: true, shutterColor: C.red, lit: true })
    garland(b, [[-2.6, H - 0.35, 0.1], [-1.3, H - 0.75, 0.16], [0, H - 0.85, 0.18], [1.3, H - 0.75, 0.16], [2.6, H - 0.35, 0.1]], 0.08)
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      for (const x of [-1.5, 1.5]) win(b, x, 1.8, { w: 0.8, h: 1.1, shutters: true, shutterColor: C.red, lit: x * s > 0 })
    })
  // cortile con Babbo Natale e la slitta (lato -X locale)
  const fx = -w / 2 - 2.85
  b.boxOn(M.planar('#e8dfcf', 'slab', 3), [5.4, 0.06, 5.6], [fx, 0, -2.8])
  for (const s of [-1, 1]) {
    b.boxOn(M.stone(), [0.3, 0.6, 0.3], [fx + s * 2.6, 0, -0.1])
    b.sphere(M.gold(), 0.09, [fx + s * 2.6, 0.7, -0.1], 1)
  }
  for (let i = 0; i < 9; i++) b.boxOn(M.trim(C.white), [0.07, 0.5, 0.07], [fx - 2.6 + 0.4 + i * 0.6, 0, -5.5])
  b.box(M.trim(C.white), [5.2, 0.06, 0.06], [fx, 0.42, -5.5])
  santa(b, [fx + 0.7, 0.06, -2.1], -2.5)
  sleigh(b, [fx - 1.2, 0.06, -3.9], 2.6)
  pine(b, [fx + 1.8, 0.06, -4.6], 2.6, 5, true)
  gifts(b, [fx - 0.6, 0.06, -1.1], 4, 0.9, 31)
  return { plaque: pl, plaqueSize: 0.35, top: ridge + 0.2 }
}

function oratorio(b: Builder, p: HouseParams): HouseInfo {
  const w = 6.4, d = 8.6, H = 6.4, pitch = deg(28)
  const apex = gableBody(b, p.wall, w, d, H, pitch, 'z')
  zoccolo(b, w, d, 0.6)
  pilasters(b, w, d, 0.6, H)
  for (const s of [-1, 1]) b.box(M.trim(), [0.4, H - 0.6, 0.07], [s * 1.75, 0.6 + (H - 0.6) / 2, 0.035])
  for (const z of [0, -d]) b.box(M.trim(), [w + 0.4, 0.24, 0.34], [0, H - 0.02, z])
  for (const x of [-w / 2, w / 2]) b.box(M.trim(), [0.34, 0.24, d + 0.4], [x, H - 0.02, -d / 2])
  const ridge = gableRoof(b, { span: w, length: d, eaveY: H + 0.1, pitch, axis: 'z', center: [0, -d / 2], gableOverhang: 0.4, color: C.roofAlt })
  const top = portone(b, { w: 2.3, h: 3.35, rise: 1.15, color: p.door, door: p.doorBuilder, studs: true, wreath: true })
  const pl = plaque(b, [0, top + 0.3, 0.02], 0.73, 0.4, p.enamel)
  // rosone
  b.at([0, 5.15, 0], 0, () => {
    b.add(M.trim(), new THREE.TorusGeometry(0.64, 0.1, 6, 24), [0, 0, 0.05])
    b.cyl(M.glass(true), 0.62, 0.62, 0.04, 24, [0, 0, 0], [HP, 0, 0])
    for (let i = 0; i < 6; i++) b.box(M.trim(), [1.22, 0.04, 0.05], [0, 0, 0.05], [0, 0, (i * Math.PI) / 6])
    b.cyl(M.trim(), 0.12, 0.12, 0.08, 12, [0, 0, 0.05], [HP, 0, 0])
  })
  // campanile a vela
  b.at([0, apex - 0.3, -0.25], 0, () => {
    const s = new THREE.Shape([
      new THREE.Vector2(-0.8, 0), new THREE.Vector2(0.8, 0), new THREE.Vector2(0.8, 1.55),
      new THREE.Vector2(0, 2.05), new THREE.Vector2(-0.8, 1.55),
    ])
    const hole = new THREE.Path()
    hole.moveTo(-0.36, 0.45)
    hole.lineTo(0.36, 0.45)
    hole.lineTo(0.36, 1.05)
    hole.absarc(0, 1.05, 0.36, 0, Math.PI, false)
    hole.lineTo(-0.36, 0.45)
    s.holes.push(hole)
    b.extrude(M.wall(p.wall), s, 0.36, [0, 0, -0.18])
    b.box(M.trim(), [1.75, 0.12, 0.46], [0, 0.4, 0])
    b.cyl(M.matte(C.bronze), 0.08, 0.26, 0.42, 10, [0, 0.95, 0])
    b.sphere(M.matte(C.bronze), 0.08, [0, 1.17, 0], 0)
    b.box(M.gold(), [0.06, 0.5, 0.06], [0, 2.3, 0])
    b.box(M.gold(), [0.3, 0.06, 0.06], [0, 2.4, 0])
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      for (const x of [-2.2, 2.2]) win(b, x, 3.4, { w: 0.72, h: 1.8, arch: true, lit: true, sill: true })
    })
  onBack(b, d, () => win(b, 0, 3.4, { w: 0.8, h: 1.6, arch: true, lit: true }))
  // corte del presepe (verso -X locale)
  b.at([-w / 2 - 2.35, 0, -2.0], 0, () => capanna(b))
  // muretto della corte
  b.boxOn(M.stone(), [4.3, 0.55, 0.3], [-w / 2 - 2.2, 0, -0.15])
  b.boxOn(M.trim(), [4.4, 0.08, 0.36], [-w / 2 - 2.2, 0.55, -0.15])
  return { plaque: pl, plaqueSize: 0.33, top: Math.max(apex + 1.9, ridge) }
}

/** Capanna del presepe con stella cometa. */
function capanna(b: Builder) {
  const wood = M.wood(C.wood)
  const straw = M.matte('#bf9d62', true)
  for (const x of [-1.5, 1.5])
    for (const z of [-1.3, 0.9]) b.boxOn(wood, [0.16, z > 0 ? 2.0 : 2.45, 0.16], [x, 0, z])
  const slope = Math.atan2(0.45, 2.2)
  b.box(straw, [3.6, 0.22, 2.6], [0, 2.38, -0.2], [slope, 0, 0])
  b.box(wood, [3.3, 0.12, 0.12], [0, 2.05, 0.9])
  b.boxOn(M.matte('#d9c08a'), [3.4, 0.08, 2.6], [0, 0, -0.2])
  // mangiatoia
  b.boxOn(wood, [0.9, 0.4, 0.5], [0, 0.08, -0.3])
  b.boxOn(M.matte('#e7cf8e', true), [0.8, 0.1, 0.42], [0, 0.48, -0.3])
  b.sphere(M.matte(C.white), 0.12, [0, 0.6, -0.3], 1, [1.4, 0.8, 1])
  // figure stilizzate
  figure(b, [-0.85, 0.08, -0.2], '#3e5f8a', '#e9e2d0')
  figure(b, [0.85, 0.08, -0.25], '#7a5a3a', '#c9b48e')
  for (const [x, z] of [[-1.2, 0.5], [1.25, 0.55]] as const) b.boxOn(M.matte('#e2c47a', true), [0.6, 0.35, 0.4], [x, 0.08, z])
  b.at([0, 3.15, 0.95], 0, () => {
    b.extrude(M.gold(), starShape(0.42, 0.18), 0.08, [0, 0, 0], [0, 0, 0], 0.02)
    b.box(M.gold(), [0.9, 0.05, 0.05], [-0.65, -0.12, 0], [0, 0, 0.35])
  })
}

function figure(b: Builder, pos: V3, robe: string, veil: string) {
  const [x, y, z] = pos
  b.cyl(M.matte(robe, true), 0.16, 0.3, 1.0, 8, [x, y + 0.5, z])
  b.sphere(M.matte(C.skin), 0.15, [x, y + 1.12, z], 1)
  b.cyl(M.matte(veil, true), 0.13, 0.2, 0.32, 8, [x, y + 1.17, z - 0.03])
}

function mostra(b: Builder, p: HouseParams): HouseInfo {
  const w = 7.6, d = 6.6, G = 3.95, H = G + 2.95, pitch = deg(26)
  zoccolo(b, w, d, 0.55)
  b.boxOn(M.wall(p.wall), [w, H, d], [0, 0, -d / 2])
  quoins(b, w, d, 0.55, H - 0.3)
  band(b, w, d, G)
  cornice(b, w, d, H)
  const top = portone(b, { w: 2.4, h: 3.1, rise: 1.2, color: p.door, door: p.doorBuilder, studs: true, lanterns: true })
  const pl = plaque(b, [0, top + 0.27, 0.02], 0.83, 0.45, p.enamel)
  for (const s of [-1, 1]) win(b, s * 2.65, 1.8, { w: 0.9, h: 1.25, grille: true, lit: true })
  for (const x of [-2.55, 0, 2.55]) win(b, x, G + 1.25, { w: 0.82, h: 1.3, arch: true, lit: true })
  // stendardi
  for (const s of [-1, 1]) banner(b, [s * 1.3, G + 0.35, 0.1], s < 0 ? C.redDark : C.pineDark)
  const ridge = hipRoof(b, { w, d, eaveY: H, pitch, center: [0, -d / 2] })
  chimney(b, [-2.3, H + 0.6, -d * 0.6], 1.4, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.1, 2.3, C.wood)
    for (const x of [-2.5, 2.5]) win(b, x, 1.8, { w: 0.85, h: 1.15 })
    for (const x of [-2.5, 0, 2.5]) win(b, x, G + 1.3, { w: 0.82, h: 1.35, shutters: true, lit: x < 0 })
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      for (const x of [-1.6, 1.6]) win(b, x, G + 1.3, { w: 0.78, h: 1.35, shutters: true })
    })
  return { plaque: pl, plaqueSize: 0.35, top: ridge }
}

/**
 * Sede dell'associazione: facciata civica con balcone centrale, stendardi
 * e frontone con la stella dorata che sfonda la linea di gronda.
 */
function sede(b: Builder, p: HouseParams): HouseInfo {
  const w = 6.8, d = 7.0, G = 4.15, H = G + 2.95, pitch = deg(25)
  zoccolo(b, w, d, 0.6)
  b.boxOn(M.wall(p.wall), [w, H, d], [0, 0, -d / 2])
  pilasters(b, w, d, 0.6, H)
  band(b, w, d, G, 0.2, 0.09)
  cornice(b, w, d, H)
  const top = portone(b, { w: 2.5, h: 3.15, rise: 1.15, color: p.door, door: p.doorBuilder, studs: true, festoon: true })
  const pl = plaque(b, [0, top + 0.3, 0.02], 0.86, 0.48, p.enamel)
  // balcone d'onore con portafinestra ad arco
  balcony(b, 3.3, 0.95, G)
  b.at([0, G + 1.09, 0], 0, () => windowPart(b, { w: 1.05, h: 1.9, arch: true, lit: true, sill: false }))
  garland(b, [[-1.6, G + 1.05, 0.98], [-0.8, G + 0.78, 1.0], [0, G + 0.72, 1.0], [0.8, G + 0.78, 1.0], [1.6, G + 1.05, 0.98]], 0.07)
  for (const s of [-1, 1]) banner(b, [s * 2.3, G + 0.35, 0.1], C.goldDark)
  for (const s of [-1, 1]) {
    win(b, s * 2.4, 1.75, { w: 0.8, h: 1.2, grille: true, lit: true })
    b.at([s * 2.4, 0, 0], 0, () => wallLantern(b, [0, 2.95, 0]))
  }
  const ridge = hipRoof(b, { w, d, eaveY: H, pitch, center: [0, -d / 2] })
  // frontone: timpano con la stella, a cavallo della gronda
  b.box(M.trim(), [4.9, 0.2, 0.46], [0, H + 0.1, 0.03])
  const tympanum = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(0, 1.2)])
  b.extrude(M.wall(p.wall), tympanum, 0.42, [0, H + 0.2, -0.21])
  b.extrude(M.gold(), starShape(0.32, 0.14), 0.08, [0, H + 0.62, 0.21], [0, 0, 0], 0.025)
  chimney(b, [-2.1, H + 0.5, -d * 0.68], 1.5, p.wall)
  onBack(b, d, () => {
    plainDoor(b, 1.1, 2.3, C.wood)
    for (const x of [-2.3, 2.3]) win(b, x, 1.8, { w: 0.85, h: 1.15 })
    for (const x of [-2.3, 0, 2.3]) win(b, x, G + 1.3, { w: 0.82, h: 1.35, shutters: true, lit: x === 0 })
  })
  for (const s of [-1, 1] as const)
    onSide(b, s, w, d, () => {
      win(b, 0, 1.8, { w: 0.8, h: 1.1, grille: true })
      win(b, 0, G + 1.3, { w: 0.8, h: 1.35, shutters: true, lit: s > 0 })
    })
  return { plaque: pl, plaqueSize: 0.37, top: ridge }
}

/** Campanile con portone alla base, orologio, cella campanaria aperta e stella in cima. */
function campanile(b: Builder, p: HouseParams): HouseInfo {
  const w = 4.2, d = 4.2, shaft = 8.6, cell = 2.7
  // fusto
  zoccolo(b, w, d, 0.7)
  b.boxOn(M.wall(p.wall), [w, shaft, d], [0, 0, -d / 2])
  quoins(b, w, d, 0.7, shaft - 0.2)
  band(b, w, d, 4.3, 0.18, 0.08)
  band(b, w, d, shaft, 0.22, 0.1)
  // portone e targa con il numero
  const top = portone(b, { w: 2.0, h: 2.9, rise: 1.0, color: p.door, door: p.doorBuilder, studs: true, festoon: true })
  const plaquePos: V3 = [0, top + 0.32, 0.02]
  const pl = p.numbered === false ? plaquePos : plaque(b, plaquePos, 0.78, 0.45, p.enamel)
  // orologio sulla facciata
  b.at([0, 6.4, 0], 0, () => {
    b.cyl(M.trim(), 0.62, 0.62, 0.06, 28, [0, 0, 0.03], [HP, 0, 0])
    b.add(M.gold(), new THREE.TorusGeometry(0.62, 0.05, 6, 28), [0, 0, 0.07])
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6
      b.box(M.iron(), [0.04, 0.12, 0.02], [Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0.08], [0, 0, -a])
    }
    b.box(M.iron(), [0.05, 0.4, 0.02], [0, 0.18, 0.1])
    b.box(M.iron(), [0.28, 0.05, 0.02], [0.12, 0, 0.11])
  })
  // finestrelle sul retro e sui fianchi
  onBack(b, d, () => {
    win(b, 0, 2.4, { w: 0.5, h: 1.0, arch: true, sill: false })
    win(b, 0, 6.2, { w: 0.5, h: 1.0, arch: true, sill: false, lit: true })
  })
  for (const s of [-1, 1] as const) onSide(b, s, w, d, () => win(b, 0, 6.2, { w: 0.5, h: 1.0, arch: true, sill: false }))
  // cella campanaria: quattro pareti con un arco aperto
  const y0 = shaft + 0.11
  const faces: [V3, number][] = [[[0, y0, 0], 0], [[0, y0, -d], Math.PI], [[w / 2, y0, -d / 2], HP], [[-w / 2, y0, -d / 2], -HP]]
  for (const [pos, ry] of faces) {
    b.at(pos, ry, () => {
      const wall = new THREE.Shape([
        new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, cell), new THREE.Vector2(-w / 2, cell),
      ])
      const hole = new THREE.Path()
      hole.moveTo(-1.25, 0.25)
      hole.lineTo(1.25, 0.25)
      hole.lineTo(1.25, 1.3)
      hole.absarc(0, 1.3, 1.25, 0, Math.PI, false)
      hole.lineTo(-1.25, 0.25)
      wall.holes.push(hole)
      b.extrude(M.wall(p.wall), wall, 0.35, [0, 0, -0.35])
      b.add(M.trim(), new THREE.TorusGeometry(1.3, 0.07, 5, 18, Math.PI), [0, 1.3, 0.02])
    })
  }
  // campana
  b.box(M.iron(), [w - 0.6, 0.12, 0.12], [0, y0 + 2.1, -d / 2])
  b.cyl(M.matte(C.bronze), 0.16, 0.6, 0.8, 14, [0, y0 + 1.55, -d / 2])
  b.sphere(M.matte(C.bronze), 0.13, [0, y0 + 1.05, -d / 2], 1)
  // cornicione, cuspide e stella
  b.box(M.trim(), [w + 0.5, 0.3, d + 0.5], [0, y0 + cell + 0.15, -d / 2])
  const roofH = 2.6
  b.add(M.roof(C.roofAlt), new THREE.ConeGeometry(w * 0.76, roofH, 4, 1), [0, y0 + cell + 0.3 + roofH / 2, -d / 2], [0, Math.PI / 4, 0])
  const starY = y0 + cell + 0.3 + roofH + 0.65
  b.at([0, starY, -d / 2], Math.PI / 6, () => {
    b.extrude(M.gold(), starShape(0.5, 0.22), 0.1, [0, 0, -0.05], [0, 0, 0], 0.03)
    b.extrude(M.gold(), starShape(0.5, 0.22), 0.1, [-0.05, 0, 0], [0, HP, 0], 0.03)
  })
  return { plaque: pl, plaqueSize: 0.35, top: starY + 0.4 }
}

export const STAND_MODELS: Record<StandModel, (b: Builder, p: HouseParams) => HouseInfo> = {
  corte, timpano, bottega, torretta, portico, babbo, oratorio, mostra, sede, campanile,
}

// ---------------------------------------------------------------------------
// Case di contorno (non interattive), più semplici e dai toni tenui.

export interface FillerSpec {
  w: number
  d: number
  floors: 1 | 2
  roof: 'gx' | 'gz' | 'hip'
  wall: string
  shutter: string
  doorX: number
  seed: number
}

const FILLER_WALLS = [MURI.sabbia, MURI.avorio, MURI.pesca, MURI.crema, MURI.salvia, MURI.beige]
const FILLER_SHUTTERS = [C.shutter, '#7d9a7c', '#8a6a4a', '#5f7f8a']

export function fillerSpec(w: number, seed: number, low = false): FillerSpec {
  const r = seeded(seed)
  const floors: 1 | 2 = low ? (r() < 0.15 ? 2 : 1) : w > 5.4 ? (r() < 0.75 ? 2 : 1) : r() < 0.5 ? 2 : 1
  const roof = (['gx', 'gz', 'hip'] as const)[Math.floor(r() * 3)]
  return {
    w,
    d: 5.4 + r() * 0.9,
    floors,
    roof,
    wall: FILLER_WALLS[Math.floor(r() * FILLER_WALLS.length)],
    shutter: FILLER_SHUTTERS[Math.floor(r() * FILLER_SHUTTERS.length)],
    doorX: (r() - 0.5) * (w - 2.6),
    seed,
  }
}

/** Casa di contorno: origine al centro della facciata. */
export function fillerHouse(b: Builder, f: FillerSpec) {
  const r = seeded(f.seed * 7 + 3)
  const { w, d } = f
  const G = 3.2
  const H = f.floors === 2 ? G + 2.7 : 3.5
  const pitch = deg(26 + r() * 8)
  if (f.roof === 'hip') b.boxOn(M.wall(f.wall), [w, H, d], [0, 0, -d / 2])
  else gableBody(b, f.wall, w, d, H, pitch, f.roof === 'gx' ? 'x' : 'z')
  zoccolo(b, w, d, 0.4)
  if (f.floors === 2) band(b, w, d, G, 0.12, 0.05)
  if (f.roof === 'hip') {
    cornice(b, w, d, H)
    hipRoof(b, { w, d, eaveY: H, pitch, center: [0, -d / 2], color: r() < 0.5 ? C.roof : C.roofWarm })
  } else if (f.roof === 'gx') {
    cornice(b, w, d, H, false)
    gableRoof(b, { span: d, length: w, eaveY: H, pitch, axis: 'x', center: [0, -d / 2], color: r() < 0.5 ? C.roof : C.roofWarm })
  } else {
    for (const z of [0, -d]) b.box(M.trim(), [w + 0.3, 0.18, 0.26], [0, H - 0.04, z])
    gableRoof(b, { span: w, length: d, eaveY: H + 0.05, pitch, axis: 'z', center: [0, -d / 2], color: r() < 0.5 ? C.roof : C.roofAlt })
  }
  const facade = (front: boolean) => {
    const dx = front ? f.doorX : -f.doorX * 0.6
    b.at([dx, 0, 0], 0, () => plainDoor(b, 1.05, 2.3, front ? C.woodDark : C.wood))
    const other = dx > 0 ? -w / 4 - 0.2 : w / 4 + 0.2
    if (Math.abs(other - dx) > 1.5 && Math.abs(other) < w / 2 - 0.7) win(b, other, 1.75, { w: 0.72, h: 1.05, shutters: w > 5.2, shutterColor: f.shutter })
    if (f.floors === 2) {
      const n = w > 5 ? 2 : 1
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : (i - 0.5) * (w * 0.46)
        win(b, x, G + 1.25, { w: 0.74, h: 1.25, shutters: true, shutterColor: f.shutter, lit: r() < 0.3, flowers: front && r() < 0.4 })
      }
    }
  }
  facade(true)
  onBack(b, d, () => facade(false))
  if (r() < 0.6) chimney(b, [(r() - 0.5) * (w - 1.6), H + 0.5, -d * (0.3 + r() * 0.4)], 1.3, f.wall)
  if (r() < 0.5) {
    const s = r() < 0.5 ? -1 : 1
    b.at([s * (w / 2 - 0.9), 0, 0], 0, () => wallLantern(b, [0, 2.4, 0]))
  }
}

