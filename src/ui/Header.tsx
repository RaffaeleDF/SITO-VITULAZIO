import { useState } from 'react'
import { useMap } from '../state/store'
import { Logo } from './Logo'

export function Header() {
  const setListOpen = useMap((s) => s.setListOpen)
  const listOpen = useMap((s) => s.listOpen)
  const [menu, setMenu] = useState(false)
  const openList = () => {
    useMap.getState().select(null)
    setListOpen(!listOpen)
    setMenu(false)
  }
  return (
    <header className="topbar">
      <Logo />
      <nav className={`nav ${menu ? 'is-open' : ''}`} aria-label="Navigazione principale">
        <a className="nav-link is-active" href="#" aria-current="page">Mappa</a>
        <button className="nav-link" type="button" onClick={openList} aria-expanded={listOpen}>Postazioni</button>
        <a className="nav-link is-soon" href="#" aria-disabled="true" title="In arrivo" onClick={(e) => e.preventDefault()}>Programma</a>
        <a className="nav-link is-soon" href="#" aria-disabled="true" title="In arrivo" onClick={(e) => e.preventDefault()}>Info</a>
      </nav>
      <button className="menu-btn" type="button" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
        <svg viewBox="0 0 24 24" aria-hidden>
          {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
    </header>
  )
}
