---
name: officepaglu-story-creative
description: Takes one seed image (generated with officepaglu-ad-creative) and builds a connected Instagram carousel series around it. Proposes 3 theme options, waits for user to pick one, then generates all remaining images in parallel on Higgsfield + writes caption.txt and copy_text.txt. Use when the user wants to expand a single ad creative into a multi-slide Instagram post or carousel.
---

# OfficePaglu Story Creative

Takes a single Higgsfield-generated seed image and builds a cohesive Instagram carousel series — connected images, a caption, and optional overlay copy.

---

## Story Types (connective tissue between slides)

| Type | Name | Description |
|---|---|---|
| A | Day in Her Life | Same character, same outfit, different scenes — follows her through a moment or a day |
| B | Same Scene, Different Moments | Same environment, zooming into different funny/interesting beats of one situation |
| C | Different Characters, Same Vibe | Different character, same aesthetic and emotional register — community feel |

AI picks the best story type per theme option based on the seed image.

---

## Theme Option Structure

Always present **exactly 3 options**:

- **Option 1** — Story type (A/B/C, AI picks) + **Relatable humor** angle
  - The quiet suffering of corporate life: meetings that could've been emails, 11pm deploys, pretending to understand requirements
- **Option 2** — Story type (A/B/C, AI picks) + **Dry/deadpan** angle  
  - No explanation needed, the image IS the joke. Very online, absurdist, minimal
- **Option 3** — AI's **wildcard** — strongest instinct regardless of category

For each option provide:
- Option number + story type label (e.g. "Option 1 — Type B, Relatable")
- A title (3-5 words, the story concept)
- A one-sentence description of what each slide would show
- Estimated slide count (AI decides, 3–7 based on story needs)

---

## Step-by-Step Process

### Step 1 — Analyze the seed image

Read the seed image carefully:
- What character is in it? What tshirt are they wearing?
- What's the scene/environment?
- What's the mood/energy?
- What story beat does it represent?

The seed image becomes **slide 1**. All other slides must connect to it.

### Step 2 — Present 3 theme options

Show all 3 options clearly formatted. **Stop and wait for the user to pick one.**

### Step 3 — After theme is selected

1. Plan out all slides (slide 1 = seed, slides 2–N = to generate)
2. **Build the Environment Bible (MANDATORY for same-scene carousels).** Before writing any slide prompts, identify which slides share a scene/location. For each shared location, extract concrete locked details from the seed image: wall color + finish, bedsheet/bed color + pattern, desk material + color + shape, monitor/laptop brand-style + size + color, chair, floor, lighting source + tone, window position, and any recurring props. Write this as a single fixed string per location and paste it **verbatim** into every slide prompt set in that location. Do not paraphrase between slides — the model treats reworded details as new details and will drift wall colors, bedsheets, monitors, etc. See the Environment Lock Rule in `/officepaglu-ad-creative` for the full checklist.
3. **MANDATORY: Follow the `/officepaglu-ad-creative` skill rules for ALL prompt writing.** This means:
   - Lock the photography style from the seed image and use it identically in every slide prompt
   - Lock the Environment Bible per scene and paste it verbatim across all slides sharing that scene
   - Only vary the action, the camera angle, and any new beat-specific props per slide
   - Match angle to action (overhead for bed flat-lays, eye-level for seated/eating, low-angle for desk)
   - Use `@soul_id` and `@mockup_media_id` inline in each prompt
   - Never default every slide to the same angle — vary framing to match the scene
3. Upload the tshirt mockup from `mockups/` as a reference image (same tshirt as the seed)
4. Generate **all slides in parallel** using `nano_banana_2`
5. Poll all jobs simultaneously with `job_status (sync: true)`

### Step 4 — Write copy

After all images complete, write:

**`caption.txt`**:
```
[HOOK LINE — punchy, first line, makes them stop scrolling]

[2-3 lines of body — voice is dry/insider, speaks to devs/designers in India]

[5 hashtags on their own line]
```

