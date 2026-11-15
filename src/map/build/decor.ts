import * as THREE from 'three'
import { Builder, type V3, seeded, starShape } from './builder'
import { C, M } from './materials'
import { gableBody, gableRoof, garland, hipRoof, pilasters, plaque, portone, quoins, windowPart, zoccolo } from './parts'
import { giftBox, gifts } from './props'

const HP = Math.PI / 2

// ---------------------------------------------------------------------------
// Vegetazione

/** Abete stilizzato a palchi. */
export function pine(b: Builder, pos: V3, h: number, seed = 1, decorated = false) {
  const r = seeded(seed)
  const [x, y, z] = pos
  const tiers = h > 4 ? 4 : 3
  const R = h * 0.34
  b.cyl(M.matte(C.woodDark), h * 0.045, h * 0.06, h * 0.16, 6, [x, y + h * 0.08, z])
  const shades = [C.pineDark, C.pine, C.pineLight]
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers
    const rad = R * (1 - k * 0.72)
    const th = h * (0.5 - k * 0.12)
    const yc = y + h * 0.12 + k * h * 0.62 + th / 2
    b.add(M.foliage(shades[(i + seed) % 3]), new THREE.ConeGeometry(rad, th, 7), [x, yc, z], [0, r() * Math.PI, 0])
  }
  if (decorated) {
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2
      const t = 0.2 + r() * 0.6
      const rad = R * (1 - t * 0.85) * 0.92
      b.sphere(i % 2 ? M.gold() : M.matte(C.red), h * 0.03, [x + Math.cos(a) * rad, y + h * (0.22 + t * 0.62), z + Math.sin(a) * rad], 0)
    }
  }
}

export function shrub(b: Builder, pos: V3, r: number, seed = 1) {
  const rand = seeded(seed)
  const c = [C.hedge, '#6f9a6a', '#55805a'][Math.floor(rand() * 3)]
  b.add(M.foliage(c), new THREE.IcosahedronGeometry(r, 0), [pos[0], pos[1] + r * 0.7, pos[2]], [rand(), rand(), 0], [1, 0.85, 1])
}

export function hedge(b: Builder, a: [number, number], c: [number, number], h = 0.75, depth = 0.7) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1])
  const ang = Math.atan2(c[0] - a[0], c[1] - a[1])
  b.at([(a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2], ang, () => {
    b.boxOn(M.foliage(C.hedge), [depth, h, len], [0, 0, 0])
    const n = Math.floor(len / 0.7)
    for (let i = 0; i < n; i++) b.sphere(M.foliage('#6a9466'), depth * 0.42, [0, h, -len / 2 + 0.35 + i * 0.7], 0, [1, 0.55, 1])
  })
}

/** Grande albero di Natale con palline, spirale di luci e stella. */
export function bigTree(b: Builder, pos: V3, h = 9) {
  const [x, y, z] = pos
  const r = seeded(42)
  b.cyl(M.fabric(C.red), 1.7, 1.9, 0.35, 24, [x, y + 0.175, z])
  b.add(M.gold(), new THREE.TorusGeometry(1.8, 0.05, 6, 32), [x, y + 0.36, z], [HP, 0, 0])
  b.cyl(M.matte(C.woodDark), 0.25, 0.32, 1.2, 8, [x, y + 0.8, z])
  const tiers = 5
  const R = h * 0.3
  const shades = [C.pineDark, C.pine, C.pineLight]
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers
    const rad = R * (1 - k * 0.78)
    const th = h * (0.32 - k * 0.04)
    b.add(M.foliage(shades[i % 3]), new THREE.ConeGeometry(rad, th, 9), [x, y + 1.0 + k * h * 0.74 + th / 2, z], [0, i * 0.5, 0])
  }
  // spirale di luci
  const turns = 4.2
  const pts = 120
  for (let i = 4; i < pts; i++) {
    const t = i / pts
    const a = t * turns * Math.PI * 2
    const yy = y + 1.2 + t * h * 0.82
    const rad = R * (1 - t * 0.86) + 0.08
    const p: V3 = [x + Math.cos(a) * rad, yy, z + Math.sin(a) * rad]
    if (i % 2 === 0) b.sphere(M.glow(2.6), 0.07, p, 0)
  }
  for (let i = 0; i < 26; i++) {
    const t = 0.08 + r() * 0.78
    const a = r() * Math.PI * 2
    const rad = R * (1 - t * 0.86) * 0.95
    const col = [M.matte(C.red), M.gold(), M.matte(C.white)][i % 3]
    b.sphere(col, 0.14 - t * 0.05, [x + Math.cos(a) * rad, y + 1.1 + t * h * 0.78, z + Math.sin(a) * rad], 1)
  }
  // stella
  b.at([x, y + h + 0.95, z], Math.PI / 6, () => {
    b.extrude(M.gold(), starShape(0.62, 0.27), 0.12, [0, 0, -0.06], [0, 0, 0], 0.04)
    b.extrude(M.gold(), starShape(0.62, 0.27), 0.12, [-0.06, 0, 0], [0, HP, 0], 0.04)
  })
  gifts(b, [x + 1.2, y + 0.35, z + 1.2], 4, 1, 9)
  gifts(b, [x - 1.3, y + 0.35, z + 0.9], 3, 0.9, 13)
}

