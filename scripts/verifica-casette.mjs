/*
 * Controllo dei dati di percorso.json / postazioni.json: stampa, per ogni lato di ogni strada,
 * che cosa verrà generato negli spazi liberi (case vuote o giardinetti).
 * Replica la stessa aritmetica di src/map/layout.ts; gli ingombri sono letti da houses.ts.
 *   node scripts/verifica-casette.mjs
 */
import fs from 'fs'

const pc = JSON.parse(fs.readFileSync('src/data/percorso.json', 'utf8'))
const ps = JSON.parse(fs.readFileSync('src/data/postazioni.json', 'utf8'))
const src = fs.readFileSync('src/map/build/houses.ts', 'utf8')
const table = src.split('STAND_FOOTPRINT: Record<StandModel, Footprint> = {')[1].split('}\n')[0]
const FP = Object.fromEntries(
  [...table.matchAll(/(\w+): \{ x0: (-?[\d.]+), x1: (-?[\d.]+)/g)].map((m) => [m[1], [+m[2], +m[3]]]),
)

const GAP = 0.3, ROW_DEPTH = 7.2
const N = { nord: [0, 1], sud: [0, -1], ovest: [1, 0], est: [-1, 0] }
const geo = (s) => {
  const len = Math.hypot(s.a[0] - s.da[0], s.a[1] - s.da[1])
  return { len, dir: [(s.a[0] - s.da[0]) / len, (s.a[1] - s.da[1]) / len] }
}

for (const s of pc.strade) {
  const { len, dir } = geo(s)
  for (const lato of Math.abs(dir[0]) > Math.abs(dir[1]) ? ['nord', 'sud'] : ['ovest', 'est']) {
    const items = [
      ...ps.postazioni.filter((p) => p.posizione.strada === s.id && p.posizione.lato === lato)
        .map((p) => ({ n: `#${p.numero} ${p.nome}`, m: p.casetta.modello, p: p.posizione.progressiva })),
      ...(pc.monumenti ?? []).filter((m) => m.strada === s.id && m.lato === lato)
        .map((m) => ({ n: m.nome, m: m.modello, p: m.progressiva })),
    ]
    const rotY = Math.atan2(N[lato][0], N[lato][1])
    const sgn = Math.sign(Math.cos(rotY) * dir[0] - Math.sin(rotY) * dir[1]) || 1
    const row = items.map((it) => {
      const [x0, x1] = FP[it.m]
      const e = [it.p + sgn * x0, it.p + sgn * x1]
      return { n: it.n, span: [Math.min(...e), Math.max(...e)] }
    })
    // tratti occupati dall'innesto delle altre strade
    const excl = []
    for (const t of pc.strade) {
      if (t === s) continue
      const g = geo(t)
      const rel = [t.da[0] - s.da[0], t.da[1] - s.da[1]]
      const along = rel[0] * dir[0] + rel[1] * dir[1]
      if (along >= 0 && along <= len && Math.abs(Math.abs(rel[0] * -dir[1] + rel[1] * dir[0]) - s.larghezza / 2) < 0.6
        && g.dir[0] * N[lato][0] + g.dir[1] * N[lato][1] < -0.5)
        excl.push([along - t.larghezza / 2 - 0.2, along + t.larghezza / 2 + 0.2])
      const rel2 = [s.da[0] - t.da[0], s.da[1] - t.da[1]]
      const a2 = rel2[0] * g.dir[0] + rel2[1] * g.dir[1]
      if (a2 >= 0 && a2 <= g.len && Math.abs(Math.abs(rel2[0] * -g.dir[1] + rel2[1] * g.dir[0]) - t.larghezza / 2) < 0.6)
        excl.push([-1, ROW_DEPTH])
    }
    const blocked = [...row.map((l) => [l.span[0] - GAP, l.span[1] + GAP]), ...excl].sort((a, b) => a[0] - b[0])
    let cursor = 0.3
    const gaps = []
    for (const [b0, b1] of blocked) {
      if (b0 > cursor) gaps.push([cursor, b0])
      cursor = Math.max(cursor, b1)
    }
    if (len - 0.3 > cursor) gaps.push([cursor, len - 0.3])
    const riempimenti = []
    for (const [g0, g1] of gaps) {
      const L = g1 - g0
      if (L < 2.2) continue
      if (L < 4.4) { riempimenti.push({ p: g0, t: `giardinetto (${L.toFixed(1)} m)` }); continue }
      let n = Math.max(1, Math.round(L / 6.2))
      let w = (L - (n - 1) * GAP) / n
      if (w > 7.8 && (L - n * GAP) / (n + 1) >= 4.4) { n++; w = (L - (n - 1) * GAP) / n }
      riempimenti.push({ p: g0, t: `${n} casa/e vuota/e (${w.toFixed(1)} m l'una)` })
    }
    console.log(`\n${s.nome} — lato ${lato} (lunghezza ${len.toFixed(1)} m)`)
    for (const r of [...row.map((l) => ({ p: l.span[0], t: l.n })), ...riempimenti].sort((a, b) => a.p - b.p))
      console.log(`  ${r.p.toFixed(1).padStart(5)} m  ${r.t}`)
  }
}
