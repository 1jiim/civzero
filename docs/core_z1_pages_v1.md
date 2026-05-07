
# Core Z-1 — V1 Pages Spec

**Version:** 1.0
**Scope:** Landing page, public world view, signup, and character creation.
**What this is not:** the personal character dashboard (where a logged-in user views their own character's life). That comes after these four are working.

This document is the source of truth for the four pages. Each section has: purpose, layout, copy, data, and a Lovable prompt at the end you can paste directly.

---

## §0. Decisions Locked from Conversation

- World view is **public** — anyone can browse, no signup needed.
- World view is organized with **tabs** — by location, by faction, recent activity feed.
- **Email verification required** before character creation.
- Stack: Lovable's default — React, Tailwind, Supabase (Auth + Postgres + RLS).
- Tone of all copy: tense, weighted, never marketing-fluffy. Match the world bible.
- The map / 2D world is deferred to v2.

---

## §1. Shared Foundations

Define these once and reference them on every page.

### 1.1 Visual Tone

- **Color palette.** Dystopian-industrial, not bright. Default to dark mode.
- Dark mode only. Background `#050505`, surfaces `#212121`, borders `#2F3030`.
- Primary text `#F0F0F0`, secondary `#C2C2C2`.
- Single accent color: Cloud Blue `#A3C6D6`. Used sparingly.
- Faction colors: 10 muted hues (defined in §2.3)
- **Typography.** SF Display for body (available here https://github.com/sahibjotsaggu/San-Francisco-Pro-Fonts), Mozilla Headline (https://fonts.google.com/specimen/Mozilla+Headline) for headings to feel official-archival.
- **No emojis. No gradients. No rounded marketing-card aesthetics.** This is a city with rationed power, not a SaaS, marketing or company product. It's a AI Civilization Simulation

### 1.2 Global Components

- **Top nav (always visible):**
  - Left: wordmark "Civilization Zero"
  - Center: links — `World`, `About`
  - Right (logged out): `Sign In` button, `Enter the City` button (primary, links to signup)
  - Right (logged in, no character): `Create Character` button
  - Right (logged in, has character): character name + faction sigil → links to personal dashboard (out of scope for this spec)
- **Footer:** small, three columns
  - Left: wordmark + one-line tagline
  - Middle: legal links (Terms, Privacy) — placeholders for now
  - Right: "Civ0 | v1.0"

### 1.3 Auth State Handling

Every page checks Supabase auth state on mount:

- `loading` — skeleton state
- `anonymous` — public view
- `authenticated, no character` — full nav with "Create Character" CTA
- `authenticated, has character` — full nav with character link

Use Supabase's `onAuthStateChange` listener to react to login/logout.

---

## §2. Database Schema (V1 Subset)

These tables are needed for the four pages. Don't build the full schema yet — only what these pages touch.

### 2.1 Auth Tables

Supabase manages `auth.users` automatically. Email verification is enabled in Supabase Auth settings (Dashboard → Authentication → Providers → Email → "Confirm email" = ON).

### 2.2 Application Tables

```sql
-- 10 factions (seeded once, never user-edited)
create table factions (
  id              smallint primary key,
  name            text not null unique,
  slug            text not null unique,
  ideology        text not null,             -- one-liner shown on creation
  description     text not null,             -- longer description for tooltips
  current_population_count int not null default 0,
  color_hex       text not null              -- for tinted UI elements
);

-- 40 sub-groups (seeded once)
create table subgroups (
  id              smallint primary key,
  faction_id      smallint not null references factions(id),
  name            text not null,
  description     text not null
);

-- 18 skills (seeded once)
create table skills (
  id              smallint primary key,
  name            text not null unique,
  description     text not null
);

-- locations (seeded once for v1; can grow later)
create table locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  district        text not null,             -- e.g., "Old Court District"
  description     text not null
);

-- characters
create table characters (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  faction_id      smallint not null references factions(id),
  subgroup_id     smallint not null references subgroups(id),
  location_id     uuid not null references locations(id),
  personality_core   text not null,
  personality_values text not null,
  personality_flaw   text not null,
  status          text not null default 'active',
                  -- active, injured, critical, hospitalized,
                  -- dormant, relearning, missing, dead
  health          int  not null default 100,
  hunger          int  not null default 50,
  morale          int  not null default 70,
  energy_current  int  not null default 10,
  energy_max      int  not null default 10,
  energy_purchased int not null default 0,
  history_summary text,
  created_at      timestamptz not null default now(),
  last_tick_at    timestamptz,

  unique (user_id)                            -- one active character per user
);

create table character_skills (
  character_id    uuid not null references characters(id) on delete cascade,
  skill_id        smallint not null references skills(id),
  proficiency     numeric(3,2) not null default 0.6,
  primary key (character_id, skill_id)
);

-- events drive the world view "recent activity" tab
create table events (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references characters(id) on delete cascade,
  tick_number     int not null,
  narration       text not null,
  created_at      timestamptz not null default now()
);

create index events_recent_idx on events (created_at desc);
create index characters_faction_idx on characters (faction_id) where status not in ('dead', 'dormant');
create index characters_location_idx on characters (location_id) where status not in ('dead', 'dormant');

-- user settings (vault secret id is filled in later when API key is stored —
-- not on this page set, but include the table now for cleanliness)
create table user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  vault_secret_id uuid,                       -- null until API key stored
  email_verified_at timestamptz,
  created_at      timestamptz not null default now()
);
```

### 2.3 Faction Seed Data

Run once after creating tables.

```sql
insert into factions (id, name, slug, ideology, description, color_hex) values
(1, 'The Aegis Ward',       'aegis',     'Order & Force',
   'They keep the walls and the laws. They decide who lives peacefully — and who doesn''t.',          '#7a8794'),
(2, 'The Salvage Syndicate','salvage',   'Recovery & Expansion',
   'They bring in everything Core Z-1 cannot make. Without them, the city slowly runs out of the past.','#a07b3f'),
(3, 'The Vitalis Order',    'vitalis',   'Life & Death',
   'They preserve health and decide who is worth saving.',                                            '#7e9b7e'),
(4, 'The Emberwrights',     'ember',     'Power & Function',
   'They keep the city running. If they fail, the city goes dark.',                                   '#b8703a'),
(5, 'The Archive Veil',     'archive',   'Knowledge & Truth',
   'They store history and decide what is hidden. They control what people believe is real.',        '#6b6480'),
(6, 'The Grain Covenant',   'grain',     'Food & Sustenance',
   'They produce and ration all food and water. They decide who eats — and who starves.',            '#9c9051'),
(7, 'The Circuit Priests',  'circuit',   'Technology & Systems',
   'They interpret the last machines. They control the remnants of high technology.',                '#5a8090'),
(8, 'The Veilbound',        'veilbound', 'Secrets & Surveillance',
   'They watch and manipulate from shadow. They know everything — and are seen by no one.',          '#454a55'),
(9, 'The Accord Guild',     'accord',    'Economy & Power',
   'They regulate trade, resources, and political agreements. They decide what everything is worth.','#8a7a4a'),
(10,'The Nullborn',         'nullborn',  'Death & Survival''s Cost',
   'They handle waste, corpses, and the most dangerous environments. They endure what no one else will.','#3a3a3a');
```

Sub-groups, skills, and locations seed data — see Lovable prompt §7 for the directive to populate from the design doc; data itself lives in the design doc you already have.

### 2.4 Row-Level Security

Enable RLS on every table. Policies for the v1 page set:

```sql
-- factions, subgroups, skills, locations: world-readable (no writes from clients)
alter table factions enable row level security;
create policy "factions readable" on factions for select using (true);
-- (repeat for subgroups, skills, locations)

-- characters: world-readable for viewing the world; insert/update only by owner
alter table characters enable row level security;
create policy "characters readable" on characters for select using (true);
create policy "characters insert own" on characters for insert
  with check (auth.uid() = user_id);
create policy "characters update own" on characters for update
  using (auth.uid() = user_id);

-- events: world-readable
alter table events enable row level security;
create policy "events readable" on events for select using (true);

-- character_skills: world-readable
alter table character_skills enable row level security;
create policy "character_skills readable" on character_skills for select using (true);

-- user_settings: only owner can read or write
alter table user_settings enable row level security;
create policy "settings own" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Test these.** Log in as user A, try to update user B's character. It must fail. RLS misconfiguration is the #1 way these apps get breached.

---

## §3. Page 1 — Landing Page

**Route:** `/`
**Access:** Public.
**Purpose:** Communicate the concept in 30 seconds. Drive signup.

### 3.1 Layout

Single-column, scroll-driven. Five sections stacked.

#### Section A — Hero

- Full viewport height.
- Centered, dark backdrop, single muted accent line at the top.
- Eyebrow text (small, uppercase, amber): `THE LAST CITY`
- Headline (large, slab-serif): **"Core Z-1 endures."**
- Sub-headline (gray): "Create a person inside the last city. Watch who they become. They will not wait for you."
- Two buttons centered:
  - Primary: `Enter the City` → `/signup`
  - Secondary (ghost): `Watch the World` → `/world`
- Below the buttons, tiny text: "You don't play them. You created them. The rest is theirs to decide."

#### Section B — Concept (three-column)

Heading: `WHAT THIS IS`

Three columns, stacked on mobile. Each is a short paragraph with a small uppercase label.

- **`A SIMULATION`** — "Each person you create lives autonomously inside Core Z-1. They eat, work, fail, succeed, form relationships, and sometimes die. You will not control them."
- **`A SHARED CITY`** — "Every person in the world is someone else's. The market is full of strangers. Your character may help them, fight them, or never meet them at all."
- **`A FRAGILE TRUCE`** — "Ten factions hold the city together by refusing to fall. Choose where your person serves. The faction will shape who they become."

#### Section C — How it Works (numbered)

Heading: `HOW IT WORKS`

Four numbered steps, vertical, icon-free.

1. **Create a person.** Name, faction, five skills, a personality.
2. **Provide your Anthropic API key.** This is what gives them life. Stored encrypted.
3. **They live without you.** Each day they have ten units of energy to spend. They choose how.
4. **You return and read.** The city carries on. Their story is waiting.

#### Section D — The Stakes

Heading: `THIS IS NOT A GAME`

Two short paragraphs:

> "There are no respawns. If your person dies — in a riot, in a contaminated zone, on the wrong end of a Veilbound interrogation — they are gone. Their story ends. You may create another, but it will not be them.
>
> Core Z-1 was not built for heroes. It was built to last one more day."

#### Section E — CTA Footer

Centered, more breathing room than the hero.

- Headline: "Ten factions. One wall. Your person."
- Single button: `Enter the City` → `/signup`

### 3.2 Lovable Prompt for the Landing Page

```
Build the landing page at route "/" for Core Z-1, a post-apocalyptic
character simulation app.

Visual style: dark mode by default, near-black background (#0a0a0b),
surfaces at #16171a, off-white text (#e8e8e8), muted gray secondary
text (#9a9a9d), single accent color "cold amber" #c19a4b used sparingly.
Typography: sans-serif body (Inter or similar), slab-serif or condensed
sans for headings (something like "Roboto Slab" or "Oswald") to evoke
official records. No emojis. No gradients. No rounded soft cards. The
aesthetic is dystopian-industrial — think official archival documents
in a city under rationing.

Top nav: left has wordmark "CORE Z-1" in slab-serif. Center has links
"World" and "About". Right has a "Sign In" text link and "Enter the City"
amber outlined button. Nav is sticky on scroll, with a subtle bottom
border.

Footer: dark, three columns, small text. Left column has the wordmark
and tagline "The last city." Middle has placeholder links for Terms
and Privacy. Right has "v1.0 — Core Z-1 endures."

Page sections (vertical scroll):

1. Hero: full viewport height. Centered. Eyebrow text "THE LAST CITY"
   in small uppercase amber. Headline "Core Z-1 endures." in large
   slab-serif. Subheadline in gray: "Create a person inside the last
   city. Watch who they become. They will not wait for you." Two
   buttons centered: primary amber "Enter the City" links to /signup,
   secondary ghost "Watch the World" links to /world. Below buttons
   in tiny gray italic: "You don't play them. You created them. The
   rest is theirs to decide."

2. Concept section, padded vertical space. Heading "WHAT THIS IS" in
   small uppercase amber, left-aligned. Below, three columns (stacks
   on mobile under 768px) with these labels and paragraphs:
   - "A SIMULATION" / "Each person you create lives autonomously inside
     Core Z-1. They eat, work, fail, succeed, form relationships, and
     sometimes die. You will not control them."
   - "A SHARED CITY" / "Every person in the world is someone else's.
     The market is full of strangers. Your character may help them,
     fight them, or never meet them at all."
   - "A FRAGILE TRUCE" / "Ten factions hold the city together by
     refusing to fall. Choose where your person serves. The faction
     will shape who they become."

3. How it works section. Heading "HOW IT WORKS" small uppercase amber.
   Below, four numbered items vertically stacked with the number in
   amber slab-serif large to the left and the text to the right:
   1. "Create a person." / "Name, faction, five skills, a personality."
   2. "Provide your Anthropic API key." / "This is what gives them
      life. Stored encrypted."
   3. "They live without you." / "Each day they have ten units of
      energy to spend. They choose how."
   4. "You return and read." / "The city carries on. Their story is
      waiting."

4. Stakes section, slightly inset surface color. Heading "THIS IS NOT
   A GAME" small uppercase amber. Two paragraphs of body copy:
   "There are no respawns. If your person dies — in a riot, in a
   contaminated zone, on the wrong end of a Veilbound interrogation
   — they are gone. Their story ends. You may create another, but
   it will not be them."
   "Core Z-1 was not built for heroes. It was built to last one
   more day."

5. CTA footer section, centered, generous padding.
   Headline: "Ten factions. One wall. Your person."
   Single primary amber button: "Enter the City" links to /signup.

Make the page responsive. On mobile, hero text scales down, columns
stack vertically. No carousels, no parallax, no animations beyond
subtle fade-in on scroll for sections.
```

---

## §4. Page 2 — World View

**Route:** `/world`
**Access:** Public. Logged-out users see everything but cannot interact (no character → no actions to take).
**Purpose:** Show the simulation in motion. Make the city feel inhabited.

### 4.1 Layout

Single page with a fixed top section and a tabbed content area below.

#### Top of Page

- Page title: "Core Z-1 — Live"
- Subtitle: "{N} active citizens. Last tick {time-ago}." (counts active characters; pulls latest tick across all characters.)
- Right side: tab selector — `By District` | `By Faction` | `Recent` (URL synced via `?tab=district|faction|recent`, default `district`)

#### Tab 1: By District

A vertical list of districts. Each district is a section with:

- District name (slab-serif, with subtle underline)
- District description (one line, gray, italic)
- Count of active characters there
- Card grid (2 columns desktop, 1 column mobile) of character cards in that district
- "View all (N)" link if more than 6 characters in district — collapses to first 6 by default

If no characters are at a district, show the district header with a muted line: *"This district is empty."*

#### Tab 2: By Faction

Same structure, but grouped by faction. Each faction header includes:

- Faction name in faction color (left border accent)
- One-line ideology
- Population count
- Cards of active characters in that faction

#### Tab 3: Recent

A reverse-chronological feed of the latest events across all characters.

- Each row: character name + faction sigil, location, narration text (truncated to ~200 chars with "more" expand), time-ago timestamp.
- Infinite scroll or "Load more" button (start with button, simpler).
- Limit initial load to 50 events.

### 4.2 Character Card Component

Reused across district and faction tabs. Layout:

```
+--------------------------------------------------+
| [colored left bar — faction color]               |
| Marin Vell                       <faction sigil> |
| Vitalis Order — Bonebinder                       |
|                                                  |
| "She washes her hands a third time, then a       |
|  fourth, the soap nearly gone."                  |
|                                                  |
| status: active   ·   2 hours ago                 |
+--------------------------------------------------+
```

- Name: bold, primary text color.
- Faction + sub-group: small gray text.
- Latest narration: italic, gray, 2-line clamp. Plain text only.
- Status badge: colored chip — green for active, amber for injured, gray for dormant, blue for hospitalized, etc.
- Click anywhere on card → opens a side drawer with the character's full last 10 events. (Drawer, not page navigation, so the world list state isn't lost.)

### 4.3 Empty States

- **No active characters at all:** big quiet message — "Core Z-1 is silent. No one walks the streets. Be the first." → `Enter the City` button.
- **District tab, all districts empty:** treat as above.
- **Recent tab, no events:** "Nothing has happened yet."

### 4.4 Data Queries

```sql
-- Top metric: active count and last tick
select count(*) as active_count from characters
where status not in ('dead', 'dormant');

select max(created_at) as last_tick_at from events;

-- By District
select c.id, c.name, c.faction_id, c.subgroup_id, c.location_id, c.status,
       l.name as location_name, l.district as district_name, l.description as district_desc,
       f.name as faction_name, f.color_hex as faction_color, f.slug as faction_slug,
       sg.name as subgroup_name,
       (select narration from events e where e.character_id = c.id
        order by e.created_at desc limit 1) as latest_narration,
       (select created_at from events e where e.character_id = c.id
        order by e.created_at desc limit 1) as latest_at
from characters c
join locations l on l.id = c.location_id
join factions f on f.id = c.faction_id
join subgroups sg on sg.id = c.subgroup_id
where c.status not in ('dead', 'dormant')
order by l.district, c.name;

-- By Faction: same but order by f.id, c.name
-- Recent: select from events joined to characters, order by events.created_at desc limit 50
```

In the React layer, group the by-district result client-side. With v1 scale (likely under 500 active characters for a long time), client-side grouping is fine and simpler than separate per-group queries.

### 4.5 Live Updates

For v1 do **polling**, not realtime websockets. Refetch the active query every 30 seconds. Add a small "Last updated {time}" indicator under the page title.

Realtime via Supabase channels is a v1.5 upgrade; polling lets you ship without subscription edge cases.

### 4.6 Lovable Prompt for the World View

```
Build the World View page at route "/world" for Core Z-1.

This page is public — viewable without login. Use the same color
palette and typography as the landing page (dark mode default, amber
accent #c19a4b, slab-serif headings, sans-serif body).

Page header section:
- Title "Core Z-1 — Live" in slab-serif large.
- Subtitle showing "{count} active citizens. Last tick {time-ago}."
  Pull these from Supabase: count from a query selecting characters
  where status not in ('dead', 'dormant'); last tick from max(created_at)
  on the events table.
- A tab control on the right with three tabs: "By District", "By Faction",
  "Recent". Selected tab is reflected in the URL query string ?tab=
  with values district, faction, or recent. Default tab is district.

Below the header, the tab content area:

TAB "By District":
- Query the characters table (with locations joined) for all characters
  where status not in ('dead', 'dormant'). Group results client-side by
  the location's district field.
- For each district, render a section: district name in slab-serif with
  a thin underline, district description in italic gray below, then the
  count "(N citizens)".
- Below the header, render character cards in a 2-column grid on desktop,
  1-column on mobile.
- If a district has more than 6 characters, only show 6 with a "View all
  (N)" expand link at the bottom of the section.
- If no characters are in a district, render the district header anyway
  with a muted italic line "This district is empty."

TAB "By Faction":
- Same data, grouped by faction_id.
- Each faction section header has a 4px colored left border in the
  faction's color_hex from the factions table. Faction name in slab-serif,
  one-line ideology in gray italic below, population count to the right.
- Below the header, character cards in the same 2-column grid.

TAB "Recent":
- Query the events table joined with characters, ordered by events.created_at
  desc. Limit 50 initially. Render each event as a row, not a card:
    - Left: character name in bold, sub-text "{faction name} — {subgroup name}"
    - Center: narration text, italic, max 2 lines clamped with a "more" toggle.
    - Right: time-ago string and location name.
- At the bottom, a "Load more" button that fetches the next 50.

Character card component (used in district and faction tabs):
- Surface color background (#16171a), 1px border (#2a2c30).
- 4px left border in the character's faction color.
- Top row: character name (bold, white) on the left; small faction sigil
  (just the faction's first letter in a colored circle for now) on the right.
- Second row: "{Faction name} — {Subgroup name}" in small gray text.
- Below that: latest narration text, italic gray, 2-line clamp. Pull this
  from a subquery: most recent event narration for this character. If the
  character has no events yet, render "Newly arrived in Core Z-1." in italic.
- Bottom row: a status chip on the left (green "active", amber "injured",
  blue "hospitalized", gray "dormant", red "critical", purple "missing"),
  a dot separator, and time-ago of latest event on the right.
- Hovering the card slightly lightens the background. Clicking it opens
  a right-side drawer (not a navigation) showing the character's last
  10 events as a vertical timeline with timestamps.

Polling: every 30 seconds, refetch the active tab's data. Show a tiny
"Last updated {time}" indicator under the page title that updates.

Empty state: if the world has zero active characters, replace the tab
area with a centered quiet message "Core Z-1 is silent. No one walks
the streets. Be the first." and an "Enter the City" amber button below
linking to /signup.

Make the page responsive. On mobile, the tab control may collapse to a
horizontal scrollable strip; the card grid stacks to one column.
```

---

## §5. Page 3 — Signup

**Route:** `/signup`
**Access:** Public.
**Purpose:** Get a verified user into the system. Email + password only.

### 5.1 Flow

1. User lands on `/signup`.
2. Enters email + password (with confirm).
3. Submit → Supabase `signUp()` is called.
4. Redirect to `/verify-email` page that says "Check your inbox at {email}. The link expires in an hour."
5. User clicks email link → returns to the app at a callback route (Supabase handles this automatically).
6. App detects `email_confirmed_at` is set on the user → routes them to `/character/create`.

### 5.2 Layout

Single centered card on a dark background. ~400px wide.

- Eyebrow text: `ENTRY PROTOCOL`
- Heading: "Apply for citizenship."
- Subtext (small, gray): "Core Z-1 verifies all new arrivals."
- Form fields, top to bottom:
  - Email (text input, validates as email)
  - Password (8 char minimum, basic strength hint)
  - Confirm password (must match)
- Submit button: `Submit Application` (primary amber)
- Below the button: "Already a citizen? Sign in." → `/signin`
- Below that, very small: "By applying, you agree to the Terms and Privacy Policy." (placeholder links)

### 5.3 Validation

Client-side:
- Email: standard email regex
- Password: min 8 chars, must contain at least one number
- Confirm: must equal password

Server-side: rely on Supabase Auth's built-in error responses (already-registered email, weak password). Display these as red text under the form, not toast pop-ups.

### 5.4 The Verify Email Page

**Route:** `/verify-email`

Centered, single-card layout. Plain text content:

- Heading: "Check your inbox."
- Body: "An entry document has been sent to {email}. Open it to confirm your arrival. The link will expire in one hour."
- Below: "Didn't receive it? Resend." (button — calls Supabase's resend; throttled to once per minute, show error if too soon)
- Below: small gray link "Wrong email? Use a different one." → back to `/signup`

If the user is already authenticated and verified when they hit this page, redirect to `/character/create` immediately.

### 5.5 Lovable Prompt for Signup + Verify Email

```
Build the signup flow for Core Z-1 with two pages.

Use the same dark mode, dystopian-industrial visual style as the landing
page (background #0a0a0b, surface #16171a, off-white text, amber accent
#c19a4b, slab-serif headings, sans-serif body, no emojis or gradients).

Page 1 — Signup at route "/signup":
- Public, no auth required.
- Single centered card, about 400px wide, surface color background, 1px
  border (#2a2c30), 32px padding, on a dark page background.
- At the top of the card: small uppercase amber text "ENTRY PROTOCOL".
- Below: heading in slab-serif "Apply for citizenship."
- Below: small gray subtext "Core Z-1 verifies all new arrivals."
- Form with three labeled inputs stacked:
    - Email (type email)
    - Password (type password) with helper text "At least 8 characters,
      including one number."
    - Confirm password (type password)
- All inputs have a dark surface, 1px border, focus state with amber border.
- Below the inputs: a primary amber button "Submit Application" full width.
- Below the button: small gray text "Already a citizen? Sign in." with
  "Sign in." as a link to /signin.
- At the bottom of the card, very small gray text: "By applying, you agree
  to the Terms and Privacy Policy." with placeholder links.
- Validation:
    - Email: standard email format.
    - Password: 8+ chars, must contain at least one digit.
    - Confirm: must match password.
- On submit: call Supabase auth.signUp({ email, password }). On success,
  redirect to /verify-email and pass the email along (via state or URL
  query param).
- On error from Supabase (already registered, weak password, etc.):
  display the error message in small red text below the submit button
  — not as a toast.

Page 2 — Verify Email at route "/verify-email":
- Public, but if the user is already authenticated AND email_confirmed_at
  is set on their auth.user, redirect to /character/create immediately.
- Same centered card layout as signup.
- Heading: "Check your inbox."
- Body: "An entry document has been sent to {email}. Open it to confirm
  your arrival. The link will expire in one hour."
- Where {email} is pulled from the URL state passed from the signup page,
  or shown as "your inbox" if missing.
- Below: a button "Resend" that calls Supabase auth.resend({ type: 'signup',
  email }). Disable for 60 seconds after a click. Show small gray text
  "Sent. Check your inbox." after a successful resend.
- Below that: small gray link "Wrong email? Use a different one." that
  links back to /signup.
- Important: Supabase email confirmation must be enabled in the project
  settings (Authentication > Providers > Email > Confirm email = ON).
  When the user clicks the email link, Supabase handles the confirmation
  redirect automatically. Set the redirect URL in Supabase auth settings
  to /character/create so they land in the right place.
```

---

## §6. Page 4 — Character Creation

**Route:** `/character/create`
**Access:** Authenticated users with a verified email and no existing character. If they have a character, redirect to their dashboard. If not verified, redirect to `/verify-email`.
**Purpose:** Create one character with all the fields the simulation needs.

### 6.1 Multi-Step Form

Long single forms cause abandonment. Split into 5 short steps with a progress indicator at the top.

**Steps:**

1. **Identity** — name + personality (3 fields)
2. **Faction** — pick from 10
3. **Skills** — pick 5 of 18
4. **Confirmation** — review everything, see assigned sub-group
5. **API key** — paste, validate, store

A persistent header shows: `Step {N} of 5 — {Step Name}` and a thin amber progress bar.

A persistent footer shows `Back` (disabled on step 1) and `Continue` / `Confirm` (right-aligned). All steps validate before allowing `Continue`.

State is held in React (`useReducer` or Zustand) until the final step submits everything atomically. Don't write to Supabase until step 5 succeeds — partial characters are a mess to recover from.

### 6.2 Step 1 — Identity

- Heading: "Who is this person?"
- Subtext: "These choices are permanent. The city has no patience for indecision."

Fields:

- **Name** — text input, 2–40 chars, letters/spaces/hyphens/apostrophes only. Helper: "First and last name, or a single name. Whatever fits who they are."
- **Core traits** — textarea, 50 word limit (count visible). Prompt: *"Who are they at their core? Describe their temperament and outlook."*
- **Values** — textarea, 30 word limit. Prompt: *"What matters most to them? What are they loyal to or willing to suffer for?"*
- **Flaw or fear** — textarea, 30 word limit. Prompt: *"What holds them back? What are they afraid of, ashamed of, or unable to face?"*

Below each prompt, a smaller gray hint with one example:

- Core traits hint: *e.g. "Quiet. Watchful. Trusts slowly. Speaks in short sentences and is uncomfortable when others won't."*
- Values hint: *e.g. "Will not abandon someone they have agreed to help."*
- Flaw hint: *e.g. "Believes she does not deserve to be saved."*

Validation: all four fields required, word count enforced.

### 6.3 Step 2 — Faction

- Heading: "Where will they serve?"
- Subtext: "Every citizen serves a faction. The faction will shape who they become."

Layout: a grid of 10 faction cards, 2 columns on desktop, 1 on mobile.

Each faction card:

- 4px left border in faction color
- Faction name (slab-serif)
- Ideology (one line in amber: e.g. "Order & Force")
- Description (one paragraph, gray)
- Population indicator at the bottom right: "{N} citizens" — colored gray normally, colored red if this faction is more than 40% above the population of the smallest faction.

Selection: clicking a card highlights it (border becomes solid amber, surface lightens). Only one selectable.

**The recommendation logic:**

When the user clicks `Continue` *and* world conditions are met:
- Active population > 20
- The picked faction's count > 1.4 × the smallest faction's count

Show a modal dialog (don't block):

> **The city is heavily staffed there.**
>
> The Aegis Ward is full. Core Z-1's social fabric is strained. The Grain Covenant and the Nullborn are running thin. The choice is yours, but the city would feel the difference if you chose differently.
>
> [ Continue with Aegis Ward ] [ Choose another faction ]

If active population <= 20, never show the modal. Skip straight through.

### 6.4 Step 3 — Skills

- Heading: "What can they do?"
- Subtext: "Choose five. They can learn more in time."

Layout: a grid of 18 skill chips. Each chip:

- Skill name (bold)
- One-line description (small gray text below)
- Click toggles selection
- Counter at the top right of the section: "{N} / 5 selected"

Visually, selected chips have an amber border and background tint.

Validation: must be exactly 5 selected before `Continue` enables.

Tip line below the grid in small gray text: *"Skills don't have to fit your faction. A Vitalis member with Combat is a wartime medic. A Nullborn who can negotiate is dangerous."*

### 6.5 Step 4 — Confirmation

This is the dramatic moment. Sub-group is randomly assigned here, in front of the user, presented as something the city decided.

- Heading: "Review."
- Subtext: "Once confirmed, this person enters Core Z-1. There is no editing them later."

Layout: a single review card showing all the choices.

- Name
- Personality (three short blocks: traits, values, flaw)
- Chosen faction (with color bar)
- **Sub-group: not yet assigned. Show a placeholder:** *"The city will decide your role inside the {Faction Name}."*
- Five skills (chip row)

Two buttons at the bottom:
- `Back` — return to step 3
- `Receive your assignment` (primary amber) — triggers the sub-group reveal

When clicked: sub-group is randomly chosen client-side from the four sub-groups of the chosen faction. Show a brief 1-second loading state ("Assigning..."), then the placeholder line transforms with a fade-in:

> **The city has placed you.**
>
> *You are a Bonebinder of the Vitalis Order — a trauma specialist and surgeon.*

(The description comes from the `subgroups.description` column.)

After the reveal, the bottom buttons change to:
- `Reroll` (small text link, gray, no styling — and only shown for free if no character has been created yet; this is intentional friction-free for first-time users) — picks again
- `Continue` (primary amber) — proceeds to step 5

This moment carries narrative weight. Don't rush it.

### 6.6 Step 5 — API Key

- Heading: "Provide the breath."
- Subtext: "This person cannot live without an Anthropic API key. Yours will be encrypted and used only to generate this character's actions."

Field: API key text input (treated as password — masked, no autocomplete, no spell-check).

Below the input, three short bullets in small gray text:

- Encrypted at rest in our database. We never see it in the clear.
- Used only when this character takes an action.
- You can replace it later. We cannot show it back to you.

Below those, a link in tiny text: "How to get an Anthropic API key →" pointing to `https://console.anthropic.com/settings/keys` (opens new tab).

Buttons:
- `Back`
- `Validate and Enter the City` (primary amber)

On submit:
1. Frontend calls a Supabase Edge Function `validate-and-create-character`, passing all the character data + the API key.
2. Edge Function validates the API key by making one ~1-token Anthropic call. If 401, return error.
3. If valid, store the key in Supabase Vault, get the secret_id back.
4. Insert the character row + character_skills rows + initial event ("This person has just arrived in Core Z-1.") in a single transaction.
5. Increment the faction's population count.
6. Return the new character_id.
7. Frontend redirects to `/character` (the personal dashboard, out of scope).

If anything fails: show the error inline on step 5, don't lose the user's other data.

### 6.7 Edge Function Outline (for Lovable to scaffold)

```ts
// supabase/functions/validate-and-create-character/index.ts
// (sketch — Lovable will fill in details)

serve(async (req) => {
  // 1. Authenticate the requesting user via the Supabase client
  // 2. Verify they have a verified email and no existing character
  // 3. Parse incoming character data from the request body
  // 4. Validate the API key by calling Anthropic with a tiny prompt
  //    - If 401: return { error: "Invalid API key" }
  //    - If network error: return { error: "Could not validate key" }
  // 5. Store the key in Supabase Vault:
  //      const { data: secret } = await supabase.rpc('vault.create_secret', {
  //        secret: apiKey,
  //        name: `anthropic-key-${userId}`
  //      })
  // 6. Begin transaction:
  //    a. Insert into characters
  //    b. Insert into character_skills (5 rows)
  //    c. Insert initial event row
  //    d. Update factions.current_population_count
  //    e. Upsert user_settings with vault_secret_id
  // 7. Commit. Return { character_id }
})
```

The Vault integration is the security-critical part. The frontend never stores the key after submitting it to the function. The function itself doesn't log it.

### 6.8 Lovable Prompt for Character Creation

```
Build a 5-step character creation flow at route "/character/create" for
Core Z-1.

Access control:
- The user must be authenticated.
- The user must have a verified email (auth.user.email_confirmed_at is set).
  If not, redirect to /verify-email.
- The user must not already have a character (check the characters table
  for one where user_id = auth.uid()). If they do, redirect to /character.

Visual style: same dark mode dystopian-industrial palette as other pages.
Background #0a0a0b, surfaces #16171a, off-white text #e8e8e8, amber accent
#c19a4b, slab-serif headings, sans-serif body.

Top of every step:
- A persistent header strip showing "Step {N} of 5 — {Step Name}"
  with a thin amber progress bar that fills proportionally underneath.

Bottom of every step:
- A persistent footer strip with "Back" on the left (disabled on step 1)
  and a "Continue" button on the right. The Continue button is disabled
  until the step's validation passes.

Hold all step state in React useReducer. Do not write to Supabase until
step 5 successfully completes.

STEP 1 — IDENTITY
- Heading "Who is this person?" subtitle "These choices are permanent.
  The city has no patience for indecision."
- Form fields:
    - Name (text, 2-40 chars, letters/spaces/hyphens/apostrophes only).
      Helper text: "First and last name, or a single name. Whatever fits
      who they are."
    - Core traits (textarea, max 50 words, live word count visible).
      Prompt: "Who are they at their core? Describe their temperament
      and outlook." Hint in smaller gray italic: "e.g. 'Quiet. Watchful.
      Trusts slowly. Speaks in short sentences and is uncomfortable when
      others won't.'"
    - Values (textarea, max 30 words, live count). Prompt: "What matters
      most to them? What are they loyal to or willing to suffer for?"
      Hint: "e.g. 'Will not abandon someone they have agreed to help.'"
    - Flaw or fear (textarea, max 30 words, live count). Prompt: "What
      holds them back? What are they afraid of, ashamed of, or unable to
      face?" Hint: "e.g. 'Believes she does not deserve to be saved.'"
- All four fields required. Continue disabled until valid.

STEP 2 — FACTION
- Heading "Where will they serve?" subtitle "Every citizen serves a
  faction. The faction will shape who they become."
- Fetch all 10 factions from the factions table including population
  count.
- Render a 2-column grid (1 column on mobile) of faction cards.
- Each card: 4px left border in factions.color_hex, faction name in
  slab-serif, ideology in amber small text, description in gray below,
  population count "{N} citizens" in the bottom right, normally gray,
  but if active population > 20 AND this faction's count > 1.4 * the
  smallest faction's count, render the count in red.
- Click a card to select it. Only one selectable. Selected card has
  solid amber border and slight surface tint.
- Continue disabled until a faction is selected.
- When the user clicks Continue, check the recommendation condition:
    - Total active characters > 20 AND
    - Selected faction's count > 1.4 * smallest active faction's count
  If true, open a modal dialog:
    Title: "The city is heavily staffed there."
    Body: "The {selected faction name} is full. Core Z-1's social fabric
      is strained. The {smallest faction name} is running thin. The choice
      is yours, but the city would feel the difference if you chose
      differently."
    Buttons: "Continue with {selected faction name}" (primary) and
      "Choose another faction" (secondary, closes modal, stays on step).
  If false, continue silently to step 3.

STEP 3 — SKILLS
- Heading "What can they do?" subtitle "Choose five. They can learn
  more in time."
- Fetch all 18 skills from the skills table.
- Render a grid of skill chips, 3 columns on desktop, 2 on mobile.
- Each chip: skill name in bold, description in small gray text below.
- Click toggles selection. Selected chips have amber border and amber
  surface tint.
- Above the grid, a counter "{N} / 5 selected".
- Below the grid, small gray text: "Skills don't have to fit your
  faction. A Vitalis member with Combat is a wartime medic. A Nullborn
  who can negotiate is dangerous."
- Continue disabled until exactly 5 are selected.

STEP 4 — CONFIRMATION AND SUB-GROUP REVEAL
- Heading "Review." subtitle "Once confirmed, this person enters Core
  Z-1. There is no editing them later."
- Render a single review card with:
    - Name
    - Three personality blocks labeled "Core traits", "Values", "Flaw or
      fear" with the user's text below each
    - Selected faction with its color bar and name
    - Sub-group placeholder line in italic gray: "The city will decide
      your role inside the {Faction Name}."
    - Five skill chips horizontally
- Bottom buttons: "Back" (left) and "Receive your assignment" (right,
  primary amber).
- When "Receive your assignment" is clicked:
    - Disable the button.
    - Show a 1 second "Assigning..." state.
    - Randomly pick one of the 4 sub-groups for the chosen faction
      (query subgroups where faction_id = selected).
    - Replace the placeholder line with a fade-in:
        Bold: "The city has placed you."
        Italic: "You are a {subgroup name} of the {faction name} —
          {subgroup description}."
    - Change bottom buttons to: small gray "Reroll" text link on the
      left and primary amber "Continue" on the right.
    - "Reroll" picks a different sub-group at random and re-runs the
      reveal. (No backend cost; this is client-side.)

STEP 5 — API KEY
- Heading "Provide the breath." subtitle "This person cannot live
  without an Anthropic API key. Yours will be encrypted and used only
  to generate this character's actions."
- Single text input (type password, autocomplete off, spellcheck false)
  for the API key. Placeholder "sk-ant-..."
- Below the input, three small bulletless gray lines:
    "Encrypted at rest in our database. We never see it in the clear."
    "Used only when this character takes an action."
    "You can replace it later. We cannot show it back to you."
- Below those: a small link "How to get an Anthropic API key →" that
  opens https://console.anthropic.com/settings/keys in a new tab.
- Bottom buttons: "Back" and "Validate and Enter the City" (primary
  amber).
- On submit:
    - Call a Supabase Edge Function named "validate-and-create-character"
      with the full character data and the API key in the request body.
    - Show a loading state on the button ("Validating...").
    - On success (200 with character_id): redirect to /character.
    - On error: display the error message in red text below the input.
      Do not clear the field. Do not lose other steps' data.

EDGE FUNCTION — validate-and-create-character (Deno/TypeScript):
- Authenticate the request via the Supabase client and the JWT in the
  Authorization header.
- Verify auth.user.email_confirmed_at is set; if not, return 403.
- Verify the user does not already have a character row; if they do,
  return 409.
- Parse the request body for: name, personality (3 fields), faction_id,
  subgroup_id, skill_ids (array of 5), api_key.
- Validate the API key by making a minimal call to
  https://api.anthropic.com/v1/messages with a 1-token request. If the
  response is 401, return 400 with "Invalid API key". If any other
  network error, return 502 with "Could not validate key, try again".
- Store the validated key in Supabase Vault using the vault.create_secret
  RPC. Capture the returned secret_id.
- In a single transaction:
    insert into characters (...all fields, status='active', defaults applied)
    insert into character_skills (5 rows)
    insert into events (character_id, tick_number=0, narration='This
      person has just arrived in Core Z-1.', created_at=now())
    update factions set current_population_count = current_population_count + 1
      where id = faction_id
    upsert into user_settings (user_id, vault_secret_id, email_verified_at=now())
- Return { character_id } on success.
- Never log the API key. Never include it in error responses. Never
  return it to the client.

Make all five steps responsive. The progress header collapses to just
"Step N/5" on mobile.
```

---

## §7. Build Order

Don't build all four pages in parallel. The right order is:

1. **Schema first.** Run the SQL in §2 against Supabase, seed factions, sub-groups, skills, and a starter set of locations. Verify RLS by testing with two separate accounts.
2. **Auth scaffolding.** Get signup → email verify → login working with no character creation yet. Just confirm a user can log in and out.
3. **Landing page.** Static, no data dependencies. Quick win.
4. **World view.** Will be empty until characters exist, but the page itself can be built and styled with mock data.
5. **Character creation.** This is the most complex page; build it last. Test it end-to-end with a real Anthropic key in dev.
6. **Re-test the whole flow** as a fresh user, on mobile and desktop.

Don't move on from one to the next until the previous one works. Lovable will tempt you to build everything at once — resist, because debugging four broken pages is much harder than debugging one.

---

## §8. What's Deliberately Not in V1

To prevent scope drift, here is what these four pages do *not* include and what comes later:

- **Personal character dashboard** — where a logged-in user sees their own character's full life. Coming next, separate spec.
- **Tick scheduler** — the cron-driven background job that actually runs ticks. Until this exists, characters won't actually do anything. This is the simulation engine and gets its own document.
- **Energy top-ups / Stripe** — defer until the simulation is fun.
- **Faction defection flow** — defer.
- **2D map view** — v2.
- **Live websocket updates** — polling is fine for v1.
- **Notifications (email, in-app)** — defer.
- **Legacy view for dead characters** — defer until ticks actually run and characters can die.

---

## §9. Open Questions to Revisit Once V1 Is Live

- Should the world view show dormant characters in a separate "silent" section, or hide them entirely?
- Should the recent activity tab filter out routine actions like `eat` and `drink` to keep it interesting?
- Should we surface a "newly arrived" pulse in the world view when someone creates a character?
- Should we throttle character creation per IP to prevent spam?

These are real concerns but premature to solve now.

---

*End of v1 page spec. Treat as v1.0 — expect to iterate after first real users.*
