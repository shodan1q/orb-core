import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PartMeshProps } from '../../data/parts'

function useOledTexture() {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.magFilter = THREE.NearestFilter
    t.minFilter = THREE.NearestFilter
    return t
  }, [canvas])

  const tickRef = useRef(0)

  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_, dt) => {
    tickRef.current += dt
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 256, 128)
    const powered = (window as unknown as { __magOrbPowered?: boolean }).__magOrbPowered !== false
    if (!powered) {
      texture.needsUpdate = true
      return
    }

    ctx.fillStyle = '#00d4ff'
    ctx.font = 'bold 14px ui-monospace, Menlo, monospace'
    ctx.fillText('MAG-ORB', 8, 18)
    ctx.fillRect(192, 6, 50, 14)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 11px ui-monospace, Menlo, monospace'
    ctx.fillText('LINK', 199, 17)

    const d = new Date()
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    const ss = d.getSeconds().toString().padStart(2, '0')
    ctx.fillStyle = '#00d4ff'
    ctx.font = 'bold 44px ui-monospace, Menlo, monospace'
    ctx.fillText(`${hh}:${mm}:${ss}`, 24, 78)

    const scanX = (tickRef.current * 80) % 256
    ctx.fillStyle = '#00d4ff'
    ctx.fillRect(0, 102, 256, 1)
    ctx.fillRect(scanX, 96, 2, 14)
    ctx.fillStyle = '#005f7a'
    for (let i = 0; i < 12; i++) {
      const h = 2 + Math.abs(Math.sin(tickRef.current * 2 + i * 0.6)) * 14
      ctx.fillRect(8 + i * 20, 122 - h, 12, h)
    }
    texture.needsUpdate = true
  })

  return texture
}

export function OLEDDisplay({ selected, hovered, onPointerOver, onPointerOut, onClick }: PartMeshProps) {
  const hi = selected || hovered
  const tex = useOledTexture()

  // 再放大约 1.3×（更显眼）
  const PCB_W = 0.68
  const PCB_H = 0.38
  const SCR_W = 0.6
  const SCR_H = 0.32
  const DISP_W = 0.55
  const DISP_H = 0.28

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        onPointerOver()
      }}
      onPointerOut={onPointerOut}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* PCB 背板 */}
      <mesh position={[0, 0, -0.014]}>
        <boxGeometry args={[PCB_W, PCB_H, 0.024]} />
        <meshStandardMaterial color="#0c2a48" roughness={0.6} />
      </mesh>
      {/* 黑色亚克力面板 */}
      <mesh position={[0, 0, 0.001]}>
        <boxGeometry args={[SCR_W, SCR_H, 0.012]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* 屏幕内容（动态贴图） */}
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[DISP_W, DISP_H]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* 排针接口（下方） */}
      <mesh position={[0, -PCB_H / 2 + 0.02, -0.014]}>
        <boxGeometry args={[0.3, 0.04, 0.024]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* 排针金属脚 */}
      {[-3, -1, 1, 3].map((i) => (
        <mesh key={i} position={[i * 0.04, -PCB_H / 2 + 0.005, -0.014]}>
          <boxGeometry args={[0.012, 0.014, 0.012]} />
          <meshStandardMaterial color="#d4af37" metalness={0.95} roughness={0.2} />
        </mesh>
      ))}
      {hi && (
        <mesh>
          <boxGeometry args={[PCB_W + 0.04, PCB_H + 0.04, 0.05]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  )
}
