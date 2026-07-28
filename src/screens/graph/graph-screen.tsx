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
  entity: '#60A5FA',
  concept: '#A78BFA',
  default: '#94A3B8',
}

const BG_COLOR = '#0B0F1A'
const EDGE_COLOR = 'rgba(148, 163, 184, 0.25)' // Slate-400 with opacity
const EDGE_FADED_COLOR = 'rgba(148, 163, 184, 0.05)'
const EDGE_HIGHLIGHT_COLOR = 'rgba(96, 165, 250, 0.6)' // Blue-400

function getNodeColor(type?: string): string {
  if (!type) return NODE_COLORS.default
  return NODE_COLORS[type.toLowerCase()] ?? NODE_COLORS.default
}

function getNodeRadius(connections: number): number {
  return Math.max(3, Math.min(12, 3 + connections * 1.5))
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

    void (async () => {
      const d3 = await import('d3-force-3d')

      const connectionCount = new Map<string, number>()
      for (const node of nodes) connectionCount.set(node.id, 0)
      for (const edge of edges) {
        connectionCount.set(
          edge.source,
          (connectionCount.get(edge.source) ?? 0) + 1,
        )
        connectionCount.set(
          edge.target,
          (connectionCount.get(edge.target) ?? 0) + 1,
        )
      }

      const simNodes = nodes.map((n) => ({
        ...n,
        connections: connectionCount.get(n.id) ?? 0,
      }))
      const simLinks = edges
        .filter(
          (e) =>
            connectionCount.has(e.source) && connectionCount.has(e.target),
        )
        .map((e) => ({ source: e.source, target: e.target }))

      const simulation = d3
        .forceSimulation(simNodes, 3)
        .force(
          'link',
          d3.forceLink(simLinks).id((d: any) => d.id).distance(20).strength(0.5),
        )
        .force('charge', d3.forceManyBody().strength(-150))
        .force('center', d3.forceCenter())
        .stop()

      // Run simulation synchronously
      const iterations = 300
      for (let i = 0; i < iterations; i++) simulation.tick()

      setLayout(
        simNodes.map((n: any) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          tags: n.tags,
          x: n.x ?? 0,
          y: n.y ?? 0,
          z: n.z ?? 0,
          connections: n.connections,
        })),
      )
    })()
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
  
  // Transform state
  const state = useRef({
    rotX: 0,
    rotY: 0,
    zoom: 1,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    width: 0,
    height: 0,
    hoveredId: hoveredNodeId,
    selectedId: selectedNodeId,
    // Store projected 2D coordinates for hit detection
    projectedNodes: [] as Array<{
      id: string
      px: number
      py: number
      pr: number
      z: number
    }>,
  })

  // Sync props to mutable ref so animation loop can read them without recreating closures
  useEffect(() => {
    state.current.hoveredId = hoveredNodeId
    state.current.selectedId = selectedNodeId
  }, [hoveredNodeId, selectedNodeId])

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

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const render = () => {
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
      const focalLength = 400 * zoom
      const cameraDistance = 400

      // Compute active highlights (search + selected + hovered + their edges)
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
            activeEdges.add(`${edge.source}->${edge.target}`)
          }
        }
      }

      if (selectedId) addActive(selectedId)
      if (hoveredId) addActive(hoveredId)
      
      const hasFocus = activeIds.size > 0

      // Project nodes 3D -> 2D
      const projNodes = []
      const nodeMap = new Map<string, any>()
      
      for (const node of nodes) {
        // Rotate around Y
        const r1x = node.x * cosY - node.z * sinY
        const r1z = node.x * sinY + node.z * cosY
        // Rotate around X
        const r2y = node.y * cosX - r1z * sinX
        const finalZ = node.y * sinX + r1z * cosX

        // Perspective
        const scale = focalLength / (focalLength + finalZ + cameraDistance)
        const px = r1x * scale + cx
        const py = r2y * scale + cy
        const pr = getNodeRadius(node.connections) * scale

        const pNode = { ...node, px, py, pr, z: finalZ, scale }
        projNodes.push(pNode)
        nodeMap.set(node.id, pNode)
      }

      // Sort by Z for proper draw order (back to front)
      projNodes.sort((a, b) => b.z - a.z)
      
      // Save for hit detection
      state.current.projectedNodes = projNodes

      // Draw Edges
      ctx.lineWidth = 1
      for (const edge of edges) {
        const from = nodeMap.get(edge.source)
        const to = nodeMap.get(edge.target)
        if (!from || !to) continue
        
        // Don't draw edges behind camera
        if (from.scale < 0 || to.scale < 0) continue

        let isFaded = hasFocus
        let isHighlighted = false
        
        if (activeEdges.has(`${edge.source}->${edge.target}`) || activeEdges.has(`${edge.target}->${edge.source}`)) {
          isFaded = false
          isHighlighted = true
        } else if (activeIds.has(edge.source) && activeIds.has(edge.target)) {
          isFaded = false
        }

        ctx.beginPath()
        ctx.moveTo(from.px, from.py)
        ctx.lineTo(to.px, to.py)
        ctx.strokeStyle = isHighlighted ? EDGE_HIGHLIGHT_COLOR : isFaded ? EDGE_FADED_COLOR : EDGE_COLOR
        ctx.stroke()
      }

      // Draw Nodes
      for (const node of projNodes) {
        if (node.scale < 0) continue // behind camera
        
        const isHighlighted = activeIds.has(node.id) || hoveredId === node.id || searchHighlightIds.has(node.id)
        const isSelected = selectedId === node.id
        const isFaded = hasFocus && !isHighlighted
        const isSearchHit = searchHighlightIds.has(node.id)
        
        const baseColor = getNodeColor(node.type)
        const radius = isHighlighted || isSelected ? node.pr * 1.5 : node.pr
        
        ctx.beginPath()
        ctx.arc(node.px, node.py, Math.max(0.5, radius), 0, Math.PI * 2)
        
        if (isFaded) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.15)'
        } else {
          ctx.fillStyle = baseColor
          if (isHighlighted || isSelected) {
            ctx.shadowColor = baseColor
            ctx.shadowBlur = 10 * node.scale
          }
        }
        ctx.fill()
        
        if (isSelected || isSearchHit) {
           ctx.strokeStyle = '#FFFFFF'
           ctx.lineWidth = 2 * node.scale
           ctx.stroke()
        }
        
        ctx.shadowBlur = 0 // reset shadow for next draw

        // Draw Label if highlighted
        if (isHighlighted || isSelected) {
          ctx.font = `${Math.max(10, 12 * Math.min(1.5, node.scale))}px Inter, sans-serif`
          ctx.fillStyle = '#E2E8F0'
          ctx.textAlign = 'center'
          ctx.fillText(node.title, node.px, node.py - radius - (5 * node.scale))
        }
      }

      ctx.restore()
      animationId = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(animationId)
  }, [nodes, edges, searchHighlightIds])

  // Mouse Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    state.current.isDragging = true
    state.current.lastMouseX = e.clientX
    state.current.lastMouseY = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const s = state.current
    if (s.isDragging) {
      const dx = e.clientX - s.lastMouseX
      const dy = e.clientY - s.lastMouseY
      // Y rotation is controlled by horizontal mouse movement
      s.rotY += dx * 0.005
      // X rotation is controlled by vertical mouse movement
      s.rotX += dy * 0.005
      s.lastMouseX = e.clientX
      s.lastMouseY = e.clientY
    } else {
      // Hit detection (hover)
      const rect = canvasRef.current!.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      
      let hitId: string | null = null
      // Check from front to back (projectedNodes are sorted back-to-front, so we iterate backwards)
      for (let i = s.projectedNodes.length - 1; i >= 0; i--) {
        const p = s.projectedNodes[i]
        const r = Math.max(p.pr * 1.5, 5) // at least 5px hit radius
        const distSq = (p.px - mx) ** 2 + (p.py - my) ** 2
        if (distSq < r ** 2) {
          hitId = p.id
          break
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
    if (state.current.isDragging) {
      state.current.isDragging = false
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      if (canvasRef.current) canvasRef.current.style.cursor = state.current.hoveredId ? 'pointer' : 'grab'
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
    // Only click if not dragging significantly
    if (state.current.hoveredId) {
      onClick(state.current.hoveredId)
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
      className="absolute right-4 top-4 z-10 w-80 overflow-hidden rounded-xl border shadow-2xl"
      style={{
        background: 'color-mix(in srgb, var(--theme-bg) 92%, transparent)',
        borderColor: 'var(--theme-border)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-start justify-between gap-2 border-b p-4" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
            {node.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: typeColor }}
            />
            <span className="text-xs capitalize" style={{ color: 'var(--theme-muted)' }}>
              {node.type ?? 'unknown'}
            </span>
            <span className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              - {node.connections} connection{node.connections !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--theme-card2)]"
          aria-label="Close detail panel"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} style={{ color: 'var(--theme-muted)' }} />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-muted)' }}>
          Connected to
        </p>
        {connections.length === 0 ? (
          <p className="text-xs italic" style={{ color: 'var(--theme-muted)' }}>
            No connections
          </p>
        ) : (
          <ul className="space-y-1">
            {connections.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--theme-card2)]"
              >
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getNodeColor(c.type) }}
                />
                <span className="truncate" style={{ color: 'var(--theme-text)' }}>
                  {c.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t p-3" style={{ borderColor: 'var(--theme-border)' }}>
        <a
          href={`/memory?tab=knowledge&page=${encodeURIComponent(node.id)}`}
          className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          style={{
            background: 'var(--theme-card2)',
            color: 'var(--theme-text)',
          }}
        >
          Open in Memory
          <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
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
        background: 'color-mix(in srgb, var(--theme-bg) 85%, transparent)',
        borderColor: 'var(--theme-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <StatItem label="Nodes" value={nodeCount} />
      <StatItem label="Edges" value={edgeCount} />
      <StatItem label="Entities" value={entityCount} color="#60A5FA" />
      <StatItem label="Concepts" value={conceptCount} color="#A78BFA" />
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
          style={{ backgroundColor: color }}
        />
      )}
      <span style={{ color: 'var(--theme-muted)' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: 'var(--theme-text)' }}>
        {value}
      </span>
    </div>
  )
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
      {/* Search Bar */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border px-3 py-2"
        style={{
          background: 'color-mix(in srgb, var(--theme-bg) 85%, transparent)',
          borderColor: 'var(--theme-border)',
          backdropFilter: 'blur(12px)',
          width: 280,
        }}
      >
        <HugeiconsIcon icon={Search01Icon} size={14} style={{ color: 'var(--theme-muted)' }} />
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: 'var(--theme-text)' }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="rounded p-0.5 hover:bg-[var(--theme-card2)]"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} style={{ color: 'var(--theme-muted)' }} />
          </button>
        )}
        {searchHighlightIds.size > 0 && (
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--theme-muted)' }}>
            {searchHighlightIds.size} found
          </span>
        )}
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
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              No knowledge pages found
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              Start adding pages to your Second Brain wiki to see them here.
            </p>
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
