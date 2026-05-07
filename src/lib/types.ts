// TypeScript types matching the Civzero database schema exactly.
// Row types represent what Supabase returns on SELECT.
// Insert types represent what you send on INSERT (omitting defaults/generated fields).

export type CharacterStatus =
  | 'active'
  | 'injured'
  | 'critical'
  | 'hospitalized'
  | 'dormant'
  | 'relearning'
  | 'missing'
  | 'dead'

// ── Row types ────────────────────────────────────────────────────────────────

export interface Faction {
  id: number
  name: string
  slug: string
  ideology: string
  description: string
  current_population_count: number
  color_hex: string
}

export interface Subgroup {
  id: number
  faction_id: number
  name: string
  description: string
}

export interface Skill {
  id: number
  name: string
  description: string
}

export interface Location {
  id: string
  name: string
  district: string
  description: string
}

export interface Character {
  id: string
  user_id: string
  name: string
  faction_id: number
  subgroup_id: number
  location_id: string
  personality_core: string
  personality_values: string
  personality_flaw: string
  status: CharacterStatus
  health: number
  hunger: number
  morale: number
  energy_current: number
  energy_max: number
  energy_purchased: number
  history_summary: string | null
  created_at: string
  last_tick_at: string | null
}

export interface CharacterSkill {
  character_id: string
  skill_id: number
  proficiency: number
}

export interface Event {
  id: string
  character_id: string
  tick_number: number
  narration: string
  created_at: string
}

export interface UserSettings {
  user_id: string
  vault_secret_id: string | null
  email_verified_at: string | null
  created_at: string
}

// ── Insert types (omit server-generated fields) ───────────────────────────────

export type CharacterInsert = Omit<Character, 'id' | 'created_at' | 'last_tick_at'> & {
  id?: string
}

export type EventInsert = Omit<Event, 'id' | 'created_at'> & { id?: string }

// ── Database type for Supabase client generics ────────────────────────────────

export type Database = {
  public: {
    Tables: {
      factions: {
        Row: Faction
        Insert: Omit<Faction, 'current_population_count'> & { current_population_count?: number }
        Update: Partial<Faction>
      }
      subgroups: {
        Row: Subgroup
        Insert: Subgroup
        Update: Partial<Subgroup>
      }
      skills: {
        Row: Skill
        Insert: Skill
        Update: Partial<Skill>
      }
      locations: {
        Row: Location
        Insert: Omit<Location, 'id'> & { id?: string }
        Update: Partial<Location>
      }
      characters: {
        Row: Character
        Insert: CharacterInsert
        Update: Partial<Character>
      }
      character_skills: {
        Row: CharacterSkill
        Insert: CharacterSkill
        Update: Partial<CharacterSkill>
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: Partial<Event>
      }
      user_settings: {
        Row: UserSettings
        Insert: UserSettings
        Update: Partial<UserSettings>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
