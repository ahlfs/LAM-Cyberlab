/**
 * Obsidian-Style Live 2D Interactive Concept Graph
 *
 * Impeccable Architecture:
 * 1. Live organic spring physics with decay-to-sleep (0% CPU at equilibrium).
 * 2. Interactive node dragging with spring tension and elastic ripple effect.
 * 3. Smart Level-of-Detail (LOD) typography with dark contrast halos.
 * 4. Side-over Inspector Drawer for instant Markdown reading & relation traversal.
 * 5. Category filter pills (Concepts, Entities, Projects, Skills, Daily notes).
 */
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// @ts-ignore
import * as d3 from 'd3-force-3d'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Cancel01Icon,
  Add01Icon,
  MinusSignIcon,
  ViewIcon,
  ViewOffIcon,
  SidebarLeftIcon,
} from '@hugeicons/core-free-icons'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useCurrentTheme } from '@/lib/theme'
import { useNavigate } from '@tanstack/react-router'
import {
  GraphFilterBar,
  CATEGORY_CONFIG,
  type GraphCategory,
} from './components/graph-filter-bar'
import {
  GraphSideInspector,
  type InspectorNode,
} from './components/graph-side-inspector'

// ── Types ───────────────────────────────────────────────────────────

export type GraphNode = {
  id: string
  title: string
  type?: string
  tags?: string[]
}

export type GraphEdge = {
  source: string
  target: string
}

export type GraphResponse = {
  nodes?: GraphNode[]
  edges?: GraphEdge[]
}

type SimNode = GraphNode & {
  x: number
  y: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  connections: number
}

type SimLink = {
  source: SimNode
  target: SimNode
}

// ── Color Schemes & Physics Helpers ─────────────────────────────────

export function getNodeColor(type?: string, isDark: boolean = true): string {
  const normalized = (type?.toLowerCase() || 'concept') as GraphCategory
  // Read dynamic theme tokens computed from the current document root
  if (typeof window !== 'undefined') {
    const computed = getComputedStyle(document.documentElement)
    const themeAccent = computed.getPropertyValue('--theme-accent').trim()
    const themeText = computed.getPropertyValue('--theme-text').trim()
    const themeBorder = computed.getPropertyValue('--theme-border').trim()
    const themeSuccess = computed.getPropertyValue('--theme-success').trim()
    const themeWarning = computed.getPropertyValue('--theme-warning').trim()
    const themeDanger = computed.getPropertyValue('--theme-danger').trim()

    if (normalized === 'concept') {
      return themeText || (isDark ? '#f8fafc' : '#0f172a')
    }
    if (normalized === 'entity') {
      return themeAccent || (isDark ? '#2dd4bf' : '#0d9488')
    }
    if (normalized === 'project') {
      return themeSuccess || (isDark ? '#10b981' : '#059669')
    }
    if (normalized === 'skill') {
      return themeDanger || (isDark ? '#f43f5e' : '#e11d48')
    }
    if (normalized === 'daily') {
      return themeWarning || (isDark ? '#38bdf8' : '#0284c7')
    }
  }

  if (normalized === 'concept') {
    return isDark ? '#f8fafc' : '#0f172a'
  }
  if (normalized === 'entity') {
    return isDark ? '#2dd4bf' : '#0d9488'
  }
  if (normalized === 'project') {
    return isDark ? '#10b981' : '#059669'
  }
  if (normalized === 'skill') {
    return isDark ? '#f43f5e' : '#e11d48'
  }
  if (normalized === 'daily') {
    return isDark ? '#38bdf8' : '#0284c7'
  }
  const fallback = CATEGORY_CONFIG[normalized] as { color: string } | undefined
  return fallback?.color || (isDark ? '#f8fafc' : '#0f172a')
}

export function getNodeRadius(connections: number): number {
  return Math.max(4, Math.min(16, 4 + Math.sqrt(connections) * 2.5))
}

// ── Obsidian 2D Canvas Renderer ─────────────────────────────────────