**`copy_text.txt`**:
```
Slide 1: [optional overlay text — one punchy line, or "no overlay" if it doesn't need one]
Slide 2: [optional overlay text]
...
```

Overlay text rules:
- Max one line per slide
- Only suggest it where it genuinely sharpens the joke or hook
- Label clearly as OPTIONAL — user places it in Canva/Figma, not on Higgsfield
- Tone must match the chosen theme (relatable = sardonic, deadpan = extremely minimal or none)

### Step 5 — Save everything

1. Create a slug from the caption hook line: lowercase, hyphens, max 5 words
   - e.g. "the deploy was fine actually" → `the-deploy-was-fine`
2. Create folder: `creatives/{slug}/`
3. Download all generated images into the folder, named: `slide-1.png`, `slide-2.png`, etc.
   - Slide 1 (seed) should be copied/downloaded from its source URL if available, or noted as "add manually"
4. Write `creatives/{slug}/caption.txt`
5. Write `creatives/{slug}/copy_text.txt`

---

## Higgsfield Prompt Formula for Story Slides

**This section is governed by the `officepaglu-ad-creative` skill. Follow its rules exactly.**

Key rules for carousel prompts:
- Extract the exact photography style string from the seed (e.g. `Y2K candid photography, direct flash, 35mm lens`) and open every single slide prompt with it — word for word
- Extract the Environment Bible from the seed (wall color, bedsheet, desk, monitor, chair, floor, lighting, window, recurring props) and paste it verbatim into every slide prompt that shares that scene
- Character referenced as `@soul_id` inline. Tshirt as `@mockup_media_id` inline
- Only `medias: [{ role: "image", value: "<mockup_media_id>" }]` — no character in medias
- Angle must match the action — never blindly repeat "overhead" for every slide
- Only the action, the angle, and beat-specific new props change. Photography style and Environment Bible are locked

```
[LOCKED STYLE FROM SEED], [ANGLE matching action], @[SOUL_ID] [ACTION for this slide], wearing the exact [COLOR] tshirt @[MOCKUP_ID], [SCENE DETAILS for this slide], [MOOD for this slide]
```

**Important**: Each slide should visually work standalone AND as part of the sequence.

---

## Model & Technical

- Model: `nano_banana_2`
- Aspect ratio: `3:4`
- Resolution: `2k`
- Pass tshirt mockup as `medias: [{ role: "image", value: "<mockup_media_id>" }]`
- Pass seed image (or character reference) as second image where helpful

---

## Soul Characters

| Soul ID | Name |
|---|---|
| `61470ec1-9504-449f-baf8-15438638b96b` | Midnight Muse (female, Indian) |
| `850e696f-c15f-4bd7-ad20-673fb9bc144c` | Varun (male, Indian) |

If Type C (different characters) is chosen, use the alternate Soul character for some slides — pass their prior generated image as reference.

---

## Output Summary

```
creatives/
└── {caption-slug}/
    ├── slide-1.png     ← seed (add manually or download)
    ├── slide-2.png
    ├── slide-3.png
    ├── ...
    ├── caption.txt
    └── copy_text.txt
```

---

## Quality Checklist

- [ ] 3 theme options presented before any generation
- [ ] User confirmed their choice before generating
- [ ] Tshirt mockup uploaded and passed as reference in every prompt
- [ ] All slides generated in parallel
- [ ] Photography style string from seed is identical across all slide prompts
- [ ] Environment Bible (wall, bedsheet, desk, monitor, chair, floor, lighting, props) is locked and pasted verbatim across all slides sharing a scene
- [ ] Camera angle varies per slide to match the action (not every slide "overhead")
- [ ] @soul_id and @mockup_media_id used inline in every prompt
- [ ] caption.txt has hook + body + exactly 5 hashtags
- [ ] copy_text.txt has per-slide overlay suggestions labeled OPTIONAL
- [ ] All files saved in `creatives/{slug}/`
- [ ] Slug derived from caption hook, not a generic name