// ---------------------------------------------------------------------------
// Arredo urbano

/** Lampione in ghisa con lanterna e fiocco natalizio. */
export function lamp(b: Builder, pos: V3) {
  const [x, y, z] = pos
  const iron = M.iron()
  b.cyl(iron, 0.17, 0.22, 0.4, 8, [x, y + 0.2, z])
  b.cyl(iron, 0.07, 0.09, 3.3, 8, [x, y + 2.0, z])
  b.cyl(iron, 0.13, 0.13, 0.1, 8, [x, y + 1.1, z])
  b.cyl(iron, 0.11, 0.11, 0.08, 8, [x, y + 3.6, z])
  b.cyl(iron, 0.1, 0.18, 0.12, 4, [x, y + 3.72, z], [0, Math.PI / 4, 0])
  b.box(M.glow(2.0), [0.26, 0.42, 0.26], [x, y + 4.0, z])
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(iron, [0.03, 0.44, 0.03], [x + dx * 0.14, y + 4.0, z + dz * 0.14])
  b.cyl(iron, 0.03, 0.27, 0.22, 4, [x, y + 4.32, z], [0, Math.PI / 4, 0])
  b.sphere(M.gold(), 0.05, [x, y + 4.48, z], 0)
  b.add(M.foliage(C.pine), new THREE.TorusGeometry(0.18, 0.06, 4, 10), [x, y + 2.7, z + 0.08])
  b.sphere(M.matte(C.red), 0.06, [x, y + 2.55, z + 0.15], 0, [1.5, 0.8, 0.6])
}

export function bench(b: Builder, pos: V3, rotY: number) {
  b.at(pos, rotY, () => {
    const wood = M.wood(C.wood)
    for (const x of [-0.65, 0.65]) {
      b.boxOn(M.iron(), [0.08, 0.42, 0.5], [x, 0, 0])
      b.box(M.iron(), [0.08, 0.5, 0.06], [x, 0.65, -0.24], [-0.15, 0, 0])
    }
    for (let i = 0; i < 3; i++) b.box(wood, [1.6, 0.05, 0.13], [0, 0.45, -0.16 + i * 0.15])
    for (let i = 0; i < 2; i++) b.box(wood, [1.6, 0.11, 0.04], [0, 0.6 + i * 0.17, -0.27], [-0.15, 0, 0])
  })
}

