import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useMap } from '../state/store'
import type { SceneData } from './scene'

/*
 * Telecamera ortografica isometrica a orientamento fisso.
 * Consente solo: spostamento, zoom (rotella, pinch, pulsanti), avvicinamento
 * morbido a una postazione e ritorno alla vista generale. Nessuna rotazione libera.
 */

const DEG = Math.PI / 180
export const AZIMUTH = 30 * DEG
export const ELEVATION = 40 * DEG
const FOCUS_ELEVATION = 46 * DEG
const DIST = 400

interface View {
  x: number
  y: number
  z: number
  zoom: number
  az: number
  el: number
  ox: number
  oy: number
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const angleLerp = (a: number, b: number, t: number) => {
  let d = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI
  if (d < -Math.PI) d += 2 * Math.PI
  return a + d * t
}

function basis(az: number, el: number) {
  const sa = Math.sin(az), ca = Math.cos(az), se = Math.sin(el), ce = Math.cos(el)
  return {
    r: new THREE.Vector3(ca, 0, -sa),
    u: new THREE.Vector3(-se * sa, ce, -se * ca),
    back: new THREE.Vector3(ce * sa, se, ce * ca),
    sa, ca, se,
  }
}

/** Inquadratura che contiene tutti i punti, tenendo conto delle aree coperte dall'interfaccia. */
export function fitView(points: [number, number, number][], w: number, h: number, top: number, bottom: number, mobile: boolean) {
  const { r, u, sa, ca, se } = basis(AZIMUTH, ELEVATION)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  const v = new THREE.Vector3()
  for (const p of points) {
    v.set(p[0], p[1], p[2])
    const sx = v.dot(r), sy = v.dot(u)
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy)
  }
  const padX = mobile ? 10 : 48, padY = mobile ? 16 : 36
  const zoom = Math.min((w - padX * 2) / (x1 - x0), (h - top - bottom - padY * 2) / (y1 - y0))
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const a = cx, b = -cy / se
  return { x: a * ca + b * sa, z: -a * sa + b * ca, zoom }
}

