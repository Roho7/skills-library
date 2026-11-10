# pstack in Claude Code

pstack skills here are pre-translated for Claude Code: tool names, model names and the model-sheet path already use Claude names. Map the few remaining Cursor terms like this:

- `readonly: true` → `subagent_type: "Explore"` and tell the agent not to edit files. `readonly: false` → `general-purpose`.
- `environment: "local"`, `run_in_background: true` → omit. `cloud_base_branch: <b>` → tell the worker to check out `<b>` first. `resume` → spawn a new agent with the earlier result in its brief. `file_attachments` → list the paths in the brief.
- A role value `<model> <effort>` (e.g. `sonnet medium`) → `model` and `effort` on the Agent call. `inherit-parent` or `auto` → omit `model`.
- Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` → `~/.claude/projects/<slug>/<session>.jsonl` (slug: workspace path with `/` and `.` as `-`; newest `.jsonl` is the current session).
- `.cursor/rules/*.mdc` → the project's `CLAUDE.md` (or `AGENTS.md` when there is none).
- Cursor Automations, routines, webhooks, Bugbot setup and Cursor cloud-agent dashboards don't exist here. Write `Skipped in Claude Code: <step>. <reason>.` and continue. Bugbot comments already on a PR are ordinary review threads. A built-in PR tool step uses `gh`.
