import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export function LoginScreen() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (data.ok) {
        // Success! Reload to trigger auth check
        window.location.reload()
      } else {
        setError(data.error || 'Invalid password')
        setLoading(false)
      }
    } catch (err) {
      setError('Authentication failed. Please try again.')
      setLoading(false)
    }
  }

  // A geometric dot pattern for the background
  const DotGrid = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-20">
      <div
        className="w-[200vw] h-[200vh] absolute"
        style={{
          backgroundImage:
            'radial-gradient(var(--theme-muted, rgba(255,255,255,0.2)) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0',
        }}
      />
      <motion.div
        className="w-[150vw] h-[150vh] absolute"
        style={{
          background:
            'radial-gradient(circle, var(--theme-accent-subtle, rgba(94,106,210,0.15)) 0%, transparent 60%)',
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )

  if (!mounted) return null

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--theme-bg,#08090a)] px-4 overflow-hidden text-[var(--theme-text,#f7f8f8)]">
      <DotGrid />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 24,
          delay: 0.1,
        }}
      >
        <div className="overflow-hidden rounded-2xl bg-[var(--theme-card,rgba(255,255,255,0.02))] p-8 sm:p-10 border border-[var(--theme-border,rgba(255,255,255,0.08))] shadow-2xl backdrop-blur-md">
          {/* Logo & Header */}
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            <motion.div
              className="flex items-center justify-center mb-5 h-16 w-16 rounded-2xl overflow-hidden shadow-2xl border border-[var(--theme-border,rgba(255,255,255,0.1))]"
              style={{
                boxShadow:
                  '0 0 25px var(--theme-accent-subtle, rgba(94,106,210,0.25))',
              }}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
            >
              <img
                src="/claude-avatar.webp"
                alt="LAM Cyberlab Logo"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--theme-text,#f7f8f8)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              LAM Cyberlab
            </motion.h1>
            <motion.p
              className="mt-1.5 text-xs font-mono text-[var(--theme-muted,#8a8f98)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Secure Workspace Authentication
            </motion.p>
          </div>

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter workspace password..."
                className="w-full rounded-xl border border-[var(--theme-border,rgba(255,255,255,0.08))] bg-[var(--theme-bg,#08090a)] px-4 py-3 text-xs sm:text-sm text-[var(--theme-text,#f7f8f8)] placeholder-[var(--theme-muted,#8a8f98)] font-medium outline-none transition-all focus:border-[var(--theme-accent,#5e6ad2)] focus:ring-2 focus:ring-[var(--theme-accent,#5e6ad2)]/30"
                disabled={loading}
                autoFocus
              />
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-300 border border-red-500/20">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !password}
              whileHover={!loading && password ? { scale: 1.01 } : {}}
              whileTap={!loading && password ? { scale: 0.99 } : {}}
              className="w-full relative overflow-hidden rounded-xl bg-[var(--theme-accent,#5e6ad2)] px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent,#5e6ad2)]/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <span className={loading ? 'opacity-0' : 'opacity-100'}>
                Authenticate Access
              </span>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-1.5">
                    <motion.div
                      className="h-2 w-2 rounded-full bg-white"
                      animate={{ y: [-3, 3, -3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        ease: 'easeInOut',
                      }}
                    />
                    <motion.div
                      className="h-2 w-2 rounded-full bg-white"
                      animate={{ y: [-3, 3, -3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.2,
                        ease: 'easeInOut',
                      }}
                    />
                    <motion.div
                      className="h-2 w-2 rounded-full bg-white"
                      animate={{ y: [-3, 3, -3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.6,
                        delay: 0.4,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.button>
          </motion.form>
        </div>

        {/* Footer */}
        <motion.p
          className="mt-6 text-center text-xs font-mono text-[var(--theme-muted,#8a8f98)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Powered by{' '}
          <a
            href="https://github.com/NousResearch/hermes-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--theme-accent-secondary,var(--theme-accent,#7170ff))] hover:underline transition-colors"
          >
            Hermes Agent
          </a>
        </motion.p>
      </motion.div>
    </div>
  )
}
