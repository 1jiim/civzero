'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function validatePassword(pw: string): string | null {
  if (pw.length < 8 || !/\d/.test(pw)) return 'At least 8 characters, including one number.'
  return null
}

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPasswordError(null)
    setConfirmError(null)

    const pwErr = validatePassword(password)
    if (pwErr) {
      setPasswordError(pwErr)
      return
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/character/create`,
      },
    })

    if (authError) {
      setError(authError.message)
      setSubmitting(false)
      return
    }

    router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`)
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-surface border border-line p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-accent text-xs uppercase tracking-widest">Entry Protocol</span>
          <h1 className="font-heading text-3xl text-primary">Apply for citizenship.</h1>
          <p className="text-muted text-sm">Core Z-1 verifies all new arrivals.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-primary text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-canvas border border-line px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-primary text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-canvas border border-line px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {passwordError
              ? <p className="text-danger text-xs">{passwordError}</p>
              : <p className="text-muted text-xs">At least 8 characters, including one number.</p>
            }
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-primary text-sm">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full bg-canvas border border-line px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            {confirmError && <p className="text-danger text-xs">{confirmError}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent text-canvas py-2.5 text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity mt-2"
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>

          {error && <p className="text-danger text-sm">{error}</p>}
        </form>

        <div className="flex flex-col gap-3">
          <p className="text-muted text-sm">
            Already a citizen?{' '}
            <Link href="/signin" className="text-primary hover:text-accent transition-colors">
              Sign in.
            </Link>
          </p>
          <p className="text-muted text-xs">
            By applying, you agree to the{' '}
            <Link href="#" className="underline hover:text-primary transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="#" className="underline hover:text-primary transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
