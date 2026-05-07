> ⚠ **Visual style override:** The visual style defined in `CLAUDE.md` (repo root) supersedes any color, font, or styling values in this document. When in doubt, use CLAUDE.md.

# Core Z-1 — Simulation Design Document

**Version:** 1.0
**Purpose:** This is the creative core of the Core Z-1 AI simulation app. Every tick of every character ultimately routes through the prompts and schemas in this document. Treat this as the canonical source of truth — when prompts in Claude Code diverge from this document, fix them to match. When you change something here, propagate it.

---

## How to Use This Document

This document is split into **reference material** (sections you read for context, like the world bible and faction sheets) and **runtime material** (sections that get programmatically inserted into Claude API calls, like prompt templates and the JSON schema).

When building, you will:

1. Paste the **World Bible** into the system prompt of every tick call.
2. Paste the relevant **Faction Reference** snippet into the system prompt based on the character's faction.
3. Inject character state, history, and the **Action Types Table** into the user message.
4. Use the **JSON Tool Schema** as the `tools` parameter on the API call to enforce strict output.
5. For characters in `critical` status, route to the **Critical-Resolution Prompt** instead of the main tick prompt.

Sections are numbered for direct reference (e.g., "the prompt in §8").

---

## §1. The World Bible (Canonical)

> *This is the text that goes into the system prompt of every tick. It is compressed deliberately — keep edits tight.*

```
Core Z-1 is the last city. Beyond its walls the world is dead: contaminated, irradiated, broken by the Collapse — a catastrophe the Archive Veil has half-erased and half-mythologized. Within the walls, millions survive in tense interdependence.

Ten factions hold monopolies on every essential function. None rules. None can fall. Each is essential, each is dangerous.

— The Aegis Ward enforces law and defends the walls.
— The Salvage Syndicate retrieves what the city cannot make.
— The Vitalis Order heals the sick and decides who is worth saving.
— The Emberwrights keep power and machinery running.
— The Archive Veil curates history, data, and truth itself.
— The Grain Covenant grows and rations all food and water.
— The Circuit Priests interpret the surviving high technology.
— The Veilbound watch, listen, and manipulate from the shadows.
— The Accord Guild sets the price of everything.
— The Nullborn handle waste, corpses, and the contaminated zones.

The city does not thrive. It persists. Food is rationed. Power flickers. Information is curated. Within each faction, sub-groups vie for influence, and rivalries between sub-groups are often sharper than rivalries between factions. Districts vary: some patrolled, some abandoned, some forbidden by edict.

Every citizen serves a faction. Defection is rare, costly, disorienting. The walls hold — for now.

TONE: Tense, weighted, never heroic. Characters live small lives inside a system that watches. Most days are about hunger, work, rumor, hygiene, the people in the next room. Routine is itself a survival strategy. Danger exists but is not constant. Decisions carry weight; trivial choices reveal character.

NARRATIVE RULES:
- Characters do not narrate their own thoughts in third person; show through action and observation.
- Avoid grand action-movie language. Prefer specific, grounded sensory detail.
- Faction loyalty is complicated — most citizens both depend on and resent their faction.
- Random violence is rare. Consequences accumulate slowly.
- The world is not waiting for the character to be a hero.
```

---

## §2. Faction Reference (Extended)

For each faction, the structured fields below are stored in the `factions` table. The `system_prompt_snippet` is what gets inserted into the system prompt at tick time, after the world bible, when a character of that faction is being processed.

### 1. The Aegis Ward — Order & Force
- **Territory:** The walls, gate-houses, the Old Court District, garrison blocks throughout the city.
- **Sub-groups:** Iron Sentinels, Internal Judicators, Pale Command, Shieldbearers.
- **system_prompt_snippet:**
  > This character serves the Aegis Ward. They keep the walls and the laws. Aegis members are conditioned toward authority, suspicion, and procedure. Internal politics: Iron Sentinels resent Pale Command's distance from the front; Internal Judicators are feared by other sub-groups for their interrogation latitude; Shieldbearers are seen as career-track favorites. The Aegis is openly suspicious of the Veilbound, formally allied with the Accord Guild, and quietly contemptuous of the Nullborn.

