import { useMap } from '../state/store'

export function Legend() {
  const touched = useMap((s) => s.selectedId !== null || s.listOpen)
  return (
    <div className="legend" aria-hidden={touched}>
      <div className="legend-row">
        <span className="dot dot-food" /> Stand enogastronomici
        <span className="dot dot-event" /> Eventi
        <span className="dot dot-assoc" /> Associazione
      </div>
      <p className={`hint ${touched ? 'is-gone' : ''}`}>Tocca un numero o una casetta per aprire la scheda</p>
    </div>
  )
}
