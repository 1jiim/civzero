'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CharacterCard } from '@/components/CharacterCard'
import { CharacterDrawer } from '@/components/CharacterDrawer'
import { timeAgo } from '@/lib/timeAgo'
import type { CharacterStatus } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'district' | 'faction' | 'recent'

// Shape returned by the characters query with embedded joins.
// Cast from Supabase's generic return via `as unknown as CharacterRow[]`.
interface CharacterRow {
  id: string
  name: string
  status: CharacterStatus
  created_at: string
  faction_id: number
  factions: { name: string; color_hex: string; ideology: string }
  subgroups: { name: string }
  locations: { name: string; district: string; description: string }
  events: Array<{ narration: string; created_at: string }>
}

// Shape returned by the events query with embedded joins (Recent tab).
interface RecentEventRow {
  id: string
  narration: string
  created_at: string
  tick_number: number
  characters: {
    name: string
    factions: { name: string; color_hex: string }
    subgroups: { name: string }
    locations: { name: string }
  }
}

// ── Select strings ─────────────────────────────────────────────────────────────

const CHAR_SELECT = `
  id, name, status, created_at, faction_id,
  factions!inner(name, color_hex, ideology),
  subgroups!inner(name),
  locations!inner(name, district, description),
  events(narration, created_at)
`.trim()

const EVENTS_SELECT = `
  id, narration, created_at, tick_number,
  characters!inner(
    name,
    factions!inner(name, color_hex),
    subgroups!inner(name),
    locations!inner(name)
  )
`.trim()

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'district', label: 'By District' },
  { id: 'faction',  label: 'By Faction' },
  { id: 'recent',   label: 'Recent' },
]

// ── Skeleton (shown while initial data loads) ──────────────────────────────────

function WorldSkeleton() {
  return (
    <div className="flex flex-col flex-1 px-4 md:px-8 py-8 max-w-5xl mx-auto w-full gap-8">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-52 bg-surface animate-pulse" />
        <div className="h-4 w-40 bg-surface animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-36 bg-surface animate-pulse border-l-4 border-line" />
        ))}
      </div>
    </div>
  )
}

// ── Recent event row (inline component, only used here) ───────────────────────

function EventFeedRow({ event }: { event: RecentEventRow }) {
  const [expanded, setExpanded] = useState(false)
  const { characters: char } = event
  const isLong = event.narration.length > 200
  const displayText =
    expanded || !isLong ? event.narration : event.narration.slice(0, 200) + '…'

  return (
    <div className="flex gap-4 py-4 border-b border-line last:border-b-0">
      {/* Character info */}
      <div className="flex flex-col gap-0.5 w-36 shrink-0">
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: char.factions.color_hex }}
          />
          <span className="text-primary text-xs font-medium truncate">{char.name}</span>
        </div>
        <p className="text-muted text-xs leading-tight truncate">
          {char.factions.name} — {char.subgroups.name}
        </p>
      </div>

      {/* Narration */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <p className="text-muted text-xs leading-relaxed">{displayText}</p>
        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-accent text-xs self-start hover:underline"
          >
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </div>

      {/* Time + location */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-muted text-xs whitespace-nowrap">{timeAgo(event.created_at)}</span>
        <span className="text-muted text-xs truncate max-w-[96px]">{char.locations.name}</span>
      </div>
    </div>
  )
}

// ── Main view (uses useSearchParams — must be inside Suspense) ─────────────────

