import { useMap } from '../state/store'

export function Loader() {
  const ready = useMap((s) => s.ready)
  return (
    <div className={`loader ${ready ? 'is-done' : ''}`} aria-hidden={ready} role="status">
      <img className="loader-logo" src="logo.png" alt="" width="512" height="512" />
      <p>Prepariamo il villaggio…</p>
    </div>
  )
}
