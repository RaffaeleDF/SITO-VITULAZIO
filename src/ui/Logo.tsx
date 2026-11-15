/** Logo ufficiale dell'evento (public/logo.png) con il sottotitolo della pagina. */
export function Logo() {
  return (
    <a className="logo" href="#" aria-label="Natale ’Ndo Purton — torna alla mappa">
      <img className="logo-img" src="logo.png" alt="Natale ’Ndo Purton" width="512" height="512" />
      <span className="logo-sub">Mappa delle postazioni</span>
    </a>
  )
}
