import * as d3 from 'd3-force-3d'

self.onmessage = (event) => {
  const { nodes, edges } = event.data

  const connectionCount = new Map<string, number>()
  for (const node of nodes) connectionCount.set(node.id, 0)
  for (const edge of edges) {
    connectionCount.set(edge.source, (connectionCount.get(edge.source) ?? 0) + 1)
    connectionCount.set(edge.target, (connectionCount.get(edge.target) ?? 0) + 1)
  }

  const simNodes = nodes.map((n: any) => {
    // Detect index node (the "black hole" center)
    const isIndex =
      n.id === 'index.md' ||
      n.id === 'wiki/index.md' ||
      n.title?.toLowerCase() === 'index'

    return {
      ...n,
      connections: connectionCount.get(n.id) ?? 0,
      // Pin index node exactly at the center (0,0,0)
      ...(isIndex ? { fx: 0, fy: 0, fz: 0, isBlackHole: true } : {}),
    }
  })

  const simLinks = edges
    .filter((e: any) => connectionCount.has(e.source) && connectionCount.has(e.target))
    .map((e: any) => ({ source: e.source, target: e.target }))

  const simulation = d3
    .forceSimulation(simNodes, 3)
    .force('link', d3.forceLink(simLinks).id((d: any) => d.id).distance(150).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(0, 0, 0))
    .force('collide', d3.forceCollide().radius(30))
    .stop()

  // Run simulation synchronously inside the worker
  const iterations = 300
  for (let i = 0; i < iterations; i++) simulation.tick()

  const layout = simNodes.map((n: any) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    tags: n.tags,
    x: n.x ?? 0,
    y: n.y ?? 0,
    z: n.z ?? 0,
    connections: n.connections,
    isBlackHole: n.isBlackHole,
  }))

  self.postMessage({ layout })
}
