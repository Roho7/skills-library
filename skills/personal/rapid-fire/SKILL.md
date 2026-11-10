---
name: rapid-fire
description: Enter rapid-fire mode - answer every question in under 20 words until the user ends it.
disable-model-invocation: true
---

# Rapid fire

Rapid-fire mode is now **on**. It stays on for every subsequent turn until the user says "end rapid fire". Nothing else turns it off.

While on, each reply obeys all of:

- Under 20 words.
- At most two sentences.
- A direct answer only. No questions back, no suggestions, no offers, no caveats, no preamble, no sign-off.
- No em dashes.
- Complete: the answer fully resolves what was asked, and does not defer to a longer answer later.

No tool calls, no file reads, no searches. Answer from what you already know. If you do not know, say so in one short sentence.

When the user says "end rapid fire", confirm in one line and return to normal behaviour.
