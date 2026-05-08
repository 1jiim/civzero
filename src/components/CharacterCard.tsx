'use client'

import type { CharacterStatus } from '@/lib/types'
import { timeAgo } from '@/lib/timeAgo'

// Desaturated semantic palette — distinct from the Cloud Blue accent.
// Applied as chip background; text is white at 85% opacity.
const STATUS_COLORS: Record<CharacterStatus, string> = {
  active:       '#5d7d5d',
  injured:      '#8b5a2b',
  hospitalized: '#4a6878',
  critical:     '#9b3a30',
  dormant:      '#555a60',
  relearning:   '#555a60',
  missing:      '#5a5470',
  dead:         '#3a3a3a',
}

export interface CharacterCardProps {
  id: string
  name: string
  status: CharacterStatus
  factionName: string
  factionColor: string
  subgroupName: string
  latestNarration: string | null
  latestAt: string | null
  onClick: () => void
}

export function CharacterCard({
  name,
  status,
  factionName,
  factionColor,
  subgroupName,
  latestNarration,
  latestAt,
  onClick,
}: CharacterCardProps) {
  const sigil = factionName.charAt(0).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface border border-line hover:bg-[#2a2a2a] transition-colors"
      style={{ borderLeftColor: factionColor, borderLeftWidth: '4px' }}
    >
      <div className="p-4 flex flex-col gap-2">
        {/* Name + faction sigil */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-primary text-sm leading-tight">{name}</span>
          <span
            className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border shrink-0"
            style={{ borderColor: factionColor, color: factionColor }}
          >
            {sigil}
          </span>
        </div>

        {/* Faction — Subgroup */}
        <p className="text-muted text-xs">{factionName} — {subgroupName}</p>

        {/* Latest narration, 2-line clamp */}
        <p className="text-muted text-xs leading-relaxed line-clamp-2">
          {latestNarration ?? 'Newly arrived in Core Z-1.'}
        </p>

        {/* Status chip + time-ago */}
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-xs px-2 py-0.5"
            style={{
              backgroundColor: STATUS_COLORS[status] ?? STATUS_COLORS.dormant,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {status}
          </span>
          {latestAt && (
            <>
              <span className="text-line text-xs">·</span>
              <span className="text-muted text-xs">{timeAgo(latestAt)}</span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