/** Bicicletta d'epoca con cestino di regali. Asse X locale lungo la bici. */
export function bicycle(b: Builder, pos: V3, rotY: number, color: string) {
  b.at(pos, rotY, () => {
    const wr = 0.34
    const tire = M.matte(C.black)
    const frame = M.matte(color)
    const rear: V3 = [-0.52, wr, 0], front: V3 = [0.56, wr, 0]
    for (const c of [rear, front]) {
      b.add(tire, new THREE.TorusGeometry(wr, 0.035, 6, 24), c)
      b.add(M.trim('#d9d4c9'), new THREE.TorusGeometry(wr - 0.05, 0.012, 4, 24), c)
      b.cyl(M.gold(), 0.04, 0.04, 0.1, 8, c, [HP, 0, 0])
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI
        b.box(M.trim('#d9d4c9'), [0.008, (wr - 0.05) * 2, 0.008], c, [0, 0, a])
      }
    }
    const bb: V3 = [-0.05, 0.3, 0], seat: V3 = [-0.2, 0.86, 0], head: V3 = [0.42, 0.88, 0]
    b.rod(frame, bb, rear, 0.022)
    b.rod(frame, seat, rear, 0.02)
    b.rod(frame, bb, seat, 0.025)
    b.rod(frame, seat, head, 0.024)
    b.rod(frame, bb, head, 0.026)
    b.rod(frame, head, front, 0.022)
    b.rod(M.iron(), [0.42, 0.88, 0], [0.36, 1.04, 0], 0.02)
    b.rod(M.iron(), [0.34, 1.04, -0.26], [0.34, 1.04, 0.26], 0.018)
    for (const s of [-1, 1]) b.cyl(M.matte(C.woodDark), 0.03, 0.03, 0.1, 6, [0.33, 1.04, s * 0.27], [HP, 0, 0])
    b.box(M.matte(C.woodDark), [0.26, 0.06, 0.13], [-0.22, 0.92, 0])
    b.cyl(M.matte(C.gold), 0.05, 0.05, 0.05, 8, [-0.05, 0.3, 0.06], [HP, 0, 0])
    // cestino con regali e stella di Natale
    b.boxOn(M.matte('#c9a26b', true), [0.36, 0.24, 0.4], [0.7, 0.82, 0])
    giftBox(b, [0.66, 1.06, -0.06], 0.18, 0.16, 0.4, C.red, C.gold)
    giftBox(b, [0.74, 1.06, 0.1], 0.14, 0.2, 0.9, C.pine, C.gold)
    b.sphere(M.foliage(C.red), 0.08, [0.78, 1.12, -0.12], 0)
  })
}

/** Filo di luminarie a catenaria tra due punti, con stella pendente opzionale. */
export function lightString(b: Builder, a: V3, c: V3, sag: number, star = false, starRotY = 0) {
  const n = 18
  const pts: V3[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (c[2] - a[2]) * t])
  }
  b.tube(M.matte(C.pineDark), pts, 0.022, 4, n * 2)
  const len = Math.hypot(c[0] - a[0], c[2] - a[2])
  const bulbs = Math.max(6, Math.round(len / 0.42))
  for (let i = 1; i < bulbs; i++) {
    const t = i / bulbs
    const p: V3 = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - sag * 4 * t * (1 - t) - 0.07, a[2] + (c[2] - a[2]) * t]
    b.sphere(M.glow(3.2), 0.085, p, 1)
  }
  if (star) {
    const m: V3 = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - sag - 0.05, (a[2] + c[2]) / 2]
    b.rod(M.iron(), m, [m[0], m[1] - 0.35, m[2]], 0.01, 3)
    b.at([m[0], m[1] - 0.75, m[2]], starRotY, () => {
      b.extrude(M.gold(), starShape(0.42, 0.18), 0.06, [0, 0, -0.03], [0, 0, 0], 0.02)
      b.extrude(M.glow(2.2), starShape(0.24, 0.1), 0.02, [0, 0, 0.06])
    })
  }
}

