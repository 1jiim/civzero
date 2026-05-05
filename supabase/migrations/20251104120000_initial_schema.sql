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

insert into locations (name, district, description) values

('Gate-3 Staging Yard',     'Outer Ring',          'Where Salvage Syndicate runners stage before going beyond the wall.'),
('The Reactor Halls',       'Furnace Quarter',     'Sealed rooms behind heavy lead doors. The city''s heartbeat.'),
('Old Court District',      'Old Court District',  'Aegis Ward administrative blocks; cracked marble, watch-posts on every corner.'),
('Vitalis North Ward',      'Quarantine Quarter',  'A medical complex with constant low foot traffic. Smells of disinfectant.'),
('The Sub-Farms',           'Sub-Farm Levels',     'Underground levels lit by grow lamps. Always humid.'),
('The Archive Spire',       'Archive Spire',       'A windowless tower of stacked record-rooms. Quiet.'),
('Listening Tower 2',       'Spire District',      'Circuit Priest territory. Occasional rumble from the old subway system and unexplained chimes.'),
('Listening Tower 4',       'Spire District',      'Circuit Priest territory. Hum of servers, occasional unexplained chimes.'),
('The Exchange Halls',      'Exchange Halls',      'Open trading floor of the Accord Guild. Crowded, watched.'),
('The Pyre-Yards',          'Outer Ring',          'Where Nullborn process the dead. Smoke discoloration on every surface.'),
('Worker Tenement Block 11','Lower Tenements',     'Cramped residential housing. Most citizens spend their nights here.');

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
(19, 'Leatherworking','Tanning hides, cutting and stitching leather goods, repairing straps and harnesses.'),
(20, 'Tailoring',     'Sewing, mending, and altering clothing; pattern work and textile repair.'),
(21, 'Smithing',      'Forging and shaping metal at the anvil — tools, blades, hinges, fittings.'),
(22, 'Carpentry',     'Working salvaged timber and reclaimed wood into furniture, frames, and joinery.'),
(23, 'Masonry',       'Cutting and laying stone, brick, and concrete; patching walls and foundations.'),
(24, 'Plumbing',      'Installing and repairing water lines, drains, pumps, and pressure systems.'),
(25, 'Mechanics',     'Maintaining engines, gearboxes, pumps, and mechanical assemblies under load.'),
(26, 'Butchery',      'Slaughtering and dressing animals, breaking down carcasses, curing and preserving cuts.'),
(27, 'Brewing',       'Fermenting alcohol, vinegar, and preserves; managing yeasts, mashes, and cultures.'),
(28, 'Weaving',       'Spinning fiber and weaving cloth on loom or frame; producing textiles from raw stock.'),
(29, 'Pottery',       'Shaping and firing clay into vessels, tiles, and crockery.'),
(30, 'Husbandry',     'Raising livestock and draft animals, controlling vermin, working trained beasts.'),
(31, 'Cartography',   'Mapping districts, tunnels, and routes; reading and producing accurate plans.'),
(32, 'Tracking',      'Following trails, marks, and sign; locating people or animals through corridors and ruins.'),
(33, 'Climbing',      'Scaling walls, scaffolds, and ruins; rigging ropes for vertical movement.'),
(34, 'Forgery',       'Producing false documents, ration cards, faction marks, and counterfeit goods.'),
(35, 'Bureaucracy',   'Navigating permits, regulations, faction paperwork, and official procedure.'),
(36, 'Locksmithing',  'Making, fitting, and defeating locks, latches, and basic security mechanisms.'),
(37, 'Performance',   'Music, storytelling, and public entertainment; holding a crowd, shaping mood.'),
(38, 'Linguistics',   'Reading pre-Collapse scripts, dead languages, and specialized technical jargon.');

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