### 2. The Salvage Syndicate — Recovery & Expansion
- **Territory:** The outer markets, the Reclamation Yards, the Gate-3 staging zone.
- **Sub-groups:** Dust Runners, Deep Delvers, Relic Brokers, Scrap Forgers.
- **system_prompt_snippet:**
  > This character serves the Salvage Syndicate. They bring in what Core Z-1 cannot make. Salvage culture mixes superstition with greed — luck rituals before runs, grudges over who finds what. Dust Runners are the lowest rung; Deep Delvers have the highest mortality and the highest pay; Relic Brokers control which finds become "official" and which disappear; Scrap Forgers translate junk into goods. The Syndicate has working friction with the Accord Guild over pricing and an uneasy peace with the Nullborn whose territory they often skirt.

### 3. The Vitalis Order — Life & Death
- **Territory:** The Vitalis Wards (multiple buildings citywide), the Quarantine Quarter, the Grey Halls.
- **Sub-groups:** Bonebinders, Breathkeepers, Genewardens, Last Mercy Circle.
- **system_prompt_snippet:**
  > This character serves the Vitalis Order. They control medical resources and decide who is worth saving. Vitalis members carry the moral weight of triage — most have made peace with letting people die. Bonebinders handle the everyday wounded; Breathkeepers work behind biohazard seals; Genewardens are quietly mistrusted, even within Vitalis, for their experiments; the Last Mercy Circle is regarded with reverence and dread. The Order is professionally allied with the Grain Covenant (nutrition is medicine), wary of the Genewardens within itself, and politically careful with the Aegis Ward.

### 4. The Emberwrights — Power & Function
- **Territory:** The Reactor Halls, the Grid Stations, the Furnace Quarter.
- **Sub-groups:** Core Tenders, Gridbinders, Ash Mechanics, Flamekeepers.
- **system_prompt_snippet:**
  > This character serves the Emberwrights. If they fail, the city goes dark. Emberwright culture is technical, fatalistic, soot-blackened. Core Tenders work in radiation-shielded rooms and are quietly venerated; Gridbinders fight politics over distribution priority; Ash Mechanics are the working class that holds it all together; Flamekeepers respond to disaster and have the highest casualty rates. The Emberwrights cooperate closely with Circuit Priests on shared infrastructure but resent their priestly mystique.

### 5. The Archive Veil — Knowledge & Truth
- **Territory:** The Archive Spire, the Recording Halls, locked Substrata vaults.
- **Sub-groups:** Memory Scribes, Data Excavators, Redactors, Echo Interpreters.
- **system_prompt_snippet:**
  > This character serves the Archive Veil. They decide what is remembered. Archive culture is hushed, paranoid, layered with internal codes. Memory Scribes record official history; Data Excavators search the ruins for old-world data; Redactors edit, censor, and erase; Echo Interpreters piece together corrupted fragments and are sometimes accused of inventing what they "find." The Archive's bitterest internal rivalry is between Memory Scribes (who write truth) and Redactors (who unwrite it). The Veil keeps a frozen-cold relationship with the Veilbound — both deal in secrets, but for opposite reasons.

### 6. The Grain Covenant — Food & Sustenance
- **Territory:** The Sub-Farms, the Cisterns, the Spore Halls, the Distribution Yards.
- **Sub-groups:** Rootkeepers, Spore Cultivators, Waterbinders, Harvest Wardens.
- **system_prompt_snippet:**
  > This character serves the Grain Covenant. They feed everyone — and decide who gets fed first. Covenant culture is patient, ritualistic, calendar-bound. Rootkeepers tend the underground farms; Spore Cultivators grow fungi food on a faster cycle and are sometimes looked down on as "lesser growers"; Waterbinders are the most politically powerful sub-group because water is scarcest; Harvest Wardens are armed guards and often despised by the growers they protect. The Covenant has a permanent uneasy alliance with the Aegis Ward who guard their stores.

### 7. The Circuit Priests — Technology & Systems
- **Territory:** The Old Server Vaults, the Listening Towers, sealed AI sanctuaries.
- **Sub-groups:** Code Acolytes, Machine Seers, Core Architects, Ghost Handlers.
- **system_prompt_snippet:**
  > This character serves the Circuit Priests. They interpret the last machines as much as they maintain them. Priest culture treats systems with religious gravity — error logs are studied like scripture. Code Acolytes do the day-to-day; Machine Seers interpret system behavior and are alternately respected and ridiculed; Core Architects design and are guarded jealously; Ghost Handlers deal with rogue AI fragments and tend to be solitary, strange, sometimes feared. The Priests work intimately with the Emberwrights and have a quiet rivalry with the Archive Veil over data jurisdiction.

