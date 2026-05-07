'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    console.log('[signin] handleSubmit started')

    try {
      const supabase = createClient()
      console.log('[signin] calling signInWithPassword...')
      const { error: authError, data } = await supabase.auth.signInWithPassword({ email, password })
      console.log('[signin] signInWithPassword returned — error:', authError?.message ?? 'none', '| session:', data.session ? 'present' : 'null', '| user:', data.user?.id ?? 'null')

      if (authError) {
        setError(authError.message)
        return
      }

      if (!data.session) {
        setError('Please confirm your email before signing in. Check your inbox.')
        return
      }

      console.log('[signin] calling router.push /character/create')
      // TODO: once Phase 9 (character dashboard) is built, query characters here and
      // redirect to /character if one exists, /character/create if not.
      router.push('/character/create')
      console.log('[signin] router.push called')
    } finally {
      setSubmitting(false)
      console.log('[signin] setSubmitting(false) called')
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-accent text-xs uppercase tracking-widest">Entry</span>
          <h1 className="font-heading text-3xl text-primary">Sign in.</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-surface border border-line px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-surface border border-line px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-canvas py-2.5 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          {error && <p className="text-danger text-sm">{error}</p>}
        </form>

        <p className="text-muted text-sm">
          New to the city?{' '}
          <Link href="/signup" className="text-primary hover:text-accent transition-colors">
            Apply for citizenship.
          </Link>
        </p>
      </div>
    </div>
  )
}
