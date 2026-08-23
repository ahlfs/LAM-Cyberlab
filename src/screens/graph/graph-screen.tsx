/**
 * Lightweight 2D Knowledge Graph (Fake 3D Projection)
 *
 * Uses d3-force-3d for physical layout, but renders completely
 * on a standard HTML5 <canvas> to save GPU/CPU resources.
 * No WebGL or Three.js required.
 */
import { useQuery } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'

// ── Types ───────────────────────────────────────────────────────────

import { HamburgerTrigger } from '@/components/mobile-hamburger-menu'

type GraphNode = {
  id: string
  title: string
  type?: string
  tags?: string[]
}

type GraphEdge = {
  source: string
  target: string
}

type GraphResponse = {
  nodes?: GraphNode[]
  edges?: GraphEdge[]
}

type LayoutNode = GraphNode & {
  x: number
  y: number
  z: number
  connections: number
}

// ── Colors & Sizes ──────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  entity: '#00FFFF',    // Pure Cyan
  concept: '#FFFFFF',   // White
  action: '#FFCC00',    // Bright Yellow
  file: '#3B82F6',      // Neon Blue
  folder: '#FF0055',    // Laser Red
  default: '#00F0FF',
}

const BG_COLOR = '#02040A' // Deep space black
const EDGE_COLOR = 'rgba(255, 255, 255, 0.15)' 
const EDGE_FADED_COLOR = 'rgba(255, 255, 255, 0.03)'
const EDGE_HIGHLIGHT_COLOR = 'rgba(0, 240, 255, 0.7)' // Cyan highlight

function getNodeColor(type?: string): string {
  if (!type) return NODE_COLORS.default
  return NODE_COLORS[type.toLowerCase()] ?? NODE_COLORS.default
}

function getNodeRadius(connections: number): number {
  return Math.max(5, Math.min(18, 5 + connections * 2.5))
}

// ── Force Layout Hook ───────────────────────────────────────────────

function useForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): LayoutNode[] | null {
  const [layout, setLayout] = useState<LayoutNode[] | null>(null)

  useEffect(() => {
    if (nodes.length === 0) {
      setLayout([])
      return
    }

    // Spawn Web Worker for heavy d3-force-3d layout calculation
    const worker = new Worker(
      new URL('./workers/force-layout.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (event) => {
      setLayout(event.data.layout)
    }

    worker.postMessage({ nodes, edges })

    // Cleanup worker if component unmounts or data changes
    return () => worker.terminate()
  }, [nodes, edges])

  return layout
}

// ── Fake 3D Canvas Renderer ─────────────────────────────────────────

function CanvasRenderer({
  nodes,
  edges,
  hoveredNodeId,
  selectedNodeId,
  searchHighlightIds,
  onHover,
  onClick,
}: {
  nodes: LayoutNode[]
  edges: GraphEdge[]
  hoveredNodeId: string | null
  selectedNodeId: string | null
  searchHighlightIds: Set<string>
  onHover: (id: string | null) => void
  onClick: (id: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const projDataRef = useRef<Float32Array | null>(null)
  const drawOrderRef = useRef<Uint16Array | null>(null)
  const nodeIndexMapRef = useRef<Map<string, number>>(new Map())
  
  // Transform state
  const state = useRef({
    rotX: -0.3,
    rotY: 0.4,
    zoom: 1.2,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    width: 0,
    height: 0,
    hoveredId: hoveredNodeId,
    selectedId: selectedNodeId,
    pointers: new Map<number, { x: number, y: number }>(),
    lastPinchDist: 0,
  })

  const activeIdsRef = useRef<Set<string>>(new Set())
  const activeEdgesRef = useRef<Set<string>>(new Set())

  // Sync props to mutable ref so animation loop can read them without recreating closures
  useEffect(() => {
    state.current.hoveredId = hoveredNodeId
    state.current.selectedId = selectedNodeId
    
    // Precompute active sets to eliminate GC pressure inside render loop
    const activeIds = new Set<string>()
    for (const id of searchHighlightIds) activeIds.add(id)
    
    let activeEdges = new Set<string>()
    const addActive = (centerId: string) => {
      activeIds.add(centerId)
      for (const edge of edges) {
        if (edge.source === centerId) {
          activeIds.add(edge.target)
          activeEdges.add(`${edge.source}->${edge.target}`)
        }
        if (edge.target === centerId) {
          activeIds.add(edge.source)
          activeEdges.add(`${edge.target}->${edge.source}`)
        }
      }
    }
    
    if (selectedNodeId) addActive(selectedNodeId)
    if (hoveredNodeId) addActive(hoveredNodeId)
    
    activeIdsRef.current = activeIds
    activeEdgesRef.current = activeEdges
    
  }, [hoveredNodeId, selectedNodeId, searchHighlightIds, edges])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const resize = () => {
      const w = parent.clientWidth
      const h = parent.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      state.current.width = w
      state.current.height = h
    }

    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    resize()
    return () => observer.disconnect()
  }, [])

  // Allocate typed arrays once when nodes change
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      if (!projDataRef.current || projDataRef.current.length < nodes.length * 5) {
        projDataRef.current = new Float32Array(nodes.length * 5)
        drawOrderRef.current = new Uint16Array(nodes.length)
      }
      const drawOrder = drawOrderRef.current!
      for (let i = 0; i < nodes.length; i++) drawOrder[i] = i
      
      const map = new Map<string, number>()
      nodes.forEach((n, i) => map.set(n.id, i))
      nodeIndexMapRef.current = map
    }
  }, [nodes])

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    // Optimize Black Hole Accretion Disk by caching its particle as a Sprite
    const glowSprite = document.createElement('canvas')
    glowSprite.width = 64
    glowSprite.height = 64
    const spriteCtx = glowSprite.getContext('2d')
    if (spriteCtx) {
      spriteCtx.beginPath()
      spriteCtx.arc(32, 32, 4, 0, 2 * Math.PI)
      spriteCtx.fillStyle = '#FFFFFF'
      spriteCtx.shadowColor = '#FFaa00'
      spriteCtx.shadowBlur = 18
      spriteCtx.fill()
    }

    // Optimize Comets by caching them as well
    const cometSprite = document.createElement('canvas')
    cometSprite.width = 64
    cometSprite.height = 64
    const cometCtx = cometSprite.getContext('2d')
    if (cometCtx) {
      cometCtx.beginPath()
      cometCtx.arc(32, 32, 4, 0, 2 * Math.PI)
      cometCtx.fillStyle = '#FFFFFF'
      cometCtx.shadowColor = '#00FFFF'
      cometCtx.shadowBlur = 18
      cometCtx.fill()
    }

    // Pre-allocate TypedArray for Accretion Disk particles (350 points * 4 values: px, py, scale, z)
    const diskCount = 150 + 100 + 100
    const diskProj = new Float32Array(diskCount * 4)

    const render = () => {
      // Auto-rotation when idle (no drag, no hover, no selection)
      if (!state.current.isDragging && !state.current.hoveredId && !state.current.selectedId) {
        state.current.rotY += 0.002 // Slow horizontal spin
      }
      
      const { width, height, rotX, rotY, zoom, hoveredId, selectedId } = state.current
      const dpr = window.devicePixelRatio || 1
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      // Math precomputes
      const cx = width / 2
      const cy = height / 2
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)
      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const focalLength = 600
      const cameraDistance = 350
      
      const activeIds = activeIdsRef.current
      const activeEdges = activeEdgesRef.current
      const hasFocus = activeIds.size > 0

      // TypedArrays for Zero GC
      const projData = projDataRef.current
      const drawOrder = drawOrderRef.current
      const nodeIndexMap = nodeIndexMapRef.current
      
      if (!projData || !drawOrder) {
        animationId = requestAnimationFrame(render)
        return
      }

      // Project nodes 3D -> 2D
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        // Rotate around Y
        const r1x = node.x * cosY - node.z * sinY
        const r1z = node.x * sinY + node.z * cosY
        // Rotate around X
        const r2y = node.y * cosX - r1z * sinX
        const finalZ = node.y * sinX + r1z * cosX

        // Perspective
        const baseScale = focalLength / (focalLength + finalZ + cameraDistance)
        const scale = baseScale * zoom
        const px = r1x * scale + cx
        const py = r2y * scale + cy
        const pr = getNodeRadius(node.connections) * scale

        const idx = i * 5
        projData[idx + 0] = px
        projData[idx + 1] = py
        projData[idx + 2] = pr
        projData[idx + 3] = finalZ
        projData[idx + 4] = scale
      }

      // Sort indices by Z for proper draw order (back to front)
      drawOrder.sort((a, b) => projData[b * 5 + 3] - projData[a * 5 + 3])

      // Helper for projecting a 3D point
      const projectPoint = (x: number, y: number, z: number) => {
        const r1x = x * cosY - z * sinY
        const r1z = x * sinY + z * cosY
        const r2y = y * cosX - r1z * sinX
        const finalZ = y * sinX + r1z * cosX
        if (finalZ < -focalLength) return null
        const scale = (focalLength / (focalLength + finalZ + cameraDistance)) * zoom
        return { px: r1x * scale + cx, py: r2y * scale + cy, scale }
      }

      // Helper for 3D rotation independent of camera
      const rotate3D = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
        let x1 = x * Math.cos(rz) - y * Math.sin(rz), y1 = x * Math.sin(rz) + y * Math.cos(rz), z1 = z
        let y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx), z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx), x2 = x1
        let x3 = x2 * Math.cos(ry) + z2 * Math.sin(ry), z3 = -x2 * Math.sin(ry) + z2 * Math.cos(ry), y3 = y2
        return [x3, y3, z3]
      }

      // Draw Glowing Core (Black Hole)
      const coreProj = projectPoint(0, 0, 0)
      if (coreProj) {
        const time = performance.now() * 0.001

        // 1. Far outer glow (Event Horizon Aura)
        const gradient = ctx.createRadialGradient(coreProj.px, coreProj.py, 15 * coreProj.scale, coreProj.px, coreProj.py, 70 * coreProj.scale)
        gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)')
        gradient.addColorStop(0.3, 'rgba(255, 50, 0, 0.3)')
        gradient.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(coreProj.px, coreProj.py, 70 * coreProj.scale, 0, 2 * Math.PI)
        ctx.fillStyle = gradient
        ctx.fill()

        // 2. Accretion Disks (3D Rings intersecting like an atom)
        let diskIdx = 0
        const createRing = (rx: number, ry: number, rz: number, count: number, baseRadius: number) => {
           for (let i = 0; i < count; i++) {
             const angle = (i / count) * Math.PI * 2
             const rDisk = baseRadius + Math.sin(angle * 6 + time * 3) * 3
             const px = Math.cos(angle) * rDisk
             const pz = Math.sin(angle) * rDisk
             const py = Math.cos(angle * 3 + time * 2) * 2 // slight vertical wobble
             
             const [x3, y3, z3] = rotate3D(px, py, pz, rx, ry, rz)
             
             // Inline projectPoint to grab the finalZ for depth sorting
             const r1x = x3 * cosY - z3 * sinY
             const r1z = x3 * sinY + z3 * cosY
             const r2y = y3 * cosX - r1z * sinX
             const finalZ = y3 * sinX + r1z * cosX
             if (finalZ >= -focalLength) {
                const scale = (focalLength / (focalLength + finalZ + cameraDistance)) * zoom
                diskProj[diskIdx++] = r1x * scale + cx
                diskProj[diskIdx++] = r2y * scale + cy
                diskProj[diskIdx++] = scale
                diskProj[diskIdx++] = finalZ
             }
           }
        }
        
        createRing(0, 0, 0, 150, 32) // Horizontal
        createRing(Math.PI / 2, 0, 0, 100, 38) // Vertical 1
        createRing(0, Math.PI / 2, 0, 100, 38) // Vertical 2

        // Draw Back Disk (Z < 0)
        for (let i = 0; i < diskIdx; i += 4) {
           if (diskProj[i + 3] < 0) {
              const size = 32 * diskProj[i + 2]
              ctx.drawImage(glowSprite, diskProj[i] - size / 2, diskProj[i + 1] - size / 2, size, size)
           }
        }

        // 3. The Black Hole (Event Horizon - Turbulent Anomaly)
        ctx.beginPath()
        const baseBHRadius = 22 * coreProj.scale
        for (let i = 0; i <= 60; i++) {
           const a = (i / 60) * Math.PI * 2
           // Chaotic ripples to the radius based on angle and time
           const ripple = Math.sin(a * 5 + time * 8) * 1.5 + Math.cos(a * 3 - time * 6) * 1.5
           const rBH = baseBHRadius + ripple * coreProj.scale
           
           const px = coreProj.px + Math.cos(a) * rBH
           const py = coreProj.py + Math.sin(a) * rBH
           
           if (i === 0) ctx.moveTo(px, py)
           else ctx.lineTo(px, py)
        }
        ctx.closePath()
        
        ctx.fillStyle = '#000000' // Pure void
        ctx.shadowBlur = 0
        ctx.fill()
        // Bright rippling rim light for the black hole
        ctx.lineWidth = 1.5 * coreProj.scale
        ctx.strokeStyle = 'rgba(255, 180, 50, 0.9)'
        ctx.stroke()

        // Draw front half of the disks (overlapping the black hole)
        // Draw Front Disk (Z >= 0)
        for (let i = 0; i < diskIdx; i += 4) {
           if (diskProj[i + 3] >= 0) {
              const size = 32 * diskProj[i + 2]
              ctx.drawImage(glowSprite, diskProj[i] - size / 2, diskProj[i + 1] - size / 2, size, size)
           }
        }
        
        // 4. Sucked-in particles (Comets falling in)
        for (let i = 0; i < 6; i++) {
           const t = (time * 1.2 + i * 0.33) % 1 // loops from 0 to 1
           const angle = i * (Math.PI * 2 / 6) + time * 2
           const r = 70 - t * 48 // spirals inwards from 70 to 22
           const p = projectPoint(Math.cos(angle) * r, (Math.sin(time + i) - 0.5) * 15, Math.sin(angle) * r)
           if (p) {
             const size = 32 * p.scale
             ctx.drawImage(cometSprite, p.px - size / 2, p.py - size / 2, size, size)
           }
        }
        
        ctx.shadowBlur = 0 // reset
      }

      // Draw Spherical Wireframe (Equator & Meridians)
      const r = 400
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      
      // Equator and Latitudes
      for (let lat = -2; lat <= 2; lat++) {
         const latAngle = (lat / 5) * (Math.PI / 2)
         const latR = Math.cos(latAngle) * r
         const latY = Math.sin(latAngle) * r
         
         ctx.beginPath()
         for (let i = 0; i <= 60; i++) {
           const lonAngle = (i / 60) * Math.PI * 2
           const x = latR * Math.cos(lonAngle)
           const z = latR * Math.sin(lonAngle)
           const proj = projectPoint(x, latY, z)
           if (proj) {
             if (i === 0) ctx.moveTo(proj.px, proj.py)
             else ctx.lineTo(proj.px, proj.py)
           }
         }
         ctx.stroke()
      }

      // Longitudes
      for (let j = 0; j < 12; j++) {
         const lonAngle = (j / 12) * Math.PI * 2
         ctx.beginPath()
         for (let i = 0; i <= 60; i++) {
            const latAngle = (i / 60) * Math.PI * 2
            const x = r * Math.cos(latAngle) * Math.cos(lonAngle)
            const y = r * Math.sin(latAngle)
            const z = r * Math.cos(latAngle) * Math.sin(lonAngle)

            const proj = projectPoint(x, y, z)
            if (proj) {
              if (i === 0) ctx.moveTo(proj.px, proj.py)
              else ctx.lineTo(proj.px, proj.py)
            }
         }
         ctx.stroke()
      }

      // Draw Edges
      ctx.lineWidth = 1
      for (const edge of edges) {
        const fromIdx = nodeIndexMap.get(edge.source)
        const toIdx = nodeIndexMap.get(edge.target)
        if (fromIdx === undefined || toIdx === undefined) continue
        
        const fScale = projData[fromIdx * 5 + 4]
        const tScale = projData[toIdx * 5 + 4]
        
        // Don't draw edges behind camera
        if (fScale < 0 && tScale < 0) continue
        
        const fx = projData[fromIdx * 5 + 0]
        const fy = projData[fromIdx * 5 + 1]
        const tx = projData[toIdx * 5 + 0]
        const ty = projData[toIdx * 5 + 1]
        
        // Edge Frustum Culling
        if ((fx < 0 && tx < 0) || (fx > width && tx > width) || 
            (fy < 0 && ty < 0) || (fy > height && ty > height)) {
            continue
        }

        let isFaded = hasFocus
        let isHighlighted = false
        
        if (activeEdges.has(`${edge.source}->${edge.target}`) || activeEdges.has(`${edge.target}->${edge.source}`)) {
          isFaded = false
          isHighlighted = true
        } else if (activeIds.has(edge.source) && activeIds.has(edge.target)) {
          isFaded = false
        }

        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(tx, ty)
        ctx.strokeStyle = isHighlighted ? EDGE_HIGHLIGHT_COLOR : isFaded ? EDGE_FADED_COLOR : EDGE_COLOR
        ctx.stroke()
      }

      // Draw Nodes
      for (let i = 0; i < drawOrder.length; i++) {
        const nodeIdx = drawOrder[i]
        const idx = nodeIdx * 5
        const scale = projData[idx + 4]
        
        if (scale < 0) continue // behind camera
        
        const px = projData[idx + 0]
        const py = projData[idx + 1]
        const pr = projData[idx + 2]
        const node = nodes[nodeIdx]
        
        const isHighlighted = activeIds.has(node.id) || hoveredId === node.id || searchHighlightIds.has(node.id)
        const isSelected = selectedId === node.id
        const isFaded = hasFocus && !isHighlighted
        const isSearchHit = searchHighlightIds.has(node.id)
        
        const baseColor = getNodeColor(node.type)
        const radius = isHighlighted || isSelected ? pr * 1.5 : pr
        
        const actualRadius = Math.max(0.5, radius)
        
        // Helper to draw circle
        const drawCircle = (x: number, y: number, r: number) => {
          ctx.beginPath()
          ctx.arc(x, y, r, 0, 2 * Math.PI)
          ctx.closePath()
        }

        if (!node.isBlackHole) {
          if (isFaded) {
            drawCircle(px, py, actualRadius)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
            ctx.fill()
          } else {
            // Stardust / Data Bits design (clean, tiny squares)
            ctx.fillStyle = baseColor
            // Faint opacity for background stars, bright for highlighted
            ctx.globalAlpha = isHighlighted || isSelected ? 1.0 : 0.6
            
            // Draw as a tiny square (data bit)
            const size = Math.max(1.5, actualRadius * 0.8)
            ctx.fillRect(px - size / 2, py - size / 2, size, size)
            
            ctx.globalAlpha = 1.0 // reset alpha
          }
          
          if (isSelected || isSearchHit) {
             ctx.shadowBlur = 0 // turn off shadow for ring
             drawCircle(px, py, actualRadius + (4 * scale))
             ctx.strokeStyle = '#FFFFFF'
             ctx.lineWidth = 1.5 * scale
             ctx.stroke()
          }
        }
        
        ctx.shadowBlur = 0 // reset shadow for next draw

        // Draw Label if highlighted
        if (isHighlighted || isSelected) {
          ctx.font = `bold ${Math.max(10, 12 * Math.min(1.5, scale))}px 'JetBrains Mono', 'Courier New', monospace`
          ctx.fillStyle = '#FFFFFF'
          ctx.textAlign = 'center'
          ctx.fillText(node.title.toUpperCase(), px, py - radius - (8 * scale))
        }
      }

      ctx.restore()
      animationId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationId)
  }, [nodes, edges, searchHighlightIds])

  // Mouse / Touch Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    state.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (state.current.pointers.size === 1) {
      state.current.isDragging = true
      state.current.lastMouseX = e.clientX
      state.current.lastMouseY = e.clientY
    } else if (state.current.pointers.size === 2) {
      state.current.isDragging = false // disable rotation when pinching
      const pts = Array.from(state.current.pointers.values())
      state.current.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    }
    try {
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const s = state.current
    if (s.pointers.has(e.pointerId)) {
      s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (s.pointers.size === 2) {
      // Pinch to zoom
      const pts = Array.from(s.pointers.values())
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (s.lastPinchDist > 0) {
        const delta = dist - s.lastPinchDist
        const zoomDelta = delta * 0.01 // Sensitivity
        let newZoom = s.zoom * (1 + zoomDelta)
        newZoom = Math.max(0.2, Math.min(newZoom, 5))
        s.zoom = newZoom
      }
      s.lastPinchDist = dist
      return // skip drag rotation
    }

    if (s.isDragging && s.pointers.size === 1) {
      const dx = e.clientX - s.lastMouseX
      const dy = e.clientY - s.lastMouseY
      // Y rotation is controlled by horizontal mouse movement
      s.rotY += dx * 0.005
      // X rotation is controlled by vertical mouse movement
      s.rotX += dy * 0.005
      s.lastMouseX = e.clientX
      s.lastMouseY = e.clientY
    } else if (s.pointers.size === 0) {
      // Hit detection (hover) only when not interacting
      const rect = canvasRef.current!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      
      let hitId: string | null = null
      // Check from front to back (drawOrder is sorted back-to-front, so we iterate backwards)
      if (projDataRef.current && drawOrderRef.current) {
        const projData = projDataRef.current
        const drawOrder = drawOrderRef.current
        for (let i = drawOrder.length - 1; i >= 0; i--) {
          const nodeIdx = drawOrder[i]
          const idx = nodeIdx * 5
          const scale = projData[idx + 4]
          if (scale < 0) continue
          
          const px = projData[idx + 0]
          const py = projData[idx + 1]
          const pr = projData[idx + 2]
          
          const r = Math.max(pr * 1.5, 5) // at least 5px hit radius
          const distSq = (px - mx) ** 2 + (py - my) ** 2
          if (distSq < r ** 2) {
            hitId = nodes[nodeIdx].id
            break
          }
        }
      }
      
      if (hitId !== s.hoveredId) {
        onHover(hitId)
      }
      
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hitId ? 'pointer' : s.isDragging ? 'grabbing' : 'grab'
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    state.current.pointers.delete(e.pointerId)
    
    if (state.current.pointers.size === 0) {
      state.current.isDragging = false
      state.current.lastPinchDist = 0
    } else if (state.current.pointers.size === 1) {
      const remaining = Array.from(state.current.pointers.values())[0]
      state.current.isDragging = true
      state.current.lastMouseX = remaining.x
      state.current.lastMouseY = remaining.y
      state.current.lastPinchDist = 0
    }

    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = state.current.hoveredId ? 'pointer' : 'grab'
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY * -0.001
    let newZoom = state.current.zoom * (1 + zoomDelta)
    newZoom = Math.max(0.2, Math.min(newZoom, 5))
    state.current.zoom = newZoom
  }
  
  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !projDataRef.current || !drawOrderRef.current) return
    
    // Perform hit detection directly on click for mobile tap support
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    
    let hitId: string | null = null
    const projData = projDataRef.current
    const drawOrder = drawOrderRef.current
    
    // Check from front to back
    for (let i = drawOrder.length - 1; i >= 0; i--) {
      const nodeIdx = drawOrder[i]
      const idx = nodeIdx * 5
      const scale = projData[idx + 4]
      if (scale < 0) continue
      
      const px = projData[idx + 0]
      const py = projData[idx + 1]
      const pr = projData[idx + 2]
      
      const r = Math.max(pr * 1.5, 5) // at least 5px hit radius
      const distSq = (px - mx) ** 2 + (py - my) ** 2
      if (distSq < r ** 2) {
        hitId = nodes[nodeIdx].id
        break
      }
    }

    if (hitId) {
      onClick(hitId)
    } else {
      onClick(null)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full outline-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleClick}
      style={{ cursor: 'grab', background: BG_COLOR }}
    />
  )
}

