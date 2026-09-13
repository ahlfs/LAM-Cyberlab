# Design Spec: Second Brain Ingestion & Autonomous Knowledge Pipeline Overhaul

**Date:** 2026-09-13  
**Status:** Approved for Implementation  
**Scope:** `~/.hermes/hermes-agent/scripts/second-brain/` and active Obsidian Vault (`~/obsidian/memoribro/`)

---

## 1. Objective & Problem Statement
Currently, Hermes Agent's Second Brain architecture produces high rates of "wiki rot" and disconnected nodes:
1. **434 Dangling Links & 25 Orphan Pages:** `wiki_ingest.py` generates arbitrary `[[wikilinks]]` to non-existent pages without strict index constraint.
2. **Unstructured Daily Logs & Projects:** `generate_daily.py` and `extract_projects.py` output flat, unstructured markdown without YAML frontmatter or wikilinks.
3. **Dirty Memory Pollution:** `self_reflection.py` appends raw string rules directly to `MEMORY.md` (often catching 404s/error noise) instead of utilizing the structured `memory` tool.
4. **Decoupled Learning Loop:** Chat conversations containing rich technical knowledge are discarded after daily summaries instead of being converted into permanent Wiki concepts/entities or researched further.

---

## 2. Architecture & Pipeline Enhancements

### 2.1. Component A: `wiki_ingest.py` (Ingestion Hardening)
- **Prompt Constraint:** Explicit directive: `ONLY create [[wikilinks]] to pages explicitly listed in the CURRENT WIKI INDEX, or to pages created within this exact batch. Do NOT hallucinate non-existent page links.`
- **Frontmatter Standard:** Mandate `title`, `type` (concept/entity), `category`, `summary`, `tags` (array >= 1), `sources`, `updated`.
- **Post-Ingestion Linting & Warning:** Real-time check of output wikilinks against current wiki index.

### 2.2. Component B: `generate_daily.py` (Structured Journals)
- **Schema:** Strict YAML frontmatter (`date`, `type: daily`, `tags: [daily, journal]`, `projects: []`).
- **Context Injection:** Ingests `04-Wiki/index.md` + active projects list into the LLM prompt.
- **Wikilink Enrichment:** Converts mentions of active projects or existing concepts into functional `[[wikilinks]]`.

### 2.3. Component C: `extract_projects.py` (Structured Projects)
- **Schema:** Standardized project frontmatter (`title`, `status: active|paused|completed`, `type: project`, `started: YYYY-MM-DD`, `tags: [project, ...]`).
- **Wiki Index Context:** Links newly generated or updated project specs with relevant technical concepts in `04-Wiki/`.

### 2.4. Component D: `self_reflection.py` (Safe Hermes Memory Tool Integration)
- **Refactored Execution:** Replaces raw file appending with execution via `hermes -z "<prompt>" -t memory --yolo`.
- **Garbage Filtering:** Strictly ignores HTTP/API errors, session timeouts, and ephemeral bugs.

### 2.5. Component E: `extract_knowledge.py` (Autonomous Selective Research & Compounding)
New Step in `daily-reflection.sh`:
- **Phase 1: Concept Extraction:** Identifies new tools, libraries, architectural patterns, and security mechanisms from yesterday's daily log.
- **Phase 2: Index Deduplication:** Filters out topics already present in `04-Wiki/index.md`.
- **Phase 3: Selective Web Research (Option 3):** If a significant knowledge gap or repeated struggle is detected, spawns `hermes -z "Deep dive research into <topic>" -t web --yolo` (capped at max 2 web queries/day to preserve tokens).
- **Phase 4: Output Synthesis:** Writes synthesized notes directly to `03-Notes/Extracted-Docs/<topic>.md`.
- **Phase 5: Wiki Trigger:** Executes `wiki_ingest.py` to ingest new notes into `04-Wiki/Concepts/` or `04-Wiki/Entities/`.

---

## 3. Updated Execution Flow (`daily-reflection.sh`)
```text
daily-reflection.sh (Cron Midnight)
  ├── Step 1: extract_projects.py   (05-Projects/*.md with frontmatter & wikilinks)
  ├── Step 2: generate_daily.py     (07-Daily/YYYY-MM-DD.md with frontmatter & wikilinks)
  ├── Step 3: self_reflection.py    (Clean durable facts via hermes memory tool)
  ├── Step 4: extract_knowledge.py  (Autonomous extraction + selective web research -> Extracted-Docs -> wiki_ingest)
  └── Step 5: wiki_lint.py          (Quality assurance report -> 04-Wiki/lint-report.md)
```

---

## 4. Retroactive Data Cleanup (One-Time Batch Healing)
1. Generate missing core concept stubs for high-frequency dangling references (`[[Linux-Distributions-Architecture]]`, `[[MenggunakanAGdiHermes]]`, `[[GPU]]`, `[[TDP]]`, `[[Docker]]`, etc.).
2. Re-run `wiki_lint.py` to verify zero breaking dangling references and connect orphan pages into the graph.
