/**
 * 3D Knowledge Graph — Second Brain Visualizer
 *
 * Renders the entire Second Brain (Obsidian Wiki) as an interactive
 * force-directed 3D graph using Three.js (react-three-fiber).
 *
 * Architecture:
 *   1. Fetch graph data from /api/knowledge/graph (nodes + edges)
 *   2. Compute 3D positions via d3-force-3d simulation
 *   3. Render spheres (nodes) + lines (edges) in a <Canvas>
 *   4. User can orbit, zoom, hover, click, and search
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Billboard } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useQuery } from '@tanstack/react-query'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'
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

// ── Colors ──────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  entity: '#60A5FA',
  concept: '#A78BFA',
  default: '#94A3B8',
}

const EDGE_COLOR = '#334155'
const EDGE_HOVER_COLOR = '#60A5FA'
const BG_COLOR = '#0B0F1A'

function getNodeColor(type?: string): string {
  if (!type) return NODE_COLORS.default
  return NODE_COLORS[type.toLowerCase()] ?? NODE_COLORS.default
}

function getNodeRadius(connections: number): number {
  return Math.max(0.15, Math.min(0.6, 0.15 + connections * 0.05))
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

    // Dynamic import so d3-force-3d doesn't break SSR
    void (async () => {
      const d3 = await import('d3-force-3d')

      // Count connections per node
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

      // Build simulation nodes & links
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
          d3.forceLink(simLinks).id((d: any) => d.id).distance(3).strength(0.4),
        )
        .force('charge', d3.forceManyBody().strength(-30))
        .force('center', d3.forceCenter())
        .force('collision', d3.forceCollide().radius(1))
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

// ── 3D Node Component ───────────────────────────────────────────────

function GraphNodeMesh({
  node,
  isHighlighted,
  isSelected,
  isFaded,
  onHover,
  onClick,
}: {
  node: LayoutNode
  isHighlighted: boolean
  isSelected: boolean
  isFaded: boolean
  onHover: (node: LayoutNode | null) => void
  onClick: (node: LayoutNode) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = getNodeColor(node.type)
  const radius = getNodeRadius(node.connections)
  const emissiveIntensity = isSelected ? 1.2 : isHighlighted ? 0.8 : 0.3

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isHighlighted || isSelected ? 1.3 : 1
      const s = meshRef.current.scale.x
      meshRef.current.scale.setScalar(s + (targetScale - s) * 0.1)
    }
  })

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(node)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(null)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick(node)
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent={isFaded}
          opacity={isFaded ? 0.15 : 1}
          toneMapped={false}
        />
      </mesh>

      {/* Label on hover/select */}
      {(isHighlighted || isSelected) && (
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          <Text
            position={[0, radius + 0.35, 0]}
            fontSize={0.28}
            color="#E2E8F0"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.02}
            outlineColor="#0B0F1A"
            font="/fonts/inter-latin-400-normal.woff2"
          >
            {node.title}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

// ── 3D Edge Component ───────────────────────────────────────────────

function GraphEdgeLine({
  from,
  to,
  isFaded,
}: {
  from: [number, number, number]
  to: [number, number, number]
  isFaded: boolean
}) {
  const points = useMemo(
    () => [new THREE.Vector3(...from), new THREE.Vector3(...to)],
    [from, to],
  )
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={isFaded ? '#1E293B' : EDGE_COLOR}
        transparent
        opacity={isFaded ? 0.08 : 0.35}
      />
    </line>
  )
}

// ── Camera Auto-Focus ───────────────────────────────────────────────

function CameraFocus({
  target,
}: {
  target: { x: number; y: number; z: number } | null
}) {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3())
  const active = useRef(false)

  useEffect(() => {
    if (target) {
      targetPos.current.set(target.x, target.y, target.z)
      active.current = true
    } else {
      active.current = false
    }
  }, [target])

  useFrame(() => {
    if (!active.current) return
    const dir = targetPos.current
      .clone()
      .sub(camera.position)
      .normalize()
    const dest = targetPos.current.clone().sub(dir.multiplyScalar(8))
    camera.position.lerp(dest, 0.03)
    camera.lookAt(targetPos.current)
  })

  return null
}

// ── 3D Scene ────────────────────────────────────────────────────────

