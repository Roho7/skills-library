---
name: officepaglu-ad-creative
description: Generate OfficePaglu lifestyle ad creatives on Higgsfield. Produces candid Indian home/office/nightshift style photos of Soul characters wearing OfficePaglu tshirts with exact design accuracy. Use when the user wants to generate ad creatives, lifestyle shots, or product photography for OfficePaglu tshirts on Higgsfield.
disable-model-invocation: true
---

# OfficePaglu Ad Creative Generator

Generates lifestyle ad creatives for OfficePaglu tshirts on Higgsfield using Soul characters, with pixel-accurate tshirt design replication.

## Soul Characters Available

| Soul ID | Name | Use for |
|---|---|---|
| `61470ec1-9504-449f-baf8-15438638b96b` | Midnight Muse | Female, Indian, dark features |
| `850e696f-c15f-4bd7-ad20-673fb9bc144c` | Varun | Male, Indian, fair skin tone, curly hair |

Always use one of these two Soul IDs. Never generate a character without a Soul ID.

## Tshirt Reference Protocol

**MANDATORY for every generation:**
1. Pick the matching tshirt mockup from `mockups/` folder (use the flatlay or front-facing shot)
2. Upload it to Higgsfield as `media_input` → use as `<<<image_2>>>` (tshirt reference)
3. Use the Soul ID as `<<<soul_id>>>` via `soul_2` model

The tshirt **color, print design, placement, and proportions** must be replicated with 100% accuracy.

## Model to Use

Always use `nano_banana_2` (Nano Banana Pro). Never use `soul_2`, `nano_banana_flash`, or any other model.

## Visual Consistency Rule (CRITICAL)

When generating multiple images in a series (carousel, story, campaign):

**What NEVER changes across slides:**
- Photography style (e.g. Y2K direct flash, 35mm grain — pick one and lock it)
- Lighting setup (flash, tungsten, golden hour — consistent throughout)
- Overall aesthetic and color grading
- Shot "feel" (candid, editorial, lo-fi — pick one)

**What changes per slide:**
- The action / activity the character is doing
- The specific scene props or environment details
- The camera angle / framing (match the angle to the action — e.g. overhead for bed flat-lays, eye-level for seated/eating scenes, low-angle for desk shots)

Every prompt in a series must open with the **same photography style string** to lock the aesthetic. Only the action, environment, and angle should vary.

## Environment Lock Rule (CRITICAL — for same-scene carousels)

When two or more slides depict the **same scene/location** (same bedroom, same desk, same kitchen) from different angles or moments, the environment is not allowed to "drift." The model will silently re-roll wall colors, bedsheets, monitors, and furniture between generations unless the prompt nails them down.

**Before generating a same-scene series, define an "Environment Bible" and reuse the exact same string in every slide prompt for that scene.** Lock these specifics with concrete values (not vague adjectives):

- **Wall**: color + finish (e.g. `pale mint green wall, matte paint`)
- **Bed / bedsheet**: color + pattern (e.g. `crumpled white cotton bedsheet with thin grey stripes`)
- **Table / desk**: material + color + shape (e.g. `dark walnut rectangular wooden desk, scratched matte finish`)
- **Monitor / laptop**: brand-style + size + color (e.g. `single 27-inch black Dell monitor on a thin silver stand`, `silver MacBook Pro 14-inch`)
- **Chair**: type + color (e.g. `black mesh ergonomic chair`)
- **Floor**: material + color (e.g. `beige tiled floor`)
- **Lighting source**: fixture + tone (e.g. `warm yellow ceiling pendant, single source from top-right`)
- **Window**: presence + direction (e.g. `window on the left wall with sheer white curtains`)
- **Recurring props**: any object that appears more than once (e.g. `same red ceramic mug`, `same half-eaten Kurkure packet`)

Treat these as a fixed string and paste them verbatim into every slide prompt that shares the scene. Vary only the character's action, the camera angle, and any *new* props that belong to that specific beat. Do not rephrase or shorten the locked environment string between slides — the model treats paraphrased details as new details.

If a slide moves to a genuinely different room/location, write a fresh Environment Bible for that location and lock it across any other slides set there.

## Prompt Formula

