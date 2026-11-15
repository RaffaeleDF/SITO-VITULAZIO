import { Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { useMap } from '../state/store'
import { C, getMaterial, getTexture } from './build/materials'
import { CameraRig } from './CameraRig'
import { FONT_LABELS, FONT_NUMBERS } from './fonts'
import { PLINTH_BASE, PLINTH_SOIL, type SceneData, buildScene, outlineShape } from './scene'
import { Stands } from './Stands'

const quality = (() => {
  if (typeof window === 'undefined') return 'high'
  const q = new URLSearchParams(window.location.search).get('qualita')
  if (q === 'bassa' || q === 'alta') return q === 'alta' ? 'high' : 'low'
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  const cores = navigator.hardwareConcurrency ?? 4
  return small || cores <= 4 ? 'low' : 'high'
})()

function Village({ scene }: { scene: SceneData }) {
  return (
    <group>
      {scene.parts.map((p) => (
        <mesh
          key={p.key}
          geometry={p.geometry}
          material={getMaterial(p.spec)}
          castShadow={p.spec.shadow !== false}
          receiveShadow
        />
      ))}
      {scene.labels.map((l, i) => (
        <Text
          key={i}
          font={l.font === 'serif' ? FONT_NUMBERS : FONT_LABELS}
          position={l.pos}
          rotation={l.ground !== undefined ? [-Math.PI / 2, 0, l.ground] : [0, l.rotY, 0]}
          fontSize={l.size}
          letterSpacing={l.ground !== undefined ? 0.28 : 0}
          color={l.color}
          fillOpacity={l.ground !== undefined ? 0.85 : 1}
          anchorX="center"
          anchorY="middle"
        >
          {l.text}
        </Text>
      ))}
    </group>
  )
}

/** Plastico: strato di terreno con prato e base color crema, poggiati su un "tavolo". */
function Plinth({ scene }: { scene: SceneData }) {
  const { soil, base, trim, mats } = useMemo(() => {
    const shape = outlineShape(scene.outline)
    const soil = new THREE.ExtrudeGeometry(shape, { depth: PLINTH_SOIL, bevelEnabled: false, curveSegments: 4 })
    soil.rotateX(-Math.PI / 2)
    soil.translate(0, -PLINTH_SOIL, 0)
    const base = new THREE.ExtrudeGeometry(shape, {
      depth: PLINTH_BASE,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 2,
      curveSegments: 4,
    })
    base.rotateX(-Math.PI / 2)
    base.translate(0, -PLINTH_SOIL - PLINTH_BASE - 0.12, 0)
    const trim = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.16, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 4 })
    trim.rotateX(-Math.PI / 2)
    trim.translate(0, -PLINTH_SOIL - 0.13, 0)
    const lawnTex = getTexture('lawn').clone()
    lawnTex.repeat.set(1 / 6, 1 / 6)
    lawnTex.needsUpdate = true
    const lawn = new THREE.MeshStandardMaterial({ color: C.lawn, map: lawnTex, roughness: 1 })
    const soilSide = new THREE.MeshStandardMaterial({ color: C.plinthTop, roughness: 0.95 })
    const baseMat = new THREE.MeshStandardMaterial({ color: C.plinthBase, roughness: 0.75 })
    const goldMat = new THREE.MeshStandardMaterial({ color: C.gold, roughness: 0.35, metalness: 0.8 })
    return { soil, base, trim, mats: { lawn, soilSide, baseMat, goldMat } }
  }, [scene])
  const H = PLINTH_SOIL + PLINTH_BASE + 0.25
  return (
    <group>
      <mesh geometry={soil} material={[mats.lawn, mats.soilSide]} receiveShadow castShadow />
      <mesh geometry={trim} material={mats.goldMat} />
      <mesh geometry={base} material={[mats.baseMat, mats.baseMat]} receiveShadow castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -H, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color={C.table} roughness={1} />
      </mesh>
    </group>
  )
}

function Lights({ scene }: { scene: SceneData }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const { x0, x1, z0, z1 } = scene.bounds
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const dir = new THREE.Vector3(-0.42, 0.78, 0.46).normalize()
  const ext = Math.max(x1 - x0, z1 - z0) * 0.62 + 6
  useLayoutEffect(() => {
    const l = sun.current
    if (!l) return
    l.target.position.set(cx, 0, cz)
    l.target.updateMatrixWorld()
    const cam = l.shadow.camera
    cam.left = -ext
    cam.right = ext
    cam.top = ext
    cam.bottom = -ext
    cam.near = 1
    cam.far = 400
    cam.updateProjectionMatrix()
  }, [cx, cz, ext])
  return (
    <>
      <hemisphereLight args={['#fff4e2', '#b3a385', 0.72]} />
      <directionalLight
        ref={sun}
        position={[cx + dir.x * 150, dir.y * 150, cz + dir.z * 150]}
        intensity={3.3}
        color="#ffeed4"
        castShadow
        shadow-mapSize={quality === 'high' ? [4096, 4096] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={quality === 'high' ? 3 : 2}
      />
      <directionalLight position={[cx + 80, 40, cz - 10]} intensity={0.45} color="#e9eefc" />
    </>
  )
}

/** Scena statica: le ombre vengono calcolate una sola volta. */
function StaticRendering() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const setReady = useMap((s) => s.setReady)
  const frames = useRef(0)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.4
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  useFrame(() => {
    frames.current++
    if (frames.current === 2) setReady()
  })
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const g = globalThis as unknown as Record<string, unknown>
    g.__gl = gl
    g.__three = scene
  }, [gl, scene])
  return null
}

function Effects() {
  const high = quality === 'high'
  return (
    <EffectComposer multisampling={0} frameBufferType={THREE.HalfFloatType}>
      <N8AO aoRadius={1.4} distanceFalloff={0.8} intensity={high ? 4 : 3.2} color="#2b1d12" quality={high ? 'medium' : 'performance'} halfRes={!high} />
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={1.35} luminanceSmoothing={0.2} radius={0.55} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <BrightnessContrast brightness={-0.015} contrast={0.07} />
      <HueSaturation saturation={0.02} />
      <SMAA />
    </EffectComposer>
  )
}

export function MapCanvas() {
  const scene = useMemo(() => {
    const t0 = performance.now()
    const s = buildScene()
    if (import.meta.env.DEV) (globalThis as unknown as Record<string, unknown>).__buildMs = Math.round(performance.now() - t0)
    return s
  }, [])
  const onMissed = () => {
    document.body.style.cursor = ''
  }
  useEffect(() => {
    if (import.meta.env.DEV) (globalThis as unknown as Record<string, unknown>).__scene = scene
  }, [scene])
  return (
    <Canvas
      className="map-canvas"
      orthographic
      shadows="percentage"
      frameloop="demand"
      dpr={quality === 'high' ? [1, 2] : [1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ near: 1, far: 2000, zoom: 8, position: [200, 200, 200] }}
      onPointerMissed={onMissed}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping
      }}
    >
      <color attach="background" args={[C.table]} />
      <StaticRendering />
      <Lights scene={scene} />
      <Plinth scene={scene} />
      <Village scene={scene} />
      <Stands scene={scene} />
      <CameraRig scene={scene} />
      <Effects />
    </Canvas>
  )
}
