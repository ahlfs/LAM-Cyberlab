---
name: LAM Cyberlab
description: The command center UI for a self-hosted Hermes AI agent — chat, swarm, ops, and files in one inhabited shell.
colors:
  harbor-night-teal: "#041C1C"
  teal-panel: "#06282A"
  teal-card: "#082F31"
  teal-card-raised: "#0A3638"
  lantern-cream: "#FFE6CB"
  signal-amber: "#FFAC02"
  phosphor-green: "#8FFF89"
  alert-red: "#FB2C36"
typography:
  body:
    fontFamily: "var(--interface-font-family), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "var(--interface-font-family), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  headline:
    fontFamily: "var(--interface-font-family), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
  label:
    fontFamily: "var(--interface-font-family), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.harbor-night-teal}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.lantern-cream}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.teal-card}"
    rounded: "{rounded.xl}"
    padding: "14px 16px"
  chip-trend:
    backgroundColor: "rgba(255, 172, 2, 0.12)"
    textColor: "{colors.signal-amber}"
    rounded: "{rounded.pill}"
    padding: "3.2px 7.2px"
  input:
    backgroundColor: "{colors.teal-panel}"
    textColor: "{colors.lantern-cream}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
---

# Design System: LAM Cyberlab

## 1. Overview

**Creative North Star: "The Agent Basecamp"**

LAM Cyberlab is not an admin panel you visit; it is a basecamp you and your agents inhabit. The reference energy is Discord, not Jira: warm chat surfaces you can live in for hours, a sidebar with presence and life, an agent that reads as a character (avatar, activity, status) rather than a form field. The chrome is technical and confident — deep harbor-night surfaces, instruments that glow amber when they matter — but never cold. Everything conveys that a live system is breathing underneath: sessions streaming, workers running, jobs ticking.

The system's single most important structural fact is the **theme contract**: every color on every surface flows through the semantic `--theme-*` custom-property layer (`bg → sidebar/panel → card → card2`, plus text, muted, accent, borders, chat, composer, code, states), implemented by fourteen first-class themes (Nous, Matrix, Hermes, Bronze, Slate, SciFi, Dracula — each with a light twin). The default and canonical palette is **Nous** (harbor-night teal, lantern cream, signal amber); all values in this document describe that default, and every rule must survive a theme swap.

It explicitly rejects glossy SaaS landing aesthetics (gradient text, glassmorphism, hero metrics), Jira-like enterprise heaviness, and the bare ChatGPT-clone chat column.

**Key Characteristics:**
- Inhabited, not administered: presence, avatars, live activity everywhere it's honest.
- Deep tonal surfaces with one amber voice; personality lives in the theme layer.
- Dense enough for an ops console, warm enough for an all-day chat home.
- Alive but disciplined: fast 150–200ms feedback, uniform component vocabulary.

## 2. Colors: The Harbor-Night Palette

A dark maritime watch: teal depths, cream lantern-light, and a single amber signal — with phosphor green reserved for the machine's own voice.