/** Babbo Natale stilizzato; guarda verso +Z locale. */
export function santa(b: Builder, pos: V3, rotY: number) {
  b.at(pos, rotY, () => {
    const red: ReturnType<typeof M.matte> = { c: '#b8282c', r: 0.75 }
    const fur = M.matte('#fbf7ef')
    const black = M.matte(C.black)
    b.cyl(M.fabric(C.redDark), 1.15, 1.15, 0.06, 28, [0, 0.03, 0])
    b.add(M.gold(), new THREE.TorusGeometry(1.15, 0.03, 4, 32), [0, 0.06, 0], [HP, 0, 0])
    for (const s of [-1, 1]) {
      b.sphere(black, 0.13, [s * 0.15, 0.15, 0.06], 1, [1, 0.75, 1.45])
      b.cyl(red, 0.11, 0.12, 0.34, 10, [s * 0.15, 0.36, 0])
    }
    b.cyl(red, 0.36, 0.5, 0.72, 16, [0, 0.82, 0])
    b.add(fur, new THREE.TorusGeometry(0.49, 0.075, 8, 24), [0, 0.48, 0], [HP, 0, 0])
    b.box(fur, [0.13, 0.72, 0.06], [0, 0.82, 0.44], [0.19, 0, 0])
    b.sphere(red, 0.42, [0, 1.02, 0.02], 2, [1, 0.95, 0.95])
    b.add(black, new THREE.TorusGeometry(0.41, 0.06, 6, 24), [0, 0.92, 0.02], [HP, 0, 0])
    b.box(M.gold(), [0.17, 0.14, 0.06], [0, 0.92, 0.45])
    b.sphere(red, 0.32, [0, 1.36, 0], 2)
    // braccio che saluta
    b.rod(red, [-0.3, 1.42, 0], [-0.58, 1.82, 0.1], 0.09, 8)
    b.sphere(fur, 0.11, [-0.6, 1.86, 0.11], 1)
    b.sphere(black, 0.1, [-0.64, 1.97, 0.12], 1)
    // braccio con il sacco
    b.rod(red, [0.3, 1.4, 0], [0.5, 1.02, 0.1], 0.09, 8)
    b.sphere(fur, 0.11, [0.51, 0.98, 0.1], 1)
    b.sphere(black, 0.1, [0.53, 0.88, 0.1], 1)
    // testa
    b.sphere(M.matte(C.skin), 0.22, [0, 1.74, 0], 2)
    b.sphere({ c: '#fbf7ef', r: 0.9, flat: true }, 0.24, [0, 1.6, 0.08], 1, [1, 1.05, 0.85])
    b.add({ c: '#fbf7ef', r: 0.9, flat: true }, new THREE.ConeGeometry(0.2, 0.32, 7), [0, 1.42, 0.12], [Math.PI + 0.25, 0, 0])
    for (const s of [-1, 1]) b.sphere(fur, 0.07, [s * 0.075, 1.68, 0.2], 1, [1.5, 0.6, 0.7])
    b.sphere(M.matte('#e59a86'), 0.045, [0, 1.72, 0.22], 1)
    for (const s of [-1, 1]) b.sphere(black, 0.024, [s * 0.075, 1.8, 0.19], 0)
    // cappello
    b.add(fur, new THREE.TorusGeometry(0.21, 0.07, 8, 20), [0, 1.9, 0], [HP, 0, 0])
    b.add(red, new THREE.ConeGeometry(0.21, 0.52, 14), [0.06, 2.14, -0.02], [0, 0, -0.38])
    b.sphere(fur, 0.08, [0.17, 2.4, -0.03], 1)
    // sacco dei doni
    b.sphere(M.matte('#a8814f', true), 0.36, [0.62, 0.42, -0.25], 1, [1, 1.15, 1])
    b.cyl(M.matte('#a8814f', true), 0.12, 0.18, 0.18, 8, [0.62, 0.86, -0.25])
    giftBox(b, [0.55, 0.88, -0.3], 0.2, 0.2, 0.4, C.pine, C.gold)
    giftBox(b, [0.72, 0.9, -0.18], 0.16, 0.18, 1.1, C.red, C.white)
  })
}

