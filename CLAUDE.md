# Lam Cyberlab — Agent Notes

## Design Context

Strategic and visual direction for all UI work lives in two root documents — read them before designing or building any surface:

- [PRODUCT.md](PRODUCT.md) — register (`product`), platform (`web`), users, positioning ("a command center, not a chat wrapper"), brand personality (technical, alive, characterful — Discord energy, not Jira), anti-references, and design principles.
- [DESIGN.md](DESIGN.md) — the visual system: North Star ("The Agent Basecamp"), the `--theme-*` theme contract (14 themes; Nous is canonical default), Harbor-Night palette, typography, elevation, and component rules.

Non-negotiables in short: never hardcode colors (route everything through `--theme-*` and verify in Nous + one light + one high-character theme), accent ≤10% of any screen, WCAG 2.1 AA contrast, 150–250ms ease-out motion with reduced-motion alternatives, no glossy-SaaS/gradient-text/glassmorphism, and chat must never look like a bare ChatGPT clone.

Feature roadmap for the owner's instance: [docs/PRD-workspace-additions.md](docs/PRD-workspace-additions.md).
