# Product

## Register

product

## Platform

web

## Users

The primary user is the instance owner (ahlfs): a self-hoster running Lam Cyberlab on their own Debian server as a daily driver, reached from browser, PWA, and Tailscale devices. Secondary audience is the open-source community using the public repo for their own instances — the UI must stay legible to a newcomer who just connected their first gateway, not only to the owner who knows every corner.

It is an all-day tool, not a occasional visit: daily agent chat, multi-agent/swarm orchestration, server monitoring and ops, and managing files, memory, and skills all happen in the same shell.

## Product Purpose

Lam Cyberlab is the command center for a self-hosted Hermes AI agent: chat, sessions, memory, skills, jobs, terminal, dashboards, and swarm orchestration in one interface, zero-fork on top of vanilla `hermes-agent`. Success means the owner can live in it for hours and run their whole agent fleet from it — and a stranger cloning the repo reaches a working, understandable workspace without help.

## Positioning

A command center, not a chat wrapper. Every screen should reinforce that this is a complete operations surface for your agent — if a view could be mistaken for a bare ChatGPT clone, it is underselling the product.

## Brand Personality

Technical, alive, characterful. The reference feel is Discord/Slack rather than sterile admin tooling: comfortable to inhabit for hours, chat that feels warm and conversational, a sidebar with presence and life. The agent reads as a character (avatar, activity, status), not a form field. Personality is expressed through the first-class theme system (Nous, Matrix, Dracula, SciFi…) and chrome — while controls stay familiar and predictable.

## Anti-references

- Glossy SaaS landing aesthetics: gradient text, glassmorphism, hero metrics.
- Heavy enterprise tooling (Jira-like): stacked forms, endless toolbars, configuration mazes, sluggish feel.
- The bare chat wrapper: one chat column and dead space, indistinguishable from a ChatGPT clone.

## Design Principles

- **Command center first.** Surfaces show status and controls of a live system; breadth is a feature, but never buries the task at hand.
- **Comfortable for hours.** A daily driver earns its keep in long sessions: readable density, warm chat surfaces, nothing that fatigues.
- **The agent is a character.** Presence, avatar, live activity, and voice make the workspace feel inhabited, not administered.
- **Themes are first-class citizens.** Every feature must look intentional in all fourteen themes; identity lives in the theme layer, not hardcoded chrome.
- **Familiar controls, characterful chrome.** Standard affordances users already know; the personality budget is spent on chrome, themes, and moments — never on reinventing form controls.

## Accessibility & Inclusion

WCAG 2.1 AA: body text contrast ≥4.5:1 in every theme, visible focus states, keyboard reachability, and `prefers-reduced-motion` honored across animations.
