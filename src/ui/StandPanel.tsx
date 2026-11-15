import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { POSTAZIONI, type TipoVoce } from '../map/layout'
import { useMap } from '../state/store'
import { categoriaLabel, luogo, medalClass, pad } from './labels'

/* Icone delle voci di menu: solo tratto, nessun riempimento (lo stile è in .ico svg). */
const ICONE: Record<TipoVoce, { label: string; path: ReactNode }> = {
  piatto: {
    label: 'Da mangiare nel piatto',
    path: (
      <>
        <path d="M6 14.4a6 6 0 0 1 12 0" />
        <path d="M3.8 14.4h16.4" />
      </>
    ),
  },
  bevanda: {
    label: 'Da bere',
    path: (
      <>
        <path d="M5.8 4h12.4l-2.2 15.2a2 2 0 0 1-2 1.8h-4a2 2 0 0 1-2-1.8z" />
        <path d="M7.3 9.4h9.4" />
      </>
    ),
  },
  strada: {
    label: 'Da mangiare in mano',
    path: (
      <>
        <path d="M12 20.8 5.6 8.3a1.2 1.2 0 0 1 .5-1.7 14 14 0 0 1 11.8 0 1.2 1.2 0 0 1 .5 1.7z" />
        <path d="M9.5 11.2h.01" />
        <path d="M14.5 11.2h.01" />
        <path d="M12 15.6h.01" />
      </>
    ),
  },
}

const useIsMobile = () => {
  const q = '(max-width: 759px)'
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

export function StandPanel() {
  const selectedId = useMap((s) => s.selectedId)
  const select = useMap((s) => s.select)
  const setInsets = useMap((s) => s.setInsets)
  const mobile = useIsMobile()
  const ref = useRef<HTMLElement>(null)
  const index = POSTAZIONI.findIndex((p) => p.id === selectedId)
  const [shown, setShown] = useState(index >= 0 ? POSTAZIONI[index] : null)
  if (index >= 0 && shown?.id !== POSTAZIONI[index].id) setShown(POSTAZIONI[index])
  const open = index >= 0

  // comunica alla telecamera quanta parte di schermo è coperta
  useLayoutEffect(() => {
    const top = document.querySelector<HTMLElement>('.topbar')?.offsetHeight ?? (mobile ? 68 : 84)
    const el = ref.current
    if (!open || !el) {
      setInsets({ top, right: 0, bottom: 0 })
      return
    }
    const update = () => {
      if (mobile) setInsets({ top, right: 0, bottom: el.offsetHeight })
      else setInsets({ top, right: el.offsetWidth + 24, bottom: 0 })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, mobile, setInsets, shown])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const go = (d: number) => {
    const n = POSTAZIONI.length
    select(POSTAZIONI[(index + d + n) % n].id)
  }

  const p = shown
  return (
    <aside ref={ref} className={`panel ${open ? 'is-open' : ''}`} role="dialog" aria-modal="false" aria-hidden={!open} aria-labelledby="panel-title">
      {p && (
        <>
          <div className="sheet-handle" aria-hidden />
          <button className="panel-close" type="button" aria-label="Chiudi la scheda" onClick={() => select(null)}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="panel-head">
            <div className={`medal ${medalClass(p)}`}>{pad(p.numero)}</div>
            <div>
              <p className="kicker">{categoriaLabel(p)}</p>
              <h2 id="panel-title">{p.nome}</h2>
              <p className="where">
                <svg viewBox="0 0 24 24" aria-hidden><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
                {luogo(p)}
              </p>
            </div>
          </div>
          <div className="panel-body">
            <span className="draft">Il ricavato sarà interamente devoluto in beneficenza!</span>
            <p className="desc">{p.descrizione}</p>
            <section className="menu" aria-label="Menu">
              <h3>Menu</h3>
              {p.menu.length > 0 ? (
                <ul>
                  {p.menu.map((v, i) => (
                    <li key={i}>
                      <span>{v.nome}</span>
                      {v.tipo && (
                        <span className="ico">
                          <svg viewBox="0 0 24 24" role="img" aria-label={ICONE[v.tipo].label}>{ICONE[v.tipo].path}</svg>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="menu-empty">
                  <ul aria-hidden>
                    <li><span className="ph" style={{ width: '62%' }} /><span className="ph ph-price" /></li>
                    <li><span className="ph" style={{ width: '48%' }} /><span className="ph ph-price" /></li>
                    <li><span className="ph" style={{ width: '56%' }} /><span className="ph ph-price" /></li>
                  </ul>
                  <p>Il menu di questa postazione non è ancora stato inserito.</p>
                </div>
              )}
            </section>
          </div>
          <footer className="panel-foot">
            <button type="button" className="step" onClick={() => go(-1)} aria-label="Postazione precedente">
              <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
              Precedente
            </button>
            <span className="count">{index + 1} di {POSTAZIONI.length}</span>
            <button type="button" className="step" onClick={() => go(1)} aria-label="Postazione successiva">
              Successiva
              <svg viewBox="0 0 24 24" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </footer>
        </>
      )}
    </aside>
  )
}
