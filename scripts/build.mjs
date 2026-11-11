#!/usr/bin/env node
// Builds generated/ from the repo's single sources:
//   models.json                         -> generated/cursor/pstack-models.mdc, generated/claude/pstack-models.md
//   skills/<group>/* + overrides/<group>/* -> generated/<tool>/skills/<name>, upstream default slugs mapped to models.json tiers
//   adapters/claude                     -> Claude-native text in generated/claude/skills
// --check exits 1 when an upstream default slug or a denylisted Cursor term survives.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(repo, "generated");
const isCheck = process.argv.includes("--check");

const models = JSON.parse(readFileSync(join(repo, "models.json"), "utf8"));
const adapter = JSON.parse(readFileSync(join(repo, "adapters/claude/substitutions.json"), "utf8"));

function buildSheetLines(runtime) {
  return Object.entries(models.roles).map(([role, tiers]) => {
    const values = tiers.map((tier) => {
      const value = models.tiers[tier]?.[runtime];
      if (!value) throw new Error(`models.json: tier "${tier}" has no ${runtime} model (role "${role}")`);
      return value;
    });
    return `${role}: ${values.join(", ")}`;
  });
}

const sheetHeader = [
  "# pstack model configuration, generated from models.json in the skills repo. Edit models.json, run scripts/build.mjs and copy this sheet into place; edits here are overwritten.",
  "# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the subagent `model`).",
  `# budget: ${models.budget}`,
];

function writeSheets() {
  mkdirSync(join(out, "cursor"), { recursive: true });
  mkdirSync(join(out, "claude"), { recursive: true });
  const cursorFrontmatter = ["---", "description: pstack per-role model choices (overrides skill defaults)", "alwaysApply: true", "---"];
  writeFileSync(join(out, "cursor/pstack-models.mdc"), [...cursorFrontmatter, ...sheetHeader, ...buildSheetLines("cursor"), ""].join("\n"));
  writeFileSync(join(out, "claude/pstack-models.md"), [...sheetHeader, ...buildSheetLines("claude"), ""].join("\n"));
  cpSync(join(repo, "adapters/claude/pstack-runtime.md"), join(out, "claude/pstack-runtime.md"));
}

function mapUpstreamDefaults(text, runtime) {
  let mapped = text;
  for (const [slug, tier] of Object.entries(models.upstreamDefaults)) {
    mapped = mapped.split(slug).join(models.tiers[tier][runtime]);
  }
  return mapped;
}

function translate(text) {
  let translated = text;
  for (const rule of adapter.substitutions) {
    translated = rule.literal !== undefined
      ? translated.split(rule.literal).join(rule.replacement)
      : translated.replace(new RegExp(rule.regex, "g"), rule.replacement);
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
  const denylist = [...Object.keys(models.upstreamDefaults), ...(runtime === "claude" ? adapter.denylist : [])];
  const leftovers = [];
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
        let text = mapUpstreamDefaults(readFileSync(file, "utf8"), runtime);
        if (runtime === "claude") text = translate(text);
        writeFileSync(file, text);
        for (const term of denylist) {
          if (text.includes(term)) leftovers.push(`${relative(out, file)}: ${term}`);
        }
      }
    }
  }
  return leftovers;
}

writeSheets();
const leftovers = ["cursor", "claude"].flatMap(buildSkills);
console.log(`built generated/: model sheets and ${readdirSync(join(out, "claude/skills")).length} pstack skills for cursor + claude`);
if (models.TODO) console.log(`TODO in models.json: ${models.TODO}`);
if (leftovers.length) {
  console.log(`untranslated upstream terms (${leftovers.length}):\n  ${leftovers.join("\n  ")}`);
  if (isCheck) process.exit(1);
}
