# Unified Living Concept Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Concept Graph into an aesthetic, lightweight, and unified Living Brain Map connecting Wiki, Projects, Skills, and Daily notes with Obsidian-style elastic physics and an interactive side inspector drawer.

**Architecture:**

- Backend parses Wiki (`04-Wiki`), Projects (`05-Projects`), Daily notes (`07-Daily`), and Hermes agent skills (`~/.hermes/skills`), filtering out raw `Extracted-Docs/` staging noise, and extracts wikilinks and bidirectional relations.
- Frontend utilizes an optimized HTML5 2D Canvas physics engine with d3-force, decay-to-sleep (0% idle CPU), smart LOD typography with dark contrast halos, and interactive spring-tension dragging.
- A slide-over Side Inspector Drawer provides live Markdown preview, inbound/outbound connection badges with camera jump navigation, and quick links to the Knowledge Browser.

**Tech Stack:** React 19, TypeScript, TanStack Router, TanStack Query, HTML5 Canvas 2D, d3-force-3d, Tailwind CSS, Lucide / Hugeicons, Vite.

**Spec:** `docs/superpowers/specs/2026-09-13-concept-graph-design.md`

## Global Constraints

- Impeccable and Anti-slop engineering standards: modular components, zero placeholders, strict type safety, zero generic filler comments.
- Dynamic theme variable support: strictly use `var(--theme-bg)`, `var(--theme-card)`, `var(--theme-border)`, `var(--theme-text)`, `var(--theme-muted)`, `var(--theme-accent)`.
- 0% idle CPU when canvas simulation settles.
- Keep credentials redacted in all outputs.

---

### Task 1: Unified Graph Ingestion Backend Service

**Files:**

- Modify: `src/server/knowledge-browser.ts`
- Test: `src/server/knowledge-graph-unified.test.ts`

**Interfaces:**

- Consumes: `getKnowledgeRoot()`, `readParsedKnowledgeFile()`, `~/.hermes/skills`
- Produces: `buildKnowledgeGraph(): KnowledgeGraph` containing nodes tagged with types (`concept`, `entity`, `project`, `skill`, `daily`) and cross-domain edges.

- [ ] **Step 1: Write the failing unit test for unified graph extraction**

