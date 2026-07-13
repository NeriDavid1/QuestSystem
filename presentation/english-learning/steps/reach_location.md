# Step: Reach Location

**Type ID:** `reach_location`  
**English-learning weight:** Low (travel pacing; optional sign English)

---

## What it does

The player must enter a trigger zone in the world. Used for exploration, guiding players to the next activity, or gating areas until the story allows entry.

Completes when the player enters the zone (within `radius` meters of the location).

---

## Player experience

1. Quest marker on map / compass.
2. Player walks or runs to the area.
3. Zone triggers → optional one-line UI ("You arrived at the **Library**").
4. Step completes.

---

## English-learning role

Light touch only:

- Location names in English on signs: **School**, **Forest**, **Gate**
- Optional popup: "Welcome to the **A** Garden!"

Do not use long travel chains without a learning step at the destination.

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `location_id` | yes | Zone ID (e.g. `school_yard`, `letter_garden`) |
| `radius` | no | Trigger radius in meters (default 5.0) |

### Example

```yaml
- type: reach_location
  location_id: school_chest_room
  radius: 4.0
```

---

## Pairs well with

- `play_minigame` — go to place, then interact
- `talk_to_npc` — go to NPC area first
- `defeat_enemy` — enter arena zone

## See also

- [When to use each step](../when-to-use.md)