### Primary
- **Signal Amber** (#FFAC02): the one voice of action and attention — primary buttons, active nav, focus rings, selection, live-state badges. It reads like an instrument lamp on the bridge: rare, warm, unmistakable.

### Neutral
- **Harbor-Night Teal** (#041C1C): the body background; the sea at night. Headers share it to keep the shell seamless.
- **Teal Panel** (#06282A): sidebars, panels, composer, assistant chat bubbles — the first tonal step up.
- **Teal Card** (#082F31): cards and raised content; **Teal Card Raised** (#0A3638) for the layer above that.
- **Lantern Cream** (#FFE6CB): all text. Muted text is the same cream at 60% opacity, borders at 10–20% opacity — the palette never introduces a foreign gray.

### Tertiary
- **Phosphor Green** (#8FFF89): success states and code/terminal foreground — the color of the machine speaking.
- **Alert Red** (#FB2C36): destructive and error states only.

### Named Rules
**The Theme Contract Rule.** No component ever hardcodes a color. Every fill, border, and text color flows through a `--theme-*` variable (or a Tailwind token remapped to one). A feature is not done until it looks intentional in all fourteen themes, both modes.

**The One Lantern Rule.** Signal Amber (and each theme's accent counterpart) covers at most ~10% of any screen: actions, current selection, live indicators. Amber used decoratively is a bug.

**The No Foreign Gray Rule.** Muted text and borders are transparencies of Lantern Cream over teal, never a neutral gray dropped onto the palette.

## 3. Typography

**Body Font:** User-selectable interface font via `--interface-font-family` — system sans by default, with Inter, serif, and JetBrains Mono as Settings options.
**Label/Mono Font:** JetBrains Mono (with ui-monospace fallbacks) for code, terminal, and data readouts.

**Character:** A quiet, well-tuned sans carries the entire UI; the mono voice marks wherever the machine itself is talking. No display font exists — hierarchy is earned through weight and rhythm, not typeface theater.

### Hierarchy
- **Headline** (700, 1.5rem, lh 1.2): screen titles and KPI values.
- **Title** (600, 1.125rem, lh 1.3): panel and card headings.
- **Body** (400, 0.875rem, lh 1.5): default UI text and chat prose; chat column caps at `--chat-content-max-width` (900px default) to keep lines readable.
- **Label** (600, 0.7rem, tracking 0.08em, uppercase): KPI labels and section markers — the one sanctioned uppercase voice.
- **Mono** (400–500, 0.8125rem, lh 1.6): code blocks, terminal, logs, token/ID readouts.

### Named Rules
**The Machine Voice Rule.** JetBrains Mono appears exactly where output belongs to the system (code, terminal, logs, IDs) — never as decoration on human-facing labels or buttons.

**The Fixed Scale Rule.** Type sizes are fixed rem steps (scale ≈1.2); nothing fluid, nothing clamped. This is product UI viewed at consistent DPI.

## 4. Elevation

Depth is tonal first: the four-step surface ladder (bg → panel → card → card2) does the structural work, with hairline cream-transparency borders separating layers. Shadows are an accent, not the architecture — three theme-scoped levels that deepen on dark themes and all but vanish on light ones (Nous Light's shadow-1 is literally zero). Glass (`--theme-glass`, a 88–92% opaque veil of the bg color) is reserved for overlays that float above live content.

### Shadow Vocabulary
- **shadow-1** (`0 1px 2px rgba(0,0,0,0.55)` on Nous): resting cards that need a whisper of lift.
- **shadow-2** (`0 6px 16px rgba(0,0,0,0.48)`): hover states and small popovers.
- **shadow-3** (`0 16px 36px rgba(0,0,0,0.58)`): dialogs, command palette, dropdown panels.

### Named Rules
**The Tonal-First Rule.** If a layer boundary needs expressing, reach for the next surface tone and a hairline border before reaching for a shadow. Shadows respond to state (hover, floating, modal); they do not decorate rest.

## 5. Components

Component character: **alive but disciplined**. Everything responds — 150–200ms ease transitions on hover, focus, and press — but shape, radius, and state vocabulary are identical on every screen.

### Buttons
- **Shape:** gently rounded (0.5rem); pill (9999px) reserved for chips and filters.
- **Primary:** Signal Amber fill with Harbor-Night text; padding 8px 16px; weight 600.
- **Ghost:** transparent with Lantern Cream text; hover fills with the panel tone.
- **Hover / Focus:** background/border shift over 150–200ms plus a visible `--theme-focus` ring on focus-visible; no color change is instant.
- **Destructive:** Alert Red, same geometry — danger changes the color, never the shape.

### Chips
- **Style:** pill-shaped, amber-tinted fill (`--theme-accent-subtle`) with amber text and a soft amber border — the KPI trend badge is canonical.
- **State:** selected chips go accent-tinted; unselected stay on card tone with muted text.

### Cards / Containers
- **Corner Style:** 0.75rem (rounded-xl) standard; 1rem for hero panels.
- **Background:** `--theme-card` on `--theme-panel`/bg; never a card directly on a card (use card2 for the single sanctioned raised layer).
- **Shadow Strategy:** shadow-1 at rest, shadow-2 on hover (see Elevation).
- **Border:** 1px `--theme-border` (cream at ~20% on Nous).
- **Internal Padding:** 14–16px.

### Inputs / Fields
- **Style:** `--theme-input` fill, 1px `--theme-border`, 0.5rem radius; placeholder uses `--composer-placeholder` (cream at 45%), never a lighter gray.
- **Focus:** `--theme-focus` ring/border (amber on Nous), 150ms.
- **Error / Disabled:** Alert Red border for errors; disabled drops to 50% opacity without changing fill.

### Navigation
- **Style:** sidebar on `--theme-sidebar` with grouped sections; items are quiet cream-muted rows that fill with `--theme-accent-subtle` and switch to accent text when active; icon and label always paired.
- **Mobile:** sidebar collapses; bottom tab bar (`--tabbar-h: 80px`) takes over.

### Chat Bubbles (signature)
The heart of the basecamp. User messages sit in a teal-deep bubble with an amber-tinted border (`--chat-user-bg` / `--chat-user-border`); the agent answers on the panel tone with hairline cream borders — visibly two voices in one room. Tool calls render as dedicated sub-cards (`--tool-card-*`) inside the agent's turn, and code blocks drop to the near-black `--code-bg` with Phosphor Green text: the machine voice made visible.

## 6. Do's and Don'ts

### Do:
- **Do** route every color through the `--theme-*` contract and test new UI in at least Nous, one light theme, and one high-character theme (Matrix/Dracula) before calling it done.
- **Do** keep body-text contrast ≥4.5:1 in every theme (WCAG 2.1 AA) — including placeholders and muted text on tinted surfaces.
- **Do** give every interactive element the full state set: default, hover, focus-visible, active, disabled, loading, error.
- **Do** keep transitions 150–250ms with ease-out curves, and provide `prefers-reduced-motion` alternatives for anything that moves.
- **Do** show the system's liveness honestly — streaming tokens, worker status, presence — that's the product's soul.

### Don't:
- **Don't** import the glossy SaaS landing kit: no gradient text, no glassmorphism-as-decoration, no hero-metric blocks (PRODUCT.md anti-reference, verbatim).
- **Don't** drift toward Jira-like enterprise heaviness: stacked forms, endless toolbars, configuration mazes (PRODUCT.md anti-reference).
- **Don't** let any screen read as a bare chat wrapper — one lonely chat column indistinguishable from a ChatGPT clone (PRODUCT.md anti-reference).
- **Don't** hardcode a hex in a component; that's a theme-contract violation even when it matches Nous.
- **Don't** use side-stripe borders (`border-left` > 1px as accent), foreign grays, or decorative motion that conveys no state.
- **Don't** put JetBrains Mono on buttons, labels, or headings — the machine voice is for machine output.
