import { useMap } from '../state/store'

export function MapControls() {
  const send = useMap((s) => s.send)
  const hidden = useMap((s) => s.listOpen)
  return (
    <div className={`controls ${hidden ? 'is-hidden' : ''}`} role="group" aria-label="Controlli della mappa">
      <button type="button" className="ctrl" aria-label="Avvicina" onClick={() => send({ type: 'zoom', factor: 1.45 })}>
        <svg viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <button type="button" className="ctrl" aria-label="Allontana" onClick={() => send({ type: 'zoom', factor: 1 / 1.45 })}>
        <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12h14" /></svg>
      </button>
      <button type="button" className="ctrl ctrl-home" aria-label="Vista generale" title="Vista generale" onClick={() => send({ type: 'reset' })}>
        <svg viewBox="0 0 24 24" aria-hidden><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
    </div>
  )
}
