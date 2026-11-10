---
name: officepaglu-web-assets
description: Generate all 5 OfficePaglu ecommerce web asset mockups (ghost mannequin, angled flatlay, macro closeup, full body front, full body back) on Higgsfield from a base tshirt mockup. Asks for fit type (regular/oversized) and print type (embroidery/DTG), then generates all 5 using exact proven prompts. Use when the user wants to create product page images or web assets for an OfficePaglu tshirt.
---

# OfficePaglu Web Asset Generator

Generates all 5 ecommerce web asset mockups for a single tshirt product on Higgsfield. Uses exact proven prompts — no deviations.

---

## Pre-Flight Questions (MANDATORY)

Before generating anything, you MUST collect ALL 5 inputs below. If any is missing, ask for it. Do not skip any.

### 1. Base Tshirt Mockup + Side Detection (MANDATORY)

Ask: **"Please share the base tshirt mockup image (the reference tee with the design on it)."**

This is the reference image that Higgsfield will use to replicate the design accurately. Upload it to Higgsfield via `media_upload_widget` or `media_import_url` and note the `media_id`.

**After receiving the mockup, visually inspect it to determine which side it shows:**

- **Front side indicators**: visible crewneck collar, chest-area design placement, front neckline curve
- **Back side indicators**: back neckline shape (higher, straighter), design centered on upper back, no visible collar dip

**If only ONE side is provided**, ask:

> "I see you've only provided the **front/back** mockup. Would you like to provide the other side as well, or shall I generate mockups for just this side?"

- If **user provides the other side**: upload it too, note its `media_id`, and generate the full set (all front-facing mockups use the front reference, all back-facing mockups use the back reference)
- If **user says generate for one side only**: generate only the mockups relevant to that side (see Side-Specific Generation below)
- If **user provides both sides upfront**: proceed with the full set

**If both sides are provided**, use the front mockup for front-facing prompts (1, 2, 3, 4) and the back mockup for back-facing prompts (5).

### 2. Fit Type

Ask: **"Is this tee regular fit or oversized?"**

- If **regular fit**: use "regular-fit" in all prompts (this is what the prompts below default to)
- If **oversized**: replace every instance of "regular-fit" / "regular fit" with "oversized" in all prompts

### 3. Print Type

Ask: **"Is the design embroidered or DTG printed?"**

- If **embroidery**: use the Embroidery prompt set
- If **DTG**: use the DTG prompt set

### 4. Soul Character (MANDATORY — always ask)

Ask: **"Which model for the full body shots — Midnight Muse, Varun, or both?"**

| Soul ID | Name |
|---|---|
| `61470ec1-9504-449f-baf8-15438638b96b` | Midnight Muse (female, Indian, dark features) |
| `850e696f-c15f-4bd7-ad20-673fb9bc144c` | Varun (male, Indian, fair skin tone, curly hair) |

- If **Midnight Muse**: generate 2 full body shots (front + back) with Midnight Muse
- If **Varun**: generate 2 full body shots (front + back) with Varun
- If **both**: generate 4 full body shots total — front + back with Varun AND front + back with Midnight Muse (all 4 in parallel)

### 5. Higgsfield Model (MANDATORY — always ask)

Ask: **"Which Higgsfield model — Nano Banana Pro or GPT 2?"**

- If **Nano Banana Pro**: use `nano_banana_2` for all generations
- If **GPT 2**: use `gpt_image_2` for all generations

---

## The Mockups to Generate

For the first 3 (no Soul needed), generate in parallel. Then generate the full body shots (with Soul character) in parallel.

| # | Name | Needs Soul Character? |
|---|---|---|
| 1 | Ghost Mannequin Front | No |
| 2 | Angled Flatlay | No |
| 3 | Macro Closeup | No |
| 4 | Full Body Front | Yes |
| 5 | Full Body Back | Yes |

If user chose **both** Soul characters, the full body set becomes 4 images:

| # | Name | Soul |
|---|---|---|
| 4a | Full Body Front (Midnight Muse) | `61470ec1-9504-449f-baf8-15438638b96b` |
| 4b | Full Body Back (Midnight Muse) | `61470ec1-9504-449f-baf8-15438638b96b` |
| 5a | Full Body Front (Varun) | `850e696f-c15f-4bd7-ad20-673fb9bc144c` |
| 5b | Full Body Back (Varun) | `850e696f-c15f-4bd7-ad20-673fb9bc144c` |

