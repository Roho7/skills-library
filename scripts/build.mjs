#!/usr/bin/env node
// Builds generated/ from the repo's single sources:
//   models.json                         -> generated/cursor/rohostack-models.mdc, generated/claude/rohostack-models.md
//   rules/rohostack-defaults.md         -> generated/cursor/rohostack-defaults.mdc, generated/claude/rohostack-defaults.md (no frontmatter)
//   skills/<group>/* + overrides/<group>/* -> generated/<tool>/skills/<name>, upstream default slugs mapped to models.json tiers
//   adapters/common, adapters/claude    -> rewrites in both copies, then Claude-native text in generated/claude/skills
// --check exits 1 when an upstream default slug or a denylisted term survives, or an adapters/common rule no longer matches.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(repo, "generated");
const isCheck = process.argv.includes("--check");

const models = JSON.parse(readFileSync(join(repo, "models.json"), "utf8"));
const adapter = JSON.parse(readFileSync(join(repo, "adapters/claude/substitutions.json"), "utf8"));
const common = JSON.parse(readFileSync(join(repo, "adapters/common/substitutions.json"), "utf8"));

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

function mapUpstreamDefaults(text, runtime) {
  let mapped = text;
  for (const [slug, tier] of Object.entries(models.upstreamDefaults)) {
    mapped = mapped.split(slug).join(tierModel(tier, runtime));
  }
  return mapped;
}

function translate(text, rules, hits) {
  let translated = text;
  for (const rule of rules) {
    const pattern = rule.literal !== undefined ? rule.literal : new RegExp(rule.regex, "g");
    const next = translated.replaceAll(pattern, rule.replacement);
    if (next !== translated) hits?.add(rule);
    translated = next;
  }
  return translated;
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function buildSkills(runtime) {
  const target = join(out, runtime, "skills");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  const denylist = [...Object.keys(models.upstreamDefaults), ...common.denylist, ...(runtime === "claude" ? adapter.denylist : [])];
  const leftovers = [];
  const hits = new Set();
  const commonRules = common.substitutions
    .map((rule) => ({ ...rule, replacement: rule.replacement[runtime] ?? rule.replacement }))
    .filter((rule) => typeof rule.replacement === "string");
  for (const group of adapter.groups) {
    const groupDir = join(repo, "skills", group);
    if (!existsSync(groupDir)) continue;
    for (const name of readdirSync(groupDir)) {
      const source = join(groupDir, name);
      if (!statSync(source).isDirectory()) continue;
      const dest = join(target, name);
      cpSync(source, dest, { recursive: true });
      const override = join(repo, "overrides", group, name);
      if (existsSync(override)) cpSync(override, dest, { recursive: true });
      for (const file of listFiles(dest).filter((f) => f.endsWith(".md"))) {
        let text = mapUpstreamDefaults(translate(readFileSync(file, "utf8"), commonRules, hits), runtime);
        if (runtime === "claude") text = translate(text, adapter.substitutions);
        writeFileSync(file, text);
        for (const term of denylist) {
          if (text.includes(term)) leftovers.push(`${relative(out, file)}: ${term}`);
        }
      }
    }
  }
  for (const rule of commonRules) {
    if (!hits.has(rule)) leftovers.push(`${runtime}: adapters/common rule no longer matches: ${rule.literal ?? rule.regex}`);
  }
  return leftovers;
}

writeSheets();
const leftovers = ["cursor", "claude"].flatMap(buildSkills);
console.log(`built generated/: model sheets and ${readdirSync(join(out, "claude/skills")).length} rohostack skills for cursor + claude`);
if (leftovers.length) {
  console.log(`untranslated upstream terms (${leftovers.length}):\n  ${leftovers.join("\n  ")}`);
  if (isCheck) process.exit(1);
}