// ── Node Detail Panel ───────────────────────────────────────────────

function NodeDetailPanel({
  node,
  edges,
  allNodes,
  onClose,
}: {
  node: LayoutNode
  edges: GraphEdge[]
  allNodes: LayoutNode[]
  onClose: () => void
}) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>()
    for (const n of allNodes) map.set(n.id, n)
    return map
  }, [allNodes])

  const connections = useMemo(() => {
    const connected: LayoutNode[] = []
    for (const edge of edges) {
      if (edge.source === node.id) {
        const n = nodeMap.get(edge.target)
        if (n) connected.push(n)
      }
      if (edge.target === node.id) {
        const n = nodeMap.get(edge.source)
        if (n) connected.push(n)
      }
    }
    return connected
  }, [node, edges, nodeMap])

  const typeColor = getNodeColor(node.type)

  return (
    <div
      className="absolute right-4 top-16 z-10 w-60 sm:w-80 overflow-hidden rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 20, 35, 0.8), rgba(5, 10, 20, 0.95))',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/5 p-3 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm sm:text-base font-semibold tracking-wide text-white">
            {node.title}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: typeColor, boxShadow: `0 0 8px ${typeColor}` }}
            />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-300">
              {node.type ?? 'unknown'}
            </span>
            <span className="text-xs text-slate-500">
              • {node.connections} links
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-full bg-white/5 p-1.5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
          aria-label="Close detail panel"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      <div className="max-h-40 sm:max-h-64 overflow-y-auto p-2 sm:p-3">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Connected Nodes
        </p>
        {connections.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs italic text-slate-500">
            No connections found.
          </p>
        ) : (
          <ul className="space-y-1">
            {connections.map((c) => (
              <li
                key={c.id}
                className="group flex cursor-default items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-white/5"
              >
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getNodeColor(c.type), boxShadow: `0 0 6px ${getNodeColor(c.type)}` }}
                />
                <span className="truncate text-xs font-medium text-slate-300 transition-colors group-hover:text-white">
                  {c.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-white/5 p-4">
        <a
          href={`/memory?tab=knowledge&page=${encodeURIComponent(node.id)}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600/20 px-4 py-2.5 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-600/30 hover:text-indigo-200"
        >
          View in Databank
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </a>
      </div>
    </div>
  )
}

// ── Stats Bar ───────────────────────────────────────────────────────

function StatsBar({
  nodeCount,
  edgeCount,
  entityCount,
  conceptCount,
}: {
  nodeCount: number
  edgeCount: number
  entityCount: number
  conceptCount: number
}) {
  return (
    <div
      className="absolute bottom-4 left-4 z-10 flex items-center gap-4 rounded-lg border px-3 py-2"
      style={{
        background: 'color-mix(in srgb, #02040A 85%, transparent)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <StatItem label="Nodes" value={nodeCount} />
      <StatItem label="Edges" value={edgeCount} />
      <StatItem label="Entities" value={entityCount} color="#00FFFF" />
      <StatItem label="Concepts" value={conceptCount} color="#FFFFFF" />
    </div>
  )
}

function StatItem({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {color && (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 5px ${color}` }}
        />
      )}
      <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: '#FFFFFF' }}>
        {value}
      </span>
    </div>
  )
}