Generate all 4 full body shots in parallel.

---

## Side-Specific Generation

When only one side of the tshirt is provided and the user opts to generate for that side only:

### Front-only mockup provided → generate:

| # | Name | Prompt |
|---|---|---|
| 1 | Ghost Mannequin Front | Prompt 1 |
| 2 | Angled Flatlay | Prompt 2 |
| 3 | Macro Closeup | Prompt 3 |
| 4 | Full Body Front | Prompt 4 (per Soul selection) |

**Skip**: Full Body Back (Prompt 5) — no back reference available.

### Back-only mockup provided → generate:

| # | Name | Prompt |
|---|---|---|
| 1 | Full Body Back | Prompt 5 (per Soul selection) |

**Skip**: Ghost Mannequin Front, Angled Flatlay, Macro Closeup, Full Body Front — these all show the front of the tee and require a front reference.

### Both sides provided → generate all 5 prompts (full set)

Use the front mockup `media_id` for Prompts 1-4. Use the back mockup `media_id` for Prompt 5.

---

## EXACT PROMPTS — Embroidery Set

Use these prompts VERBATIM when print type is embroidery. Do not modify, rephrase, or "improve" them.

### Prompt 1: Ghost Mannequin Front (Embroidery)

```
Use the provided t-shirt design exactly as uploaded. Create a premium invisible ghost mannequin ecommerce mockup of a regular-fit crewneck t-shirt. Front-facing view, perfectly centered. Garment appears naturally worn without showing any body, neck, or mannequin structure. Preserve exact embroidery placement, size, color, proportions, stitching, neckline shape, sleeve shape, and fit. visible thread texture,  Light grey (#eeeeee) seamless studio background. Soft luxury fashion lighting. Subtle natural fabric folds showing realistic drape. No model, no props, no branding additions. High-end fashion photography, photorealistic, ultra-clean ecommerce presentation, 8k detail.
```

### Prompt 2: Angled Flatlay (Embroidery)

```
Use the provided t-shirt exactly as uploaded.

Create a premium ecommerce flatlay mockup matching the composition of high-end apparel product photography.

FRAMING REQUIREMENTS:
- Portrait aspect ratio (4:5)
- Camera directly overhead (90 degree top-down)
- T-shirt rotated approximately 28-32 degrees clockwise IMPORTANT!
- Only upper 60-70% of the garment visible
- Bottom hem completely cropped out of frame
- right shoulder fully visible
- left shoulder partially visible
- Both sleeves partially cropped by frame edges
- Crewneck collar fully visible and positioned in upper-right quadrant
- Collar should occupy approximately 15-18% of image width
- Visible shoulder seam details
- Chest embroidery positioned slightly right of center
- Embroidery located approximately 55% down from top edge

GARMENT STYLING:
- Regular fit t-shirt
- Natural fabric drape
- 180 GSM pure cotton fabric
- One primary diagonal fold running from collar toward lower center
- Subtle tension folds near shoulder seam
- Soft premium cotton texture
- No wrinkles that look messy
- Luxury fashion flatlay styling

BACKGROUND:
- Clean light grey seamless studio background (#eeeeee)
- No props
- No hanger
- No model
- No accessories

LIGHTING:
- Soft diffused studio lighting
- Slight directional light from upper left
- Gentle shadow definition in folds
- Luxury ecommerce product photography
- Photorealistic

PRESERVE EXACTLY:
- Garment color
- Embroidery placement
- Embroidery size
- Embroidery texture
- Neckline shape
- Sleeve shape
- Stitching details
- Fabric proportions

Reference composition: premium oversized apparel flatlay where the focus is on the collar, shoulder construction, chest embroidery, and fabric texture rather than showing the entire garment.
```

### Prompt 3: Macro Closeup (Embroidery)

```
Macro close-up of the embroidered chest logo on the provided t-shirt. Visible thread texture, premium stitching details, realistic cotton weave, luxury apparel product photography, shallow depth of field.
```

### Prompt 4: Full Body Front (Embroidery)