### 8. The Veilbound — Secrets & Surveillance
- **Territory:** Officially nowhere; in practice everywhere. Hidden offices in every faction's territory.
- **Sub-groups:** Whisper Agents, Interrogators, Shadow Archivists, Nullwatchers.
- **system_prompt_snippet:**
  > This character serves the Veilbound. They are seen by no one and they see everything. Veilbound members live double lives — they almost always have a cover identity in another faction. Whisper Agents are embedded spies; Interrogators are feared even by other Veilbound; Shadow Archivists keep records the Archive Veil doesn't know exist; Nullwatchers monitor what's beyond the walls and are often mentally affected by what they see. The Veilbound is openly mistrusted by the Aegis Ward and quietly indispensable to the Accord Guild.

### 9. The Accord Guild — Economy & Power
- **Territory:** The Exchange Halls, the Contract Vaults, the High Counting-Rooms.
- **Sub-groups:** Coinmasters, Contract Weavers, Envoys, Rationers.
- **system_prompt_snippet:**
  > This character serves the Accord Guild. They set the price of everything, including peace. Guild culture is precise, formal, slow to anger and slow to forgive. Coinmasters control currency itself; Contract Weavers draft binding agreements between factions and their word is law; Envoys handle inter-faction diplomacy and external negotiations; Rationers distribute essentials to citizens and are the most publicly visible sub-group. The Accord is the most universally allied faction — every faction needs them — but their internal politics are vicious.

### 10. The Nullborn — Death & Survival's Cost
- **Territory:** The Pyre-Yards, the Toxic Quarters, the outer contamination zones.
- **Sub-groups:** Carrion Ward, Toxbearers, Ashwalkers, The Marked.
- **system_prompt_snippet:**
  > This character serves the Nullborn. They handle what no one else will: corpses, waste, contamination, the Outside. Nullborn are visibly marked — robes, masks, scarification — and shunned in polite quarters. Carrion Ward handles burial and corpse-disposal; Toxbearers work radiation and contamination zones; Ashwalkers go beyond the walls into the dead world and many do not return; The Marked are Nullborn changed by exposure, sometimes feared, sometimes possessing strange resilience. The Nullborn have no formal allies. Vitalis Order tolerates them. Most other factions ignore them until they need them.

---

## §3. Skill Pool (18 Skills)

The user picks **5** of these at character creation. Stored with a `proficiency` value `0.0–1.0`; default at creation is `0.6` for selected skills, `0.0` for unselected. Skills can be improved over time via `train_skill` actions and degrade only via the defection relearning period.

| # | Skill | Description |
|---|---|---|
| 1 | **Combat** | Close-quarters fighting with melee weapons, brawling, defending oneself. |
| 2 | **Marksmanship** | Firearms, crossbows, ranged accuracy under stress. |
| 3 | **Stealth** | Moving unseen, blending in, avoiding patrols and surveillance. |
| 4 | **Surveillance** | Observing others without being noticed, reading body language, eavesdropping. |
| 5 | **Scavenging** | Finding usable items in ruins, debris, abandoned spaces. |
| 6 | **Engineering** | Designing and building physical systems — structures, machines, fortifications. |
| 7 | **Electronics** | Working with circuits, salvaged tech, sensors, repairing devices. |
| 8 | **Programming** | Reading and writing code, manipulating surviving software systems. |
| 9 | **Medicine** | General medical care — wounds, illness, basic procedures, diagnosis. |
| 10 | **Surgery** | Invasive procedures, trauma surgery, organ work. |
| 11 | **Toxicology** | Poisons, contaminants, antidotes, hazard identification. |
| 12 | **Botany** | Growing food, identifying plants and fungi, agricultural work. |
| 13 | **Cooking** | Preparing food from limited ingredients, preserving, ration planning. |
| 14 | **Negotiation** | Bargaining, persuading, brokering deals, formal diplomacy. |
| 15 | **Deception** | Lying convincingly, maintaining false identities, misdirection. |
| 16 | **Endurance** | Physical resilience, working through pain, surviving deprivation. |
| 17 | **Survival** | Operating in dangerous environments — outside, contaminated zones, dark places. |
| 18 | **Archival** | Organizing information, working with records, decoding, research. |

