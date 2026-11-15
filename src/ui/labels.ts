import { type Categoria, type Postazione, STRADE } from '../map/layout'

export const pad = (n: number) => String(n).padStart(2, '0')

const CATEGORIA: Record<Categoria, string> = {
  enogastronomia: 'Stand enogastronomico',
  evento: 'Evento',
  associazione: 'Associazione',
}

export const categoriaLabel = (p: Postazione) => CATEGORIA[p.categoria]

/** Classe del medaglione col numero: rosso (enogastronomia), verde (evento), dorato (associazione). */
export const medalClass = (p: Postazione) =>
  p.categoria === 'evento' ? 'medal-event' : p.categoria === 'associazione' ? 'medal-assoc' : ''

export function luogo(p: Postazione) {
  const s = STRADE.find((x) => x.id === p.posizione.strada)
  return `${s?.nome ?? p.posizione.strada} · lato ${p.posizione.lato}`
}
