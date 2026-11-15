import percorso from '../data/percorso.json'
import datiPostazioni from '../data/postazioni.json'
import { type FillerSpec, STAND_FOOTPRINT, type StandModel, fillerSpec } from './build/houses'

/*
 * Traduce i dati (percorso e postazioni) in posizioni nella scena 3D.
 * Nessun dato dell'evento è scritto qui: tutto arriva dai file JSON in src/data.
 */

export type Lato = 'nord' | 'sud' | 'est' | 'ovest'
export type Categoria = 'enogastronomia' | 'evento' | 'associazione'

/** Icona mostrata accanto alla voce: piatto (da mangiare seduti), bevanda, cibo di strada. */
export type TipoVoce = 'piatto' | 'bevanda' | 'strada'

export interface VoceMenu {
  nome: string
  tipo?: TipoVoce
  note?: string | null
}

export interface Postazione {
  id: string
  numero: number
  nome: string
  categoria: Categoria
  posizione: { strada: string; lato: Lato; progressiva: number }
  casetta: { modello: StandModel; muro: string; portone: string }
  modello3d: string | null
  descrizione: string
  menu: VoceMenu[]
}

export interface Strada {
  id: string
  nome: string
  a: [number, number]
  b: [number, number]
  larghezza: number
  marciapiede: number
  dir: [number, number]
  len: number
}

export interface PuntoInteresse {
  id: string
  nome: string
  tipo: 'chiesa' | 'servizi'
  posizione: [number, number]
  orientamento: Lato
}

export const STRADE: Strada[] = percorso.strade.map((s) => {
  const dx = s.a[0] - s.da[0], dz = s.a[1] - s.da[1]
  const len = Math.hypot(dx, dz)
  return {
    id: s.id,
    nome: s.nome,
    a: s.da as [number, number],
    b: s.a as [number, number],
    larghezza: s.larghezza,
    marciapiede: s.marciapiede,
    dir: [dx / len, dz / len],
    len,
  }
})

export const PUNTI: PuntoInteresse[] = percorso.puntiDiInteresse as PuntoInteresse[]

/** Edificio senza numero (es. il campanile) allineato su una strada come le casette. */
export interface Monumento {
  id: string
  nome: string
  modello: StandModel
  strada: string
  lato: Lato
  progressiva: number
  muro: string
  portone: string
}

export const MONUMENTI: Monumento[] = ((percorso as { monumenti?: unknown[] }).monumenti ?? []) as Monumento[]

export const POSTAZIONI: Postazione[] = (datiPostazioni.postazioni as Postazione[])
  .slice()
  .sort((a, b) => a.numero - b.numero)

export const strada = (id: string) => {
  const s = STRADE.find((x) => x.id === id)
  if (!s) throw new Error(`Strada sconosciuta: ${id}`)
  return s
}

/** Normale (verso la strada) della facciata di un edificio che sta sul lato indicato. */
export const LATO_NORMALE: Record<Lato, [number, number]> = {
  nord: [0, 1],
  sud: [0, -1],
  ovest: [1, 0],
  est: [-1, 0],
}

export const rotFromNormal = (n: [number, number]) => Math.atan2(n[0], n[1])

export const axisPoint = (s: Strada, p: number): [number, number] => [s.a[0] + s.dir[0] * p, s.a[1] + s.dir[1] * p]

/** I lati ammessi per una strada sono quelli perpendicolari alla sua direzione. */
export function lati(s: Strada): Lato[] {
  return Math.abs(s.dir[0]) > Math.abs(s.dir[1]) ? ['nord', 'sud'] : ['ovest', 'est']
}

export interface Lotto {
  kind: 'stand' | 'landmark' | 'filler' | 'garden'
  strada: Strada
  lato: Lato
  /** progressiva del punto di origine (portone per gli stand, centro facciata per il resto) */
  p: number
  span: [number, number]
  origin: [number, number]
  normal: [number, number]
  rotY: number
  depth: number
  stand?: Postazione
  monumento?: Monumento
  filler?: FillerSpec
}

const ROW_DEPTH = 7.2
/** direzione orizzontale da cui guarda la telecamera nella vista generale (azimut 30°) */
const VIEW_DIR: [number, number] = [0.5, 0.866]
const GAP = 0.3

function lotto(kind: Lotto['kind'], s: Strada, lato: Lato, p: number, x0: number, x1: number, depth: number): Lotto {
  const normal = LATO_NORMALE[lato]
  const rotY = rotFromNormal(normal)
  const ax = axisPoint(s, p)
  const origin: [number, number] = [ax[0] - (normal[0] * s.larghezza) / 2, ax[1] - (normal[1] * s.larghezza) / 2]
  // verso dell'asse x locale rispetto alla direzione della strada
  const lx: [number, number] = [Math.cos(rotY), -Math.sin(rotY)]
  const sgn = Math.sign(lx[0] * s.dir[0] + lx[1] * s.dir[1]) || 1
  const e0 = p + sgn * x0, e1 = p + sgn * x1
  return { kind, strada: s, lato, p, span: [Math.min(e0, e1), Math.max(e0, e1)], origin, normal, rotY, depth }
}

