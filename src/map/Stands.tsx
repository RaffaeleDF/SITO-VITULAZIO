import { Billboard, Text } from '@react-three/drei'
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useMap } from '../state/store'
import { C, getMaterial } from './build/materials'
import { FONT_NUMBERS } from './fonts'
import { GlbModel } from './GlbModel'
import type { HitBox, SceneData, StandRender } from './scene'

const pad = (n: number) => String(n).padStart(2, '0')
const CLICK_TOLERANCE = 8

function useStandState(id: string) {
  const hovered = useMap((s) => s.hoveredId === id)
  const selected = useMap((s) => s.selectedId === id)
  return { hovered, selected }
}

function handlers(id: string) {
  const { hover, select } = useMap.getState()
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (e.pointerType === 'mouse') hover(id)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      if (useMap.getState().hoveredId === id) hover(null)
      document.body.style.cursor = ''
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (e.delta > CLICK_TOLERANCE) return
      select(id)
    },
  }
}

/** Texture di un alone morbido, condivisa da tutte le postazioni. */
let glowTex: THREE.Texture | null = null
function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,214,140,1)')
  grd.addColorStop(0.45, 'rgba(255,200,120,0.45)')
  grd.addColorStop(1, 'rgba(255,190,110,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

function Stand({ s }: { s: StandRender }) {
  const id = s.stand.id
  const { hovered, selected } = useStandState(id)
  const invalidate = useThree((st) => st.invalidate)
  const mats = useMemo(
    () =>
      s.doorParts.map((p) => {
        const m = getMaterial(p.spec).clone()
        m.emissive = new THREE.Color('#ffb54d')
        m.emissiveIntensity = 0
        return m
      }),
    [s],
  )
  const pool = useRef<THREE.MeshBasicMaterial>(null)
  const level = useRef(0)

  useFrame((_, dt) => {
    const target = hovered ? 1 : selected ? 0.3 : 0
    const cur = level.current
    if (Math.abs(target - cur) < 0.002) return
    const next = cur + (target - cur) * Math.min(1, dt * 9)
    level.current = next
    for (const m of mats) m.emissiveIntensity = next * 0.16
    if (pool.current) pool.current.opacity = 0.3 + next * 0.6
    invalidate()
  })

  const [nx, nz] = s.normal
  return (
    <group>
      {s.doorParts.map((p, i) => (
        <mesh key={p.key} geometry={p.geometry} material={mats[i]} castShadow receiveShadow />
      ))}
      {s.stand.modello3d && (
        <Suspense fallback={null}>
          <GlbModel url={s.stand.modello3d} position={[s.origin[0], 0, s.origin[1]]} rotationY={s.rotY} highlight={hovered || selected} />
        </Suspense>
      )}
      <mesh position={[s.origin[0] + nx * 1.25, 0.19, s.origin[1] + nz * 1.25]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshBasicMaterial ref={pool} map={glowTexture()} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {s.plaque && (
        <Text
          font={FONT_NUMBERS}
          position={s.plaque.pos}
          rotation={[0, s.rotY, 0]}
          fontSize={s.plaque.size}
          color="#f8ecd0"
          anchorX="center"
          anchorY="middle"
        >
          {pad(s.stand.numero)}
        </Text>
      )}
    </group>
  )
}

/** Segnaposto numerato che resta leggibile a ogni livello di zoom. */
function Marker({ s }: { s: StandRender }) {
  const id = s.stand.id
  const { hovered, selected } = useStandState(id)
  const camera = useThree((st) => st.camera) as THREE.OrthographicCamera
  const width = useThree((st) => st.size.width)
  const invalidate = useThree((st) => st.invalidate)
  const ref = useRef<THREE.Group>(null)
  const pop = useRef(1)
  const event = s.stand.categoria === 'evento'
  const assoc = s.stand.categoria === 'associazione'
  const face = selected ? C.gold : assoc ? C.goldDark : event ? '#24553d' : '#a8302b'
  const ink = selected ? '#3a2614' : '#fbf1dc'
  const h = useMemo(() => handlers(id), [id])

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const base = width < 760 ? 25 : 31
    const z = camera.zoom
    const px = base * Math.min(1.45, Math.max(1, Math.pow(z / 12, 0.3)))
    const target = hovered ? 1.18 : selected ? 1.22 : 1
    pop.current += (target - pop.current) * Math.min(1, dt * 12)
    if (Math.abs(target - pop.current) > 0.003) invalidate()
    g.scale.setScalar((px / z) * pop.current)
  })

  return (
    <group position={s.marker}>
      <Billboard>
        <group ref={ref} {...h}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.12, 40]} />
            <meshStandardMaterial color={face} roughness={0.55} metalness={selected || assoc ? 0.6 : 0.05} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.5, 0.065, 10, 48]} />
            <meshStandardMaterial color={C.gold} roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh position={[0, -0.64, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.12, 0.24, 12]} />
            <meshStandardMaterial color={C.gold} roughness={0.3} metalness={0.85} />
          </mesh>
          <Text font={FONT_NUMBERS} position={[0, 0.02, 0.075]} fontSize={0.46} color={ink} anchorX="center" anchorY="middle">
            {pad(s.stand.numero)}
          </Text>
        </group>
      </Billboard>
    </group>
  )
}

/** Volumi invisibili: rendono cliccabile l'intera casetta e fanno da schermo per ciò che sta dietro. */
function HitBoxes({ boxes }: { boxes: HitBox[] }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), [])
  const block = useMemo(
    () => ({
      onPointerOver: (e: ThreeEvent<PointerEvent>) => e.stopPropagation(),
      onPointerMove: (e: ThreeEvent<PointerEvent>) => e.stopPropagation(),
      onClick: (e: ThreeEvent<MouseEvent>) => e.stopPropagation(),
    }),
    [],
  )
  return (
    <>
      {boxes.map((b, i) => (
        <mesh key={i} position={b.center} rotation={[0, b.rotY, 0]} material={mat} {...(b.id ? handlers(b.id) : block)}>
          <boxGeometry args={b.size} />
        </mesh>
      ))}
    </>
  )
}

export function Stands({ scene }: { scene: SceneData }) {
  return (
    <>
      <HitBoxes boxes={scene.hitBoxes} />
      {scene.stands.map((s) => (
        <group key={s.stand.id}>
          <Stand s={s} />
          <Marker s={s} />
        </group>
      ))}
    </>
  )
}
