# Core Z-1 — V1 Build Runbook

**Purpose:** A linear, verifiable sequence to build the v1 four-page app. Don't skip phases. Don't combine prompts. Verify each phase works before starting the next.

**Realistic time estimate:** 8–14 hours of focused work, spread across 2–4 sessions. If you sit down expecting to finish in an evening, you'll be frustrated; expect a long weekend.

**The phases:**

| # | Phase | Type | Time |
|---|---|---|---|
| 0 | Prerequisites | Manual | 30 min |
| 1 | Supabase project setup | Manual | 20 min |
| 2 | Database schema | SQL | 30 min |
| 3 | Database functions | SQL | 30 min |
| 4 | Lovable project + basic auth | Lovable | 45 min |
| 5 | Landing page | Lovable | 45 min |
| 6 | Signup flow | Lovable | 60 min |
| 7 | World view | Lovable | 60 min |
| 8 | Edge function (manual) | Code | 90 min |
| 9 | Character creation | Lovable + wiring | 90 min |
| 10 | End-to-end smoke test | Manual | 30 min |

**Hard rule:** Each phase has a "Verify" section. Do not start the next phase until the verify checks pass. If they fail, fix the current phase first.

---

## Phase 0 — Prerequisites

**Before you start, you need:**

1. **A Supabase account** — supabase.com, free tier is fine for v1.
2. **A Lovable account** — lovable.dev, free tier is fine.
3. **Your own Anthropic API key** for testing. You'll create a real character at the end and need to validate against a working key. Get one at console.anthropic.com/settings/keys.
4. **A test email address** you can receive verification emails on.
5. **Git** installed locally — you'll need it for editing the Edge Function.
6. **Node.js 18+** installed locally — for running the Supabase CLI.
7. **The Supabase CLI:** `npm install -g supabase` (we'll use it for deploying the Edge Function).

**Verify Phase 0:**
- [ ] Run `supabase --version` in a terminal. It returns a version number.
- [ ] You can log into supabase.com and lovable.dev.
- [ ] You have a working Anthropic API key (test by calling the API with curl if you want to be sure).

---

## Phase 1 — Supabase Project Setup

**Goal:** A new Supabase project with auth configured for email verification.

**Steps:**

1. In Supabase dashboard → **New project**. Name it `core-z1`. Pick a region close to you. Set a strong database password and **save it somewhere** — you'll need it.
2. Wait for provisioning (1–2 minutes).
3. Go to **Project Settings → API**. Copy and save:
   - `Project URL`
   - `anon public` key
   - `service_role` key (this is the powerful one — never put it in frontend code)
4. Go to **Authentication → Providers → Email**. Confirm:
   - "Enable Email provider" = ON
   - "Confirm email" = ON (this is the email-verification toggle from the spec)
5. Go to **Authentication → URL Configuration**:
   - Set "Site URL" to your eventual production URL, or for now use `http://localhost:3000` (we'll update later when Lovable gives you a deploy URL).
   - Add redirect URLs: `http://localhost:3000/character/create` and your Lovable preview URL once you have one.
6. Go to **Database → Extensions** and ensure **`pgsodium`** is enabled. Vault depends on it. It's usually on by default — verify.
7. Go to **Database → Vault**. You should see an empty secrets list. Vault should be initialized and ready.

**Verify Phase 1:**
- [ ] Project URL, anon key, and service_role key saved somewhere safe (a password manager, not a text file in your downloads folder).
- [ ] Email confirmation is ON.
- [ ] `pgsodium` extension is enabled.
- [ ] Vault dashboard loads without errors.

**Common issues:**
- *Vault doesn't appear in the dashboard.* Older Supabase projects may need to enable Vault via SQL: `create extension if not exists supabase_vault;`. Newer projects have it on by default.

---

## Phase 2 — Database Schema

**Goal:** All v1 tables created, seeded, and protected by RLS.

Run each SQL block below in the Supabase **SQL Editor** (Dashboard → SQL → New query). Run them in order.

### 2.1 Tables

```sql
-- factions
create table factions (
  id              smallint primary key,
  name            text not null unique,
  slug            text not null unique,
  ideology        text not null,
  description     text not null,
  current_population_count int not null default 0,
  color_hex       text not null
);

-- subgroups
create table subgroups (
  id              smallint primary key,
  faction_id      smallint not null references factions(id),
  name            text not null,
  description     text not null
);

-- skills
create table skills (
  id              smallint primary key,
  name            text not null unique,
  description     text not null
);

-- locations
create table locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  district        text not null,
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
  health          int  not null default 100,
  hunger          int  not null default 50,
  morale          int  not null default 70,
  energy_current  int  not null default 10,
  energy_max      int  not null default 10,
  energy_purchased int not null default 0,
  history_summary text,
  created_at      timestamptz not null default now(),
  last_tick_at    timestamptz,
  unique (user_id)
);

-- character_skills
create table character_skills (
  character_id    uuid not null references characters(id) on delete cascade,
  skill_id        smallint not null references skills(id),
  proficiency     numeric(3,2) not null default 0.6,
  primary key (character_id, skill_id)
);

-- events
create table events (
  id              uuid primary key default gen_random_uuid(),
  character_id    uuid not null references characters(id) on delete cascade,
  tick_number     int not null,
  narration       text not null,
  created_at      timestamptz not null default now()
);

create index events_recent_idx on events (created_at desc);
create index characters_active_faction_idx on characters (faction_id) where status not in ('dead', 'dormant');
create index characters_active_location_idx on characters (location_id) where status not in ('dead', 'dormant');

-- user_settings
create table user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  vault_secret_id uuid,
  email_verified_at timestamptz,
  created_at      timestamptz not null default now()
);
```

### 2.2 Faction Seed Data

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

### 2.3 Subgroup Seed Data

```sql
insert into subgroups (id, faction_id, name, description) values
-- Aegis Ward
(1,  1, 'Iron Sentinels',      'Frontline soldiers guarding gates and walls.'),
(2,  1, 'Internal Judicators', 'Enforcers of law within the city — riot control, arrests, public punishments.'),
(3,  1, 'Pale Command',        'Strategic leadership and officers shaping doctrine.'),
(4,  1, 'Shieldbearers',       'Elite unit assigned to protect high-value targets.'),
-- Salvage Syndicate
(5,  2, 'Dust Runners',        'Fast-moving scavengers focusing on quick, low-risk retrieval.'),
(6,  2, 'Deep Delvers',        'Enter dangerous ruins, old bunkers, or collapsed megastructures.'),
(7,  2, 'Relic Brokers',       'Sort, evaluate, and secretly skim the best finds before official trade.'),
(8,  2, 'Scrap Forgers',       'Turn salvage into usable tools, weapons, or components.'),
-- Vitalis Order
(9,  3, 'Bonebinders',         'Trauma specialists and surgeons.'),
(10, 3, 'Breathkeepers',       'Handle disease control, quarantine zones, and toxins.'),
(11, 3, 'Genewardens',         'Experiment with mutation, adaptation, and long-term survival biology.'),
(12, 3, 'Last Mercy Circle',   'End-of-life caretakers — decide when saving someone is no longer viable.'),
-- Emberwrights
(13, 4, 'Core Tenders',        'Maintain reactors and primary energy sources.'),
(14, 4, 'Gridbinders',         'Control distribution of power across the city.'),
(15, 4, 'Ash Mechanics',       'Repair broken machines, engines, and industrial systems.'),
(16, 4, 'Flamekeepers',        'Emergency responders for fires, meltdowns, and system failures.'),
-- Archive Veil
(17, 5, 'Memory Scribes',      'Record daily events, laws, and history.'),
(18, 5, 'Data Excavators',     'Recover old-world data from drives, ruins, and networks.'),
(19, 5, 'Redactors',           'Control access — erase, censor, or alter information.'),
(20, 5, 'Echo Interpreters',   'Study fragmented or corrupted data, often bordering on speculation or myth.'),
-- Grain Covenant
(21, 6, 'Rootkeepers',         'Manage underground farms and nutrient cycles.'),
(22, 6, 'Spore Cultivators',   'Grow fungi and synthetic food sources.'),
(23, 6, 'Waterbinders',        'Control irrigation, purification, and water allocation.'),
(24, 6, 'Harvest Wardens',     'Guard food supplies and prevent theft or sabotage.'),
-- Circuit Priests
(25, 7, 'Code Acolytes',       'Low-level programmers maintaining basic systems.'),
(26, 7, 'Machine Seers',       'Interpret system outputs, glitches, or AI behavior like prophecy.'),
(27, 7, 'Core Architects',     'Design and maintain complex systems and networks.'),
(28, 7, 'Ghost Handlers',      'Deal with rogue AI fragments or unstable machine behavior.'),
-- Veilbound
(29, 8, 'Whisper Agents',      'Spies embedded across all factions.'),
(30, 8, 'Interrogators',       'Extract information through psychological or physical means.'),
(31, 8, 'Shadow Archivists',   'Keep secret records unknown to the Archive Veil.'),
(32, 8, 'Nullwatchers',        'Monitor external threats and unknown entities beyond the city.'),
-- Accord Guild
(33, 9, 'Coinmasters',         'Control currency, pricing, and resource valuation.'),
(34, 9, 'Contract Weavers',    'Draft binding agreements between factions.'),
(35, 9, 'Envoys',              'Handle diplomacy and external negotiations.'),
(36, 9, 'Rationers',           'Control distribution of essential goods to citizens.'),
-- Nullborn
(37, 10, 'Carrion Ward',       'Handle corpses, burial, and body disposal.'),
(38, 10, 'Toxbearers',         'Deal with hazardous waste, radiation zones, and contamination.'),
(39, 10, 'Ashwalkers',         'Enter the most dangerous external zones no one else can survive.'),
(40, 10, 'The Marked',         'Individuals changed by exposure — feared, but sometimes possessing strange resilience.');
```

### 2.4 Skills Seed Data

```sql
insert into skills (id, name, description) values
(1,  'Combat',        'Close-quarters fighting with melee weapons, brawling, defending oneself.'),
(2,  'Marksmanship',  'Firearms, crossbows, ranged accuracy under stress.'),
(3,  'Stealth',       'Moving unseen, blending in, avoiding patrols and surveillance.'),
(4,  'Surveillance',  'Observing others without being noticed, reading body language, eavesdropping.'),
(5,  'Scavenging',    'Finding usable items in ruins, debris, abandoned spaces.'),
(6,  'Engineering',   'Designing and building physical systems — structures, machines, fortifications.'),
(7,  'Electronics',   'Working with circuits, salvaged tech, sensors, repairing devices.'),
(8,  'Programming',   'Reading and writing code, manipulating surviving software systems.'),
(9,  'Medicine',      'General medical care — wounds, illness, basic procedures, diagnosis.'),
(10, 'Surgery',       'Invasive procedures, trauma surgery, organ work.'),
(11, 'Toxicology',    'Poisons, contaminants, antidotes, hazard identification.'),
(12, 'Botany',        'Growing food, identifying plants and fungi, agricultural work.'),
(13, 'Cooking',       'Preparing food from limited ingredients, preserving, ration planning.'),
(14, 'Negotiation',   'Bargaining, persuading, brokering deals, formal diplomacy.'),
(15, 'Deception',     'Lying convincingly, maintaining false identities, misdirection.'),
(16, 'Endurance',     'Physical resilience, working through pain, surviving deprivation.'),
(17, 'Survival',      'Operating in dangerous environments — outside, contaminated zones, dark places.'),
(18, 'Archival',      'Organizing information, working with records, decoding, research.');
```

### 2.5 Starter Locations

A small set so newly created characters have somewhere to spawn. You'll expand this later.

```sql
insert into locations (name, district, description) values
('Gate-3 Staging Yard',     'Outer Ring',          'Where Salvage Syndicate runners stage before going beyond the wall.'),
('The Reactor Halls',       'Furnace Quarter',     'Sealed rooms behind heavy lead doors. The city''s heartbeat.'),
('Old Court District',      'Old Court District',  'Aegis Ward administrative blocks; cracked marble, watch-posts on every corner.'),
('Vitalis North Ward',      'Quarantine Quarter',  'A medical complex with constant low foot traffic. Smells of disinfectant.'),
('The Sub-Farms',           'Sub-Farm Levels',     'Underground levels lit by grow lamps. Always humid.'),
('The Archive Spire',       'Archive Spire',       'A windowless tower of stacked record-rooms. Quiet.'),
('Listening Tower 4',       'Spire District',      'Circuit Priest territory. Hum of servers, occasional unexplained chimes.'),
('The Exchange Halls',      'Exchange Halls',      'Open trading floor of the Accord Guild. Crowded, watched.'),
('The Pyre-Yards',          'Outer Ring',          'Where Nullborn process the dead. Smoke discoloration on every surface.'),
('Worker Tenement Block 11','Lower Tenements',     'Cramped residential housing. Most citizens spend their nights here.');
```

### 2.6 RLS Policies

```sql
-- Enable RLS on every table
alter table factions enable row level security;
alter table subgroups enable row level security;
alter table skills enable row level security;
alter table locations enable row level security;
alter table characters enable row level security;
alter table character_skills enable row level security;
alter table events enable row level security;
alter table user_settings enable row level security;

-- Reference data: world-readable, no client writes
create policy "factions readable" on factions for select using (true);
create policy "subgroups readable" on subgroups for select using (true);
create policy "skills readable" on skills for select using (true);
create policy "locations readable" on locations for select using (true);

-- Characters: world-readable for the world view; only the owner can modify
create policy "characters readable" on characters for select using (true);
create policy "characters insert own" on characters for insert
  with check (auth.uid() = user_id);
create policy "characters update own" on characters for update
  using (auth.uid() = user_id);

-- Character skills: world-readable
create policy "character_skills readable" on character_skills for select using (true);

-- Events: world-readable
create policy "events readable" on events for select using (true);

-- User settings: only the owner
create policy "settings own" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 2.7 Verify Phase 2

In the SQL editor, run these checks. All should return rows.

```sql
select count(*) from factions;       -- expect 10
select count(*) from subgroups;      -- expect 40
select count(*) from skills;         -- expect 18
select count(*) from locations;      -- expect 10
```

Then verify RLS works:
- In Supabase **Authentication → Users**, create a test user manually (or via signup later).
- Open the SQL editor as an authenticated session (the editor has an "impersonate user" toggle in the top right; flip it on and select your test user).
- Try `insert into characters (user_id, name, ...) values ('different-user-uuid', ...);`. It should be **rejected** by the policy.
- Verify `select * from factions` returns rows. (Reference data should always be readable.)

If RLS doesn't reject the cross-user insert, your policy is wrong — fix before continuing.

---

## Phase 3 — Database Functions

**Goal:** Create the Postgres functions the Edge Function will call. Doing them as RPC functions gives us atomic transactions and keeps all sensitive logic on the database side.

### 3.1 Vault Helper

```sql
create or replace function create_anthropic_secret(
  p_secret text,
  p_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare
  v_secret_id uuid;
begin
  v_secret_id := vault.create_secret(
    p_secret,
    'anthropic-key-' || p_user_id::text,
    'Anthropic API key for user ' || p_user_id::text
  );
  return v_secret_id;
end;
$$;

-- Only callable by service role (the Edge Function uses service_role key)
revoke execute on function create_anthropic_secret from public, anon, authenticated;
```

### 3.2 Atomic Character Creation

```sql
create or replace function create_character_with_skills(
  p_user_id uuid,
  p_name text,
  p_personality_core text,
  p_personality_values text,
  p_personality_flaw text,
  p_faction_id smallint,
  p_subgroup_id smallint,
  p_location_id uuid,
  p_skill_ids smallint[],
  p_vault_secret_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_character_id uuid;
  v_skill_id smallint;
begin
  -- Insert character (unique constraint on user_id will block duplicates)
  insert into characters (
    user_id, name, faction_id, subgroup_id, location_id,
    personality_core, personality_values, personality_flaw
  ) values (
    p_user_id, p_name, p_faction_id, p_subgroup_id, p_location_id,
    p_personality_core, p_personality_values, p_personality_flaw
  ) returning id into v_character_id;

  -- Insert skills
  if array_length(p_skill_ids, 1) <> 5 then
    raise exception 'Must provide exactly 5 skills';
  end if;

  foreach v_skill_id in array p_skill_ids loop
    insert into character_skills (character_id, skill_id)
    values (v_character_id, v_skill_id);
  end loop;

  -- Initial event
  insert into events (character_id, tick_number, narration)
  values (v_character_id, 0, 'This person has just arrived in Core Z-1.');

  -- Update faction count
  update factions
  set current_population_count = current_population_count + 1
  where id = p_faction_id;

  -- Upsert user_settings
  insert into user_settings (user_id, vault_secret_id, email_verified_at)
  values (p_user_id, p_vault_secret_id, now())
  on conflict (user_id) do update
  set vault_secret_id = p_vault_secret_id,
      email_verified_at = excluded.email_verified_at;

  return v_character_id;
end;
$$;

revoke execute on function create_character_with_skills from public, anon, authenticated;
```

### 3.3 Verify Phase 3

```sql
-- These should exist
select proname from pg_proc where proname in ('create_anthropic_secret', 'create_character_with_skills');
-- expect 2 rows
```

---

## Phase 4 — Lovable Project + Basic Auth

**Goal:** A new Lovable project connected to Supabase, with a working sign-in page.

### 4.1 Create the Project

1. Go to lovable.dev → **New Project**.
2. Name it `core-z1`.
3. After it provisions, go to project settings and add the Supabase integration.
   - Paste your **Project URL** and **anon public key** (NOT the service_role key — never).
4. Lovable should set up the `@supabase/supabase-js` client automatically.

### 4.2 Lovable Prompt 1 — Foundation + Auth

**Paste this into Lovable:**

```
Set up the foundation for Core Z-1, a post-apocalyptic character
simulation app, on top of the existing Supabase integration.

Visual identity:
- Dark mode by default (and only — no light mode toggle).
- Background color #0a0a0b.
- Surface color #16171a.
- Border color #2a2c30.
- Primary text #e8e8e8.
- Secondary/gray text #9a9a9d.
- Accent color "cold amber" #c19a4b — used sparingly.
- Slab-serif or condensed sans-serif font for headings (Roboto Slab or Oswald via Google Fonts is fine).
- Clean sans-serif for body (Inter is fine).
- No emojis. No gradients. No bouncy soft cards. Industrial, archival aesthetic.

Global layout:
- A persistent top navigation bar with:
    - Left: wordmark "CORE Z-1" in slab-serif, links to /
    - Center: text links "World" (links to /world) and "About" (links to /#about, anchor on landing page for now)
    - Right (when logged out): "Sign In" text link to /signin and an amber outlined button "Enter the City" linking to /signup
    - Right (when logged in but no character): an amber button "Create Character" linking to /character/create
    - Right (when logged in with a character): the character's name as a link to /character (this page doesn't exist yet — link to it anyway)
- A persistent footer with: wordmark on the left, placeholder "Terms" and "Privacy" links in the middle, and "v1.0 — Core Z-1 endures." on the right.

Set up the Supabase auth state in a context or hook. Auth states to handle:
- loading
- anonymous (logged out)
- authenticated, no character (check the characters table for a row where user_id = auth.uid())
- authenticated, with character

For now, build only one auth-related page:

Page: /signin
- Centered card layout, ~400px wide, on the dark background.
- Eyebrow text "ENTRY" in small uppercase amber.
- Heading "Sign in." in slab-serif.
- Email input, password input.
- Primary amber button "Sign in".
- Below the button: small gray text "New to the city? Apply for citizenship." with "Apply for citizenship." linking to /signup. (The /signup page itself will be built in a later prompt — for now, the link can go to a placeholder.)
- On submit, call supabase.auth.signInWithPassword. On success, redirect to / (the landing page; we'll change this to /character later when that page exists).
- On error, show the error message in red text below the button.

For all other routes (/, /world, /signup, /verify-email, /character/create), create empty placeholder pages with just the heading "Coming soon" so the nav links don't break.

Make the layout responsive. On mobile, the nav center links collapse into a hamburger menu.
```

### 4.3 Verify Phase 4

After Lovable runs the prompt:

- [ ] Open the Lovable preview. The app loads.
- [ ] The top nav and footer render with the correct dark colors.
- [ ] Click "Sign In" — go to `/signin`.
- [ ] In Supabase dashboard, manually create a user (Authentication → Users → Add user → manual sign-up with email + password, mark as email-confirmed).
- [ ] In the app, sign in with that user. You're redirected somewhere reasonable (likely `/`).
- [ ] The nav now shows "Create Character" instead of "Sign In".
- [ ] Sign out (you may need to add a sign-out option somewhere — if Lovable didn't include one, ask it to in a follow-up).

**Common issues:**
- *Auth state isn't updating after sign-in.* The `onAuthStateChange` listener is missing. Tell Lovable: "The nav doesn't update after sign-in. Make sure you're subscribed to `supabase.auth.onAuthStateChange` and updating React state."
- *Supabase env vars not set.* Lovable normally handles this via the integration UI, but check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or equivalent) are set.

---

## Phase 5 — Landing Page

**Goal:** The full landing page at `/` is built and styled.

### 5.1 Lovable Prompt 2 — Landing Page

**Paste:**

```
Build the landing page at route "/" for Core Z-1, replacing the
"Coming soon" placeholder.

Use the same dark mode visual style established earlier (#0a0a0b
background, #16171a surfaces, off-white text, amber accent #c19a4b,
slab-serif headings, sans-serif body, no emojis, no gradients).

Five sections, scrolling vertically:

1. Hero (full viewport height, centered):
   - Eyebrow: "THE LAST CITY" in small uppercase amber.
   - Headline: "Core Z-1 endures." in large slab-serif.
   - Subheadline in gray: "Create a person inside the last city.
     Watch who they become. They will not wait for you."
   - Two centered buttons: primary amber "Enter the City" → /signup,
     secondary ghost "Watch the World" → /world.
   - Below the buttons in tiny gray italic: "You don't play them.
     You created them. The rest is theirs to decide."

2. Concept section:
   - Heading "WHAT THIS IS" in small uppercase amber, left-aligned.
   - Three columns (stack to 1 column under 768px) with these
     uppercase labels and paragraphs below them:
     - "A SIMULATION" — "Each person you create lives autonomously
       inside Core Z-1. They eat, work, fail, succeed, form
       relationships, and sometimes die. You will not control them."
     - "A SHARED CITY" — "Every person in the world is someone
       else's. The market is full of strangers. Your character may
       help them, fight them, or never meet them at all."
     - "A FRAGILE TRUCE" — "Ten factions hold the city together by
       refusing to fall. Choose where your person serves. The
       faction will shape who they become."

3. How It Works:
   - Heading "HOW IT WORKS" small uppercase amber.
   - Four numbered items, vertical layout. The number is large
     amber slab-serif on the left; bold step name and gray
     description on the right.
     1. "Create a person." — "Name, faction, five skills, a personality."
     2. "Provide your Anthropic API key." — "This is what gives them
        life. Stored encrypted."
     3. "They live without you." — "Each day they have ten units of
        energy to spend. They choose how."
     4. "You return and read." — "The city carries on. Their story
        is waiting."

4. Stakes section, slightly inset (use surface color #16171a as
   the section background):
   - Heading "THIS IS NOT A GAME" small uppercase amber.
   - Two paragraphs of body copy:
     "There are no respawns. If your person dies — in a riot, in a
     contaminated zone, on the wrong end of a Veilbound interrogation
     — they are gone. Their story ends. You may create another, but
     it will not be them."
     "Core Z-1 was not built for heroes. It was built to last one
     more day."

5. CTA footer (centered, generous padding):
   - Headline: "Ten factions. One wall. Your person."
   - Single primary amber button: "Enter the City" → /signup.

Add subtle fade-in on scroll for sections 2-5 (just opacity, no
parallax). On mobile, hero text scales down.
```

### 5.2 Verify Phase 5

- [ ] `/` shows the full landing page.
- [ ] Hero buttons go to `/signup` and `/world` (those are placeholders for now, that's expected).
- [ ] On mobile, the layout stacks correctly.
- [ ] Section anchors work — clicking nav "About" jumps to the concept section (or stays on landing).

---

## Phase 6 — Signup Flow

**Goal:** Users can sign up, receive a verification email, click the link, and land back in the app verified.

### 6.1 Configure Supabase Email Templates

Before the prompt, configure the email Supabase sends:

1. Supabase dashboard → **Authentication → Email Templates** → "Confirm signup".
2. The default template works. If you want it on-theme, edit the subject to "Core Z-1 — Confirm your arrival" and the body to something like:
   ```
   The city verifies all new arrivals.

   Click the link below to confirm your application:
   {{ .ConfirmationURL }}

   The link expires in one hour.
   ```
3. Save.

### 6.2 Lovable Prompt 3 — Signup + Verify Email

**Paste:**

```
Replace the "Coming soon" placeholders at /signup and /verify-email
with the full signup flow for Core Z-1.

Use the same dark mode visual style (#0a0a0b background, #16171a
surfaces, off-white text, amber accent #c19a4b, slab-serif headings,
sans-serif body).

Page 1 — /signup (public):
- Single centered card, about 400px wide, surface color #16171a
  background, 1px border #2a2c30, 32px padding.
- Top of card: small uppercase amber "ENTRY PROTOCOL".
- Heading in slab-serif: "Apply for citizenship."
- Subtext in gray: "Core Z-1 verifies all new arrivals."
- Form with three labeled inputs:
    - Email (type email)
    - Password (type password) with helper text "At least 8 characters,
      including one number."
    - Confirm password (type password)
- Inputs: dark background, 1px border, focus state has amber border.
- Primary amber "Submit Application" button, full width.
- Below: small gray text "Already a citizen? Sign in." with link to /signin.
- At bottom: very small gray text "By applying, you agree to the Terms
  and Privacy Policy." with placeholder links.
- Validation:
    - Email must be valid email format.
    - Password: 8+ chars, at least one digit.
    - Confirm must match password.
- On submit: call supabase.auth.signUp({ email, password, options: {
  emailRedirectTo: window.location.origin + '/character/create' } }).
  On success, redirect to /verify-email and pass the email via state
  or query param.
- On error: display the Supabase error message in red text below the
  submit button. Do not use toast popups.

Page 2 — /verify-email (public, but with logic):
- On mount, check auth state. If the user is authenticated AND
  their auth.user.email_confirmed_at is set, redirect to
  /character/create immediately.
- Otherwise, render the verify-email card:
    - Heading: "Check your inbox."
    - Body: "An entry document has been sent to {email}. Open it to
      confirm your arrival. The link will expire in one hour."
      (Pull email from URL state, or render "your inbox" if missing.)
    - "Resend" button: calls supabase.auth.resend({ type: 'signup',
      email }). After clicking, disable for 60 seconds. Show "Sent.
      Check your inbox." in small gray text after success.
    - Below that: small gray link "Wrong email? Use a different one."
      → /signup.

Important: do NOT modify Supabase Auth settings from code — the user
has already enabled email confirmation in the Supabase dashboard.
```

### 6.3 Verify Phase 6

This phase has the most moving parts. Test thoroughly.

- [ ] At `/signup`, fill in real email + valid password. Submit.
- [ ] You're redirected to `/verify-email`.
- [ ] Within ~1 minute, you receive an email from Supabase.
- [ ] Click the link in the email.
- [ ] You're redirected to `/character/create` (still a placeholder for now, that's fine).
- [ ] In Supabase dashboard → Auth → Users, your user shows `email_confirmed_at` populated.

Then test failure cases:

- [ ] Try to sign up with the same email again. The error appears under the form.
- [ ] Click "Resend" on `/verify-email`. Button disables for 60s.
- [ ] Click "Resend" too soon. Supabase rate-limit error displays.

**Common issues:**
- *Email never arrives.* Check spam. Check Supabase logs (Auth → Logs). The free tier has rate limits — if you've signed up many times during testing, you may be throttled.
- *The link in the email goes to localhost or the wrong URL.* Fix the redirect URL in Supabase Auth → URL Configuration. Add your Lovable preview URL.
- *After clicking the email link, the user lands on the home page instead of `/character/create`.* The `emailRedirectTo` option wasn't set in `signUp()`. Have Lovable check.

---

## Phase 7 — World View

**Goal:** The public world view at `/world` is built. It will be empty (no characters yet), and that's correct — verify the empty state works.

### 7.1 Lovable Prompt 4 — World View

**Paste:**

```
Replace the "Coming soon" placeholder at /world with the public
World View page for Core Z-1.

Public access — viewable without login. Use the same dark mode visual
style as other pages.

Page header section:
- Title "Core Z-1 — Live" in slab-serif large.
- Subtitle in gray: "{count} active citizens. Last tick {time-ago}."
  Pull these from Supabase:
    - count: select count(*) from characters where status not in ('dead', 'dormant')
    - last tick: select max(created_at) from events
  If count is 0, the subtitle reads: "The city is silent."
- A tab control on the right with three tabs: "By District",
  "By Faction", "Recent". Selected tab synced to URL query string
  ?tab=district|faction|recent. Default tab is district.

Below the header, the tab content area:

TAB "By District":
- Query characters with locations joined, where status not in
  ('dead', 'dormant'). Group results client-side by locations.district.
- For each district, render a section: district name in slab-serif
  with a thin underline, district description in italic gray, count
  "(N citizens)".
- Below the header, character cards in a 2-column grid on desktop,
  1-column on mobile.
- If a district has more than 6 characters, show 6 by default with a
  "View all (N)" expand link.
- If a district has zero characters but exists in the locations table,
  do NOT render it (only render districts that contain characters).

TAB "By Faction":
- Same query, grouped by faction_id client-side.
- Each faction section header: 4px colored left border in the
  faction's color_hex. Faction name in slab-serif. One-line ideology
  in gray italic. Population count to the right.
- Cards in the same 2-column grid.
- If a faction has zero characters, do not render it.

TAB "Recent":
- Query: select e.*, c.name, c.faction_id, c.subgroup_id, l.name as
  location_name, f.name as faction_name, f.color_hex, sg.name as
  subgroup_name from events e join characters c on c.id=e.character_id
  join locations l on l.id=c.location_id join factions f on f.id=c.faction_id
  join subgroups sg on sg.id=c.subgroup_id order by e.created_at desc limit 50.
- Render each event as a row, not a card:
    - Left: character name in bold; small gray "{faction name} — {subgroup name}".
    - Center: narration text, italic, max 2 lines clamped, with a "more"
      toggle to expand to full text.
    - Right: time-ago string and location name.
- "Load more" button at the bottom that fetches the next 50 events.

Character card component (used in district and faction tabs):
- Surface color background (#16171a), 1px border (#2a2c30).
- 4px left border in the character's faction color_hex.
- Top row: character name (bold, white) on left; faction sigil (just
  the faction's first letter inside a small colored circle) on right.
- Second row: "{Faction name} — {Subgroup name}" in small gray text.
- Latest narration text, italic gray, 2-line clamp. Pull from a
  subquery: most recent event for this character. If no events,
  render "Newly arrived in Core Z-1." in italic.
- Bottom row: status chip (green for active, amber for injured, blue
  for hospitalized, gray for dormant, red for critical, purple for
  missing), dot separator, time-ago of latest event.
- Hovering the card slightly lightens the background.
- Clicking the card opens a right-side drawer (slide-in, NOT a
  navigation) showing the character's last 10 events as a vertical
  timeline with timestamps. The drawer has a close button.

Polling: every 30 seconds, refetch the active tab's data. Show a
small "Last updated {time}" indicator under the page title.

Empty state: if count of active characters is 0, REPLACE the tab
content area with a centered quiet message: "Core Z-1 is silent.
No one walks the streets. Be the first." and a primary amber
button "Enter the City" linking to /signup. Keep the page header
(title + tabs) visible.

Responsive: on mobile, tabs collapse to a horizontal scrollable strip,
card grid becomes one column.
```

### 7.2 Verify Phase 7

- [ ] `/world` loads.
- [ ] The empty state appears (no characters exist yet) — title visible, tabs visible, but the main area says "Core Z-1 is silent."
- [ ] Switching tabs updates the URL query string.
- [ ] No console errors.
- [ ] On mobile, the tab strip scrolls horizontally if needed.

You can't test the populated state until characters exist. We'll come back here after Phase 9.

---

## Phase 8 — Edge Function (Manual)

**Goal:** A working Supabase Edge Function `validate-and-create-character` that you wrote yourself.

This is the security boundary of the entire app. Take your time.

### 8.1 Initialize Supabase Locally

In a terminal, in a folder where you want to keep the function code (this can be separate from the Lovable project):

```bash
mkdir core-z1-functions
cd core-z1-functions
supabase init
supabase link --project-ref <your-project-ref>
```

The project ref is in your Supabase project URL: `https://<project-ref>.supabase.co`.

You'll be prompted for the database password (the one you saved in Phase 1).

```bash
supabase functions new validate-and-create-character
```

This creates `supabase/functions/validate-and-create-character/index.ts`.

### 8.2 The Function Code

Replace the contents of `index.ts` with this. Read it as you paste — the comments explain each section.

```typescript
// supabase/functions/validate-and-create-character/index.ts
//
// Validates an Anthropic API key, stores it in Supabase Vault,
// and atomically creates a character row + skills + initial event.
//
// SECURITY NOTES:
// - The user's JWT is verified before anything else.
// - The API key is never logged.
// - The API key is never returned in responses.
// - Vault stores the key encrypted at rest.
// - Service-role client is only used after JWT verification.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // ========================================================================
    // 1. AUTHENTICATE THE USER
    // ========================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client used only to verify the user's JWT.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid authorization" }, 401);
    }

    if (!user.email_confirmed_at) {
      return jsonResponse({ error: "Email not verified" }, 403);
    }

    // ========================================================================
    // 2. PARSE AND VALIDATE INPUT
    // ========================================================================
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const {
      name,
      personality_core,
      personality_values,
      personality_flaw,
      faction_id,
      subgroup_id,
      skill_ids,
      api_key,
    } = body ?? {};

    // Required-fields check
    if (
      typeof name !== "string" ||
      typeof personality_core !== "string" ||
      typeof personality_values !== "string" ||
      typeof personality_flaw !== "string" ||
      typeof faction_id !== "number" ||
      typeof subgroup_id !== "number" ||
      !Array.isArray(skill_ids) ||
      typeof api_key !== "string"
    ) {
      return jsonResponse({ error: "Missing or invalid fields" }, 400);
    }

    if (skill_ids.length !== 5) {
      return jsonResponse({ error: "Must select exactly 5 skills" }, 400);
    }

    if (name.length < 2 || name.length > 40) {
      return jsonResponse({ error: "Name must be 2-40 characters" }, 400);
    }

    if (!api_key.startsWith("sk-ant-")) {
      return jsonResponse({ error: "Invalid API key format" }, 400);
    }

    // ========================================================================
    // 3. SERVICE-ROLE CLIENT (used after auth verification)
    // ========================================================================
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ========================================================================
    // 4. CHECK USER DOESN'T ALREADY HAVE A CHARACTER
    // ========================================================================
    const { data: existing } = await adminClient
      .from("characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: "You already have a character" }, 409);
    }

    // ========================================================================
    // 5. VERIFY FACTION/SUBGROUP CONSISTENCY
    // ========================================================================
    const { data: subgroup } = await adminClient
      .from("subgroups")
      .select("id, faction_id")
      .eq("id", subgroup_id)
      .maybeSingle();

    if (!subgroup || subgroup.faction_id !== faction_id) {
      return jsonResponse({ error: "Subgroup does not match faction" }, 400);
    }

    // ========================================================================
    // 6. VALIDATE THE ANTHROPIC API KEY
    // ========================================================================
    // Make a tiny call. If 401, the key is invalid.
    const anthropicCheck = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    if (anthropicCheck.status === 401) {
      return jsonResponse({ error: "Invalid Anthropic API key" }, 400);
    }

    // Don't fail on rate-limit (429) — the key is valid, just throttled.
    // Fail on 5xx — Anthropic is down or unreachable.
    if (anthropicCheck.status >= 500) {
      return jsonResponse(
        { error: "Could not validate key right now. Try again." },
        502,
      );
    }

    // ========================================================================
    // 7. PICK A STARTING LOCATION (random from seed locations)
    // ========================================================================
    const { data: locations } = await adminClient
      .from("locations")
      .select("id");

    if (!locations || locations.length === 0) {
      return jsonResponse({ error: "No locations available" }, 500);
    }

    const starting = locations[Math.floor(Math.random() * locations.length)];

    // ========================================================================
    // 8. STORE KEY IN VAULT
    // ========================================================================
    const { data: secretId, error: secretError } = await adminClient.rpc(
      "create_anthropic_secret",
      { p_secret: api_key, p_user_id: user.id },
    );

    if (secretError || !secretId) {
      console.error("Vault error:", secretError); // Note: secretError, not the key
      return jsonResponse({ error: "Could not securely store key" }, 500);
    }

    // ========================================================================
    // 9. ATOMIC CHARACTER CREATION
    // ========================================================================
    const { data: characterId, error: charError } = await adminClient.rpc(
      "create_character_with_skills",
      {
        p_user_id: user.id,
        p_name: name,
        p_personality_core: personality_core,
        p_personality_values: personality_values,
        p_personality_flaw: personality_flaw,
        p_faction_id: faction_id,
        p_subgroup_id: subgroup_id,
        p_location_id: starting.id,
        p_skill_ids: skill_ids,
        p_vault_secret_id: secretId,
      },
    );

    if (charError) {
      console.error("Character creation error:", charError);
      return jsonResponse({ error: "Could not create character" }, 500);
    }

    // ========================================================================
    // 10. SUCCESS
    // ========================================================================
    return jsonResponse({ character_id: characterId }, 200);
  } catch (err) {
    // Never include the API key in error logs.
    console.error("Unexpected error:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
```

### 8.3 Deploy the Function

```bash
supabase functions deploy validate-and-create-character --no-verify-jwt
```

`--no-verify-jwt` is needed because we verify the JWT manually inside the function (which gives us cleaner error messages than Supabase's default).

### 8.4 Test the Function with curl

Get your anon key and a real user's JWT (sign in via the app, open browser devtools → Application → Local Storage → look for the supabase auth token).

```bash
curl -X POST 'https://<your-project>.supabase.co/functions/v1/validate-and-create-character' \
  -H "Authorization: Bearer <user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Character",
    "personality_core": "Quiet and watchful.",
    "personality_values": "Loyalty above all.",
    "personality_flaw": "Cannot ask for help.",
    "faction_id": 3,
    "subgroup_id": 9,
    "skill_ids": [1, 9, 10, 14, 16],
    "api_key": "<your-real-anthropic-key>"
  }'
```

Expected: `{"character_id":"<uuid>"}`.

Test failure cases:
- Wrong API key prefix → 400 "Invalid API key format"
- Real but invalid API key (e.g., `sk-ant-fake-key`) → 400 "Invalid Anthropic API key"
- Subgroup that doesn't belong to the faction → 400 "Subgroup does not match faction"
- Same user calling again → 409 "You already have a character"

### 8.5 Verify Phase 8

- [ ] Function deploys successfully.
- [ ] Successful character creation returns a character_id.
- [ ] In Supabase dashboard → Database → Tables → `characters`, the row exists.
- [ ] In Supabase dashboard → Database → Vault, a secret named `anthropic-key-<user-id>` is listed (you cannot see its value — that's correct).
- [ ] `select count(*) from character_skills where character_id = '<the new id>';` returns 5.
- [ ] `select * from events where character_id = '<the new id>';` returns 1 row with the "arrived" narration.
- [ ] `select current_population_count from factions where id = 3;` shows the count incremented.
- [ ] All failure cases above return the expected error codes.

**Before continuing**, delete this test character and decrement the faction count manually (or rerun the seed). Phase 9 needs the user to be character-less to test the UI flow.

```sql
delete from characters where user_id = '<your-test-user-id>';
update factions set current_population_count = 0;
delete from vault.secrets where name like 'anthropic-key-%';
```

---

## Phase 9 — Character Creation Page

**Goal:** The 5-step character creation form at `/character/create`, wired to the Edge Function.

### 9.1 Lovable Prompt 5 — Character Creation

**Paste:**

```
Replace the "Coming soon" placeholder at /character/create with the
5-step character creation flow for Core Z-1.

Access control:
- The user must be authenticated. If not, redirect to /signin.
- The user must have a verified email (auth.user.email_confirmed_at
  is set). If not, redirect to /verify-email.
- The user must not already have a character. Query the characters
  table for a row where user_id = auth.uid(). If one exists, redirect
  to /character (this page is a future placeholder, fine for now).

Visual style: same dark mode dystopian-industrial palette as other
pages. Background #0a0a0b, surfaces #16171a, off-white text, amber
accent #c19a4b.

Persistent layout for all steps:
- Top header: "Step {N} of 5 — {Step Name}" with a thin amber
  progress bar that fills proportionally.
- Bottom footer: "Back" button on the left (disabled on step 1),
  primary amber "Continue" or "Confirm" button on the right.
- The Continue/Confirm button is disabled until the current step's
  validation passes.

Hold all step state in React useReducer or useState. Do NOT write
to Supabase or call the Edge Function until step 5 succeeds.

STEP 1 — IDENTITY
- Heading "Who is this person?" subtitle "These choices are
  permanent. The city has no patience for indecision."
- Form fields:
    - Name (text input, 2-40 chars, only letters/spaces/hyphens/
      apostrophes). Helper: "First and last name, or a single name.
      Whatever fits who they are."
    - Core traits (textarea, max 50 words, live word count). Prompt:
      "Who are they at their core? Describe their temperament and
      outlook." Hint in smaller gray italic: 'e.g. "Quiet. Watchful.
      Trusts slowly. Speaks in short sentences and is uncomfortable
      when others won''t."'
    - Values (textarea, max 30 words, live count). Prompt: "What
      matters most to them? What are they loyal to or willing to
      suffer for?" Hint: 'e.g. "Will not abandon someone they have
      agreed to help."'
    - Flaw or fear (textarea, max 30 words, live count). Prompt:
      "What holds them back? What are they afraid of, ashamed of, or
      unable to face?" Hint: 'e.g. "Believes she does not deserve
      to be saved."'
- All four fields required and within word limits.

STEP 2 — FACTION
- Heading "Where will they serve?" subtitle "Every citizen serves a
  faction. The faction will shape who they become."
- Fetch all 10 factions from the factions table including
  current_population_count.
- Render a 2-column grid (1 column on mobile) of faction cards.
- Each card: 4px left border in factions.color_hex, faction name in
  slab-serif, ideology in amber, description in gray below, population
  count "{N} citizens" in the bottom right (gray normally; if total
  active count > 20 AND this faction's count > 1.4 * smallest active
  faction's count, render the count in red).
- Click selects only one card. Selected card has solid amber border
  and slight surface tint.

When the user clicks Continue:
- Compute total active count and smallest faction's count from the
  fetched data.
- If total > 20 AND selected_count > 1.4 * smallest_count, show a
  modal dialog (do not block — they can dismiss):
  Title: "The city is heavily staffed there."
  Body: "The {selected faction name} is full. Core Z-1's social
    fabric is strained. The {smallest faction name} is running thin.
    The choice is yours, but the city would feel the difference if
    you chose differently."
  Buttons: primary "Continue with {selected faction name}" (proceeds
    to step 3) and secondary "Choose another faction" (closes modal,
    stays on step 2).
- If the threshold is not met, proceed silently.

STEP 3 — SKILLS
- Heading "What can they do?" subtitle "Choose five. They can learn
  more in time."
- Fetch all 18 skills from the skills table.
- Above the grid: a counter "{N} / 5 selected".
- Render skill chips in a grid (3 columns desktop, 2 mobile). Each
  chip: skill name bold, description in small gray below.
- Click toggles selection. Selected chips have amber border and
  amber-tinted surface.
- Below the grid, gray text: "Skills don't have to fit your faction.
  A Vitalis member with Combat is a wartime medic. A Nullborn who
  can negotiate is dangerous."
- Continue disabled until exactly 5 selected.

STEP 4 — CONFIRMATION + SUB-GROUP REVEAL
- Heading "Review." subtitle "Once confirmed, this person enters
  Core Z-1. There is no editing them later."
- Render a single review card:
    - Name
    - Three personality blocks labeled "Core traits", "Values",
      "Flaw or fear" with the user's text below each
    - Selected faction with color bar and name
    - Sub-group placeholder line in italic gray: "The city will
      decide your role inside the {Faction Name}."
    - Five skill chips horizontally
- Bottom buttons: "Back" and "Receive your assignment" (primary amber).

When "Receive your assignment" is clicked:
- Disable the button, show 1-second "Assigning..." state.
- Fetch all subgroups for the selected faction_id from the subgroups
  table. Pick one randomly client-side.
- Replace the placeholder line with a fade-in transition:
    Bold (white): "The city has placed you."
    Italic (gray): "You are a {subgroup name} of the {faction name} —
      {subgroup description}."
- Bottom buttons change to: small gray "Reroll" link on the left,
  primary amber "Continue" on the right.
- "Reroll" picks a different subgroup at random and re-runs the reveal.

STEP 5 — API KEY
- Heading "Provide the breath." subtitle "This person cannot live
  without an Anthropic API key. Yours will be encrypted and used only
  to generate this character's actions."
- Single text input (type password, autocomplete off, spellcheck off,
  autocapitalize off) for the API key. Placeholder "sk-ant-..."
- Below the input, three small bulletless gray lines:
    "Encrypted at rest in our database. We never see it in the clear."
    "Used only when this character takes an action."
    "You can replace it later. We cannot show it back to you."
- Below those: small link "How to get an Anthropic API key →"
  (target=_blank to https://console.anthropic.com/settings/keys).
- Bottom buttons: "Back" and "Validate and Enter the City" (primary amber).

On submit:
- Show button loading state: "Validating..."
- Get the user's JWT: const { data: { session } } = await supabase.auth.getSession();
- Call the Edge Function:
    fetch(`${SUPABASE_URL}/functions/v1/validate-and-create-character`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name, personality_core, personality_values, personality_flaw,
        faction_id, subgroup_id, skill_ids: [array of 5 skill ids], api_key,
      }),
    })
- On 200: redirect to /character (placeholder route, fine).
- On error (any non-200): display the response error in red text below
  the input. DO NOT clear the API key field. DO NOT lose data from
  earlier steps.

Make all 5 steps responsive. On mobile, the progress header collapses
to "Step N/5".
```

### 9.2 Verify Phase 9

This is the big end-to-end test. Use a fresh user (sign up a new one, verify the email, then test).

- [ ] `/character/create` redirects appropriately if you're logged out, unverified, or already have a character.
- [ ] Step 1 — fill in all fields. Word counts work. Continue enables when valid.
- [ ] Step 2 — all 10 factions render. Click one, Continue. (No recommendation modal, since you're alone in the world.)
- [ ] Step 3 — all 18 skills render. Pick 5. Counter updates. Continue enables.
- [ ] Step 4 — review card shows all your choices. Click "Receive your assignment". Sub-group reveals after 1 second. Try Reroll a few times.
- [ ] Step 5 — paste your real Anthropic API key. Submit.
- [ ] Loading state shows. After a few seconds, you're redirected to `/character` (404 placeholder is fine).
- [ ] In Supabase dashboard, the character row exists with all fields populated.
- [ ] Vault has a new secret.
- [ ] `events` table has the "arrived" event.
- [ ] Faction count incremented.

**Now go back to `/world`** — your character should be visible in the By District and By Faction tabs, and the "arrived" event should be in the Recent tab.

**Common issues:**
- *Edge function returns 401.* The JWT isn't being sent. Check the Authorization header in the network tab.
- *Edge function returns CORS error.* Lovable may need to be told the function is hosted on a different origin and to allow it. Verify the corsHeaders in the function code.
- *Character creates but world view doesn't show it.* Polling interval is 30s — wait, or refresh. If still nothing, the world view query is wrong.

---

## Phase 10 — End-to-End Smoke Test

**Goal:** A full lap through the app from a fresh browser, fresh user.

1. Open an incognito window. Go to your app's root URL.
2. Read the landing page.
3. Click "Watch the World." The world view shows your character from Phase 9.
4. Click your character's card. The drawer opens with the "arrived" event.
5. Close the drawer. Switch tabs to By Faction and Recent. Your character appears in both.
6. Click "Enter the City." Sign up with a new email + password.
7. Verify the email link.
8. You land at `/character/create`. Go through all 5 steps. Use your second test Anthropic key (or the same one).
9. After creation, go to `/world`. Both characters appear.
10. Sign out. Sign back in. The nav shows your character link.

**If all 10 work, you've shipped v1.**

---

## What's Next (Not in v1)

You now have:
- A working signup → character creation flow.
- A public world view that reflects the database in near-real-time.
- API keys stored encrypted in Vault.
- Two real characters in the world.

What you don't have yet:
- **A tick scheduler.** Characters exist but nothing happens to them. They have one "arrived" event and that's it.
- **A personal character dashboard.** Users can see all characters publicly but have no dedicated page for *their own*.
- **The simulation prompts.** The world bible, the action types, the tick prompt, the JSON schema — all defined in the design doc, but not yet wired up.
- **Energy refill cron job.**

That's the next document: the **tick engine**. When you're ready, come back and we'll build it. The pattern will be similar — schema additions, an Edge Function (the tick worker), a `pg_cron` schedule, and a personal dashboard page that shows the character's life as it happens.

---

## Maintenance Notes

- **The faction `current_population_count` will drift.** Every character creation increments it; nothing decrements it on character deletion in v1. Add a nightly recount job when you build the tick engine.
- **Vault secrets accumulate** — if a user deletes their account, their vault secret is orphaned. Eventually you'll want a cleanup job here too.
- **Lovable will sometimes regenerate code in ways that break your wiring** — particularly the Edge Function call. After every Lovable session, smoke-test character creation with a fresh user.
- **Your Supabase free tier has limits.** Watch the dashboard. Database row count, auth users, function invocations — all metered.

---

*End of v1 build runbook. Ship it, then come back for the tick engine.*
