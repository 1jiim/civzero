'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'

// DEV ONLY — remove before commit
async function devSignOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = '/'
}

export function Nav() {
  const { user, hasCharacter, characterName, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-canvas border-b border-line">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

        <Link href="/" className="font-heading text-primary text-lg tracking-wider">
          CIVZERO
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/world" className="text-muted text-sm hover:text-primary transition-colors">
            World
          </Link>
          <Link href="/#about" className="text-muted text-sm hover:text-primary transition-colors">
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-32 bg-surface rounded animate-pulse" />
          ) : !user ? (
            <>
              <Link href="/signin" className="text-muted text-sm hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm px-4 py-1.5 border border-accent text-accent hover:bg-accent hover:text-canvas transition-colors"
              >
                Enter the City
              </Link>
            </>
          ) : (
            <>
              {!hasCharacter ? (
                <Link
                  href="/character/create"
                  className="text-sm px-4 py-1.5 bg-accent text-canvas hover:opacity-90 transition-opacity"
                >
                  Create Character
                </Link>
              ) : (
                <Link href="/character" className="text-muted text-sm hover:text-primary transition-colors">
                  {characterName}
                </Link>
              )}
              {/* DEV ONLY — remove before commit */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={devSignOut}
                  className="text-xs text-muted border border-line px-2 py-1 hover:border-danger hover:text-danger transition-colors"
                >
                  [sign out]
                </button>
              )}
            </>
          )}

          <button
            className="md:hidden ml-2 text-muted hover:text-primary"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen ? (
                <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              ) : (
                <path fillRule="evenodd" clipRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-line bg-canvas px-4 py-3 flex flex-col gap-3">
          <Link
            href="/world"
            className="text-muted text-sm hover:text-primary transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            World
          </Link>
          <Link
            href="/#about"
            className="text-muted text-sm hover:text-primary transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>
        </div>
      )}
    </nav>
  )
}