Replace `<<<MODEL>>>` with `@[Name](soul_id)` inline (e.g. `@[Midnight-Muse](61470ec1-9504-449f-baf8-15438638b96b)` or `@[Varun](850e696f-c15f-4bd7-ad20-673fb9bc144c)`). This exact bracket format is required for Higgsfield Soul references.

```
full body portrait of <<<MODEL>>>, facing left side, neutral expression, slight natural weight shift to one leg, relaxed posture, arms relaxed naturally, clean white studio background, soft studio lighting, realistic body proportions, 50mm lens, photorealistic, maintain character consistency with hair, eyes, nose, lips, skin texture including any spots, moles, pores, and natural facial features. 
WARDROBE:  <<<MODEL>>> MUST be wearing a white regular fit tshirt with the exact design shown in , embroidered chest design, realistic cotton texutre, realistic print proportions derived from reference image 
Loose black color pants and white sneakers.
```

### Prompt 5: Full Body Back (Embroidery)

Replace `<<<MODEL>>>` with `@[Name](soul_id)` inline (e.g. `@[Midnight-Muse](61470ec1-9504-449f-baf8-15438638b96b)` or `@[Varun](850e696f-c15f-4bd7-ad20-673fb9bc144c)`). This exact bracket format is required for Higgsfield Soul references.

```
full body portrait of <<<MODEL>>>, back facing camera, body oriented slightly toward left side, head turned subtly in left profile, neutral expression, slight natural weight shift to one leg, relaxed posture, arms resting naturally, clean white studio background, soft studio lighting, realistic body proportions, 50mm lens, photorealistic, maintain character consistency with hair, eyes, nose, lips, skin texture including any spots, moles, pores, and natural facial features.
WARDROBE: <<<MODEL>>> MUST be wearing a black regular fit tshirt with the exact back design shown in the uploaded image, embroidered design, realistic cotton texture, realistic print proportions derived from reference image.
Loose light color pants and white sneakers.
```

---

## EXACT PROMPTS — DTG Set

Use these prompts VERBATIM when print type is DTG. Do not modify, rephrase, or "improve" them.

### Prompt 1: Ghost Mannequin Front (DTG)

```
Use the provided t-shirt design exactly as uploaded. Create a premium invisible ghost mannequin ecommerce mockup of a regular-fit crewneck t-shirt. Front-facing view, perfectly centered. Garment appears naturally worn without showing any body, neck, or mannequin structure. Preserve exact DTG print placement, size, color, proportions, and artwork detail. The chest design must look like a direct-to-garment (DTG) print — ink absorbed into the cotton fibers, no raised texture, no embossed edges, no thread or stitching texture. Smooth matte ink finish with slight fabric grain showing through the print. Light grey (#eeeeee) seamless studio background. Soft luxury fashion lighting. Subtle natural fabric folds showing realistic drape. No model, no props, no branding additions. High-end fashion photography, photorealistic, ultra-clean ecommerce presentation, 8k detail.
```

### Prompt 2: Angled Flatlay (DTG)

```
Use the provided t-shirt exactly as uploaded.

Create a premium ecommerce flatlay mockup matching the composition of high-end apparel product photography.

FRAMING REQUIREMENTS:
- Portrait aspect ratio (4:5)
- Camera directly overhead (90 degree top-down)
- T-shirt rotated approximately 28-32 degrees clockwise IMPORTANT!
- Only upper 60-70% of the garment visible
- Bottom hem completely cropped out of frame
- right shoulder fully visible
- left shoulder partially visible
- Both sleeves partially cropped by frame edges
- Crewneck collar fully visible and positioned in upper-right quadrant
- Collar should occupy approximately 15-18% of image width
- Visible shoulder seam details
- Chest DTG print positioned slightly right of center
- Print located approximately 55% down from top edge

GARMENT STYLING:
- Regular fit t-shirt
- Natural fabric drape
- 180 GSM pure cotton fabric
- One primary diagonal fold running from collar toward lower center
- Subtle tension folds near shoulder seam
- Soft premium cotton texture
- No wrinkles that look messy
- Luxury fashion flatlay styling

BACKGROUND:
- Clean light grey seamless studio background (#eeeeee)
- No props
- No hanger
- No model
- No accessories

LIGHTING:
- Soft diffused studio lighting
- Slight directional light from upper left
- Gentle shadow definition in folds
- Luxury ecommerce product photography
- Photorealistic

PRINT TECHNIQUE — DTG (Direct-to-Garment):
- Ink is absorbed directly into the cotton fibers
- No raised texture, no embossed edges, no thread texture
- Smooth matte ink finish
- Slight fabric weave visible through the print
- Print conforms naturally to fabric folds and drape
- Colors appear slightly softened by the cotton base, not plasticky or glossy

PRESERVE EXACTLY:
- Garment color
- DTG print placement
- DTG print size
- DTG print colors and artwork detail
- Neckline shape
- Sleeve shape
- Fabric proportions

Reference composition: premium oversized apparel flatlay where the focus is on the collar, shoulder construction, chest DTG print, and fabric texture rather than showing the entire garment.
```

