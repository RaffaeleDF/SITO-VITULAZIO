import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Modello GLB che sostituisce una casetta procedurale.
 * Convenzione: origine al centro della facciata a quota 0, facciata verso +Z.
 * Le mesh il cui nome contiene "portone" vengono evidenziate al passaggio del mouse.
 */
export function GlbModel({ url, position, rotationY, highlight }: { url: string; position: [number, number, number]; rotationY: number; highlight: boolean }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = m.receiveShadow = true
      if (/portone/i.test(m.name) && m.material) m.material = (m.material as THREE.MeshStandardMaterial).clone()
    })
    return c
  }, [scene])
  useEffect(() => {
    clone.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && /portone/i.test(m.name)) {
        const mat = m.material as THREE.MeshStandardMaterial
        mat.emissive?.set(highlight ? '#ffb54d' : '#000000')
        mat.emissiveIntensity = highlight ? 0.5 : 0
      }
    })
  }, [clone, highlight])
  return <primitive object={clone} position={position} rotation={[0, rotationY, 0]} />
}
