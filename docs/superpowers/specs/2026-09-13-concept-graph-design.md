# Design Spec: Unified Living Concept Graph (Obsidian Dark Aesthetic & Smart Inspector)

**Date:** 2026-09-13  
**Status:** Approved for Implementation  
**Target:** LAM-Cyberlab Knowledge Ecosystem

---

## 1. Executive Summary & Goals

The objective of this design is to elevate the **Concept Graph** (`/graph`) into an aesthetic, lightweight, and unified **Living Brain Map**. It unifies knowledge from Second Brain Wiki (`04-Wiki/`), Active Projects (`05-Projects/`), Daily Notes (`07-Daily/`), and Agent Skills (`~/.hermes/skills/`) while omitting raw staging noise (`03-Notes/Extracted-Docs/`).

Key Pillars:

1. **Unified Graph Ingestion:** Cross-domain nodes connecting Wiki concepts, entities, projects, daily journals, and Hermes procedural skills.
2. **Obsidian / Linear Dark Aesthetics:** Glow halos, harmonic category color palettes, clean anti-aliased links, and smooth interactive highlighting.
3. **Smart LOD (Level of Detail) Typography:** Dynamic label visibility based on node degree and zoom thresholds with dark readability halos to prevent visual clutter.
4. **Zero Idle CPU Simulation:** Optimized 2D Canvas force engine that settles organically and enters 100% idle sleep mode (0% background CPU usage).
5. **Slide-Over Side Inspector Drawer:** Collapsible right-side drawer showing Markdown content preview, metadata tags, interactive two-way relation links, and direct action shortcuts.
6. **Category Layer Filter Controls:** Top toolbar pills allowing dynamic toggle of node types (`[✓] Concepts`, `[✓] Entities`, `[✓] Projects`, `[✓] Skills`, `[✓] Daily`).

---

## 2. Node Schema & Color Hierarchy

| Category    | Source Directory                        | Color Hex | Visual Purpose                                   |
| ----------- | --------------------------------------- | --------- | ------------------------------------------------ |
| **Concept** | `$OBSIDIAN_VAULT_DIR/04-Wiki/Concepts/` | `#f8fafc` | Core theories, paradigms, mental models          |
| **Entity**  | `$OBSIDIAN_VAULT_DIR/04-Wiki/Entities/` | `#2dd4bf` | Libraries, frameworks, languages, tools          |
| **Project** | `$OBSIDIAN_VAULT_DIR/05-Projects/`      | `#10b981` | Active repositories and production systems       |
| **Skill**   | `~/.hermes/skills/`                     | `#f43f5e` | Hermes agent procedural capabilities & workflows |
| **Daily**   | `$OBSIDIAN_VAULT_DIR/07-Daily/`         | `#38bdf8` | Daily journals, chat extracts, learning logs     |

_Note: `Extracted-Docs/` (`03-Notes/Extracted-Docs/`) is intentionally excluded from the graph to prevent raw staging noise._

---

## 3. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│  Knowledge Root ($OBSIDIAN_VAULT_DIR) & Hermes Skills  │
└───────────────────────────┬────────────────────────────┘
                            │ (Backend Parsing & Wikilink Extraction)
                            ▼
┌────────────────────────────────────────────────────────┐
│   Backend Service: buildKnowledgeGraph()               │
│   - Scans 04-Wiki, 05-Projects, 07-Daily, ~/.hermes/skills
│   - Extracts [[Wikilinks]] & explicit relation tags   │
│   - Strips Extracted-Docs from node catalog            │
└───────────────────────────┬────────────────────────────┘
                            │ JSON API: /api/knowledge/graph
                            ▼
┌────────────────────────────────────────────────────────┐
│   Frontend Graph Canvas Component (CanvasRenderer)     │
│   - HTML5 2D Canvas (d3-force simulation)              │
│   - Decay-to-sleep physics engine (0% CPU at rest)     │
│   - Smart LOD label engine with background halos       │
│   - Category filter pill bar (dynamic active sets)     │
└───────────────────────────┬────────────────────────────┘
                            │ User clicks node
                            ▼
┌────────────────────────────────────────────────────────┐
│   Slide-Over Side Inspector Drawer                     │
│   - Real-time Markdown preview fetch                   │
│   - Inbound / Outbound relation links (clickable)      │
│   - Direct jump to Knowledge Browser / Editor          │
└────────────────────────────────────────────────────────┘
```

---

## 4. Canvas Physics & Smart LOD Specs

### A. Physics Parameters & Obsidian Drag Mechanics

- **True Obsidian Interactive Drag & Elastic Physics:**
  - **Spring Tension on Drag:** Saat sebuah node digeret (_dragged_), gaya pegas d3-force direheat secara lokal (`alphaTarget(0.3)`) sehingga node-node yang terhubung ikut tertarik dan bergoyang lentur (_elastic ripple effect_) secara organik mengikuti gerakan kursor.
  - **Inertia & Momentum Release:** Saat drag dilepas, node mempertahankan sedikit momentum sebelum pegas menariknya kembali ke posisi ekuilibrium stabil (_smooth decay_).
  - **Physics Tuning:**
    - **Charge (Repulsion):** `-140` (gaya tolak antar node agar tidak menumpuk).
    - **Link Distance:** `45` s.d. `65` px dengan elastisitas pegas `strength(0.7)`.
    - **Centering Gravity:** `0.04` untuk menjaga klaster tetap proporsional di tengah layar.
    - **Alpha Decay:** `0.02` (memberikan transisi gerak yang luwes ~1.5-2.5s lalu _sleep_ 0% CPU).
  - **Canvas Pan & Zoom:** Dragging pada background kosong menggeser kanvas (_infinite canvas pan_), wheel/pinch mengontrol _smooth zoom_ (0.1x hingga 5.0x) tanpa pernah reset/snap back secara mendadak.

### B. Smart LOD (Level of Detail) Formula

- **Global Label Toggle:** When enabled:
  - If `zoom < 0.7`: Only render labels for nodes where `connections >= 3`.
  - If `0.7 <= zoom <= 1.4`: Render labels for nodes where `connections >= 1` or category is `Project`/`Skill`.
  - If `zoom > 1.4`: Render labels for all visible nodes.
- **Label Typography:** Font `11px Inter, sans-serif`, centered with 4px vertical offset under node, surrounded by `rgba(8, 9, 10, 0.85)` rounded pill or text shadow for extreme contrast against dark canvas.

---

## 5. Side Inspector Drawer Specification

- **Placement:** Anchored on the right edge (`w-[380px]` on desktop, overlay on mobile).
- **State Management:** Controlled via `selectedNodeId` in Graph Screen state.
- **Components:**
  1. **Header:** Node type pill badge, filename/title, and close button (`X`).
  2. **Content Preview:** Renders initial ~500 words of Markdown with syntax highlighting.
  3. **Relations:**
     - _Connected to (Outbound):_ Interactive badges that pan/zoom directly to target node.
     - _Referenced by (Inbound/Backlinks):_ Interactive badges for incoming links.
  4. **Actions:**
     - `Open Note`: Redirects to `/memory?tab=knowledge&path=...` or `/editor`.

---

## 6. Verification & Quality Gates

1. **Performance Gate:** 60 FPS pan/zoom and 0% CPU consumption verified via Chrome DevTools / Browser evaluation once settled.
2. **Visual Gate:** Verified with `browser_vision` — aesthetic neon-on-dark nodes, contrast halos on text, and responsive side inspector.
3. **Data Gate:** Unified nodes from Wiki Concepts, Entities, Projects, Skills, and Daily notes correctly populated with zero console errors.