### Prompt 3: Macro Closeup (DTG)

```
Macro close-up of the DTG-printed chest design on the provided t-shirt. Ink absorbed into cotton fibers, no raised texture, no thread or stitching, smooth matte ink finish with visible cotton weave grain showing through the print. Realistic direct-to-garment printing texture, premium cotton fabric detail, luxury apparel product photography, shallow depth of field.
```

### Prompt 4: Full Body Front (DTG)

Replace `<<<MODEL>>>` with `@[Name](soul_id)` inline (e.g. `@[Midnight-Muse](61470ec1-9504-449f-baf8-15438638b96b)` or `@[Varun](850e696f-c15f-4bd7-ad20-673fb9bc144c)`). This exact bracket format is required for Higgsfield Soul references.

```
full body portrait of <<<MODEL>>>, facing left side, neutral expression, slight natural weight shift to one leg, relaxed posture, arms relaxed naturally, clean white studio background, soft studio lighting, realistic body proportions, 50mm lens, photorealistic, maintain character consistency with hair, eyes, nose, lips, skin texture including any spots, moles, pores, and natural facial features.
WARDROBE: <<<MODEL>>> MUST be wearing a white regular fit tshirt with the exact design shown in the uploaded image, DTG printed chest design — ink absorbed into cotton fibers, no raised texture, no embossed edges, no thread or stitching, smooth matte ink finish with fabric weave visible through the print, realistic cotton texture, realistic print proportions derived from reference image.
Loose black color pants and white sneakers.
```

### Prompt 5: Full Body Back (DTG)

Replace `<<<MODEL>>>` with `@[Name](soul_id)` inline (e.g. `@[Midnight-Muse](61470ec1-9504-449f-baf8-15438638b96b)` or `@[Varun](850e696f-c15f-4bd7-ad20-673fb9bc144c)`). This exact bracket format is required for Higgsfield Soul references.

```
full body portrait of <<<MODEL>>>, back facing camera, body oriented slightly toward left side, head turned subtly in left profile, neutral expression, slight natural weight shift to one leg, relaxed posture, arms resting naturally, clean white studio background, soft studio lighting, realistic body proportions, 50mm lens, photorealistic, maintain character consistency with hair, eyes, nose, lips, skin texture including any spots, moles, pores, and natural facial features.
WARDROBE: <<<MODEL>>> MUST be wearing a black regular fit tshirt with the exact back design shown in the uploaded image, DTG printing — ink absorbed into cotton fibers, no raised texture, no embossed edges, no thread or stitching, smooth matte ink finish with fabric weave visible through the print, realistic cotton texture, realistic print proportions derived from reference image.
Loose light color pants and white sneakers.
```

---

## Fit Type Substitution

If the user says **oversized**, do a find-and-replace across whichever prompt set is active:

- `regular-fit` → `oversized`
- `Regular fit` → `Oversized`
- `regular fit` → `oversized`

No other changes to the prompts.

---

## Step-by-Step Generation Process

### Step 1 — Collect Inputs

Collect ALL pre-flight inputs. If any is missing, ask for it:

1. Base tshirt mockup image
2. **Detect front or back** from the mockup → ask user if they want to provide the other side or generate for one side only
3. Regular fit or oversized?
4. Embroidery or DTG?
5. Soul character: Midnight Muse, Varun, or both?
6. Higgsfield model: Nano Banana Pro (`nano_banana_2`) or GPT 2 (`gpt_image_2`)?