/** Tratti di una fila di case occupati da altre strade che si innestano. */
function esclusioni(s: Strada, lato: Lato): [number, number][] {
  const out: [number, number][] = []
  for (const t of STRADE) {
    if (t === s) continue
    // t parte dal bordo di s?
    const rel = [t.a[0] - s.a[0], t.a[1] - s.a[1]]
    const along = rel[0] * s.dir[0] + rel[1] * s.dir[1]
    const across = Math.abs(rel[0] * -s.dir[1] + rel[1] * s.dir[0])
    if (along >= 0 && along <= s.len && Math.abs(across - s.larghezza / 2) < 0.6) {
      const n = LATO_NORMALE[lato]
      if (t.dir[0] * n[0] + t.dir[1] * n[1] < -0.5) out.push([along - t.larghezza / 2 - 0.2, along + t.larghezza / 2 + 0.2])
    }
    // s parte dal bordo di t: le sue file iniziano oltre la profondità delle case di t
    const rel2 = [s.a[0] - t.a[0], s.a[1] - t.a[1]]
    const along2 = rel2[0] * t.dir[0] + rel2[1] * t.dir[1]
    const across2 = Math.abs(rel2[0] * -t.dir[1] + rel2[1] * t.dir[0])
    if (along2 >= 0 && along2 <= t.len && Math.abs(across2 - t.larghezza / 2) < 0.6) out.push([-1, ROW_DEPTH])
  }
  return out
}

export interface Layout {
  lotti: Lotto[]
  stands: Lotto[]
  /** tratti occupati per strada/lato, utili per luminarie e lampioni */
  occupati: Map<string, Lotto[]>
}

export function computeLayout(): Layout {
  const lotti: Lotto[] = []
  let seed = 1
  for (const s of STRADE) {
    for (const lato of lati(s)) {
      const row: Lotto[] = []
      for (const st of POSTAZIONI) {
        if (st.posizione.strada !== s.id || st.posizione.lato !== lato) continue
        const fp = STAND_FOOTPRINT[st.casetta.modello]
        const l = lotto('stand', s, lato, st.posizione.progressiva, fp.x0, fp.x1, fp.d)
        l.stand = st
        row.push(l)
      }
      for (const m of MONUMENTI) {
        if (m.strada !== s.id || m.lato !== lato) continue
        const fp = STAND_FOOTPRINT[m.modello]
        const l = lotto('landmark', s, lato, m.progressiva, fp.x0, fp.x1, fp.d)
        l.monumento = m
        row.push(l)
      }
      const blocked: [number, number][] = [...row.map((l) => [l.span[0] - GAP, l.span[1] + GAP] as [number, number]), ...esclusioni(s, lato)]
      blocked.sort((a, b) => a[0] - b[0])
      // spazi liberi -> case di contorno o giardinetti
      let cursor = 0.3
      const gaps: [number, number][] = []
      for (const [b0, b1] of blocked) {
        if (b0 > cursor) gaps.push([cursor, b0])
        cursor = Math.max(cursor, b1)
      }
      if (s.len - 0.3 > cursor) gaps.push([cursor, s.len - 0.3])
      for (const [g0, g1] of gaps) {
        const L = g1 - g0
        if (L < 2.2) continue
        if (L < 4.4) {
          const l = lotto('garden', s, lato, (g0 + g1) / 2, -L / 2, L / 2, 4)
          row.push(l)
          continue
        }
        let n = Math.max(1, Math.round(L / 6.2))
        let w = (L - (n - 1) * GAP) / n
        if (w > 7.8 && (L - n * GAP) / (n + 1) >= 4.4) {
          n++
          w = (L - (n - 1) * GAP) / n
        }
        // le file che mostrano il retro alla vista principale restano basse, per lasciare visibile la strada
        const nrm = LATO_NORMALE[lato]
        const low = nrm[0] * VIEW_DIR[0] + nrm[1] * VIEW_DIR[1] < -0.2
        for (let i = 0; i < n; i++) {
          const c = g0 + w / 2 + i * (w + GAP)
          const f = fillerSpec(w, seed++ * 13, low)
          const l = lotto('filler', s, lato, c, -w / 2, w / 2, f.d)
          l.filler = f
          row.push(l)
        }
      }
      lotti.push(...row)
    }
  }
  const occupati = new Map<string, Lotto[]>()
  for (const l of lotti) {
    const k = `${l.strada.id}:${l.lato}`
    if (!occupati.has(k)) occupati.set(k, [])
    occupati.get(k)!.push(l)
  }
  return { lotti, stands: lotti.filter((l) => l.kind === 'stand'), occupati }
}