// ── Dummy Data Generator ──────────────────────────────────────────────
function getDummyGraphData(): GraphResponse {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  
  const types = ['entity', 'concept', 'action', 'file', 'folder']
  
  // Create 1000 nodes
  for (let i = 0; i < 1000; i++) {
    nodes.push({
      id: `node_${i}`,
      title: `Node ${Math.random().toString(36).substring(7)}`.toUpperCase(),
      type: types[Math.floor(Math.random() * types.length)],
      tags: ['dummy']
    })
  }

  // Create clusters (hubs)
  const hubs = [0, 20, 40, 60, 80]
  
  for (let i = 0; i < 1000; i++) {
    if (hubs.includes(i)) continue // Skip hubs themselves
    
    // Connect most nodes to a random hub (clustering effect)
    if (Math.random() > 0.3) {
      const randomHub = hubs[Math.floor(Math.random() * hubs.length)]
      edges.push({ source: `node_${i}`, target: `node_${randomHub}` })
    }
    
    // Add some random cross-connections
    if (Math.random() > 0.95) { // Reduce cross-connection probability to prevent excessive edges
      const randomTarget = Math.floor(Math.random() * 1000)
      if (i !== randomTarget) {
        edges.push({ source: `node_${i}`, target: `node_${randomTarget}` })
      }
    }
  }

  return { nodes, edges }
}