```
[LOCKED PHOTOGRAPHY STYLE], [ANGLE matching the action], @[SOUL_ID] [ACTION], wearing the exact [COLOR] oversized tshirt @[MOCKUP_MEDIA_ID], [ENVIRONMENT DETAILS specific to this slide], [MOOD for this slide].
```

**The character is referenced with `@soul_id` inline in the prompt. The tshirt is referenced with `@mockup_media_id` inline. Both are NOT passed in medias — only the tshirt mockup is passed as `medias: [{ role: "image", value: "<mockup_media_id>" }]`.**

**Scene styles that work well:**
- `Y2K candid photography, direct flash` (lock this for the whole series if using)
- `35mm film photography, golden hour`
- `lo-fi indie photography, warm tungsten light`
- `cyberpunk nightshift, blue monitor glow`

**Environment presets:**
- Indian home office nightshift: `spreadsheet screens, walnut desk texture, framed botanical prints, foreground hand on mouse, cinematic grain`
- Cafe work: `macbook on marble table, ceramic matcha, warm cafe bokeh, street light spill`
- Rooftop evening: `city skyline blur, golden hour haze, concrete ledge, kurta layered over tshirt`

**Photography modifiers (add to any prompt):**
- `35mm snapshot grain, cinematic grain, glossy skin texture, cyber realism`
- `direct flash, 50mm lens, shallow depth of field`
- `hyper-realistic, 8k detail, studio quality`

## Step-by-Step Generation Process

1. **Identify the tshirt** the user wants to feature (which product, which color variant)
2. **Find the mockup file** — check `mockups/` subfolders (e.g., `mockups/WFH2/`, `mockups/WFH2-red/`)
3. **Upload the mockup** to Higgsfield via `media_upload` + `media_confirm` → note the media ID
4. **Choose a Soul ID** (default: `61470ec1` for female Indian model)
5. **Pick a scene style** from the presets above or from user description
6. **Generate** using `soul_2` model with:
   - `soul_id`: the chosen Soul ID
   - `medias`: Soul ID as `soul` role, mockup as `image` role
   - Prompt: use the formula above, referencing `<<<image_2>>>` for the tshirt
7. **Poll** with `job_status` (sync: true) and display result
8. **Download** completed image to `mockups/[PRODUCT]-ads/` folder

## Full Example Prompt

Single image:
```
Y2K candid photography, direct flash, low-angle desk portrait, @61470ec1-9504-449f-baf8-15438638b96b coding at her monitor, wearing the exact red oversized tshirt @<mockup_media_id>, the tshirt has the exact same print, color, design and proportions as the reference, spreadsheet screens, foreground hand on mouse, walnut desk texture, indian home office nightshift, cinematic grain, glossy skin texture
```

Series example (same style locked, only action/angle changes):
```
Slide 1: Y2K candid photography, direct flash, overhead shot, @850e696f... lying in bed coding on 2 laptops, wearing the exact black tshirt @<mockup_id>, Indian household bedroom, Lays Kurkure Doritos packets, beer bottles, 2am energy
Slide 2: Y2K candid photography, direct flash, eye-level shot, @850e696f... sitting cross-legged eating Maggi with one hand typing with other, wearing the exact black tshirt @<mockup_id>, same Indian bedroom, Kurkure packet beside him, 1pm lunch break energy
Slide 3: Y2K candid photography, direct flash, low-angle shot, @850e696f... at desk on a call looking at monitor, wearing the exact black tshirt @<mockup_id>, home office setup, 4pm meeting energy
```

## Generation Call Template

```json
{
  "model": "nano_banana_2",
  "prompt": "<your prompt here — with @soul_id and @mockup_media_id inline>",
  "aspect_ratio": "3:4",
  "medias": [
    { "role": "image", "value": "<mockup_media_id>" }
  ]
}
```

## Output

- Save generated images to `mockups/[PRODUCT]-ads/` (create folder if needed)
- Name files descriptively: `wfh-red-desk-nightshift.png`, `wfh-navy-cafe-golden.png`
- Always show the result to the user after downloading

## Quality Checklist

Before calling complete:
- [ ] Soul ID was used (not a generic character)
- [ ] Tshirt mockup from `/mockups` folder was passed as reference image
- [ ] Prompt explicitly states "wearing the exact [color] tshirt from <<<image_2>>>" 
- [ ] Prompt says "same print, color, design and proportions as <<<image_2>>>"
- [ ] Result downloaded to the correct folder