```typescript
import { describe, it, expect } from 'vitest'
import { buildKnowledgeGraph } from './knowledge-browser'

describe('buildKnowledgeGraph (Unified Ecosystem)', () => {
  it('returns nodes categorized into concept, entity, project, skill, and daily', () => {
    const graph = buildKnowledgeGraph()
    expect(graph).toBeDefined()
    expect(Array.isArray(graph.nodes)).toBe(true)
    expect(Array.isArray(graph.edges)).toBe(true)

    // Extracted-Docs must be excluded
    const hasExtractedDocs = graph.nodes.some((n) =>
      n.id.includes('Extracted-Docs'),
    )
    expect(hasExtractedDocs).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails or needs unified features**

Run: `pnpm test src/server/knowledge-graph-unified.test.ts`

- [ ] **Step 3: Implement unified graph builder in `src/server/knowledge-browser.ts`**

Update `walkKnowledgeDir` and `buildKnowledgeGraph` to:

1. Parse `04-Wiki/Concepts`, `04-Wiki/Entities`, `05-Projects`, `07-Daily`.
2. Skip `03-Notes/Extracted-Docs`.
3. Read `~/.hermes/skills/*/SKILL.md` to index agent skills as nodes of type `skill`.
4. Extract `[[Wikilinks]]` and project/concept references to build edges.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/server/knowledge-graph-unified.test.ts`

- [ ] **Step 5: Commit backend changes**

```bash
git add src/server/knowledge-browser.ts src/server/knowledge-graph-unified.test.ts
git commit -m "feat(graph): add unified graph ingestion for wiki, projects, skills, and daily"
```

---

### Task 2: Category Filter Bar Component

**Files:**

- Create: `src/screens/graph/components/graph-filter-bar.tsx`
- Test: `src/screens/graph/components/graph-filter-bar.test.tsx`

**Interfaces:**

- Consumes: Category counts and toggle callback.
- Produces: `GraphFilterBar` component for toggling active node categories.

- [ ] **Step 1: Write test for GraphFilterBar**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraphFilterBar } from './graph-filter-bar'

describe('GraphFilterBar', () => {
  it('renders category toggle pills with counts', () => {
    const onToggle = vi.fn()
    render(
      <GraphFilterBar
        activeCategories={new Set(['concept', 'entity', 'project', 'skill', 'daily'])}
        counts={{ concept: 10, entity: 5, project: 3, skill: 8, daily: 12 }}
        onToggleCategory={onToggle}
      />
    )
    expect(screen.getByText(/Concepts/i)).toBeDefined()
    expect(screen.getByText(/Skills/i)).toBeDefined()

    fireEvent.click(screen.getByText(/Skills/i))
    expect(onToggle).toHaveBeenCalledWith('skill')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/graph/components/graph-filter-bar.test.tsx`

- [ ] **Step 3: Implement `GraphFilterBar` component**

Implement `GraphFilterBar` in `src/screens/graph/components/graph-filter-bar.tsx` with pill buttons, category indicators, node counts, and keyboard accessibility.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/screens/graph/components/graph-filter-bar.test.tsx`

- [ ] **Step 5: Commit component**

```bash
git add src/screens/graph/components/graph-filter-bar.tsx src/screens/graph/components/graph-filter-bar.test.tsx
git commit -m "feat(graph): add category filter bar component"
```

---

### Task 3: Slide-Over Side Inspector Drawer Component

**Files:**

- Create: `src/screens/graph/components/graph-side-inspector.tsx`
- Test: `src/screens/graph/components/graph-side-inspector.test.tsx`

**Interfaces:**

- Consumes: `selectedNodeId`, `nodes`, `edges`, `onClose`, `onSelectNode`, `onOpenFull`
- Produces: `GraphSideInspector` slide-over drawer with Markdown preview and bidirectional link navigation.

- [ ] **Step 1: Write test for `GraphSideInspector`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GraphSideInspector } from './graph-side-inspector'

describe('GraphSideInspector', () => {
  it('renders node title and relations when node is selected', () => {
    const onSelectNode = vi.fn()
    const onClose = vi.fn()
    render(
      <GraphSideInspector
        selectedNode={{ id: '04-Wiki/Concepts/Docker.md', title: 'Docker', type: 'concept', tags: ['devops'] }}
        inboundLinks={[{ id: '05-Projects/LAM-Router.md', title: 'LAM-Router', type: 'project' }]}
        outboundLinks={[{ id: '04-Wiki/Entities/Linux.md', title: 'Linux', type: 'entity' }]}
        onClose={onClose}
        onSelectNode={onSelectNode}
        onOpenFull={vi.fn()}
      />
    )
    expect(screen.getByText('Docker')).toBeDefined()
    expect(screen.getByText('LAM-Router')).toBeDefined()

    fireEvent.click(screen.getByText('LAM-Router'))
    expect(onSelectNode).toHaveBeenCalledWith('05-Projects/LAM-Router.md')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/screens/graph/components/graph-side-inspector.test.tsx`

- [ ] **Step 3: Implement `GraphSideInspector` component**

Build `src/screens/graph/components/graph-side-inspector.tsx` with animated slide-over container, Markdown preview fetch, inbound/outbound relations, and action shortcuts.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/screens/graph/components/graph-side-inspector.test.tsx`

- [ ] **Step 5: Commit inspector component**

```bash
git add src/screens/graph/components/graph-side-inspector.tsx src/screens/graph/components/graph-side-inspector.test.tsx
git commit -m "feat(graph): add slide-over side inspector drawer"
```

---

### Task 4: Obsidian 2D Canvas Engine & Smart LOD Physics Overhaul

**Files:**

- Modify: `src/screens/graph/graph-screen.tsx`
- Test: `src/screens/graph/graph-screen.test.tsx`

**Interfaces:**

- Consumes: Graph API data, `GraphFilterBar`, `GraphSideInspector`
- Produces: True Obsidian 2D live interactive canvas with elastic spring dragging, local reheat, decay-to-sleep (0% idle CPU), and smart LOD typography with contrast halos.

- [ ] **Step 1: Write / update screen test for graph rendering and interaction state**

```typescript
import { describe, it, expect } from 'vitest'
import { getNodeColor, getNodeRadius } from './graph-screen'

describe('Graph physics & visual helper functions', () => {
  it('correctly maps unified category colors', () => {
    expect(getNodeColor('concept')).toBe('#f8fafc')
    expect(getNodeColor('entity')).toBe('#2dd4bf')
    expect(getNodeColor('project')).toBe('#10b981')
    expect(getNodeColor('skill')).toBe('#f43f5e')
    expect(getNodeColor('daily')).toBe('#38bdf8')
  })

  it('computes proportional radius based on connectivity', () => {
    expect(getNodeRadius(0)).toBeGreaterThanOrEqual(4)
    expect(getNodeRadius(16)).toBeGreaterThan(getNodeRadius(1))
  })
})
```

- [ ] **Step 2: Run unit test to verify**

Run: `pnpm test src/screens/graph/graph-screen.test.tsx`

- [ ] **Step 3: Overhaul `src/screens/graph/graph-screen.tsx`**

1. Integrate Category Filter Bar and active category filtering.
2. Update CanvasRenderer physics:
   - Elastic spring tension with `alphaTarget(0.3)` on node dragging.
   - Smooth momentum release with `d3.forceLink().strength(0.7)`.
   - Complete 0% CPU sleep when alpha reaches equilibrium (`< 0.005`).
3. Implement Smart LOD label rendering:
   - Dynamic thresholding by zoom level and connection degree.
   - Dark contrast text halo backgrounds.
4. Mount `GraphSideInspector` drawer connected with `selectedNodeId`.

- [ ] **Step 4: Run unit tests**

Run: `pnpm test src/screens/graph/graph-screen.test.tsx`

- [ ] **Step 5: Commit changes**

```bash
git add src/screens/graph/graph-screen.tsx src/screens/graph/graph-screen.test.tsx
git commit -m "feat(graph): overhaul 2D canvas with Obsidian spring physics, smart LOD, and side inspector"
```

---

### Task 5: Production Build, Hot Reload & End-to-End Visual Verification

**Files:**

- Test: Full build and browser visual QA

- [ ] **Step 1: Build the production bundle**

Run: `pnpm build && pm2 reload lam-cyberlab-workspace`

- [ ] **Step 2: Test live in browser**

1. Navigate to `http://localhost:3000/graph`.
2. Verify node clusters, colors (White, Teal, Emerald, Pink, Sky Blue).
3. Test dragging a node: verify elastic spring tension and organic movement.
4. Test clicking a node: verify Side Inspector Drawer opens with preview and relations.
5. Test category filter pills: verify toggling categories updates canvas smoothly.
6. Verify with `browser_vision` that aesthetics, typography, and layout are 100% clean and flawless.

- [ ] **Step 3: Commit and finalize**

```bash
git add -A
git commit -m "chore(graph): complete live interactive concept graph polish and verification"
```