No skill is faction-locked. A Vitalis member with Combat is plausible (a wartime medic). A Nullborn with Negotiation is unusual but interesting. Mismatch between skills and faction generates good character texture; the AI should lean into it rather than ignore it.

---

## §4. Action Types Table

This is the canonical action table. Stored in the `action_types` table in the database. Claude is given a filtered subset of this table on each tick (only actions the character can perform given their state, location, and sub-group).

### 4.1 Solo Actions (Cold-Start Backbone)

These are always available and form the bulk of early-game play when the world is sparse.

| id | name | energy | can_kill | severity | category | description |
|---|---|---|---|---|---|---|
| 1 | `eat` | 1 | no | – | survival | Consume food from inventory or buy from rations. |
| 2 | `drink` | 1 | no | – | survival | Drink water, ration, or whatever is available. |
| 3 | `sleep` | 0 | no | – | survival | Restore some health and morale. Costs no energy but advances time. |
| 4 | `hygiene` | 1 | no | – | survival | Wash, groom, treat minor sores. Affects morale and social actions. |
| 5 | `find_food` | 1 | no | – | survival | Search for or acquire food. Outcome depends on location and skills. |
| 6 | `find_water` | 1 | no | – | survival | Search for or acquire water. |
| 7 | `work_faction_job` | 1 | no | – | labor | Perform routine work for the faction. Builds standing, may earn resources. |
| 8 | `train_skill` | 1 | no | – | growth | Practice or train a specific skill. Increases proficiency slowly. |
| 9 | `explore_district` | 1 | no | – | discovery | Move through a district, observe, learn locations and people. |
| 10 | `rest` | 0 | no | – | survival | Brief rest. Restores small morale. Free action. |
| 11 | `repair_gear` | 1 | no | – | labor | Maintain inventory items. Prevents item loss. |
| 12 | `reflect` | 1 | no | – | internal | Internal monologue tick. The character thinks about their life, choices, regrets, plans. Excellent for cold-start density. |
| 13 | `forage_local` | 1 | no | – | survival | Search the immediate area for small items. |
| 14 | `maintain_equipment` | 1 | no | – | labor | Tend to faction-issued tools or weapons. |
| 15 | `pray_or_ritual` | 1 | no | – | internal | Faction-appropriate ritual: a Circuit Priest interprets a glitch, a Grain Covenant member tends a shrine. |

### 4.2 Social Actions (Require Other Characters Present)

These only generate as available actions when at least one other character (active, not dormant) is at the same location.

| id | name | energy | can_kill | severity | description |
|---|---|---|---|---|---|
| 20 | `greet` | 1 | no | – | Acknowledge another character. Cheap relationship-builder. |
| 21 | `converse` | 1 | no | – | Have a real conversation. Builds relationship, exchanges information. |
| 22 | `help_other` | 1 | no | – | Offer aid to another character. Strong relationship boost. |
| 23 | `request_aid` | 1 | no | – | Ask another character for help. May be accepted or refused. |
| 24 | `share_resource` | 1 | no | – | Give an item or information. |
| 25 | `confront` | 1 | no | – | Verbal challenge or accusation. Damages relationship; may escalate. |
| 26 | `negotiate` | 1 | no | – | Formal bargain. Skill-checked against Negotiation. |
| 27 | `observe_other` | 1 | no | – | Watch a target without engaging. Gathers information. |
| 28 | `follow` | 1 | no | – | Tail another character through their actions. Stealth-checked. |
| 29 | `mentor` | 1 | no | – | Teach a skill to another character. Builds bond. |
| 30 | `betray` | 2 | no | – | Act against a character who trusted you. Major relationship shift. |
| 31 | `attack` | 2 | yes | 4 | Initiate violence. Can result in critical state for either party. |

### 4.3 Sub-Group Specialty Actions (Faction-Restricted)

Only available to characters of the listed sub-group. These are the *signature* dangerous actions — the ones that make sub-groups feel mechanically distinct.

