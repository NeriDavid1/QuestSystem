# Quest runtime API contract

Supabase is the canonical content source for the editor. The game runtime should
consume published revisions only. Draft rows and editor operations stay behind
authenticated RLS policies.

## Read endpoints

The public anon key can read the following published records:

```text
GET /rest/v1/questlines
  ?status=eq.published
  &select=id,key,display_name,theme,default_giver_external_id,level_min,level_max

GET /rest/v1/questline_revisions
  ?status=eq.published
  &select=questline_id,version,schema_version,document,validation_summary,published_at
  &order=version.desc
```

Clients should keep the first revision for each `questline_id`; the descending
version order makes that the latest published snapshot.

## Snapshot shape

`questline_revisions.document` is a self-contained document:

```json
{
  "key": "adjective_crown",
  "display_name": "The Adjective Crown",
  "theme": "Basic English adjectives",
  "default_giver_external_id": "teacher_maya",
  "quests": [
    {
      "key": "q01_bridge_too_short",
      "position": 0,
      "level_required": 1,
      "prerequisites": [],
      "steps": [
        {
          "key": "q01_bridge_too_short_step_01",
          "position": 0,
          "type": "talk_to_npc",
          "payload": { "npc_id": "teacher_maya", "dialogue_id": "..." }
        }
      ]
    }
  ]
}
```

The `version` and `schema_version` columns are part of the cache key. A runtime
client should cache `(questline key, version)` and atomically replace its local
copy when a newer version is published.

Newer publish snapshots also embed referenced content for self-contained viewing:

```json
{
  "dialogues": {
    "maya_intro": { "speaker": "teacher_maya", "lines": ["..."] }
  },
  "minigames": {
    "q01_bridge_too_short_s2": {
      "minigame_id": "letter_ordering",
      "instruction": "...",
      "tasks": [],
      "params": {}
    }
  }
}
```

Existing published revisions (without embedded extras) are supported by:

```text
POST /rest/v1/rpc/get_published_viewer_extras
```

which returns the same `dialogues` / `minigames` maps for keys referenced by any
published revision document. Grant is to `anon` + `authenticated`.

## Publish and rollback rules

1. Editors update draft tables and create a new `questline_revisions` row.
2. Validation must have zero blocking errors before the revision is marked
   `published`.
3. The questline status and revision status are switched to `published`
   together by the editor publish flow.
4. Rollback means publishing a prior revision document as a new version; old
   rows are never mutated or deleted.
5. The YAML importer and `quest_content_bundle.json` remain the deterministic
   rollback bridge until Unity has fully migrated to this API.

The existing Hebrew viewer follows the same contract. If runtime configuration
is absent or the published request fails, it renders the generated YAML viewer
data and labels the page as the YAML fallback. This keeps GitHub Pages useful
offline while making a published Supabase snapshot the preferred source.
