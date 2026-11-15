import { POSTAZIONI, STRADE } from '../map/layout'
import { useMap } from '../state/store'
import { categoriaLabel, medalClass, pad } from './labels'

export function StandList() {
  const open = useMap((s) => s.listOpen)
  const setListOpen = useMap((s) => s.setListOpen)
  const select = useMap((s) => s.select)
  return (
    <aside className={`list ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Elenco delle postazioni">
      <div className="sheet-handle" aria-hidden />
      <div className="list-head">
        <h2>Postazioni</h2>
        <button className="panel-close" type="button" aria-label="Chiudi l'elenco" onClick={() => setListOpen(false)}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="list-body">
        {STRADE.map((s) => {
          const items = POSTAZIONI.filter((p) => p.posizione.strada === s.id)
          if (!items.length) return null
          return (
            <section key={s.id}>
              <h3>{s.nome}</h3>
              <ul>
                {items.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => select(p.id)}>
                      <span className={`medal medal-sm ${medalClass(p)}`}>{pad(p.numero)}</span>
                      <span className="list-text">
                        <span className="list-name">{p.nome}</span>
                        <span className="list-cat">{categoriaLabel(p)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </aside>
  )
}
