#!/usr/bin/env node
// Builds generated/ from the repo's single sources:
//   models.json                 -> generated/cursor/rohostack-models.mdc, generated/claude/rohostack-models.md
//   rules/rohostack-defaults.md -> generated/cursor/rohostack-defaults.mdc, generated/claude/rohostack-defaults.md (no frontmatter)
//   adapters/claude/rohostack-runtime.md -> generated/claude/rohostack-runtime.md
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(repo, "generated");

const models = JSON.parse(readFileSync(join(repo, "models.json"), "utf8"));

function tierModel(tier, runtime) {
  const value = models.tiers[tier]?.[runtime];
  if (!value) throw new Error(`models.json: tier "${tier}" has no ${runtime} model`);
  return [value].flat().join(", ");
}

function buildSheetLines(runtime) {
  return Object.entries(models.roles).map(([role, tier]) => `${role}: ${tierModel(tier, runtime)}`);
}

const runtimeRules = {
  claude: {
    parent: "# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the subagent `model`).",
    judges: "# Judges and panels use only the parent's own model family. The arena cross-judge is a different model from the parent when the pool has one.",
  },
  cursor: {
    judges: "# Every role, panel seat and judge runs on the model its line names, whatever the parent model is. Judges run on the same model as the runners, so there is no second model family to look for.",
  },
};

function buildSheet(runtime) {
  const { parent, judges } = runtimeRules[runtime];
  return [
    "# rohostack model configuration, generated from models.json in the skills repo. Edit models.json, run scripts/build.mjs and copy this sheet into place; edits here are overwritten.",
    ...(parent ? [parent] : []),
    `# effort: ${models.effort} for every rohostack subagent on every tool. It overrides any skill instruction or budget that raises or lowers effort. Change it only when Rohosen asks, directly or through his conductor bot, or sets it himself.`,
    judges,
    ...buildSheetLines(runtime),
    "",
  ];
}

function writeSheets() {
  mkdirSync(join(out, "cursor"), { recursive: true });
  mkdirSync(join(out, "claude"), { recursive: true });
  const cursorFrontmatter = ["---", "description: rohostack per-role model choices (overrides skill defaults)", "alwaysApply: true", "---"];
  writeFileSync(join(out, "cursor/rohostack-models.mdc"), [...cursorFrontmatter, ...buildSheet("cursor")].join("\n"));
  writeFileSync(join(out, "claude/rohostack-models.md"), buildSheet("claude").join("\n"));
  cpSync(join(repo, "adapters/claude/rohostack-runtime.md"), join(out, "claude/rohostack-runtime.md"));
  const defaults = readFileSync(join(repo, "rules/rohostack-defaults.md"), "utf8");
  writeFileSync(join(out, "cursor/rohostack-defaults.mdc"), defaults);
  writeFileSync(join(out, "claude/rohostack-defaults.md"), defaults.replace(/^---\n[\s\S]*?\n---\n\n?/, ""));
}

writeSheets();
console.log("built generated/: model sheets, defaults and runtime rules for cursor + claude");
