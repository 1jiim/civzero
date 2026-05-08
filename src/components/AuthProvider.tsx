'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Character } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  hasCharacter: boolean
  characterName: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  hasCharacter: false,
  characterName: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [hasCharacter, setHasCharacter] = useState(false)
  const [characterName, setCharacterName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchCharacter(userId: string) {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      // @supabase/ssr doesn't fully propagate Database generics through the query builder;
      // cast to the known Row type explicitly.
      const character = data as Character | null
      setHasCharacter(!!character)
      setCharacterName(character?.name ?? null)
    }

    // Phase 1 — resolve loading immediately from the cached session.
    // getSession() reads localStorage/cookies without a network round-trip, so it
    // resolves even when the Supabase project is unreachable. onAuthStateChange alone
    // is not reliable here because it waits for an internal async check before firing.
    // fetchCharacter is fire-and-forget: setLoading(false) must not wait for the DB
    // query so that the nav resolves promptly even when the database is slow.
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          fetchCharacter(currentUser.id)
        }
      } finally {
        setLoading(false)
      }
    }
    initSession()

    // Phase 2 — subscribe to live auth events (sign-in, sign-out, token refresh).
    // loading is already resolved by initSession; don't touch it here.
    //
    // IMPORTANT: fetchCharacter is fire-and-forget (no await). GoTrueClient awaits
    // every onAuthStateChange callback before resolving signInWithPassword — if this
    // callback is async and awaits a DB query, signInWithPassword will hang until the
    // query completes. Code that needs accurate post-signin character status must do
    // its own direct query instead of reading hasCharacter/characterName from context.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchCharacter(currentUser.id)
      } else {
        setHasCharacter(false)
        setCharacterName(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, hasCharacter, characterName, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
