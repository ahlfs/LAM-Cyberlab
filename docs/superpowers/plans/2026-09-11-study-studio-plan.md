# Study Studio (Interactive Knowledge Learning Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated, interactive Study Studio (`/study`) page in LAM-Cyberlab (under Knowledge & Brain) to allow users to input resources (URLs, documents, audio), interactively analyze them with Hermes, extract key insights, and seamlessly ingest them into the Obsidian Second Brain vault.

**Architecture:** Split-pane interactive UI (Resource Stage + Live Agent Panel) integrated with TanStack Start/Router, backed by server-side resource extraction services (`web`, `documents`, `audio`), Hermes Gateway SSE streaming proxy, and a sync script executor targeting `$OBSIDIAN_VAULT_DIR/03-Notes/Extracted-Docs/`.

**Tech Stack:** React 19, TypeScript, TanStack Router/Start, Zustand, Hugeicons, Tailwind CSS (Aura/Dracula Theme), Vitest, Turndown / Cheerio / PDF/Text parsers.

**Spec:** `/home/ahlfs/lam-cyberlab/docs/superpowers/specs/2026-09-11-study-studio-design.md`

## Global Constraints
- Native LAM-Cyberlab Dark palette: background `#282a36`, cards `#343746`, accents violet/pink/green.
- Zero generic AI slop: concise code, clean typography, explicit handlers, no placeholder mocks.
- Protected ports: Never interfere with 3000, 20128, 8900. Use port 8642 for Hermes Gateway.
- Safe path resolution: Default to `~/obsidian/memo` if `OBSIDIAN_VAULT_DIR` is unset.
- After rebuilds, restart PM2 process `lam-cyberlab-workspace` when finishing the deployment.

---

### Task 1: Study Service & Extraction Engine

**Files:**
- Create: `src/server/study-service.ts`
- Test: `src/server/study-service.test.ts`

**Interfaces:**
- Produces:
  - `extractContentFromUrl(url: string): Promise<{ title: string; content: string; sourceUrl: string }>`
  - `extractContentFromFile(file: { name: string; buffer: Buffer; mimeType: string }): Promise<{ title: string; content: string; size: number }>`
  - `commitToSecondBrain(payload: { title: string; content: string; tags: string[]; sourceUrl?: string }): Promise<{ success: boolean; filePath: string; syncOutput: string }>`

- [ ] **Step 1: Write the failing test**
Create test cases for URL markdown extraction, text/markdown document parsing, and file writing to `03-Notes/Extracted-Docs/`.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test src/server/study-service.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**
Implement URL fetching & HTML-to-markdown extraction, text parsing, and markdown note writing to `$OBSIDIAN_VAULT_DIR/03-Notes/Extracted-Docs/` with `sync-second-brain.sh` trigger.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm test src/server/study-service.test.ts`
Expected: PASS

---

### Task 2: Study Backend API Routes

**Files:**
- Create: `src/routes/api/study/extract.ts`
- Create: `src/routes/api/study/analyze.ts`
- Create: `src/routes/api/study/commit.ts`
- Test: `src/server/study-routes.test.ts`

**Interfaces:**
- Consumes: Functions from `src/server/study-service.ts`
- Produces: REST & SSE endpoints for extraction, streaming analysis, and vault commit.

- [ ] **Step 1: Write the failing test for API route handlers**
Verify multipart/form-data upload parsing, URL extraction endpoint, and commit handler response schemas.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test src/server/study-routes.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation for the 3 routes**
Wire auth middleware, rate limits, request validation (zod), and streaming proxy to Hermes gateway (port 8642).

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm test src/server/study-routes.test.ts`
Expected: PASS

---

### Task 3: Study Zustand State Store

**Files:**
- Create: `src/stores/study-store.ts`
- Test: `src/stores/study-store.test.ts`

**Interfaces:**
- Produces:
  - `useStudyStore`: Zustand store managing `stagedResources`, `activeResourceId`, `messages`, `isAnalyzing`, `isIngesting`, `addResource()`, `removeResource()`, `setActiveResource()`, `setMessages()`, `resetStudyState()`.

- [ ] **Step 1: Write the failing test**
Test state transitions: adding/removing resources, switching active resource, and setting analysis messages.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test src/stores/study-store.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/stores/study-store.ts`**
Define clean interfaces, action creators, and state getters.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm test src/stores/study-store.test.ts`
Expected: PASS

---

### Task 4: UI Components (Resource Stage & Interactive Agent Panel)

**Files:**
- Create: `src/screens/study/components/resource-stage.tsx`
- Create: `src/screens/study/components/study-agent-panel.tsx`
- Create: `src/screens/study/components/resource-preview-dialog.tsx`
- Create: `src/screens/study/study-screen.tsx`
- Test: `src/screens/study/study-screen.test.tsx`

**Interfaces:**
- Consumes: `useStudyStore`, `@/components/ui/*`, `@/components/prompt-kit/markdown`
- Produces: Dual-pane UI conforming to Impeccable & Anti-slop standards with zero placeholders.

- [ ] **Step 1: Write component unit/render test**
Test rendering of ResourceStage (URL input, upload dropzone) and StudyAgentPanel.

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm test src/screens/study/study-screen.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement components**
Build `resource-stage.tsx`, `study-agent-panel.tsx`, `resource-preview-dialog.tsx`, and `study-screen.tsx` with Aura dark styling, crisp borders, responsive dual-pane split, and accessible controls.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm test src/screens/study/study-screen.test.tsx`
Expected: PASS

---

### Task 5: Routing & Navigation Integration

**Files:**
- Create: `src/routes/study.tsx`
- Modify: `src/screens/chat/components/chat-sidebar.tsx` (add Knowledge & Brain navigation item)
- Modify: `src/components/layout/workspace-topbar.tsx` (add route name map & active section)

**Interfaces:**
- Produces: `/study` accessible via sidebar under Knowledge & Brain and breadcrumbs.

- [ ] **Step 1: Add `/study` route in `src/routes/study.tsx`**
Export `createFileRoute('/study')` rendering `StudyScreen`.

- [ ] **Step 2: Update Sidebar & Topbar**
Add `Study Studio` item to `knowledgeItems` in `chat-sidebar.tsx` using `BookOpen01Icon` and register `/study` in `workspace-topbar.tsx`.

- [ ] **Step 3: Run full suite and build verification**
Run: `pnpm check && pnpm build`
Expected: Clean build with zero TypeScript or Lint errors.

---

### Task 6: Verification & PM2 Service Reload

**Files:**
- Execution: `pnpm build` -> `pm2 reload lam-cyberlab-workspace`

- [ ] **Step 1: Rebuild assets**
Run: `cd /home/ahlfs/lam-cyberlab && pnpm build`

- [ ] **Step 2: Restart PM2 process**
Run: `pm2 reload lam-cyberlab-workspace`

- [ ] **Step 3: Verify live endpoint**
Check HTTP response on `http://localhost:3000/study` (status 200).