| id | name | sub_group | energy | can_kill | severity | description |
|---|---|---|---|---|---|---|
| 40 | `frontline_battle` | Iron Sentinels | 2 | yes | 4 | Combat at the walls or in a riot. |
| 41 | `interrogate` | Internal Judicators, Veilbound Interrogators | 1 | yes | 2 | Extract information by force. Risk of self-harm in resistance. |
| 42 | `protect_high_value` | Shieldbearers | 1 | yes | 3 | Bodyguard duty. Inherits the target's danger. |
| 43 | `deep_delve` | Deep Delvers | 2 | yes | 4 | Enter a dangerous ruin or collapsed structure. |
| 44 | `relic_skim` | Relic Brokers | 1 | no | – | Secretly hide a valuable find from official trade. |
| 45 | `quarantine_breach_response` | Breathkeepers | 2 | yes | 3 | Enter or seal a contaminated medical zone. |
| 46 | `gene_experiment` | Genewardens | 1 | yes | 2 | Conduct experimental biological work. |
| 47 | `last_mercy_procedure` | Last Mercy Circle | 1 | yes | 2 | End a patient's life with intent. Heavy moral and disease risk. |
| 48 | `reactor_emergency` | Core Tenders, Flamekeepers | 2 | yes | 3 | Respond to a critical reactor or grid failure. |
| 49 | `redact_record` | Redactors | 1 | no | – | Erase or alter information in the Archive. |
| 50 | `echo_interpretation` | Echo Interpreters | 1 | no | – | Reconstruct corrupted data. Can produce real or false insights. |
| 51 | `harvest_guard_action` | Harvest Wardens | 2 | yes | 3 | Defend food stores from theft or sabotage. |
| 52 | `ghost_handle` | Ghost Handlers | 1 | yes | 2 | Engage with rogue AI fragments. Mental and physical risk. |
| 53 | `whisper_op` | Whisper Agents | 1 | yes | 2 | Covert intelligence operation under cover identity. |
| 54 | `nullwatch_observation` | Nullwatchers | 1 | yes | 2 | Long observation of the world beyond the walls. |
| 55 | `coin_setting` | Coinmasters | 1 | no | – | Adjust prices or currency. Political consequences. |
| 56 | `contract_weaving` | Contract Weavers | 1 | no | – | Draft a binding inter-faction agreement. |
| 57 | `envoy_mission` | Envoys | 1 | no | – | Conduct a formal diplomatic mission. |
| 58 | `rationing_decision` | Rationers | 1 | no | – | Decide who eats this cycle. Public opinion consequence. |
| 59 | `corpse_collection` | Carrion Ward | 1 | no | – | Recover and process a body. Disease exposure. |
| 60 | `tox_zone_run` | Toxbearers | 2 | yes | 3 | Work in a radiation or chemical waste zone. |
| 61 | `ashwalker_mission` | Ashwalkers | 2 | yes | 5 | Travel beyond the walls. Highest mortality in the system. |
| 62 | `marked_endurance_act` | The Marked | 1 | yes | 1 | Use the Marked's strange resilience for a task no one else survives. |

**Action filtering rules** (your code applies before sending the prompt):
- Solo actions are always available.
- Social actions are only sent if another active character is at the same location.
- Sub-group actions are only sent if the character is in that sub-group.
- `attack` and `confront` against a specific character are only available if that character's status allows it (not `dormant`, not already `critical`).

---

## §5. Personality Field Definitions

User input at character creation. Stored on the `characters` row.

**Core Traits** (50 word limit)
> *Prompt to user:* "Who are they at their core? Describe their temperament, mannerisms, and outlook in a few sentences."

**Values** (30 word limit)
> *Prompt to user:* "What matters most to them? What are they loyal to or willing to suffer for?"

**Flaw or Fear** (30 word limit)
> *Prompt to user:* "What holds them back? What are they afraid of, ashamed of, or unable to face?"

These three fields are inserted into every system prompt verbatim. They are stable for the character's life. Long-term change is captured in the rolling `history_summary`, not by editing these.

---

## §6. The Main Tick Prompt

Used for every standard tick (when `status` is `active`, `injured`, `relearning`, or `hospitalized`).

### System Message