export function CameraRig({ scene }: { scene: SceneData }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const insets = useMap((s) => s.insets)
  const command = useMap((s) => s.command)
  const selectedId = useMap((s) => s.selectedId)

  const view = useRef<View>({ x: 0, y: 0, z: 0, zoom: 8, az: AZIMUTH, el: ELEVATION, ox: 0, oy: 0 })
  const anim = useRef<{ from: View; to: View; t0: number; dur: number } | null>(null)
  const mode = useRef<'overview' | 'free' | 'focus'>('overview')
  const limits = useRef({ min: 2, max: 60, fit: 8 })
  const mobile = size.width < 760

  const bounds = scene.bounds

  const overview = useMemo(
    () => fitView(scene.fitPoints, size.width, size.height, insets.top, mobile ? 64 : 24, mobile),
    [scene, size.width, size.height, insets.top, mobile],
  )

  const apply = () => {
    const v = view.current
    const { r, u, back } = basis(v.az, v.el)
    const shR = -v.ox / v.zoom, shU = v.oy / v.zoom
    const t = new THREE.Vector3(v.x, v.y, v.z).addScaledVector(r, shR).addScaledVector(u, shU)
    camera.position.copy(t).addScaledVector(back, DIST)
    camera.up.set(0, 1, 0)
    camera.lookAt(t)
    camera.zoom = v.zoom
    camera.updateProjectionMatrix()
  }

  /** Avvia (o aggiorna) un'animazione: se ne è già in corso una, la nuova destinazione si fonde con quella. */
  const animateTo = (to: Partial<View>, dur = 900) => {
    const from = { ...view.current }
    const prev = anim.current
    const base = prev ? prev.to : from
    const remaining = prev ? Math.max(0, prev.dur - (performance.now() - prev.t0)) : 0
    anim.current = { from, to: { ...base, ...to }, t0: performance.now(), dur: Math.max(dur, remaining) }
    invalidate()
  }

  const offsets = () => ({ ox: -insets.right / 2, oy: (insets.top - insets.bottom) / 2 })

  const clampTarget = (v: View) => {
    v.x = clamp(v.x, bounds.x0, bounds.x1)
    v.z = clamp(v.z, bounds.z0, bounds.z1)
  }

  // limiti di zoom e vista iniziale / ridimensionamento
  useEffect(() => {
    limits.current = { fit: overview.zoom, min: overview.zoom * 0.85, max: clamp(overview.zoom * 6, 28, 64) }
    const v = view.current
    if (mode.current === 'overview' && !anim.current) {
      Object.assign(v, { x: overview.x, y: 0, z: overview.z, zoom: overview.zoom, az: AZIMUTH, el: ELEVATION, ox: 0, oy: (insets.top - (mobile ? 64 : 24)) / 2 })
    } else {
      v.zoom = clamp(v.zoom, limits.current.min, limits.current.max)
    }
    apply()
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview])

  /** Inquadratura di una postazione, calcolata sullo spazio lasciato libero dai pannelli. */
  const focusView = (id: string): Partial<View> | null => {
    const s = scene.stands.find((x) => x.stand.id === id)
    if (!s) return null
    const [nx, nz] = s.normal
    // se dalla vista standard il portone è nascosto, ruota quanto basta per mostrarlo
    const visible = Math.sin(AZIMUTH) * nx + Math.cos(AZIMUTH) * nz > 0.2
    let az = AZIMUTH, el = ELEVATION + 3 * DEG
    if (!visible) {
      const doorAz = Math.atan2(nx, nz)
      const cands = [doorAz - 42 * DEG, doorAz + 42 * DEG]
      const dist = (a: number) => Math.abs(Math.atan2(Math.sin(a - AZIMUTH), Math.cos(a - AZIMUTH)))
      az = dist(cands[0]) < dist(cands[1]) ? cands[0] : cands[1]
      az = AZIMUTH + Math.atan2(Math.sin(az - AZIMUTH), Math.cos(az - AZIMUTH))
      el = FOCUS_ELEVATION
    }
    const availW = size.width - insets.right
    const availH = size.height - insets.top - insets.bottom
    const zoom = clamp(Math.min(availW / 24, availH / 17), limits.current.fit * 1.5, limits.current.max)
    return { x: s.origin[0] + nx * 1.4, y: 2.2, z: s.origin[1] + nz * 1.4, zoom, az, el, ...offsets() }
  }

  // il pannello si apre, cambia misura o si chiude: ricentra nell'area libera
  useEffect(() => {
    if (mode.current === 'overview') return
    if (mode.current === 'focus' && selectedId) {
      const to = focusView(selectedId)
      if (to) animateTo(to, 700)
      return
    }
    const to: Partial<View> = { ...offsets() }
    if (Math.abs(view.current.az - AZIMUTH) > 0.01 || Math.abs(view.current.el - ELEVATION) > 0.01) {
      to.az = AZIMUTH
      to.el = ELEVATION
    }
    animateTo(to, 800)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insets.right, insets.bottom, selectedId])

  // comandi dall'interfaccia
  useEffect(() => {
    if (!command) return
    const v = view.current
    if (command.type === 'reset') {
      mode.current = 'overview'
      anim.current = null
      animateTo({ x: overview.x, y: 0, z: overview.z, zoom: overview.zoom, az: AZIMUTH, el: ELEVATION, ox: 0, oy: (insets.top - (mobile ? 64 : 24)) / 2 }, 1000)
    } else if (command.type === 'zoom') {
      mode.current = 'free'
      const target = clamp((anim.current?.to.zoom ?? v.zoom) * command.factor, limits.current.min, limits.current.max)
      animateTo({ zoom: target }, 350)
    } else if (command.type === 'focus') {
      const to = focusView(command.id)
      if (!to) return
      mode.current = 'focus'
      anim.current = null
      animateTo(to, Math.abs((to.az ?? AZIMUTH) - v.az) > 0.2 ? 1300 : 950)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command])

  // proiezione a schermo di un punto (usata dai test automatici)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(globalThis as unknown as { __project: (p: number[]) => { x: number; y: number } }).__project = (p) => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }
  }, [camera, gl])

  // gesti: trascinamento, rotella, pinch
  useEffect(() => {
    const el = gl.domElement
    const pts = new Map<number, { x: number; y: number }>()
    let pinch: { d: number; mx: number; my: number } | null = null

    const panPx = (dx: number, dy: number) => {
      const v = view.current
      const { r, sa, ca, se } = basis(v.az, v.el)
      const du = -dx / v.zoom, dv = dy / v.zoom
      v.x += r.x * du - (sa * dv) / se
      v.z += r.z * du - (ca * dv) / se
      clampTarget(v)
    }
    const zoomAt = (factor: number, px: number, py: number) => {
      const v = view.current
      const z1 = clamp(v.zoom * factor, limits.current.min, limits.current.max)
      const rect = el.getBoundingClientRect()
      const sx = px - rect.left - (rect.width / 2 + v.ox)
      const sy = rect.top + rect.height / 2 + v.oy - py
      const k = 1 / v.zoom - 1 / z1
      const { r, sa, ca, se } = basis(v.az, v.el)
      v.x += r.x * sx * k - (sa * sy * k) / se
      v.z += r.z * sx * k - (ca * sy * k) / se
      v.zoom = z1
      clampTarget(v)
    }
    const interrupt = () => {
      if (anim.current) {
        anim.current = null
      }
      if (mode.current === 'overview') mode.current = 'free'
    }
    const down = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
      }
    }
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId)
      if (!p) return
      const nx = e.clientX, ny = e.clientY
      if (pts.size === 1) {
        const dx = nx - p.x, dy = ny - p.y
        if (dx || dy) {
          interrupt()
          panPx(dx, dy)
        }
      }
      p.x = nx
      p.y = ny
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        interrupt()
        panPx(mx - pinch.mx, my - pinch.my)
        zoomAt(d / pinch.d, mx, my)
        pinch = { d, mx, my }
      }
      apply()
      invalidate()
    }
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      interrupt()
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      zoomAt(Math.exp(-delta * 0.0016), e.clientX, e.clientY)
      apply()
      invalidate()
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  // priorità negativa: la telecamera si aggiorna prima dei segnaposto che la seguono
  useFrame(() => {
    const a = anim.current
    if (!a) return
    const t = Math.min(1, (performance.now() - a.t0) / a.dur)
    const k = ease(t)
    const v = view.current
    for (const key of ['x', 'y', 'z', 'el', 'ox', 'oy'] as const) v[key] = a.from[key] + (a.to[key] - a.from[key]) * k
    v.zoom = Math.exp(Math.log(a.from.zoom) + (Math.log(a.to.zoom) - Math.log(a.from.zoom)) * k)
    v.az = angleLerp(a.from.az, a.to.az, k)
    apply()
    if (t >= 1) anim.current = null
    invalidate()
  }, -1)

  return null
}
