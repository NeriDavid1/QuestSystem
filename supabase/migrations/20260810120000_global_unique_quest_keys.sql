-- Quest keys must be unique across the entire game (Unity OpenWorld / Guider lookup).
-- Previously uniqueness was only (questline_id, key), which allowed q01_new_quest on every line.

-- Resolve any existing global collisions by appending _{n} before enforcing the index.
do $$
declare
  r record;
  next_key text;
  suffix integer;
begin
  for r in
    select id, key
    from public.quests
    where id not in (
      select distinct on (key) id
      from public.quests
      order by key, created_at asc, id asc
    )
    order by created_at asc, id asc
  loop
    suffix := 2;
    next_key := r.key || '_' || suffix;
    while exists (select 1 from public.quests where key = next_key) loop
      suffix := suffix + 1;
      next_key := r.key || '_' || suffix;
    end loop;
    update public.quests set key = next_key where id = r.id;
  end loop;
end $$;

create unique index if not exists quests_key_global_uidx on public.quests (key);

comment on index public.quests_key_global_uidx is
  'Quest content keys are globally unique for Unity QuestManager / Guider grouping.';