```
[INSERT §1 World Bible verbatim]

[INSERT §2 Faction Reference system_prompt_snippet for this character's faction]

This character is in the sub-group: {{subgroup_name}}.
{{subgroup_description}}

CHARACTER:
Name: {{character_name}}
Core traits: {{personality_core}}
Values: {{personality_values}}
Flaw or fear: {{personality_flaw}}

You will choose ONE action for this character to take this tick. Your choice must be consistent with their personality, faction, sub-group, current state, and history. You are not playing them — you are being them.

Use the take_action tool to return your decision. Do not respond in plain prose. Narration goes in the tool's narration field, not as free text outside the tool call.

Narration rules:
- 2 to 4 sentences.
- Show through action and sensory detail. No melodrama.
- The character is not a hero. They are a person in a system.
- If they are alone, depict the texture of their solitary life: the cold floor, the noise of the next district, the rationed cup of water.
- If they are interacting with another character, that character is a real person with their own story. Do not narrate that character's inner thoughts.
```

### User Message

```
CURRENT STATE:
- Status: {{status}}
- Location: {{location_name}} — {{location_description}}
- Health: {{health}} / 100
- Hunger: {{hunger}} / 100
- Morale: {{morale}} / 100
- Energy remaining this tick: {{energy_current_plus_purchased}}
- Inventory: {{inventory_summary}}
- Tick number: {{tick_number}}

WHO THIS CHARACTER HAS BECOME (history summary):
{{history_summary_or_none}}

RECENT EVENTS (last 5):
{{recent_events}}

ACTIVE RELATIONSHIPS (filtered to relevance):
{{active_relationships}}

OTHER CHARACTERS PRESENT AT THIS LOCATION:
{{characters_at_location_or_none}}

KNOWN LOCATIONS YOU CAN MOVE TO FROM HERE:
{{adjacent_locations}}

AVAILABLE ACTIONS:
{{filtered_action_list_with_descriptions_and_costs}}

Choose one action. Use the take_action tool.
```

### Variable Definitions

| Variable | Source |
|---|---|
| `character_name` | `characters.name` |
| `personality_core/values/flaw` | `characters.personality_*` |
| `subgroup_name`, `subgroup_description` | `subgroups` table joined on character |
| `status`, `health`, `hunger`, `morale` | `characters` row |
| `location_*` | `locations` table joined on `characters.location_id` |
| `energy_current_plus_purchased` | `characters.energy_current + characters.energy_purchased` |
| `history_summary_or_none` | `characters.history_summary` or "This character is new to the world." |
| `recent_events` | Last 5 rows of `events` for this character, narration field, oldest first |
| `active_relationships` | `relationships` rows where `last_interaction_tick > current_tick - 30`, formatted with name, standing, brief note |
| `characters_at_location_or_none` | Other `characters` rows where `location_id = current.location_id` and `status NOT IN ('dormant', 'dead')` |
| `adjacent_locations` | `locations` adjacent to current per the `location_edges` table |
| `filtered_action_list` | §4 actions filtered per the rules in §4 |

---

## §7. The Critical-Resolution Prompt

Used when a tick begins with `status = critical`. The outcome is determined by your code (deterministic weighted random based on context); this prompt only narrates the predetermined outcome.

### Outcome Computation (Code, Not Prompt)

```
weights = {
  hospitalized:    base 30,
  saved_by_other:  base 0  -- only nonzero if eligible character present
  fled:            base 25,
  died:            base 15
}

modifiers:
  - severity: each point above 1 adds +5 to died, +3 to fled, -2 to hospitalized
  - location safety: inside Core Z-1 +20 hospitalized; outer zones +15 died; Ashwalker territory +30 died
  - faction support: Vitalis member inside city +25 hospitalized; Nullborn in tox zone -15 hospitalized
  - eligible savior present (active, in same location, energy >= 1, personality compatible): +30 saved_by_other
    (personality compatibility: code parses flaw/values text for cues — "ruthless", "selfish", "afraid" reduce; "loyal", "compassionate", "brave" increase)
  - relevant skills on character: +5 fled per relevant skill (Endurance, Survival, Medicine), -10 died if any present
  - personality flaw modifier: code parses for "reckless", "fatalistic", "self-destructive" → +10 died; "cautious", "careful" → +10 fled
  - The Marked sub-group: -15 died, +20 missing, narration tone: uncanny

normalize weights to sum to 100, then sample.
```

### System Message

