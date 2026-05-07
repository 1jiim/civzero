'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

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
        .select('id, name')
        .eq('user_id', userId)
        .maybeSingle()
      setHasCharacter(!!data)
      setCharacterName(data?.name ?? null)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchCharacter(currentUser.id)
      } else {
        setHasCharacter(false)
        setCharacterName(null)
      }
      // Only mark loading done after both auth state AND character query resolve.
      setLoading(false)
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
