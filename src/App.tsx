import { useEffect } from 'react'
import { MapCanvas } from './map/MapCanvas'
import { useMap } from './state/store'
import { Header } from './ui/Header'
import { Legend } from './ui/Legend'
import { Loader } from './ui/Loader'
import { MapControls } from './ui/MapControls'
import { StandList } from './ui/StandList'
import { StandPanel } from './ui/StandPanel'

export function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const s = useMap.getState()
      if (s.listOpen) s.setListOpen(false)
      else if (s.selectedId) s.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <main className="map-stage" aria-label="Mappa 3D delle postazioni">
        <MapCanvas />
        <div className="vignette" aria-hidden />
      </main>
      <Header />
      <Legend />
      <MapControls />
      <StandList />
      <StandPanel />
      <Loader />
    </div>
  )
}
