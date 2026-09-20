import { HugeiconsIcon } from '@hugeicons/react'
import {
  Activity01Icon,
  ArrowUpRight01Icon,
  BrainIcon,
  CodeIcon,
  CommandLineIcon,
  ComputerTerminal01Icon,
  Folder01Icon,
  Rocket01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

type ProfileSummary = {
  name: string
  model?: string
  active?: boolean
}

type ActionCard = {
  title: string
  description: string
  prompt: string
  icon: typeof CodeIcon
  badge: string
  tone: 'indigo' | 'purple' | 'amber' | 'emerald'
}

const ACTION_CARDS: Array<ActionCard> = [
  {
    title: 'Code & Workspace',
    description:
      'Inspect repository structure, review git changes, or scaffold new features.',
    prompt:
      'Analisis workspace structure di /home/ahlfs/workspace dan berikan overview status project aktif.',
    icon: CodeIcon,
    badge: 'Workspace',
    tone: 'indigo',
  },
  {
    title: 'Second Brain & Wiki',
    description:
      'Consult architecture guidelines, search vault notes, or research new topics.',
    prompt:
      'Cari di Second Brain wiki konsep atau panduan arsitektur yang relevan untuk sesi ini.',
    icon: BrainIcon,
    badge: 'Knowledge',
    tone: 'purple',
  },
  {
    title: 'Services & Terminal',
    description:
      'Inspect active dev servers, port allocations, background daemons, and logs.',
    prompt:
      'Cek status port aktif, running dev servers di workspace, dan background processes.',
    icon: ComputerTerminal01Icon,
    badge: 'System',
    tone: 'amber',
  },
  {
    title: 'Swarm Orchestration',
    description:
      'Decompose complex workflows across Builder, Reviewer, and QA sub-agents.',
    prompt:
      'Bantu susun rencana implementasi task dengan pembagian peran Builder, Reviewer, dan QA swarm workers.',
    icon: Rocket01Icon,
    badge: 'Swarm',
    tone: 'emerald',
  },
]

type ChatEmptyStateProps = {
  onSuggestionClick?: (prompt: string) => void
  compact?: boolean
}

export function ChatEmptyState({
  onSuggestionClick,
  compact = false,
}: ChatEmptyStateProps) {
  const [activeProfile, setActiveProfile] = useState<ProfileSummary | null>(
    null,
  )

  useEffect(() => {
    fetch('/api/profiles/list')
      .then((res) => res.json())
      .then((data) => {
        const profiles = data?.profiles as Array<ProfileSummary> | undefined
        const active = profiles?.find((p) => p.active)
        if (active) setActiveProfile(active)
      })
      .catch(() => {
        // silently ignore — profile info is cosmetic
      })
  }, [])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 4 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex h-full flex-col items-center justify-center px-4 py-6 md:py-10 select-none overflow-y-auto"
    >
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        {/* Status indicator badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide shadow-2xs backdrop-blur-md mb-6"
          style={{
            background:
              'color-mix(in srgb, var(--theme-card, #111) 90%, transparent)',
            borderColor: 'var(--theme-border, rgba(255,255,255,0.1))',
            color: 'var(--theme-muted, #888)',
          }}
        >
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-[var(--theme-text,#eee)]">
            Hermes Agent
          </span>
          <span className="opacity-30">|</span>
          <span className="text-[var(--theme-accent,#ea580c)]">
            {activeProfile?.name ? `${activeProfile.name}` : 'Command Center'}
          </span>
        </motion.div>

        {/* Avatar with layered aura */}
        <div className="relative mb-4 group">
          <div
            className="absolute -inset-1 rounded-2xl opacity-40 blur-sm transition-opacity duration-500 group-hover:opacity-75"
            style={{
              background:
                'radial-gradient(circle, var(--theme-accent, #ea580c) 0%, transparent 70%)',
            }}
          />
          <img
            src="/claude-avatar.webp"
            alt="Hermes Agent"
            className="relative size-16 rounded-xl object-cover shadow-md transition-transform duration-300 group-hover:scale-105"
            style={{
              border:
                '1px solid var(--theme-border, rgba(255,255,255,0.15))',
              padding: '3px',
              background: 'var(--theme-card, #141414)',
            }}
          />
        </div>

        {/* Dynamic Display Title */}
        <h2
          className="editorial-display text-2xl sm:text-3xl font-semibold tracking-tight"
          style={{ color: 'var(--theme-text, #f7f8f8)' }}
        >
          {greeting}, Prince
        </h2>

        <p
          className="mt-2 text-xs sm:text-sm max-w-md font-normal leading-relaxed"
          style={{ color: 'var(--theme-muted, #8a8f98)' }}
        >
          What are we building today? Pair with Hermes to code, orchestrate swarm
          workflows, or explore knowledge.
        </p>

        {/* 2x2 Interactive Action Cards */}
        <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {ACTION_CARDS.map((card, idx) => (
            <motion.button
              key={card.title}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05, duration: 0.25 }}
              onClick={() => onSuggestionClick?.(card.prompt)}
              className={cn(
                'group relative flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]',
              )}
              style={{
                background:
                  'color-mix(in srgb, var(--theme-card, #121316) 96%, transparent)',
                borderColor: 'var(--theme-border, rgba(255,255,255,0.08))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--theme-accent-border, rgba(234,88,12,0.4))'
                e.currentTarget.style.background =
                  'color-mix(in srgb, var(--theme-card2, #18191e) 98%, transparent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--theme-border, rgba(255,255,255,0.08))'
                e.currentTarget.style.background =
                  'color-mix(in srgb, var(--theme-card, #121316) 96%, transparent)'
              }}
            >
              <div className="flex items-start justify-between w-full mb-2.5">
                <div
                  className="flex size-8 items-center justify-center rounded-lg border transition-colors"
                  style={{
                    background:
                      'color-mix(in srgb, var(--theme-card2, #1f2026) 80%, transparent)',
                    borderColor: 'var(--theme-border, rgba(255,255,255,0.1))',
                  }}
                >
                  <HugeiconsIcon
                    icon={card.icon}
                    size={16}
                    strokeWidth={1.8}
                    style={{ color: 'var(--theme-accent, #ea580c)' }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold opacity-70"
                    style={{
                      background:
                        'color-mix(in srgb, var(--theme-card2) 80%, transparent)',
                      color: 'var(--theme-muted, #8a8f98)',
                    }}
                  >
                    {card.badge}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    size={14}
                    strokeWidth={1.8}
                    className="opacity-0 -translate-x-1 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
                    style={{ color: 'var(--theme-accent, #ea580c)' }}
                  />
                </div>
              </div>

              <div>
                <h3
                  className="text-xs sm:text-sm font-semibold tracking-tight transition-colors group-hover:text-[var(--theme-text,#fff)]"
                  style={{ color: 'var(--theme-text, #f7f8f8)' }}
                >
                  {card.title}
                </h3>
                <p
                  className="mt-1 text-[11px] leading-relaxed line-clamp-2"
                  style={{ color: 'var(--theme-muted, #8a8f98)' }}
                >
                  {card.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Capability / Shortcut Hint Footer */}
        {!compact && (
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-mono opacity-65"
            style={{ color: 'var(--theme-muted, #8a8f98)' }}
          >
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-[var(--theme-border)] bg-[var(--theme-card)] text-[10px]">
                ⌘K
              </kbd>
              <span>Command Palette</span>
            </span>
            <span>·</span>
            <span>Drag & drop files/images</span>
            <span>·</span>
            <span>Voice notes supported</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
