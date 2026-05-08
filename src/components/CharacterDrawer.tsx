'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/types'
import { timeAgo } from '@/lib/timeAgo'

interface CharacterDrawerProps {
  characterId: string | null
  characterName: string | null
  onClose: () => void
}

export function CharacterDrawer({ characterId, characterName, onClose }: CharacterDrawerProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!characterId) {
      setEvents([])
      return
    }

    setLoading(true)
    const supabase = createClient()
    supabase
      .from('events')
      .select('id, character_id, tick_number, narration, created_at')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setEvents((data ?? []) as Event[])
        setLoading(false)
      })
  }, [characterId])

  const isOpen = !!characterId

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface border-l border-line z-50 flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={characterName ?? 'Character chronicle'}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-line">
          <div className="flex flex-col gap-0.5">
            <span className="text-accent text-xs uppercase tracking-widest">Chronicle</span>
            <h2 className="font-heading text-xl text-primary">{characterName ?? '—'}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors text-xl leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Events timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center h-24">
              <p className="text-muted text-sm">Loading…</p>
            </div>
          )}

          {!loading && events.length === 0 && (
            <p className="text-muted text-sm">No events recorded.</p>
          )}

          {!loading && events.length > 0 && (
            <ol className="flex flex-col gap-0">
              {events.map((event, i) => (
                <li key={event.id} className="flex gap-4">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: i === 0 ? 'var(--color-accent)' : 'var(--color-line)' }}
                    />
                    {i < events.length - 1 && (
                      <div className="w-px flex-1 bg-line min-h-[1rem]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1 pb-5">
                    <p className="text-primary text-sm leading-relaxed">{event.narration}</p>
                    <p className="text-muted text-xs">{timeAgo(event.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  )
}