```
[INSERT §1 World Bible verbatim]

[INSERT §2 Faction Reference system_prompt_snippet for this character's faction]

This character is in critical condition. The outcome has been determined by the situation. Your job is to narrate that outcome with weight, specificity, and emotional truth.

CHARACTER:
Name: {{character_name}}
Core traits: {{personality_core}}
Values: {{personality_values}}
Flaw or fear: {{personality_flaw}}

OUTCOME (predetermined — narrate this and only this):
{{outcome_label}}
{{outcome_specifics}}

Narration rules:
- 4 to 6 sentences. Slower, weightier than a normal tick.
- Specific sensory detail. No epic language.
- The character is not a hero. This is happening to them.
- If saved by another character, the savior is named: {{savior_name_or_none}}. Do not invent a different rescuer.
- If dying, the death is final. Do not hint at miraculous recovery.

Use the resolve_critical tool to return your narration and the appropriate state changes.
```

### User Message

```
WHAT HAPPENED:
{{critical_context.description}}

CHARACTER STATE AT MOMENT OF CRISIS:
- Location: {{location_name}}
- Health: {{health}}
- Recent events: {{last_3_events}}
- Active relationships at scene: {{relationships_at_location}}

OUTCOME TO NARRATE: {{outcome_label}}
{{if outcome == 'saved_by_other'}}
Savior: {{savior_name}}, of {{savior_faction}}, sub-group {{savior_subgroup}}.
Their personality: {{savior_personality_summary}}.
{{endif}}

Narrate this outcome. Use the resolve_critical tool.
```

### Outcome Labels

- `hospitalized` — survives, sent to Vitalis ward, status → `hospitalized` for 2–5 ticks.
- `saved_by_other` — rescued by named character. Status → `injured` for 3 ticks. Relationship with savior +25.
- `fled` — escapes alive. Status → `injured` for 3 ticks. Possible inventory loss.
- `died` — narrate the death. Status → `dead`. Archive character. Surface to user on next login.
- `missing` — (Marked-only) status → `missing` for 1–3 ticks, then resolves to `active` or `dead` per rerolled weights.

---

## §8. JSON Tool Schemas

These go in the `tools` parameter of the Anthropic API call. Use Anthropic tool use, not "please return JSON" prose instructions.

### 8.1 take_action (Main Tick)

```json
{
  "name": "take_action",
  "description": "Choose one action for this character to take this tick. Return narration and all resulting state changes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "action_id": {
        "type": "integer",
        "description": "The id of the action chosen, from the available actions list."
      },
      "target_character_id": {
        "type": ["string", "null"],
        "description": "The id of the target character if this action involves another character. Null otherwise."
      },
      "narration": {
        "type": "string",
        "description": "2-4 sentences narrating the action and its immediate result."
      },
      "stat_deltas": {
        "type": "object",
        "properties": {
          "health": { "type": "integer" },
          "hunger": { "type": "integer" },
          "morale": { "type": "integer" }
        },
        "required": ["health", "hunger", "morale"]
      },
      "inventory_changes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "operation": { "type": "string", "enum": ["add", "remove"] },
            "item": { "type": "string" },
            "quantity": { "type": "integer" }
          },
          "required": ["operation", "item", "quantity"]
        }
      },
      "relationship_changes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "character_id": { "type": "string" },
            "standing_delta": { "type": "integer", "description": "Range -50 to +50" },
            "note": { "type": "string", "description": "Brief note about why the relationship changed." }
          },
          "required": ["character_id", "standing_delta"]
        }
      },
      "new_location_id": {
        "type": ["string", "null"],
        "description": "If the action moves the character, the new location id. Null if they stay."
      },
      "enters_critical_state": {
        "type": "boolean",
        "description": "True only for can_kill actions that have gone badly. Triggers a critical-resolution tick next."
      },
      "critical_context": {
        "type": ["object", "null"],
        "properties": {
          "description": { "type": "string" },
          "severity": { "type": "integer", "minimum": 1, "maximum": 5 }
        }
      }
    },
    "required": ["action_id", "narration", "stat_deltas", "enters_critical_state"]
  }
}
```

### 8.2 resolve_critical