function CanvasRenderer({
  nodesData,
  edgesData,
  hoveredNodeId,
  selectedNodeId,
  searchHighlightIds,
  showLabels,
  onHover,
  onClick,
  onResetRef,
  onZoomInRef,
  onZoomOutRef,
}: {
  nodesData: GraphNode[]
  edgesData: GraphEdge[]
  hoveredNodeId: string | null
  selectedNodeId: string | null
  searchHighlightIds: Set<string>
  showLabels: boolean
  onHover: (id: string | null) => void
  onClick: (id: string | null) => void
  onResetRef: React.MutableRefObject<(() => void) | null>
  onZoomInRef: React.MutableRefObject<(() => void) | null>
  onZoomOutRef: React.MutableRefObject<(() => void) | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useCurrentTheme()

  const simNodesRef = useRef<SimNode[]>([])
  const simLinksRef = useRef<SimLink[]>([])
  const simulationRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const hoveredNodeIdRef = useRef<string | null>(null)
  hoveredNodeIdRef.current = hoveredNodeId
  const lastPointerPosRef = useRef<{ screenX: number; screenY: number } | null>(null)

  // 2D Viewport Transform
  const transformRef = useRef({
    panX: 0,
    panY: 0,
    zoom: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastPanX: 0,
    lastPanY: 0,
    isDraggingNode: false,
    draggedNode: null as SimNode | null,
  })

  // Fast lookups & adjacency map
  const { neighborMap } = useMemo(() => {
    const adjMap = new Map<string, Set<string>>()
    for (const node of nodesData) {
      adjMap.set(node.id, new Set())
    }
    for (const edge of edgesData) {
      adjMap.get(edge.source)?.add(edge.target)
      adjMap.get(edge.target)?.add(edge.source)
    }
    return { neighborMap: adjMap }
  }, [nodesData, edgesData])

  // Active focus IDs (selected or hovered node + its immediate neighbors)
  const activeFocus = useMemo(() => {
    const focusNodeId = hoveredNodeId || selectedNodeId
    if (!focusNodeId) return null

    const set = new Set<string>()
    set.add(focusNodeId)
    const neighbors = neighborMap.get(focusNodeId)
    if (neighbors) {
      for (const neighborId of neighbors) {
        set.add(neighborId)
      }
    }
    return {
      centerId: focusNodeId,
      connectedIds: set,
    }
  }, [hoveredNodeId, selectedNodeId, neighborMap])

  // Single Frame Draw Function
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)

    const { panX, panY, zoom } = transformRef.current
    const cx = width / 2 + panX
    const cy = height / 2 + panY

    // Apply 2D World Transform
    ctx.translate(cx, cy)
    ctx.scale(zoom, zoom)

    const hasSearch = searchHighlightIds.size > 0
    const hasFocus = activeFocus !== null
    const nodes = simNodesRef.current
    const links = simLinksRef.current

    // 1. Draw Links / Edges
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const s = link.source
      const t = link.target
      if (!s || !t) continue

      let isEdgeHighlighted = false
      let isEdgeFaded = false

      if (hasFocus) {
        const isConnectedToCenter =
          (s.id === activeFocus.centerId && activeFocus.connectedIds.has(t.id)) ||
          (t.id === activeFocus.centerId && activeFocus.connectedIds.has(s.id))

        if (isConnectedToCenter) {
          isEdgeHighlighted = true
        } else {
          isEdgeFaded = true
        }
      } else if (hasSearch) {
        const isSearchLinked =
          searchHighlightIds.has(s.id) && searchHighlightIds.has(t.id)
        if (isSearchLinked) {
          isEdgeHighlighted = true
        } else {
          isEdgeFaded = true
        }
      }

      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(t.x, t.y)

      if (isEdgeHighlighted) {
        ctx.strokeStyle = '#818cf8'
        ctx.lineWidth = Math.max(1.8 / zoom, 1.2)
        ctx.globalAlpha = 0.9
      } else if (isEdgeFaded) {
        ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1'
        ctx.lineWidth = Math.max(0.6 / zoom, 0.4)
        ctx.globalAlpha = 0.08
      } else {
        ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'
        ctx.lineWidth = Math.max(0.9 / zoom, 0.6)
        ctx.globalAlpha = 0.25
      }

      ctx.stroke()
    }

    // 2. Draw Nodes
    const drawnLabelBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = []

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const baseRadius = getNodeRadius(node.connections)

      let isHighlighted = false
      let isFaded = false

      if (hasFocus) {
        if (node.id === activeFocus.centerId) {
          isHighlighted = true
        } else if (activeFocus.connectedIds.has(node.id)) {
          isHighlighted = true
        } else {
          isFaded = true
        }
      } else if (hasSearch) {
        if (searchHighlightIds.has(node.id)) {
          isHighlighted = true
        } else {
          isFaded = true
        }
      }

      const isCenter = hasFocus && node.id === activeFocus.centerId
      const nodeColor = getNodeColor(node.type, isDark)

      // Node Radius & Scale
      let radius = baseRadius
      if (isCenter) radius = baseRadius * 1.35
      else if (isHighlighted) radius = baseRadius * 1.15

      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)

      if (isCenter) {
        ctx.fillStyle = isDark ? '#ffffff' : '#000000'
        ctx.shadowColor = nodeColor
        ctx.shadowBlur = 18
        ctx.globalAlpha = 1.0
      } else if (isHighlighted) {
        ctx.fillStyle = nodeColor
        ctx.shadowColor = nodeColor
        ctx.shadowBlur = 10
        ctx.globalAlpha = 0.95
      } else if (isFaded) {
        ctx.fillStyle = isDark ? '#475569' : '#cbd5e1'
        ctx.shadowBlur = 0
        ctx.globalAlpha = isDark ? 0.12 : 0.18
      } else {
        ctx.fillStyle = nodeColor
        ctx.shadowColor = nodeColor
        ctx.shadowBlur = isDark ? 4 : 2
        ctx.globalAlpha = isDark ? 0.9 : 0.95
      }

      ctx.fill()
      ctx.shadowBlur = 0 // reset shadow blur

      // Center Node Accent Ring
      if (isCenter) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 3.5, 0, Math.PI * 2)
        ctx.strokeStyle = nodeColor
        ctx.lineWidth = 1.5 / zoom
        ctx.globalAlpha = 0.9
        ctx.stroke()
      }

      // 3. Smart Obsidian LOD: Show label when hovered/clicked/active OR when "Always Show Labels" (icon mata) is turned ON
      const shouldRenderLabel =
        (showLabels && !isFaded) ||
        isHighlighted ||
        (hasSearch && searchHighlightIds.has(node.id))

      if (shouldRenderLabel) {
        const fontSize = Math.max(9, Math.min(12, 11 / Math.sqrt(zoom)))
        ctx.font = `${isCenter ? '600' : '500'} ${fontSize}px Inter, -apple-system, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'

        const rawTitle = node.title || node.id
        const labelText = rawTitle
        const textY = node.y + radius + 5

        const textMetrics = ctx.measureText(labelText)
        const textWidth = textMetrics.width
        const textHeight = fontSize * 1.25

        const box = {
          x1: node.x - textWidth / 2 - 8,
          y1: textY - 2,
          x2: node.x + textWidth / 2 + 8,
          y2: textY + textHeight + 3,
        }

        drawnLabelBoxes.push(box)

        // Pill contrast background
        ctx.fillStyle = isDark
          ? 'rgba(11, 13, 19, 0.95)'
          : 'rgba(255, 255, 255, 0.95)'
        ctx.globalAlpha = 0.98
        ctx.fillRect(
          box.x1,
          box.y1,
          box.x2 - box.x1,
          box.y2 - box.y1,
        )

        ctx.strokeStyle = isCenter
          ? nodeColor
          : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)')
        ctx.lineWidth = isCenter ? 1.5 : 1
        ctx.strokeRect(
          box.x1,
          box.y1,
          box.x2 - box.x1,
          box.y2 - box.y1,
        )

        // Text
        ctx.globalAlpha = 1
        ctx.fillStyle = isDark ? '#ffffff' : '#09090b'
        ctx.fillText(labelText, node.x, textY)
      }
    }

    ctx.restore()
  }, [activeFocus, searchHighlightIds, showLabels, isDark])

  // Coordinate Conversion (Screen to Simulation Space)
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const { panX, panY, zoom } = transformRef.current
    const cx = width / 2 + panX
    const cy = height / 2 + panY
    return {
      x: (screenX - cx) / zoom,
      y: (screenY - cy) / zoom,
    }
  }, [])

  // Find Nearest Node Under Cursor (Generous hit radius so moving nodes are easily caught without stutter)
  const getNodeAtScreenPos = useCallback(
    (screenX: number, screenY: number): SimNode | null => {
      const { x, y } = screenToWorld(screenX, screenY)
      const zoom = transformRef.current.zoom
      const nodes = simNodesRef.current

      let closestNode: SimNode | null = null
      let closestDistSq = Infinity

      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i]
        const radius = getNodeRadius(node.connections)
        // Dynamic generous tolerance (minimum 22px in screen space)
        const hitRadius = Math.max(radius + 8, 22 / zoom)
        const dx = node.x - x
        const dy = node.y - y
        const distSq = dx * dx + dy * dy
        if (distSq <= hitRadius * hitRadius && distSq < closestDistSq) {
          closestDistSq = distSq
          closestNode = node
        }
      }
      return closestNode
    },
    [screenToWorld],
  )

  // React to selectedNodeId: smooth animated zoom to fit node + all its connected neighbors
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !selectedNodeId) return

    const nodes = simNodesRef.current
    const targetNode = nodes.find((n) => n.id === selectedNodeId)
    if (!targetNode || targetNode.x === undefined || targetNode.y === undefined) return

    const neighbors = neighborMap.get(selectedNodeId) || new Set<string>()
    const clusterNodes: SimNode[] = [targetNode]

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      if (neighbors.has(n.id) && n.x !== undefined && n.y !== undefined) {
        clusterNodes.push(n)
      }
    }

    // Compute bounding box around cluster
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (let i = 0; i < clusterNodes.length; i++) {
      const cn = clusterNodes[i]
      const r = getNodeRadius(cn.connections) + 36
      if (cn.x - r < minX) minX = cn.x - r
      if (cn.x + r > maxX) maxX = cn.x + r
      if (cn.y - r < minY) minY = cn.y - r
      if (cn.y + r > maxY) maxY = cn.y + r
    }

    const bboxWidth = Math.max(100, maxX - minX)
    const bboxHeight = Math.max(100, maxY - minY)
    const clusterCenterX = (minX + maxX) / 2
    const clusterCenterY = (minY + maxY) / 2

    const width = canvas.clientWidth
    const height = canvas.clientHeight

    // Account for right-side inspector drawer (~380px)
    const availableWidth = width > 800 ? width - 380 : width
    const padding = 70
    const zoomX = (availableWidth - padding) / bboxWidth
    const zoomY = (height - padding) / bboxHeight
    const desiredZoom = Math.max(0.65, Math.min(2.5, Math.min(zoomX, zoomY)))

    const desiredPanX = -clusterCenterX * desiredZoom - (width > 800 ? 120 : 0)
    const desiredPanY = -clusterCenterY * desiredZoom

    const startPanX = transformRef.current.panX
    const startPanY = transformRef.current.panY
    const startZoom = transformRef.current.zoom
    const startTime = performance.now()
    const duration = 380

    const animateZoom = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic curve
      const ease = 1 - Math.pow(1 - progress, 3)

      transformRef.current.panX = startPanX + (desiredPanX - startPanX) * ease
      transformRef.current.panY = startPanY + (desiredPanY - startPanY) * ease
      transformRef.current.zoom = startZoom + (desiredZoom - startZoom) * ease

      renderFrame()

      if (progress < 1) {
        requestAnimationFrame(animateZoom)
      }
    }

    requestAnimationFrame(animateZoom)
  }, [selectedNodeId, neighborMap, renderFrame])

  // Redraw when visual state changes (without restarting simulation)
  useEffect(() => {
    renderFrame()
  }, [renderFrame])

  // Initialize and Update Force Simulation (ONLY on dataset identity change)
  useEffect(() => {
    if (!nodesData || nodesData.length === 0) return

    // If simulation is already initialized and running/sleeping on the same nodes length, do not re-run
    if (simulationRef.current && simNodesRef.current.length === nodesData.length) {
      return
    }

    const connectionCountMap = new Map<string, number>()
    for (const edge of edgesData) {
      connectionCountMap.set(
        edge.source,
        (connectionCountMap.get(edge.source) || 0) + 1,
      )
      connectionCountMap.set(
        edge.target,
        (connectionCountMap.get(edge.target) || 0) + 1,
      )
    }

    const existingMap = new Map<string, SimNode>()
    for (const sn of simNodesRef.current) {
      existingMap.set(sn.id, sn)
    }

    const simNodes: SimNode[] = nodesData.map((n, i) => {
      const existing = existingMap.get(n.id)
      const connections = connectionCountMap.get(n.id) || 0
      if (existing) {
        return {
          ...n,
          x: existing.x,
          y: existing.y,
          vx: 0,
          vy: 0,
          connections,
        }
      }

      // Initial organic balanced distribution centered on viewport origin
      const angle = i * 0.38
      const radius = 35 + Math.sqrt(i) * 36
      return {
        ...n,
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 15,
        y: Math.sin(angle) * radius + (Math.random() - 0.5) * 15,
        connections,
      }
    })

    const nodeById = new Map<string, SimNode>()
    for (const sn of simNodes) {
      nodeById.set(sn.id, sn)
    }

    const simLinks: SimLink[] = []
    for (const edge of edgesData) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (source && target) {
        simLinks.push({ source, target })
      }
    }

    simNodesRef.current = simNodes
    simLinksRef.current = simLinks

    if (simulationRef.current) {
      simulationRef.current.stop()
    }

    // Cluster focal centers by category for structured visual grouping
    const CLUSTER_CENTERS: Record<string, { x: number; y: number }> = {
      concept: { x: -80, y: -20 },
      entity: { x: -140, y: 160 },
      project: { x: 0, y: 180 },
      skill: { x: 260, y: -40 },
      daily: { x: 220, y: 180 },
    }

    // 2D Force Simulation (Obsidian-Style Organic Spring Decay)
    const sim = d3
      .forceSimulation(simNodes, 2)
      .force(
        'link',
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance((d: any) => 65 + Math.sqrt((d.source.connections || 0) + (d.target.connections || 0)) * 8)
          .strength(0.4),
      )
      .force(
        'charge',
        d3
          .forceManyBody()
          .strength((d: any) => (d.connections > 0 ? -220 - (d.connections || 0) * 12 : -70))
          .distanceMax(650),
      )
      .force(
        'clusterX',
        d3.forceX((d: any) => {
          const cat = (d.type?.toLowerCase() || 'concept') as string
          return CLUSTER_CENTERS[cat]?.x || 0
        }).strength((d: any) => (d.connections > 0 ? 0.05 : 0.2))
      )
      .force(
        'clusterY',
        d3.forceY((d: any) => {
          const cat = (d.type?.toLowerCase() || 'concept') as string
          return CLUSTER_CENTERS[cat]?.y || 0
        }).strength((d: any) => (d.connections > 0 ? 0.05 : 0.2))
      )
      .force('center', d3.forceCenter(0, 0).strength(0.02))
      .force(
        'collision',
        d3
          .forceCollide()
          .radius((d: any) => getNodeRadius(d.connections) + 16)
          .iterations(3),
      )
      .alphaDecay(0.022)
      .alphaMin(0.005)

    sim.on('tick', () => {
      renderFrame()
    })

    simulationRef.current = sim

    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      sim.alpha(0.7).restart()
    } else {
      renderFrame()
    }

    return () => {
      sim.stop()
    }
  }, [nodesData, edgesData])

  // Mouse / Drag & Click Handlers
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let clickStartX = 0
    let clickStartY = 0
    let clickedNodeCandidate: SimNode | null = null

    const isEventOverModalOrOverlay = (e: MouseEvent): boolean => {
      const target = e.target as HTMLElement | null
      if (!target) return false
      // If event happened on something outside this canvas (e.g. settings modal dialog, drawer, overlay)
      if (target !== canvas && !canvas.contains(target)) {
        return true
      }
      return false
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (isEventOverModalOrOverlay(e)) return
      const rect = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      clickStartX = e.clientX
      clickStartY = e.clientY

      const hitNode = getNodeAtScreenPos(screenX, screenY)
      clickedNodeCandidate = hitNode

      if (hitNode) {
        // Dragging a node (Reheats physics organically)
        transformRef.current.isDraggingNode = true
        transformRef.current.draggedNode = hitNode
        hitNode.fx = hitNode.x
        hitNode.fy = hitNode.y

        if (simulationRef.current) {
          simulationRef.current.on('tick', renderFrame)
          simulationRef.current.alphaTarget(0.3).restart()
        }
      } else {
        // Panning the canvas
        transformRef.current.isDragging = true
        transformRef.current.dragStartX = e.clientX
        transformRef.current.dragStartY = e.clientY
        transformRef.current.lastPanX = transformRef.current.panX
        transformRef.current.lastPanY = transformRef.current.panY
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (isEventOverModalOrOverlay(e)) {
        if (hoveredNodeIdRef.current !== null) {
          hoveredNodeIdRef.current = null
          onHover(null)
          renderFrame()
        }
        return
      }

      const rect = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      lastPointerPosRef.current = { screenX, screenY }

      if (transformRef.current.isDraggingNode && transformRef.current.draggedNode) {
        const { x, y } = screenToWorld(screenX, screenY)
        transformRef.current.draggedNode.fx = x
        transformRef.current.draggedNode.fy = y
        renderFrame()
      } else if (transformRef.current.isDragging) {
        const dx = e.clientX - transformRef.current.dragStartX
        const dy = e.clientY - transformRef.current.dragStartY
        transformRef.current.panX = transformRef.current.lastPanX + dx
        transformRef.current.panY = transformRef.current.lastPanY + dy
        renderFrame()
      } else {
        const hitNode = getNodeAtScreenPos(screenX, screenY)
        canvas.style.cursor = hitNode ? 'pointer' : 'grab'
        if (hoveredNodeIdRef.current !== (hitNode ? hitNode.id : null)) {
          hoveredNodeIdRef.current = hitNode ? hitNode.id : null
          onHover(hitNode ? hitNode.id : null)
        }
        renderFrame()
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isEventOverModalOrOverlay(e)) return
      const rect = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top

      const dx = Math.abs(e.clientX - clickStartX)
      const dy = Math.abs(e.clientY - clickStartY)
      const isPureClick = dx < 6 && dy < 6

      if (transformRef.current.isDraggingNode) {
        if (transformRef.current.draggedNode) {
          transformRef.current.draggedNode.fx = null
          transformRef.current.draggedNode.fy = null
          transformRef.current.draggedNode = null
        }
        transformRef.current.isDraggingNode = false
        if (simulationRef.current) {
          simulationRef.current.alphaTarget(0)
          simulationRef.current.on('end', () => {
            simulationRef.current?.on('tick', null)
          })
        }
      }

      if (transformRef.current.isDragging) {
        transformRef.current.isDragging = false
      }

      if (isPureClick) {
        const hitNode = getNodeAtScreenPos(screenX, screenY) || clickedNodeCandidate
        onClick(hitNode ? hitNode.id : null)
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const { panX, panY, zoom } = transformRef.current
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
      const newZoom = Math.max(0.15, Math.min(5.0, zoom * zoomFactor))

      const cx = width / 2 + panX
      const cy = height / 2 + panY

      const newPanX = mouseX - (mouseX - cx) * (newZoom / zoom) - width / 2
      const newPanY = mouseY - (mouseY - cy) * (newZoom / zoom) - height / 2

      transformRef.current.zoom = newZoom
      transformRef.current.panX = newPanX
      transformRef.current.panY = newPanY

      renderFrame()
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('wheel', handleWheel)
    }
  }, [getNodeAtScreenPos, screenToWorld, onHover, onClick, renderFrame])

  // Resize Observer to match DPR
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      renderFrame()
    })

    ro.observe(canvas)
    return () => ro.disconnect()
  }, [renderFrame])

  // External Ref Controls
  useEffect(() => {
    onResetRef.current = () => {
      transformRef.current.panX = 0
      transformRef.current.panY = 0
      transformRef.current.zoom = 1
      renderFrame()
    }
    onZoomInRef.current = () => {
      transformRef.current.zoom = Math.min(5.0, transformRef.current.zoom * 1.3)
      renderFrame()
    }
    onZoomOutRef.current = () => {
      transformRef.current.zoom = Math.max(0.15, transformRef.current.zoom * 0.77)
      renderFrame()
    }
  }, [onResetRef, onZoomInRef, onZoomOutRef, renderFrame])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block touch-none"
      style={{
        backgroundColor: 'var(--theme-bg, #08090a)',
      }}
    />
  )
}

// ── Root Screen Component ───────────────────────────────────────────

export function GraphScreen() {
  const navigate = useNavigate()
  const { isDark } = useCurrentTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAlwaysLabels, setShowAlwaysLabels] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Top Category Filter State
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(['concept', 'entity', 'project', 'skill', 'daily']),
  )

  const onResetRef = useRef<(() => void) | null>(null)
  const onZoomInRef = useRef<(() => void) | null>(null)
  const onZoomOutRef = useRef<(() => void) | null>(null)

  const { data: rawGraph, isLoading } = useQuery<GraphResponse>({
    queryKey: ['knowledge-graph'],
    queryFn: async () => {
      const res = await fetch('/api/knowledge/graph')
      if (!res.ok) throw new Error('Failed to fetch knowledge graph')
      return res.json()
    },
    staleTime: 60_000,
  })

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      concept: 0,
      entity: 0,
      project: 0,
      skill: 0,
      daily: 0,
    }
    for (const node of rawGraph?.nodes || []) {
      const cat = (node.type?.toLowerCase() || 'concept') as GraphCategory
      if (counts[cat] !== undefined) {
        counts[cat]++
      } else {
        counts.concept++
      }
    }
    return counts
  }, [rawGraph?.nodes])

  // Filtered nodes & edges based on active categories
  const { filteredNodes, filteredEdges, nodeLookup } = useMemo(() => {
    const nodes = rawGraph?.nodes || []
    const edges = rawGraph?.edges || []

    const validNodes = nodes.filter((n) => {
      const cat = (n.type?.toLowerCase() || 'concept')
      return activeCategories.has(cat)
    })

    const validNodeIdSet = new Set(validNodes.map((n) => n.id))
    const validEdges = edges.filter(
      (e) => validNodeIdSet.has(e.source) && validNodeIdSet.has(e.target),
    )

    const map = new Map<string, GraphNode>()
    for (const n of validNodes) {
      map.set(n.id, n)
    }

    return {
      filteredNodes: validNodes,
      filteredEdges: validEdges,
      nodeLookup: map,
    }
  }, [rawGraph, activeCategories])

  // Search Highlights
  const searchHighlightIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>()
    const q = searchQuery.toLowerCase()
    const matches = new Set<string>()
    for (const n of filteredNodes) {
      if (
        n.title.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      ) {
        matches.add(n.id)
      }
    }
    return matches
  }, [searchQuery, filteredNodes])

  // Selected Node Details for Side Inspector
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return nodeLookup.get(selectedNodeId) || null
  }, [selectedNodeId, nodeLookup])

  const { inboundLinks, outboundLinks } = useMemo(() => {
    if (!selectedNodeId) return { inboundLinks: [], outboundLinks: [] }

    const inList: InspectorNode[] = []
    const outList: InspectorNode[] = []

    for (const edge of filteredEdges) {
      if (edge.source === selectedNodeId) {
        const target = nodeLookup.get(edge.target)
        if (target) outList.push(target)
      }
      if (edge.target === selectedNodeId) {
        const source = nodeLookup.get(edge.source)
        if (source) inList.push(source)
      }
    }

    return { inboundLinks: inList, outboundLinks: outList }
  }, [selectedNodeId, filteredEdges, nodeLookup])

  const handleToggleCategory = useCallback((category: GraphCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        if (next.size > 1) next.delete(category) // Keep at least 1 category
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const handleOpenFull = useCallback(
    (id: string) => {
      if (id.startsWith('skills/')) {
        navigate({ to: '/skills' })
      } else {
        navigate({
          to: '/memory',
          search: { tab: 'knowledge', path: id },
        })
      }
    },
    [navigate],
  )

  return (
    <div
      className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden relative select-none"
      style={{
        backgroundColor: 'var(--theme-bg, #08090a)',
        color: 'var(--theme-text)',
      }}
    >
      {/* ── Top Bar with Filter Pills & Search ── */}
      <div
        className="h-14 shrink-0 border-b px-4 flex items-center justify-between gap-3 z-30"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-card, rgba(15, 17, 23, 0.8))',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-56 sm:w-72">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
            />
            <input
              type="text"
              placeholder="Search nodes or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl pl-8 pr-7 py-1.5 outline-none border transition-colors"
              style={{
                backgroundColor: 'var(--theme-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="hidden sm:flex items-center gap-2">
          <GraphFilterBar
            activeCategories={activeCategories}
            counts={categoryCounts}
            onToggleCategory={handleToggleCategory}
            getNodeColorDynamic={(cat) => getNodeColor(cat, isDark)}
          />
        </div>

        {/* Canvas Quick Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowAlwaysLabels((prev) => !prev)}
            className="p-2 rounded-xl border transition-colors"
            style={{
              borderColor: 'var(--theme-border)',
              backgroundColor: showAlwaysLabels ? 'var(--theme-card2)' : 'transparent',
              color: showAlwaysLabels ? 'var(--theme-accent)' : 'var(--theme-muted)',
            }}
            title={showAlwaysLabels ? 'Show Labels On-Demand Only' : 'Always Show All Labels'}
          >
            <HugeiconsIcon icon={showAlwaysLabels ? ViewIcon : ViewOffIcon} size={15} />
          </button>
          <button
            type="button"
            onClick={() => onZoomInRef.current?.()}
            className="p-2 rounded-xl border transition-colors hover:bg-[var(--theme-card2)]"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}
            title="Zoom In"
          >
            <HugeiconsIcon icon={Add01Icon} size={15} />
          </button>
          <button
            type="button"
            onClick={() => onZoomOutRef.current?.()}
            className="p-2 rounded-xl border transition-colors hover:bg-[var(--theme-card2)]"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-muted)' }}
            title="Zoom Out"
          >
            <HugeiconsIcon icon={MinusSignIcon} size={15} />
          </button>
          <button
            type="button"
            onClick={() => onResetRef.current?.()}
            className="text-xs px-2.5 py-1.5 rounded-xl border font-medium transition-colors hover:bg-[var(--theme-card2)]"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Main Canvas Viewport ── */}
      <div className="flex-1 min-h-0 w-full relative overflow-hidden">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center gap-2 text-xs opacity-60">
            <span>Loading Living Brain Graph...</span>
          </div>
        ) : (
          <CanvasRenderer
            nodesData={filteredNodes}
            edgesData={filteredEdges}
            hoveredNodeId={hoveredNodeId}
            selectedNodeId={selectedNodeId}
            searchHighlightIds={searchHighlightIds}
            showLabels={showAlwaysLabels}
            onHover={setHoveredNodeId}
            onClick={setSelectedNodeId}
            onResetRef={onResetRef}
            onZoomInRef={onZoomInRef}
            onZoomOutRef={onZoomOutRef}
          />
        )}

        {/* ── Side Inspector Drawer ── */}
        <GraphSideInspector
          selectedNode={selectedNode}
          inboundLinks={inboundLinks}
          outboundLinks={outboundLinks}
          onClose={() => setSelectedNodeId(null)}
          onSelectNode={setSelectedNodeId}
          onOpenFull={handleOpenFull}
        />
      </div>
    </div>
  )
}
