import { Builder, type V3, seeded } from './builder'
import { C, M } from './materials'

/** Piccoli oggetti condivisi da casette e decorazioni. */

export function potTree(b: Builder, pos: V3, s = 1) {
  const [x, y, z] = pos
  b.cyl(M.matte(C.roofWarm), 0.22 * s, 0.17 * s, 0.32 * s, 8, [x, y + 0.16 * s, z])
  b.cyl(M.foliage(C.pine), 0, 0.36 * s, 0.75 * s, 7, [x, y + 0.62 * s, z])
  b.cyl(M.foliage(C.pineLight), 0, 0.27 * s, 0.55 * s, 7, [x, y + 0.98 * s, z])
  b.sphere(M.gold(), 0.04 * s, [x, y + 1.27 * s, z], 0)
}

export function gifts(b: Builder, pos: V3, n: number, s = 1, seed = 3) {
  const r = seeded(seed)
  const palette: [string, string][] = [
    [C.red, C.gold], [C.pine, C.gold], [C.white, C.red], [C.gold, C.redDark], ['#3d5f86', C.white],
  ]
  for (let i = 0; i < n; i++) {
    const [body, ribbon] = palette[Math.floor(r() * palette.length)]
    const sz = (0.32 + r() * 0.22) * s
    const h = sz * (0.7 + r() * 0.5)
    const x = pos[0] + (r() - 0.5) * 0.9 * s
    const z = pos[2] + (r() - 0.5) * 0.7 * s
    const ry = r() * Math.PI
    const yb = pos[1] + (i > 2 && r() < 0.6 ? 0.3 * s : 0)
    giftBox(b, [x, yb, z], sz, h, ry, body, ribbon)
  }
}

export function giftBox(b: Builder, pos: V3, sz: number, h: number, ry: number, body: string, ribbon: string) {
  b.at(pos, ry, () => {
    b.boxOn(M.matte(body), [sz, h, sz], [0, 0, 0])
    b.boxOn(M.matte(ribbon), [sz + 0.01, h + 0.01, sz * 0.18], [0, 0, 0])
    b.boxOn(M.matte(ribbon), [sz * 0.18, h + 0.01, sz + 0.01], [0, 0, 0])
    b.sphere(M.matte(ribbon), sz * 0.14, [-sz * 0.1, h + sz * 0.06, 0], 0, [1.3, 0.7, 0.8])
    b.sphere(M.matte(ribbon), sz * 0.14, [sz * 0.1, h + sz * 0.06, 0], 0, [1.3, 0.7, 0.8])
  })
}

