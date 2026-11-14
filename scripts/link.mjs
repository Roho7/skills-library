#!/usr/bin/env node
// Points every live agent folder at this library, so agents edit the library directly.
//   skills/<group>/<name>/        -> ~/.agents/skills/<name> (Cursor reads it through ~/.cursor/skills) and ~/.claude/skills/<name>
//   agents/<group>/<name>.md      -> ~/.claude/agents/<name>.md, ~/.cursor/agents/<name>.md
//   generated/<tool>/rohostack-*  -> ~/.claude/rules, ~/.cursor/rules (run scripts/build.mjs first)
// Idempotent. A real file or folder already in place is replaced only when its content matches the library copy;
// otherwise it is left alone and reported. --prune also deletes dangling symlinks in those folders.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, statSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = homedir();
const prune = process.argv.includes("--prune");
const live = { skills: join(home, ".agents/skills"), claudeSkills: join(home, ".claude/skills") };

const dirsIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((e) => statSync(join(dir, e)).isDirectory()) : []);

function desiredLinks() {
  const links = [];
  for (const group of dirsIn(join(repo, "skills"))) {
    for (const name of dirsIn(join(repo, "skills", group))) {
      const source = join(repo, "skills", group, name);
      if (!existsSync(join(source, "SKILL.md"))) continue;
      links.push({ path: join(live.skills, name), target: source });
      links.push({ path: join(live.claudeSkills, name), target: join(live.skills, name) });
    }
  }
  for (const group of dirsIn(join(repo, "agents"))) {
    for (const file of readdirSync(join(repo, "agents", group)).filter((f) => f.endsWith(".md"))) {
      for (const tool of [".claude", ".cursor"]) links.push({ path: join(home, tool, "agents", file), target: join(repo, "agents", group, file) });
    }
  }
  for (const [tool, folder] of [["claude", ".claude/rules"], ["cursor", ".cursor/rules"]]) {
    const dir = join(repo, "generated", tool);
    for (const file of readdirSync(dir).filter((f) => f.startsWith("rohostack-"))) links.push({ path: join(home, folder, file), target: join(dir, file) });
  }
  return links;
}

function sameContent(a, b) {
  try {
    execFileSync("diff", ["-rq", "-x", "node_modules", "-x", ".DS_Store", a, b], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const report = { linked: [], unchanged: 0, relinked: [], kept: [], pruned: [] };
const names = new Map();
for (const { path, target } of desiredLinks()) {
  if (path.startsWith(live.skills + "/")) {
    const name = path.slice(live.skills.length + 1);
    if (names.has(name)) throw new Error(`skill name "${name}" is in two groups: ${names.get(name)} and ${target}`);
    names.set(name, target);
  }
  mkdirSync(dirname(path), { recursive: true });
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink()) {
    if (readlinkSync(path) === target) {
      report.unchanged++;
      continue;
    }
    rmSync(path);
    report.relinked.push(path);
  } else if (stat) {
    if (!sameContent(path, target)) {
      report.kept.push(`${path} differs from ${target}`);
      continue;
    }
    rmSync(path, { recursive: true });
    report.relinked.push(path);
  } else {
    report.linked.push(path);
  }
  symlinkSync(target, path);
}

if (prune) {
  for (const dir of [live.skills, live.claudeSkills, join(home, ".claude/agents"), join(home, ".cursor/agents"), join(home, ".claude/rules"), join(home, ".cursor/rules")]) {
    for (const entry of existsSync(dir) ? readdirSync(dir) : []) {
      const path = join(dir, entry);
      if (lstatSync(path).isSymbolicLink() && !existsSync(path)) {
        rmSync(path);
        report.pruned.push(path);
      }
    }
  }
}

console.log(JSON.stringify({ ...report, unchanged: report.unchanged }, null, 2));
if (report.kept.length) process.exitCode = 1;
