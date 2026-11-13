#!/usr/bin/env node
import { OpError, parseFlags } from './lib/core.mjs';
import { commands as browser } from './lib/browser.mjs';
import { commands as doctor } from './lib/doctor.mjs';
import { commands as prImage } from './lib/prImage.mjs';
import { commands as record } from './lib/record.mjs';

const registry = { ...doctor, ...browser, ...record, ...prImage };

const OVERVIEW = `shot — drive a browser, take legible screenshots, record GIF demos, put them in a PR. Every command prints one JSON object on stdout and exits non-zero on failure.

Usage: shot <command> [args] [--flags]
       shot <command> --help     detailed usage for one command

Config: defaults <- <repo>/.shot.json <- SHOT_BASE_URL / SHOT_CDP_PORT / SHOT_PROFILE. State lives in <git dir>/shot.

Commands:
${Object.entries(registry)
  .map(([name, c]) => `  ${name.padEnd(22)}${c.summary}`)
  .join('\n')}
`;

function resolve(argv) {
  for (const len of [2, 1]) {
    const name = argv.slice(0, len).join(' ');
    if (registry[name]) return { name, rest: argv.slice(len) };
  }
  return null;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === 'help') {
    process.stdout.write(OVERVIEW);
    return;
  }
  const hit = resolve(argv);
  if (!hit) {
    const group = Object.keys(registry).filter((n) => n.startsWith(`${argv[0]} `));
    throw new OpError(
      `Unknown command "${argv.slice(0, 2).join(' ')}"`,
      group.length ? `Did you mean one of: ${group.join(', ')}?` : 'Run `shot --help` for the command list.'
    );
  }
  const cmd = registry[hit.name];
  const { flags, positional } = parseFlags(hit.rest, ['help', ...(cmd.booleans ?? [])]);
  if (flags.help) {
    process.stdout.write(`shot ${hit.name} — ${cmd.summary}\n\n${cmd.usage.trim()}\n`);
    return;
  }
  const result = await cmd.run(positional, flags);
  const ok = result.ok !== false;
  process.stdout.write(`${JSON.stringify({ ok, command: hit.name, ...result }, null, 2)}\n`);
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((err) => {
    const body = err instanceof OpError ? { error: err.message, hint: err.hint } : { error: err.message, stack: err.stack?.split('\n').slice(1, 4) };
    process.stdout.write(`${JSON.stringify({ ok: false, ...body }, null, 2)}\n`);
    process.exitCode = 1;
  })
  .finally(() => process.stdout.write('', () => process.exit()));
