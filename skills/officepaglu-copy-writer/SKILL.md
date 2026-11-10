---
name: officepaglu-copy-writer
description: Generate on-brand Office Paglu copy — product descriptions, t-shirt text, Instagram captions, ad copy, SEO meta titles/descriptions, collection descriptions, and launch copy. Use when the user wants to write copy, captions, descriptions, taglines, or any text for OfficePaglu tshirts, collections, ads, or social media. Also use when another skill (officepaglu-ad-creative, officepaglu-story-creative) needs a caption or copy text.
---

# Office Paglu Copy Writer

Generates copy for Office Paglu — the unprofessional office wear brand for Indian corporate mazdoors.

**Brand voice source of truth:** `docs/OFFICEPAGLU_BRAND_LANGUAGE.md` — read it before every generation. It defines the voice, vocabulary, hard nevers, and format specs. Do not generate without reading it first.

## Process

### 1. Absorb the input

The user provides one or more of: a tee image, tee name, a few lines describing the design. If an image is provided, study it — the design, the print, the color, the vibe. If the input is thin, ask one clarifying question max, then generate. Never ask more than one question.

### 2. Read the brand voice

Read `docs/OFFICEPAGLU_BRAND_LANGUAGE.md` in full. Every generation must pass through the voice, vocabulary, and hard nevers defined there. This is not optional — the brand doc is the filter, not a suggestion.

### 3. Identify the format

Determine what the user needs from context or ask. Formats and their constraints:

| Format | Structure | Length |
|---|---|---|
| **T-shirt text** | Standalone phrase. No setup, no context needed. Instant recognition. | 2–8 words |
| **Product description** | Punchline → Scene → Product detail. See punchline-first rule below. | 3–5 sentences |
| **Instagram caption** | Conversational. Can name-drop brands. Ends with a hook or question. | 2–4 sentences |
| **Ad copy** | Headline + one-line payoff. Sells the vibe, not the product. | 1–2 sentences |
| **SEO meta description** | On-brand but keyword-aware. Must include relevant search terms naturally. | Under 160 chars |
| **Collection description** | The vibe/story for a group of tees. Paints the world they belong to. | 2–3 sentences |
| **Collection meta title** | SEO-friendly, on-brand. | Under 60 chars |
| **Collection meta description** | Keyword-aware + brand voice. | Under 160 chars |
| **Launch copy** | New drop announcement. Adapt tone to channel (IG vs WhatsApp vs email). | 2–4 sentences |

If the user doesn't specify a format, generate **product description** by default.

### 4. Generate three options

Every generation produces **three distinct options** — different angles on the same input, not minor variations. Each option should take a genuinely different creative direction: different punchline, different scenario, different cultural reference.

**The punchline-first rule (product descriptions):** The punchline is Act 1 — a short Hinglish or deadpan line that hooks. Act 2 is the scene — warm, observational, paints the relatable moment. Act 3 is the product — what the tee actually is, the craft detail. End with "For working unprofessionals." where it fits naturally.

### 5. Self-check against hard nevers

Before presenting output, run every option against the hard nevers from the brand doc. If any option breaks a never, rewrite it. The nevers are non-negotiable — no exceptions for cleverness.

### 6. Present and iterate

Present all three options clearly numbered. If the user picks one, offer to refine. If they reject all three, ask what direction to push and regenerate.
