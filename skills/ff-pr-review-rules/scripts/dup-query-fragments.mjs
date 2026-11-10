import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("find src -name '*.repository.ts'", {encoding:'utf8'}).trim().split('\n');
const CALL = /\b(getByQuery|getManyByQuery|updateByQuery|updateManyByQuery|upsertByQuery|deleteMany|count|exists|find|findOne|countDocuments|updateMany|updateOne|deleteOne|aggregate)\s*\(\s*\{/g;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const lineAt = (i) => src.slice(0,i).split('\n').length;
  const frags = new Map();
  let m; CALL.lastIndex = 0;
  while ((m = CALL.exec(src))) {
    const start = m.index + m[0].length - 1;
    let d = 0, i = start;
    for (; i < src.length; i++) { if ('{[('.includes(src[i])) d++; else if ('}])'.includes(src[i])) { d--; if (!d) { i++; break; } } }
    const body = src.slice(start+1, i-1);
    // split top-level commas
    let depth = 0, cur = '', parts = [];
    for (const ch of body) {
      if ('{[('.includes(ch)) depth++;
      if ('}])'.includes(ch)) depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur=''; } else cur += ch;
    }
    parts.push(cur);
    for (const p of parts) {
      const n = p.replace(/\s+/g,'');
      if (n.length < 8 || !n.includes(':')) continue;
      if (!frags.has(n)) frags.set(n, []);
      frags.get(n).push(lineAt(m.index));
    }
  }
  const dups = [...frags.entries()].filter(([,v])=>v.length>=3).sort((a,b)=>b[1].length-a[1].length);
  if (dups.length) {
    console.log(`\n== ${file}`);
    for (const [f, lines] of dups) console.log(`   ${lines.length}x  ${f}   lines: ${lines.join(', ')}`);
  }
}
