# Civzero (Core Z-1) — Project Memory for Claude Code

This file is your persistent memory about this project. Read this every session.

## What this project is

Civzero (codename Core Z-1) is a post-apocalyptic character simulation app.
Users sign up, create one autonomous character, provide their own Anthropic
API key, and watch their character live in a shared world of other users'
characters. The simulation runs automatically: characters take actions on
a tick schedule based on their personality, faction, and circumstances.
Users do not control their characters directly.

The repo name is `civzero`. Some design documents reference the codename
`core-z1` interchangeably. They mean the same project.

## The three design documents

ALWAYS read these in this order before starting any non-trivial task:

1. `docs/core_z1_design.md` — The world bible, faction details, action types,
   tick prompts, and JSON schemas. The creative core.
2. `docs/core_z1_pages_v1.md` — The four v1 pages: landing, world view, signup,
   character creation. Layouts, copy, queries.
3. `docs/core_z1_build_runbook.md` — The phased build sequence. Schema, RLS, Edge
   Function code, verification gates.

If you are uncertain about a design decision, the documents are the source
of truth. Do not invent new design choices — surface the question to the user.

## Tech stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Vault)
- **Edge Functions:** Deno + TypeScript
- **Deployment target:** Vercel for frontend, Supabase for everything else
- **AI integration:** Anthropic API (each user's character runs on the user's own key)
- **Next.js version:** 16.x (uses `proxy.ts` instead of the legacy
  `middleware.ts`. Both files do the same thing — proxy is the new name.
  Don't rename it back.)

## Visual style — non-negotiable, adhere strictly to the following design philosophy 

- Dark mode only. Background `#050505`, surfaces `#212121`, borders `#2F3030`.
- Primary text `#F0F0F0`, secondary `#C2C2C2`.
- Single accent color: Cloud Blue `#A3C6D6`. Used sparingly.
- SF Display for body (available here https://github.com/sahibjotsaggu/San-Francisco-Pro-Fonts), 
- Mozilla Headline (https://fonts.google.com/specimen/Mozilla+Headline) for headings to feel official-archival.
- No emojis. No gradients. No bouncy soft cards. Industrial-archival.
- Civilization Zero is a post-apocalyptic AI Multiplayer Simulation driven by the users own characters.

> **TODO before public launch:** SF Display is self-hosted from an unofficial source. Apple's license restricts SF Pro to Apple platforms. Before any public/commercial deployment, swap to Inter or Geist Sans (both free, visually similar). Ignore for v1 development.

## Project structure

- `app/` — Next.js App Router pages.
- `app/(public)/` — public routes: `/`, `/world`, `/signin`, `/signup`, `/verify-email`.
- `app/character/` — authenticated routes: `/character/create` and (later) `/character`.
- `components/` — reusable React components.
- `lib/supabase/` — Supabase client setup (browser client and server client).
- `lib/types.ts` — shared TypeScript types matching the database schema.
- `supabase/migrations/` — SQL migrations. Numbered with timestamp prefixes.
- `supabase/functions/` — Edge Functions. One folder per function.
- `docs/` — design documents.

## Coding standards

- TypeScript strict mode. No `any` unless absolutely necessary, with a comment
  explaining why.
- Functional React components with hooks. No class components.
- Tailwind for all styling. No CSS files except the Tailwind base.
- Use the Supabase types pattern: define types in `lib/types.ts` that match
  the database schema exactly.
- Server-only secrets (service role key, user API keys) NEVER appear in any
  file under `app/` that doesn't have explicit server-side rendering. Use
  Edge Functions for anything sensitive.

## Security rules — non-negotiable

- The user's Anthropic API key:
  - Is only ever submitted via the `validate-and-create-character` Edge Function.
  - Is stored in Supabase Vault, never in a regular table column.
  - Is never returned to the client.
  - Is never logged.
- The Supabase service-role key:
  - Lives in `.env.local` (gitignored) and Edge Function environment variables.
  - Never appears in `app/` code.
  - Never appears in any client component.
- Row-Level Security is enabled on every table. Policies are checked manually
  by the user before going live.

## Skills system — current truth

The `skills` table has **38 skills** (ids 1–38). Ids 1–18 are the original
core skills from the design doc; ids 19–38 expand into traditional crafts
(Smithing, Carpentry, Tailoring, Brewing, Pottery, Weaving, etc.), survival
arts (Tracking, Climbing, Cartography, Husbandry), and social specialties
(Bureaucracy, Forgery, Locksmithing, Performance, Linguistics).

Users pick exactly **5** skills at character creation. This is enforced
in the `create_character_with_skills` database function and must be
matched by the character creation UI.

If the design docs and the database disagree on skills, **the database
is the source of truth**. Update the docs to match.

## Workflow rules for you, Claude Code

- Before making any non-trivial change, briefly state what you intend to do.
- Always read related files before editing them. Don't assume contents.
- When making changes that span multiple files, list the files you'll touch
  before starting.
- After completing a logical chunk of work, suggest a git commit message and
  ask before committing. Don't auto-commit.
- If a task seems to deviate from the design documents, stop and surface
  the deviation to the user.
- Run `npm run dev` only when explicitly asked. Don't auto-start servers.
- Never modify `.env.local`, `.env*`, or anything in `supabase/.branches/`.

## What's done so far

- Local environment installed: Node.js, Supabase CLI, Claude Code, git, GitHub CLI.
- GitHub repo `civzero` created and cloned locally.
- Next.js project scaffolded with TypeScript and Tailwind.
- Supabase project created, linked locally via `supabase link`.
- Database schema applied: 8 tables (factions, subgroups, skills, locations,
  characters, character_skills, events, user_settings), RLS policies, and 2
  database functions (create_anthropic_secret, create_character_with_skills).
- Seed data loaded: 10 factions, 40 subgroups, 18 skills, 10 starter locations.
- Migration files committed to repo for reproducibility.

## What's next

The runbook's Phases 5-10 still need to be done. The order is:
1. Foundation: Supabase client setup, auth context, layout shell, signin page.
   (This corresponds to Phase 4 of the runbook but adapted for Next.js.)
2. Landing page (runbook Phase 5).
3. Signup + verify-email pages (runbook Phase 6).
4. World view (runbook Phase 7).
5. Edge Function (runbook Phase 8) — the user will write this manually with
   your guidance, NOT by you generating it.
6. Character creation (runbook Phase 9).

## Things you should never do without asking

- Add new dependencies to package.json.
- Change Tailwind config or fonts.
- Add new database tables or columns.
- Modify RLS policies.
- Modify the Edge Function code.
- Add new top-level routes.
- Use any state management library beyond React's built-ins.