function GraphScene({
  nodes,
  edges,
  hoveredNode,
  selectedNode,
  searchHighlightIds,
  focusTarget,
  onHover,
  onSelect,
}: {
  nodes: LayoutNode[]
  edges: GraphEdge[]
  hoveredNode: LayoutNode | null
  selectedNode: LayoutNode | null
  searchHighlightIds: Set<string>
  focusTarget: { x: number; y: number; z: number } | null
  onHover: (node: LayoutNode | null) => void
  onSelect: (node: LayoutNode) => void
}) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, LayoutNode>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  // Determine which nodes are actively highlighted
  const activeHighlightIds = useMemo(() => {
    const set = new Set<string>()
    if (searchHighlightIds.size > 0) {
      for (const id of searchHighlightIds) set.add(id)
    }
    if (selectedNode) {
      set.add(selectedNode.id)
      for (const edge of edges) {
        if (edge.source === selectedNode.id) set.add(edge.target)
        if (edge.target === selectedNode.id) set.add(edge.source)
      }
    }
    if (hoveredNode) {
      set.add(hoveredNode.id)
      for (const edge of edges) {
        if (edge.source === hoveredNode.id) set.add(edge.target)
        if (edge.target === hoveredNode.id) set.add(edge.source)
      }
    }
    return set
  }, [hoveredNode, selectedNode, searchHighlightIds, edges])

  const hasFocus = activeHighlightIds.size > 0

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[20, 20, 20]} intensity={0.6} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={3}
        maxDistance={80}
      />

      <CameraFocus target={focusTarget} />

      {/* Edges */}
      {edges.map((edge, i) => {
        const from = nodeMap.get(edge.source)
        const to = nodeMap.get(edge.target)
        if (!from || !to) return null
        const isFaded =
          hasFocus &&
          !activeHighlightIds.has(edge.source) &&
          !activeHighlightIds.has(edge.target)
        return (
          <GraphEdgeLine
            key={`e-${i}`}
            from={[from.x, from.y, from.z]}
            to={[to.x, to.y, to.z]}
            isFaded={isFaded}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <GraphNodeMesh
          key={node.id}
          node={node}
          isHighlighted={
            activeHighlightIds.has(node.id) ||
            hoveredNode?.id === node.id
          }
          isSelected={selectedNode?.id === node.id}
          isFaded={hasFocus && !activeHighlightIds.has(node.id)}
          onHover={onHover}
          onClick={onSelect}
        />
      ))}

      {/* Post-processing glow */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.6}
        />
      </EffectComposer>
    </>
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
      {/* Header */}
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

      {/* Connections */}
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

      {/* Open in Memory */}
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
  const [hoveredNode, setHoveredNode] = useState<LayoutNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [focusTarget, setFocusTarget] = useState<{
    x: number
    y: number
    z: number
  } | null>(null)

  // Fetch graph data
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

  // Compute 3D layout
  const layoutNodes = useForceLayout(nodes, edges)

  // Search
  const searchHighlightIds = useMemo(() => {
    if (!searchQuery.trim() || !layoutNodes) return new Set<string>()
    const q = searchQuery.toLowerCase()
    const ids = new Set<string>()
    for (const node of layoutNodes) {
      if (node.title.toLowerCase().includes(q)) ids.add(node.id)
    }
    return ids
  }, [searchQuery, layoutNodes])

  // Focus camera on first search result
  useEffect(() => {
    if (searchHighlightIds.size > 0 && layoutNodes) {
      const firstId = searchHighlightIds.values().next().value
      const node = layoutNodes.find((n) => n.id === firstId)
      if (node) setFocusTarget({ x: node.x, y: node.y, z: node.z })
    } else {
      setFocusTarget(null)
    }
  }, [searchHighlightIds, layoutNodes])

  const handleSelect = useCallback((node: LayoutNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
    setFocusTarget({ x: node.x, y: node.y, z: node.z })
  }, [])

  // Stats
  const entityCount = nodes.filter(
    (n) => n.type?.toLowerCase() === 'entity',
  ).length
  const conceptCount = nodes.filter(
    (n) => n.type?.toLowerCase() === 'concept',
  ).length

  if (error) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: 'var(--theme-danger)' }}>
        <p className="text-sm">Failed to load knowledge graph: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full" style={{ background: BG_COLOR }}>
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

      {/* 3D Canvas */}
      {layoutNodes && layoutNodes.length > 0 && (
        <Canvas
          camera={{ position: [0, 0, 30], fov: 55 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: BG_COLOR }}
          onPointerMissed={() => setSelectedNode(null)}
        >
          <color attach="background" args={[BG_COLOR]} />
          <GraphScene
            nodes={layoutNodes}
            edges={edges}
            hoveredNode={hoveredNode}
            selectedNode={selectedNode}
            searchHighlightIds={searchHighlightIds}
            focusTarget={focusTarget}
            onHover={setHoveredNode}
            onSelect={handleSelect}
          />
        </Canvas>
      )}

      {/* Node Detail Panel */}
      {selectedNode && layoutNodes && (
        <NodeDetailPanel
          node={selectedNode}
          edges={edges}
          allNodes={layoutNodes}
          onClose={() => setSelectedNode(null)}
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
