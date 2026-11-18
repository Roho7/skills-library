#!/usr/bin/env node
// Writes skills.json: one entry per skill and agent, for orchestrators that route work
// without loading every SKILL.md.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(join(repo, "vendor.lock.json"), "utf8")).skills;

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fields = {};
  const lines = match[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let [, key, value] = kv;
    if (value === ">" || value === "|" || value === ">-" || value === "|-") {
      const block = [];
      while (i + 1 < lines.length && /^\s+\S|^\s*$/.test(lines[i + 1])) block.push(lines[++i].trim());
      value = block.filter(Boolean).join(" ");
    }
    fields[key] = value.replace(/^["'](.*)["']$/, "$1");
  }
  return fields;
}

function groups(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => {
    const full = join(dir, name);
    if (!existsSync(full)) {
      console.error(`skipping broken symlink ${full}`);
      return false;
    }
    return statSync(full).isDirectory();
  });
}

const entries = [];
for (const group of groups(join(repo, "skills"))) {
  for (const name of groups(join(repo, "skills", group))) {
    const path = `skills/${group}/${name}`;
    const fm = frontmatter(readFileSync(join(repo, path, "SKILL.md"), "utf8"));
    entries.push({
      kind: "skill",
      name,
      group,
      description: fm.description ?? "",
      modelInvocable: fm["disable-model-invocation"] !== "true",
      source: lock[name]?.source ?? "local",
      path,
    });
  }
}
for (const group of groups(join(repo, "agents"))) {
  for (const file of readdirSync(join(repo, "agents", group)).filter((f) => f.endsWith(".md"))) {
    const name = file.replace(/\.md$/, "");
    const path = `agents/${group}/${file}`;
    const fm = frontmatter(readFileSync(join(repo, path), "utf8"));
    entries.push({ kind: "agent", name, group, description: fm.description ?? "", source: lock[name]?.source ?? "local", path });
  }
}

entries.sort((a, b) => a.kind.localeCompare(b.kind) || a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
writeFileSync(join(repo, "skills.json"), JSON.stringify(entries, null, 2) + "\n");
console.log(`indexed ${entries.length} entries into skills.json`);