function WorldView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tab = ((searchParams.get('tab') as Tab) || 'district')

  // ── State ────────────────────────────────────────────────────────────────────

  const [activeCount, setActiveCount] = useState(0)
  const [lastTickAt, setLastTickAt] = useState<string | null>(null)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [recentEvents, setRecentEvents] = useState<RecentEventRow[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null)
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set())
  const [expandedFactions, setExpandedFactions] = useState<Set<string>>(new Set())

  // Refs to read latest values from inside stable closures (interval callback).
  const tabRef = useRef(tab)
  tabRef.current = tab
  const initializedRef = useRef(false)
  const recentFetchedRef = useRef(false)

  // ── Tab navigation ───────────────────────────────────────────────────────────

  function setTab(newTab: Tab) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', newTab)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // ── Fetch functions ──────────────────────────────────────────────────────────

  async function fetchMetricsAndChars() {
    const supabase = createClient()

    const [countResult, tickResult, charResult] = await Promise.all([
      // Head query for efficient count; fall back to chars.length if it fails.
      supabase
        .from('characters')
        .select('id', { count: 'exact', head: true })
        .not('status', 'in', '(dead,dormant)'),
      supabase
        .from('events')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('characters')
        .select(CHAR_SELECT)
        .not('status', 'in', '(dead,dormant)'),
    ])

    const chars = (charResult.data as unknown as CharacterRow[]) ?? []
    setCharacters(chars)
    // Use head count if available; fall back to character array length.
    setActiveCount(countResult.count ?? chars.length)
    setLastTickAt((tickResult.data as { created_at: string } | null)?.created_at ?? null)
  }

  async function fetchRecentEvents(append: boolean) {
    const supabase = createClient()
    // When appending, start from how many events we already have.
    // When replacing (poll or initial), start from 0.
    const offset = append ? recentEvents.length : 0
    const { data } = await supabase
      .from('events')
      .select(EVENTS_SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + 49)
    const rows = (data as unknown as RecentEventRow[]) ?? []
    if (append) {
      setRecentEvents(prev => [...prev, ...rows])
    } else {
      setRecentEvents(rows)
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────────

  // Initial load + 30-second polling. The interval callback reads tabRef to
  // avoid stale closure issues without declaring tab as a dependency.
  useEffect(() => {
    async function load() {
      await fetchMetricsAndChars()
      if (tabRef.current === 'recent') {
        await fetchRecentEvents(false)
        recentFetchedRef.current = true
      }
      setLastUpdated(new Date())
      if (!initializedRef.current) {
        initializedRef.current = true
        setInitialLoading(false)
      }
    }

    load()

    const timer = setInterval(async () => {
      await fetchMetricsAndChars()
      if (tabRef.current === 'recent') {
        await fetchRecentEvents(false)
      }
      setLastUpdated(new Date())
    }, 30_000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lazy-fetch recent events the first time the user switches to that tab.
  useEffect(() => {
    if (tab === 'recent' && !recentFetchedRef.current && !initialLoading) {
      recentFetchedRef.current = true
      fetchRecentEvents(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // ── Load more events (user-triggered) ────────────────────────────────────────

  async function loadMoreEvents() {
    setLoadingMore(true)
    await fetchRecentEvents(true)
    setLoadingMore(false)
  }

  // ── Grouping helpers ──────────────────────────────────────────────────────────

  function groupByDistrict(): [string, { description: string; chars: CharacterRow[] }][] {
    const map = new Map<string, { description: string; chars: CharacterRow[] }>()
    for (const c of characters) {
      const key = c.locations.district
      if (!map.has(key)) map.set(key, { description: c.locations.description, chars: [] })
      map.get(key)!.chars.push(c)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }

  function groupByFaction(): [number, { name: string; color: string; ideology: string; chars: CharacterRow[] }][] {
    const map = new Map<number, { name: string; color: string; ideology: string; chars: CharacterRow[] }>()
    for (const c of characters) {
      const key = c.faction_id
      if (!map.has(key)) {
        map.set(key, {
          name: c.factions.name,
          color: c.factions.color_hex,
          ideology: c.factions.ideology,
          chars: [],
        })
      }
      map.get(key)!.chars.push(c)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }

  // Get the most recent event for a character card — sort client-side so the
  // result is correct even if the server-side ordering on the embedded resource
  // didn't propagate as expected.
  function latestEvent(c: CharacterRow): { narration: string; created_at: string } | null {
    if (!c.events || c.events.length === 0) return null
    return c.events
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }

  // ── Expand/collapse helpers ────────────────────────────────────────────────────

  function toggleDistrict(name: string) {
    setExpandedDistricts(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleFaction(id: number) {
    setExpandedFactions(prev => {
      const next = new Set(prev)
      const key = String(id)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  if (initialLoading) return <WorldSkeleton />

  const districtGroups = groupByDistrict()
  const factionGroups = groupByFaction()

  return (
    <div className="flex flex-col flex-1 px-4 md:px-8 py-8 max-w-5xl mx-auto w-full gap-6">

      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl text-primary">Core Z-1 — Live</h1>
          <p className="text-muted text-sm">
            {activeCount === 0
              ? 'The city is silent.'
              : `${activeCount} active ${activeCount === 1 ? 'citizen' : 'citizens'}.${
                  lastTickAt ? ` Last tick ${timeAgo(lastTickAt)}.` : ''
                }`}
          </p>
          {lastUpdated && (
            <p className="text-muted text-xs">Updated {timeAgo(lastUpdated.toISOString())}</p>
          )}
        </div>

        {/* Tab selector */}
        <div className="flex overflow-x-auto border border-line shrink-0 self-start">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-r border-line last:border-r-0 ${
                tab === t.id ? 'bg-accent text-canvas' : 'text-muted hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global empty state — no active characters anywhere */}
      {activeCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted text-sm max-w-xs leading-relaxed">
            Core Z-1 is silent. No one walks the streets. Be the first.
          </p>
          <Link
            href="/signup"
            className="bg-accent text-canvas px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Enter the City
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* ── By District ────────────────────────────────────────────────────── */}
          {tab === 'district' && (
            <>
              {districtGroups.length === 0 ? (
                <p className="text-muted text-sm">No active citizens.</p>
              ) : (
                districtGroups.map(([districtName, { description, chars }]) => {
                  const isExpanded = expandedDistricts.has(districtName)
                  const shown = isExpanded ? chars : chars.slice(0, 6)
                  return (
                    <section key={districtName}>
                      <div className="flex flex-col gap-0.5 border-b border-line pb-2 mb-4">
                        <div className="flex items-center justify-between gap-4">
                          <h2 className="font-heading text-xl text-primary">{districtName}</h2>
                          <span className="text-muted text-xs shrink-0">
                            {chars.length} {chars.length === 1 ? 'citizen' : 'citizens'}
                          </span>
                        </div>
                        <p className="text-muted text-xs">{description}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shown.map(c => {
                          const ev = latestEvent(c)
                          return (
                            <CharacterCard
                              key={c.id}
                              id={c.id}
                              name={c.name}
                              status={c.status}
                              factionName={c.factions.name}
                              factionColor={c.factions.color_hex}
                              subgroupName={c.subgroups.name}
                              latestNarration={ev?.narration ?? null}
                              latestAt={ev?.created_at ?? null}
                              onClick={() => setSelected({ id: c.id, name: c.name })}
                            />
                          )
                        })}
                      </div>
                      {chars.length > 6 && (
                        <button
                          onClick={() => toggleDistrict(districtName)}
                          className="mt-3 text-accent text-xs hover:underline"
                        >
                          {isExpanded ? 'Show less' : `View all (${chars.length})`}
                        </button>
                      )}
                    </section>
                  )
                })
              )}
            </>
          )}

          {/* ── By Faction ─────────────────────────────────────────────────────── */}
          {tab === 'faction' && (
            <>
              {factionGroups.length === 0 ? (
                <p className="text-muted text-sm">No active citizens.</p>
              ) : (
                factionGroups.map(([factionId, { name, color, ideology, chars }]) => {
                  const isExpanded = expandedFactions.has(String(factionId))
                  const shown = isExpanded ? chars : chars.slice(0, 6)
                  return (
                    <section key={factionId}>
                      <div
                        className="border-b border-line pb-2 mb-4 pl-3"
                        style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h2 className="font-heading text-xl text-primary">{name}</h2>
                          <span className="text-muted text-xs shrink-0">
                            {chars.length} {chars.length === 1 ? 'citizen' : 'citizens'}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color }}>{ideology}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {shown.map(c => {
                          const ev = latestEvent(c)
                          return (
                            <CharacterCard
                              key={c.id}
                              id={c.id}
                              name={c.name}
                              status={c.status}
                              factionName={c.factions.name}
                              factionColor={c.factions.color_hex}
                              subgroupName={c.subgroups.name}
                              latestNarration={ev?.narration ?? null}
                              latestAt={ev?.created_at ?? null}
                              onClick={() => setSelected({ id: c.id, name: c.name })}
                            />
                          )
                        })}
                      </div>
                      {chars.length > 6 && (
                        <button
                          onClick={() => toggleFaction(factionId)}
                          className="mt-3 text-accent text-xs hover:underline"
                        >
                          {isExpanded ? 'Show less' : `View all (${chars.length})`}
                        </button>
                      )}
                    </section>
                  )
                })
              )}
            </>
          )}

          {/* ── Recent Events ───────────────────────────────────────────────────── */}
          {tab === 'recent' && (
            <div className="flex flex-col">
              {recentEvents.length === 0 ? (
                <p className="text-muted text-sm">Nothing has happened yet.</p>
              ) : (
                <>
                  {recentEvents.map(event => (
                    <EventFeedRow key={event.id} event={event} />
                  ))}
                  <button
                    onClick={loadMoreEvents}
                    disabled={loadingMore}
                    className="mt-6 self-center border border-line text-muted text-sm px-4 py-2 hover:text-primary hover:border-accent transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      )}

      {/* Drawer — always in DOM, translates off-screen when closed */}
      <CharacterDrawer
        characterId={selected?.id ?? null}
        characterName={selected?.name ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

// ── Page export ────────────────────────────────────────────────────────────────
// Wraps WorldView in Suspense because useSearchParams() requires it in Next.js.

export default function WorldPage() {
  return (
    <Suspense fallback={<WorldSkeleton />}>
      <WorldView />
    </Suspense>
  )
}