// ── Main Export ──────────────────────────────────────────────────────

export function GraphScreen() {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['knowledge-graph'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/graph')
      if (!res.ok) throw new Error('Failed to fetch graph')
      return (await res.json()) as GraphResponse
    },
    staleTime: 60_000,
  })

  const nodes = data?.nodes ?? []
  const edges = data?.edges ?? []

  const layoutNodes = useForceLayout(nodes, edges)

  const searchHighlightIds = useMemo(() => {
    if (!searchQuery.trim() || !layoutNodes) return new Set<string>()
    const q = searchQuery.toLowerCase()
    const ids = new Set<string>()
    for (const node of layoutNodes) {
      if (node.title.toLowerCase().includes(q)) ids.add(node.id)
    }
    return ids
  }, [searchQuery, layoutNodes])
  
  const selectedNode = useMemo(
    () => layoutNodes?.find(n => n.id === selectedNodeId) ?? null,
    [layoutNodes, selectedNodeId]
  )

  const entityCount = nodes.filter((n) => n.type?.toLowerCase() === 'entity').length
  const conceptCount = nodes.filter((n) => n.type?.toLowerCase() === 'concept').length

  if (error) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: 'var(--theme-danger)' }}>
        <p className="text-sm">Failed to load knowledge graph: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: BG_COLOR }}>
      {/* Header / Search Bar */}
      <div 
        className="absolute left-2 right-2 top-2 md:left-4 md:right-auto md:top-4 z-50 flex gap-2"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Mobile Hamburger Trigger */}
        <HamburgerTrigger className="md:hidden shrink-0 bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg" />
        
        {/* Search Input */}
        <div
          className="flex-1 md:w-[280px] flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{
            background: 'color-mix(in srgb, #02040A 85%, transparent)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <HugeiconsIcon icon={Search01Icon} size={14} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none min-w-0"
            style={{ color: '#FFFFFF' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="rounded p-0.5 hover:bg-white/10 shrink-0"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
            </button>
          )}
          {searchHighlightIds.size > 0 && (
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {searchHighlightIds.size} found
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {(isLoading || !layoutNodes) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--theme-border)', borderTopColor: 'transparent' }}
            />
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              {isLoading ? 'Loading knowledge graph...' : 'Computing layout...'}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {layoutNodes && layoutNodes.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                No knowledge pages found
              </p>
              <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                Your Knowledge Graph is currently empty.
              </p>
            </div>
            
            <div 
              className="rounded-md border p-3 text-left w-full shadow-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                How to connect your Second Brain:
              </p>
              <ol className="text-xs space-y-2 list-decimal pl-4" style={{ color: 'var(--theme-muted)' }}>
                <li>Go to the <strong style={{ color: 'var(--theme-text)' }}>Memory</strong> page from the sidebar.</li>
                <li>Click the <strong style={{ color: 'var(--theme-text)' }}>Knowledge Base</strong> tab.</li>
                <li>Click the <strong style={{ color: 'var(--theme-text)' }}>Settings</strong> (gear) icon.</li>
                <li>Set the source to <strong style={{ color: 'var(--theme-text)' }}>Local Path</strong> (e.g. <code>~/obsidian/memo</code>) or <strong style={{ color: 'var(--theme-text)' }}>GitHub Repo</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
      
      {/* 2D Canvas */}
      {layoutNodes && layoutNodes.length > 0 && (
        <CanvasRenderer
          nodes={layoutNodes}
          edges={edges}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={selectedNodeId}
          searchHighlightIds={searchHighlightIds}
          onHover={setHoveredNodeId}
          onClick={setSelectedNodeId}
        />
      )}

      {/* Node Detail Panel */}
      {selectedNode && layoutNodes && (
        <NodeDetailPanel
          node={selectedNode}
          edges={edges}
          allNodes={layoutNodes}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Stats Bar */}
      {layoutNodes && layoutNodes.length > 0 && (
        <StatsBar
          nodeCount={layoutNodes.length}
          edgeCount={edges.length}
          entityCount={entityCount}
          conceptCount={conceptCount}
        />
      )}
    </div>
  )
}
