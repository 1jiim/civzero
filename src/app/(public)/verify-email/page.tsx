'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const { user, loading } = useAuth()

  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [resendError, setResendError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user?.email_confirmed_at) return

    // User has confirmed email — query characters directly rather than relying
    // on auth context's hasCharacter, which may not have resolved yet.
    const confirmedUser = user
    async function redirect() {
      const supabase = createClient()
      const { data: character } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', confirmedUser.id)
        .maybeSingle()

      // TODO: /character is a placeholder until Phase 9 (character dashboard) is built
      router.push(character ? '/character' : '/character/create')
    }

    redirect()
  }, [user, loading, router])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function startCooldown() {
    setSecondsLeft(60)
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResend() {
    if (!email || secondsLeft > 0) return
    setResendStatus('sending')
    setResendError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/character/create`,
      },
    })

    if (error) {
      setResendStatus('error')
      setResendError(error.message)
      return
    }

    setResendStatus('sent')
    startCooldown()
  }

  if (loading) return null

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-surface border border-line p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl text-primary">Check your inbox.</h1>
          <p className="text-muted text-sm leading-relaxed">
            An entry document has been sent to{' '}
            {email
              ? <span className="text-primary">{email}</span>
              : 'your inbox'
            }. Open it to confirm your arrival. The link will expire in one hour.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResend}
              disabled={resendStatus === 'sending' || secondsLeft > 0 || !email}
              className="w-full bg-transparent border border-line text-primary py-2.5 text-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {secondsLeft > 0
                ? `Resend in ${secondsLeft}s`
                : resendStatus === 'sending'
                  ? 'Sending…'
                  : 'Resend'}
            </button>
            {resendStatus === 'sent' && secondsLeft > 0 && (
              <p className="text-muted text-xs">Sent. Check your inbox.</p>
            )}
            {resendError && <p className="text-danger text-xs">{resendError}</p>}
          </div>

          <Link href="/signup" className="text-muted text-sm hover:text-primary transition-colors">
            Wrong email? Use a different one.
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
