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
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center opacity-30">
      <div 
        className="w-[200vw] h-[200vh] absolute"
        style={{
          backgroundImage: 'radial-gradient(var(--theme-primary-400) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0',
        }}
      />
      <motion.div
        className="w-[150vw] h-[150vh] absolute bg-gradient-to-tr from-transparent via-primary-200/20 to-accent-500/10"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  )

  if (!mounted) return null

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary-50 px-4 overflow-hidden selection:bg-accent-500 selection:text-white">
      <DotGrid />

      <motion.div 
        className="relative z-10 w-full max-w-md"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: 'spring', 
          stiffness: 300, 
          damping: 24,
          delay: 0.1 
        }}
      >
        <div className="overflow-hidden rounded-2xl bg-primary-100 p-10 border-2 border-primary-200/50 shadow-2xl shadow-primary-900/10 ring-1 ring-primary-300/30 backdrop-blur-sm">
          
          {/* Logo & Header */}
          <div className="mb-10 flex flex-col items-center justify-center text-center">
            <motion.div 
              className="flex items-center justify-center mb-6 h-16 w-16 rounded-2xl overflow-hidden shadow-[0_0_24px_-4px_var(--theme-accent-500)]"
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            >
              <img src="/claude-logo.png" alt="LAM Cyberlab Logo" className="w-full h-full object-cover" />
            </motion.div>
            <motion.h1 
              className="text-3xl font-extrabold tracking-tight text-primary-900"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              LAM Cyberlab
            </motion.h1>
            <motion.p 
              className="mt-2 text-sm font-medium text-primary-600"
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
            className="space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="relative group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full rounded-xl border-2 border-primary-200 bg-primary-50/50 px-5 py-3.5 text-primary-900 placeholder-primary-400 font-medium outline-none transition-all focus:border-accent-500 focus:bg-primary-50 focus:ring-4 focus:ring-accent-500/20 group-hover:border-primary-300"
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
                  <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 border border-red-500/20">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || !password}
              whileHover={(!loading && password) ? { scale: 1.02 } : {}}
              whileTap={(!loading && password) ? { scale: 0.98 } : {}}
              className="w-full relative overflow-hidden rounded-xl bg-accent-500 px-4 py-3.5 font-bold text-white shadow-[0_4px_14px_0_var(--theme-accent-500)] transition-all hover:bg-accent-600 focus:outline-none focus:ring-4 focus:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent-500"
            >
              <span className={loading ? 'opacity-0' : 'opacity-100'}>
                Authenticate Access
              </span>
              
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-1.5">
                    <motion.div className="h-2 w-2 rounded-full bg-white" animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }} />
                    <motion.div className="h-2 w-2 rounded-full bg-white" animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: 0.1 }} />
                    <motion.div className="h-2 w-2 rounded-full bg-white" animate={{ y: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut', delay: 0.2 }} />
                  </div>
                </div>
              )}
            </motion.button>
          </motion.form>
        </div>

        {/* Footer */}
        <motion.p 
          className="mt-8 text-center text-xs font-semibold text-primary-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Powered by{' '}
          <a
            href="https://github.com/NousResearch/hermes-agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-500 hover:text-accent-600 transition-colors underline decoration-accent-500/30 underline-offset-4 hover:decoration-accent-500"
          >
            Hermes Agent
          </a>
        </motion.p>
      </motion.div>
    </div>
  )
}
