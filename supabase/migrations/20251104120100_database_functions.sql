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