/** Slitta con regali. */
export function sleigh(b: Builder, pos: V3, rotY: number) {
  b.at(pos, rotY, () => {
    const side = new THREE.Shape([
      new THREE.Vector2(-0.9, 0.25), new THREE.Vector2(0.55, 0.25), new THREE.Vector2(0.85, 0.45),
      new THREE.Vector2(0.95, 0.9), new THREE.Vector2(0.78, 1.0), new THREE.Vector2(0.6, 0.62),
      new THREE.Vector2(-0.45, 0.62), new THREE.Vector2(-0.62, 1.05), new THREE.Vector2(-0.92, 1.0),
      new THREE.Vector2(-0.95, 0.5),
    ])
    b.extrude(M.matte('#a52a2a'), side, 0.86, [0, 0, -0.43], [0, 0, 0], 0.03)
    b.box(M.gold(), [1.4, 0.05, 0.92], [-0.02, 0.64, 0])
    for (const s of [-1, 1]) {
      const z = s * 0.4
      b.tube(M.gold(), [[-0.95, 0.06, z], [0.4, 0.04, z], [0.95, 0.12, z], [1.12, 0.36, z], [0.98, 0.5, z]], 0.035, 5, 30)
      for (const x of [-0.6, 0.3]) b.rod(M.gold(), [x, 0.05, z], [x, 0.28, z], 0.025, 5)
    }
    gifts(b, [-0.1, 0.62, 0], 4, 0.8, 21)
  })
}

// ---------------------------------------------------------------------------
// Punti di interesse

