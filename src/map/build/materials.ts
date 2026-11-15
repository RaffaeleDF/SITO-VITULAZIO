import * as THREE from 'three'

/** Palette cromatica della scena. */
export const MURI = {
  avorio: '#f2e7d3',
  crema: '#eddcbd',
  beige: '#e3ceae',
  burro: '#f0d9a4',
  rosa: '#ecd0c0',
  salvia: '#dbe1c9',
  sabbia: '#e8d9c2',
  pesca: '#efd5b8',
} as const

export const PORTONI = {
  verde: '#2c5a41',
  rosso: '#9a2e29',
  noce: '#6d4529',
  blu: '#2f4b60',
} as const

export const C = {
  trim: '#f8f2e7',
  stone: '#dccfb8',
  stoneDark: '#c7b597',
  roof: '#b8664a',
  roofAlt: '#ad5c42',
  roofWarm: '#c37556',
  ridge: '#99482f',
  shutter: '#52785a',
  shutterDark: '#3f6347',
  gold: '#caa24c',
  goldDark: '#021f77',
  goldDeep: '#5d4718',
  iron: '#2f3633',
  glass: '#3b4852',
  glow: '#ffcf8a',
  pine: '#2f6047',
  pineDark: '#244d38',
  pineLight: '#3d7255',
  hedge: '#5d8a5f',
  red: '#b3302b',
  redDark: '#8f2522',
  white: '#fbf8f1',
  wood: '#8a5b37',
  woodDark: '#5e3d25',
  lawn: '#adbf95',
  road: '#ffffff',
  curb: '#e6ddcd',
  track: '#e9e1d2',
  plinthTop: '#8f6c4c',
  plinthBase: '#2f4b3d',
  table: '#efe7da',
  skin: '#f0c4a2',
  black: '#2a2624',
  bronze: '#a87b3c',
} as const

export type TexName = 'roof' | 'cobble' | 'slab' | 'lawn'

/** Descrizione serializzabile di un materiale: i pezzi con la stessa spec vengono fusi insieme. */
export interface MatSpec {
  c: string
  r?: number
  m?: number
  e?: string
  ei?: number
  flat?: boolean
  tex?: TexName
  /** come calcolare le coordinate UV dopo la trasformazione: tegole o proiezione planare dall'alto */
  uv?: 'roof' | 'planar'
  uvScale?: number
  /** 'door' = parte interattiva del portone (evidenziata al passaggio del mouse) */
  tag?: 'door'
  shadow?: false
}

export const specKey = (s: MatSpec) => JSON.stringify(s)

export const M = {
  wall: (c: string): MatSpec => ({ c, r: 0.92 }),
  trim: (c: string = C.trim): MatSpec => ({ c, r: 0.85 }),
  stone: (c: string = C.stone): MatSpec => ({ c, r: 0.9 }),
  roof: (c: string = C.roof): MatSpec => ({ c, r: 0.82, tex: 'roof', uv: 'roof' }),
  ridge: (c: string = C.ridge): MatSpec => ({ c, r: 0.8 }),
  door: (c: string): MatSpec => ({ c, r: 0.6, tag: 'door' }),
  wood: (c: string): MatSpec => ({ c, r: 0.7 }),
  gold: (): MatSpec => ({ c: C.gold, r: 0.32, m: 0.85 }),
  iron: (): MatSpec => ({ c: C.iron, r: 0.55, m: 0.4 }),
  glass: (lit = false): MatSpec =>
    lit ? { c: '#5a4a3a', r: 0.25, e: C.glow, ei: 0.55 } : { c: C.glass, r: 0.2, m: 0.1 },
  glow: (ei = 2.2, c: string = C.glow): MatSpec => ({ c: '#fff4dc', r: 0.4, e: c, ei, shadow: false }),
  matte: (c: string, flat = false): MatSpec => ({ c, r: 0.9, flat }),
  foliage: (c: string): MatSpec => ({ c, r: 0.85, flat: true }),
  fabric: (c: string): MatSpec => ({ c, r: 0.95 }),
  planar: (c: string, tex: TexName, uvScale: number): MatSpec => ({ c, r: 0.95, tex, uv: 'planar', uvScale }),
}

// ---------------------------------------------------------------------------
// Texture procedurali (canvas): nessun file esterno da caricare.

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(size: number) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')!] as const
}

function toTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Coppi: 8 colonne x 8 corsi, in scala di grigi (moltiplicata per il colore del materiale). */
function roofTexture() {
  const S = 512, N = 8, T = S / N
  const [cv, g] = canvas(S)
  const img = g.createImageData(S, S)
  const rand = rng(7)
  const tint: number[] = []
  for (let i = 0; i < N * N; i++) tint.push(0.9 + rand() * 0.12)
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / T)
    const fy = (y % T) / T // 0 = parte alta del corso (vicino al colmo), 1 = bordo inferiore
    for (let x = 0; x < S; x++) {
      const col = Math.floor(x / T)
      const fx = (x % T) / T
      let v = 0.7 + 0.3 * Math.pow(Math.sin(Math.PI * fx), 0.55)
      if (fy < 0.16) v *= 0.72 + 0.28 * (fy / 0.16) // ombra del corso superiore
      if (fy > 0.93) v *= 1.06
      v *= tint[row * N + col]
      const i = (y * S + x) * 4
      const c = Math.min(255, v * 255)
      img.data[i] = c
      img.data[i + 1] = c * 0.985
      img.data[i + 2] = c * 0.97
      img.data[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  return toTexture(cv)
}

/** Sanpietrini / cubetti di pietra: 512px = 4 m. */
function cobbleTexture() {
  const S = 512
  const [cv, g] = canvas(S)
  const rand = rng(11)
  g.fillStyle = '#b4aa98'
  g.fillRect(0, 0, S, S)
  const rowH = 16, colW = 26
  for (let r = 0; r < S / rowH; r++) {
    const off = (r % 2) * (colW / 2)
    for (let x = -colW; x < S + colW; x += colW) {
      const k = 0.92 + rand() * 0.14
      const base = [214, 205, 189].map((v) => Math.min(255, Math.round(v * k)))
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`
      const px = x + off + 1.5, py = r * rowH + 1.5, w = colW - 3 + (rand() - 0.5) * 2, h = rowH - 3
      roundRect(g, px, py, w, h, 4)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.10)'
      roundRect(g, px + 1, py + 1, w - 2, h * 0.45, 3)
      g.fill()
    }
  }
  return toTexture(cv)
}

/** Lastre del marciapiede: 512px = 3 m. */
function slabTexture() {
  const S = 512
  const [cv, g] = canvas(S)
  const rand = rng(23)
  g.fillStyle = '#cfc5b3'
  g.fillRect(0, 0, S, S)
  const n = 4, w = S / n
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const k = 0.96 + rand() * 0.06
      g.fillStyle = `rgb(${Math.round(238 * k)},${Math.round(231 * k)},${Math.round(217 * k)})`
      g.fillRect(c * w + 2, r * w + 2, w - 4, w - 4)
    }
  return toTexture(cv)
}

/** Prato: rumore leggerissimo per evitare l'effetto "colore piatto". */
function lawnTexture() {
  const S = 256
  const [cv, g] = canvas(S)
  const rand = rng(5)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2600; i++) {
    const v = rand()
    g.fillStyle = v > 0.5 ? 'rgba(255,255,240,0.16)' : 'rgba(90,110,70,0.06)'
    const s = 1 + rand() * 2.5
    g.fillRect(rand() * S, rand() * S, s, s)
  }
  return toTexture(cv)
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

const texCache = new Map<TexName, THREE.Texture>()
export function getTexture(name: TexName) {
  let t = texCache.get(name)
  if (!t) {
    t = { roof: roofTexture, cobble: cobbleTexture, slab: slabTexture, lawn: lawnTexture }[name]()
    texCache.set(name, t)
  }
  return t
}

const matCache = new Map<string, THREE.MeshStandardMaterial>()
export function getMaterial(spec: MatSpec) {
  const key = specKey(spec)
  let m = matCache.get(key)
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: spec.c,
      roughness: spec.r ?? 0.85,
      metalness: spec.m ?? 0,
      flatShading: spec.flat ?? false,
      emissive: spec.e ?? '#000000',
      emissiveIntensity: spec.ei ?? 1,
      map: spec.tex ? getTexture(spec.tex) : null,
      envMapIntensity: spec.m ? 1 : 0.35,
    })
    matCache.set(key, m)
  }
  return m
}