### Step 2 — Upload Reference

1. Upload the base tshirt mockup(s) to Higgsfield via `media_upload_widget` (if user has a local file) or `media_import_url` (if URL provided)
2. Note the returned `media_id`(s)
3. If two sides provided, track which `media_id` is front and which is back

### Step 3 — Generate Mockups 1-3 (No Soul, Parallel)

Generate these 3 in parallel using `generate_image` with the user's chosen Higgsfield model:

```json
{
  "model": "<nano_banana_2 or gpt_2>",
  "prompt": "<exact prompt from the selected set>",
  "aspect_ratio": "4:5",
  "medias": [
    { "role": "image", "value": "<mockup_media_id>" }
  ]
}
```

- Ghost Mannequin Front → aspect_ratio `4:5`
- Angled Flatlay → aspect_ratio `4:5`
- Macro Closeup → aspect_ratio `4:5`

Poll all 3 jobs with `job_status` (sync: true).

### Step 4 — Generate Full Body Shots (with Soul, Parallel)

Replace `<<<MODEL>>>` in prompts 4 and 5 with `@[Name](soul_id)` (e.g. `@[Midnight-Muse](61470ec1-9504-449f-baf8-15438638b96b)`).

**Single Soul character chosen:** Generate 2 images in parallel (front + back).
**Both chosen:** Generate 4 images in parallel (front + back for each Soul).

```json
{
  "model": "<nano_banana_2 or gpt_2>",
  "prompt": "<exact prompt with @soul_id substituted>",
  "aspect_ratio": "3:4",
  "medias": [
    { "role": "image", "value": "<mockup_media_id>" }
  ]
}
```

Poll all jobs with `job_status` (sync: true).

### Step 5 — Download and Save

1. Create output folder: `mockups/<product-name>-web-assets/` (ask user for product name or derive from context)
2. Download all images into the folder.

**Single Soul — file names:**
- `01-ghost-mannequin-front.png`
- `02-angled-flatlay.png`
- `03-macro-closeup.png`
- `04-full-body-front.png`
- `05-full-body-back.png`

**Both Souls — file names:**
- `01-ghost-mannequin-front.png`
- `02-angled-flatlay.png`
- `03-macro-closeup.png`
- `04-full-body-front-midnight-muse.png`
- `05-full-body-back-midnight-muse.png`
- `06-full-body-front-varun.png`
- `07-full-body-back-varun.png`

3. Show all results to the user

---

## CRITICAL RULES

1. **DO NOT modify, rephrase, shorten, or "improve" any prompt.** The prompts are proven and work exactly as written. Use them verbatim.
2. **Always pass the tshirt mockup as a media reference** in every single generation call.
3. **Always ask ALL pre-flight questions** before generating anything.
4. **If the user says oversized**, only change the fit references in the prompts — nothing else.
5. **Always detect which side (front/back) the mockup shows** and ask the user if they want to provide the other side or generate for one side only. Never silently skip this.
6. **If two mockups provided (front + back)**, use the correct one per prompt — front `media_id` for prompts 1-4, back `media_id` for prompt 5.
7. **Never generate back-facing mockups without a back reference**, and never generate front-facing mockups without a front reference.

---

## Quality Checklist

- [ ] Base tshirt mockup was provided by the user
- [ ] Side detected (front / back) and user asked about providing the other side
- [ ] Correct mockups generated based on which side(s) were provided
- [ ] Fit type confirmed (regular / oversized)
- [ ] Print type confirmed (embroidery / DTG)
- [ ] Soul character confirmed (Midnight Muse / Varun / both)
- [ ] Higgsfield model confirmed (Nano Banana Pro / GPT 2)
- [ ] Correct prompt set selected based on print type
- [ ] Fit substitution applied if oversized
- [ ] Tshirt mockup uploaded to Higgsfield and media_id noted
- [ ] All prompts used VERBATIM from this skill (no modifications)
- [ ] Correct Higgsfield model used in every generation call
- [ ] Mockup media_id passed in every generation call
- [ ] Mockups 1-3 generated in parallel
- [ ] Full body shots generated in parallel (2 if single Soul, 4 if both)
- [ ] All images downloaded to `mockups/<product>-web-assets/`
- [ ] All results shown to the user