/** Chiesa Madre con campanile. Facciata verso +Z locale, origine al centro della facciata. */
export function church(b: Builder) {
  const w = 9, d = 12, H = 8, pitch = (26 * Math.PI) / 180
  const wall = '#efe3cb'
  const apex = gableBody(b, wall, w, d, H, pitch, 'z')
  zoccolo(b, w, d, 0.7)
  pilasters(b, w, d, 0.7, H)
  for (const s of [-1, 1]) b.box(M.trim(), [0.5, H - 0.7, 0.08], [s * 2.0, 0.7 + (H - 0.7) / 2, 0.04])
  b.box(M.trim(), [w + 0.5, 0.36, 0.42], [0, H - 0.05, 0])
  b.box(M.trim(), [w + 0.2, 0.18, 0.16], [0, 4.85, 0.03])
  for (const x of [-w / 2, w / 2]) b.box(M.trim(), [0.42, 0.36, d + 0.5], [x, H - 0.05, -d / 2])
  gableRoof(b, { span: w, length: d, eaveY: H + 0.12, pitch, axis: 'z', center: [0, -d / 2], gableOverhang: 0.45, color: C.roofAlt })
  portone(b, { w: 2.8, h: 4.0, rise: 1.4, color: C.woodDark, studs: true, lanterns: true, frameW: 0.36 })
  b.at([0, 6.25, 0], 0, () => {
    b.add(M.trim(), new THREE.TorusGeometry(0.88, 0.12, 6, 28), [0, 0, 0.06])
    b.cyl(M.glass(true), 0.86, 0.86, 0.04, 28, [0, 0, 0], [HP, 0, 0])
    for (let i = 0; i < 8; i++) b.box(M.trim(), [1.7, 0.05, 0.05], [0, 0, 0.06], [0, 0, (i * Math.PI) / 8])
    b.cyl(M.trim(), 0.18, 0.18, 0.1, 14, [0, 0, 0.06], [HP, 0, 0])
  })
  for (const s of [-1, 1]) b.at([s * 3.2, 2.9, 0], 0, () => windowPart(b, { w: 0.8, h: 1.7, arch: true, lit: true }))
  b.at([0, H + (apex - H) * 0.42, 0], 0, () => b.add(M.trim(), new THREE.TorusGeometry(0.34, 0.07, 6, 18), [0, 0, 0.05]))
  for (let i = 0; i < 3; i++) b.boxOn(M.stone(i % 2 ? C.stone : C.stoneDark), [w + 1.2 - i * 0.5, 0.14, 0.42], [0, i * 0.14, 1.05 - i * 0.38])
  for (const s of [-1, 1] as const)
    b.at([(s * w) / 2, 0, -d / 2], s * HP, () => {
      for (const x of [-3.5, 0, 3.5]) b.at([x, 4.4, 0], 0, () => windowPart(b, { w: 0.85, h: 2.0, arch: true, lit: true, sill: true }))
    })
  // campanile
  const tw = 3.0, tx = w / 2 + tw / 2 + 0.1, tz = -3.2, shaft = 9.2
  b.at([tx, 0, tz + tw / 2], 0, () => {
    zoccolo(b, tw, tw, 0.7)
    b.boxOn(M.wall(wall), [tw, shaft, tw], [0, 0, -tw / 2])
    quoins(b, tw, tw, 0.7, shaft - 0.2)
    for (const y of [4.2, 7.3]) {
      b.box(M.trim(), [tw + 0.18, 0.16, 0.16], [0, y, 0])
      b.box(M.trim(), [tw + 0.18, 0.16, 0.16], [0, y, -tw])
      b.box(M.trim(), [0.16, 0.16, tw], [-tw / 2, y, -tw / 2])
      b.box(M.trim(), [0.16, 0.16, tw], [tw / 2, y, -tw / 2])
    }
    // cella campanaria
    for (const [px, pz, ry] of [[0, 0, 0], [0, -tw, Math.PI], [tw / 2, -tw / 2, HP], [-tw / 2, -tw / 2, -HP]] as [number, number, number][]) {
      b.at([px, 7.5, pz], ry, () => {
        const hole = new THREE.Shape()
        hole.moveTo(-0.55, 0)
        hole.lineTo(0.55, 0)
        hole.lineTo(0.55, 1.05)
        hole.absarc(0, 1.05, 0.55, 0, Math.PI, false)
        hole.lineTo(-0.55, 0)
        b.extrude(M.matte('#3b2e26'), hole, 0.02, [0, 0, 0.005])
        b.add(M.trim(), new THREE.TorusGeometry(0.6, 0.07, 5, 16, Math.PI), [0, 1.05, 0.05])
      })
    }
    b.cyl(M.matte(C.bronze), 0.12, 0.5, 0.7, 12, [0, 8.25, -tw / 2])
    b.box(M.trim(), [tw + 0.4, 0.26, tw + 0.4], [0, shaft + 0.05, -tw / 2])
    const roof = new THREE.ConeGeometry(tw * 0.78, 2.1, 4, 1)
    b.add(M.roof(C.roofAlt), roof, [0, shaft + 0.18 + 1.05, -tw / 2], [0, Math.PI / 4, 0])
    b.box(M.gold(), [0.08, 0.9, 0.08], [0, shaft + 2.65, -tw / 2])
    b.box(M.gold(), [0.45, 0.08, 0.08], [0, shaft + 2.8, -tw / 2])
    garland(b, [[-1.5, 4.0, 0.12], [-0.75, 3.5, 0.2], [0, 3.35, 0.22], [0.75, 3.5, 0.2], [1.5, 4.0, 0.12]], 0.09)
  })
  return { top: shaft + 3.2 }
}

/** Chiosco dei bagni pubblici. Facciata verso +Z locale. Restituisce la posizione della targa. */
export function kiosk(b: Builder) {
  const w = 3.4, d = 2.6, H = 2.9
  zoccolo(b, w, d, 0.35)
  b.boxOn(M.wall('#e6dccb'), [w, H, d], [0, 0, -d / 2])
  pilasters(b, w, d, 0.35, H - 0.2)
  hipRoof(b, { w, d, eaveY: H, pitch: (24 * Math.PI) / 180, center: [0, -d / 2], overhang: 0.35, color: C.roofWarm })
  for (const s of [-1, 1]) {
    b.box(M.wood('#5f7f8a'), [0.9, 2.1, 0.06], [s * 0.8, 1.05, 0.04])
    b.sphere(M.gold(), 0.03, [s * 0.5, 1.05, 0.09], 0)
  }
  return plaque(b, [0, 2.5, 0.02], 1.0, 0.42, '#3f5b6b')
}
