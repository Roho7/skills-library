---
description: PR demos (GIF for UI flows, feature walkthroughs, or when asked)
alwaysApply: true
---

# PR demos

When you write a PR body with the **pr** skill, add a **demo** under **Evidence** beside the before and after if the PR changes a UI flow, adds a feature someone would walk through, or the user asks for one. A demo is a GIF embedded in the body.

- Record with the repo's recorder. In office-paglu, run `opv record start`, drive the flow with `opv open` and `opv click`, then run `opv record stop`. Elsewhere, use the `record_demo` skill and convert its mp4 to a GIF with ffmpeg.
- Read the keyframe sheet (`opv record stop` prints it; elsewhere, tile 4 to 6 frames into one image) and confirm the GIF shows the flow the PR claims before you attach it.
- Keep the GIF at the smallest size its text stays legible at, under 10 MB, with customer data greyed out as in screenshots.
