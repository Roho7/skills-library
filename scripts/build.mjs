#!/usr/bin/env node
// Builds generated/ from the repo's single sources:
//   models.json                         -> generated/cursor/pstack-models.mdc, generated/claude/pstack-models.md
//   skills/<group>/* + adapters/claude  -> generated/claude/skills/<name> (Claude-native copy of Cursor-native groups)
// --check exits 1 when a denylisted Cursor term survives translation.
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

function buildClaudeSkills() {
  const target = join(out, "claude/skills");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  const leftovers = [];
  for (const group of adapter.groups) {
    const groupDir = join(repo, "skills", group);
    if (!existsSync(groupDir)) continue;
    for (const name of readdirSync(groupDir)) {
      const source = join(groupDir, name);
      if (!statSync(source).isDirectory()) continue;
      const dest = join(target, name);
      cpSync(source, dest, { recursive: true });
      for (const file of listFiles(dest).filter((f) => f.endsWith(".md"))) {
        const translated = translate(readFileSync(file, "utf8"));
        writeFileSync(file, translated);
        for (const term of adapter.denylist) {
          if (translated.includes(term)) leftovers.push(`${relative(out, file)}: ${term}`);
        }
      }
    }
  }
  return leftovers;
}

writeSheets();
const leftovers = buildClaudeSkills();
console.log(`built generated/: model sheets for cursor + claude, ${readdirSync(join(out, "claude/skills")).length} Claude-translated skills`);
if (leftovers.length) {
  console.log(`untranslated Cursor terms (${leftovers.length}):\n  ${leftovers.join("\n  ")}`);
  if (isCheck) process.exit(1);
}