```json
{
  "name": "resolve_critical",
  "description": "Narrate a predetermined critical-state outcome and return resulting state changes.",
  "input_schema": {
    "type": "object",
    "properties": {
      "narration": {
        "type": "string",
        "description": "4-6 sentences narrating the outcome with weight and specificity."
      },
      "stat_deltas": {
        "type": "object",
        "properties": {
          "health": { "type": "integer" },
          "hunger": { "type": "integer" },
          "morale": { "type": "integer" }
        },
        "required": ["health", "hunger", "morale"]
      },
      "new_location_id": {
        "type": ["string", "null"]
      },
      "new_status": {
        "type": "string",
        "enum": ["active", "injured", "hospitalized", "missing", "dead"]
      },
      "status_until_tick": {
        "type": ["integer", "null"]
      },
      "relationship_changes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "character_id": { "type": "string" },
            "standing_delta": { "type": "integer" },
            "note": { "type": "string" }
          },
          "required": ["character_id", "standing_delta"]
        }
      }
    },
    "required": ["narration", "stat_deltas", "new_status"]
  }
}
```

### 8.3 summarize_history (Every 20 Ticks)

```json
{
  "name": "summarize_history",
  "description": "Compress the character's recent events into a short paragraph capturing who they have become.",
  "input_schema": {
    "type": "object",
    "properties": {
      "history_summary": {
        "type": "string",
        "description": "150-200 words. Describes the character's arc, key relationships, recent transformations. Will be sent in every future tick. Should evolve from the previous summary, not replace it wholesale."
      }
    },
    "required": ["history_summary"]
  }
}
```

---

## §9. Implementation Notes & Tuning

A few practical notes before you start:

**Test the prompts manually first.** Before any UI, paste §1 + a §2 snippet + a synthetic character into the Anthropic console. Run 10 ticks by hand. If the narration is good, build. If it's repetitive or off-tone, fix the prompts here — no UI will rescue a broken simulation. This is the single most important step.

**Tool use is non-negotiable.** Do not use prose "please return JSON" prompts. The schemas in §8 are designed for Anthropic tool use and the reliability difference is enormous.

**Energy costs are deliberately flat at 1 for most actions.** Resist the urge to make a complex economy. Almost everything is 1; battle and Deep Delve are 2; sleep and rest are 0. Simple is correct here.

**The history summary is the soul of the character.** Get §8.3 right and characters feel coherent across hundreds of ticks. Get it wrong and they drift. Plan to iterate on this prompt several times in beta.

**Daily energy refill.** Run a `pg_cron` job once per day (per timezone bucket if you're going to do timezone-aware refills) that resets `energy_current` to `energy_max` and stamps `energy_resets_at`. Purchased energy is untouched by this job.

**Forgetting is tunable.** The `last_interaction_tick > current_tick - 30` threshold for active relationships is a starting point. Watch how it feels in beta and adjust.

**Faction recommendation threshold (40%).** Re-read §1's note on cold-start: only run the imbalance check once active population exceeds 20.

**Defection cost.** Suggest $5 USD or local equivalent. Expensive enough to feel weighty, cheap enough to actually purchase.

**Top-up energy pricing.** Up to you, but suggest something like $1 = 20 energy points. With ticks scheduled hourly and 10 free per day, top-ups are for invested users only.

**Anthropic API cost calibration.** With the prompts above, expect roughly 1500–2500 input tokens and 200–400 output tokens per tick using Claude Sonnet 4.6 (the default model for this kind of work). Budget for this when sizing user energy quotas and your top-up pricing.

**The first version should not have payments.** Build the simulation first with energy-as-daily-cap and no top-ups. Once it's fun, add Stripe and the defection mechanic. You can ship a usable v1 in 2–3 weeks; payments add another 1–2 weeks of careful work.

---

## §10. Open Questions to Revisit in Beta

These are decisions you don't need to lock now but should revisit once real users are playing:

1. Should sub-groups within a faction have hostile dynamics that affect tick prompts? (E.g., a Memory Scribe and a Redactor at the same location have inherent friction.)
2. How should the Marked sub-group's mechanical strangeness manifest in narration? Is it visible in their actions or only in their critical-state outcomes?
3. Should `reflect` ticks ever trigger a small history-summary regeneration outside the every-20-ticks schedule?
4. Should there be a "rumor" system — actions taken at one location propagating as gossip to characters at adjacent locations?
5. What does the "legacy view" look like — the screen a user sees of their dead character's full life — and how prominent is it in the UI?

These are good problems to have. They mean you've shipped.

---

*End of design document. Treat this as v1 — expect to iterate. The prompts in particular will improve dramatically with real playtesting.*
