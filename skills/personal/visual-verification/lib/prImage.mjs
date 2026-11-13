import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { OpError, REPO_ROOT, repo, run } from './core.mjs';

const ASSET_BRANCH = 'agent-screenshots';
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;

async function git(args, env = {}) {
  const result = await run('git', args, { cwd: REPO_ROOT, env, timeoutMs: 120_000 });
  if (result.code !== 0) throw new OpError(`git ${args[0]} failed: ${result.stderr.trim().split('\n').pop()}`, 'Check `gh auth status` and that origin points at GitHub.');
  return result.stdout.trim();
}

async function resolveRepoSlug() {
  const remote = await git(['remote', 'get-url', 'origin']);
  const match = remote.match(/github\.com[:/]([^/]+\/[^/.]+?)(?:\.git)?$/);
  if (!match) throw new OpError(`origin is not a GitHub remote: ${remote}`, 'pr-image only publishes to GitHub.');
  return match[1];
}

async function findRemoteAssetHead() {
  const result = await run('git', ['fetch', '--quiet', 'origin', `+refs/heads/${ASSET_BRANCH}:refs/remotes/origin/${ASSET_BRANCH}`], { cwd: REPO_ROOT, timeoutMs: 120_000 });
  if (result.code !== 0) return null;
  return git(['rev-parse', `refs/remotes/origin/${ASSET_BRANCH}`]);
}

async function commitImages(files, folder, parent) {
  const indexFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shot-pr-image-')), 'index');
  const env = { GIT_INDEX_FILE: indexFile };
  if (parent) await git(['read-tree', parent], env);
  for (const file of files) {
    const blob = await git(['hash-object', '-w', file]);
    await git(['update-index', '--add', '--cacheinfo', `100644,${blob},${folder}/${path.basename(file)}`], env);
  }
  const tree = await git(['write-tree'], env);
  return git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `screenshots: ${folder}`]);
}

async function publish(positional, flags) {
  if (!repo.inGit) throw new OpError('Not inside a git repository', 'Run pr-image from the repo whose PR the images belong to.');
  const files = positional.map((f) => path.resolve(f));
  if (files.length === 0) throw new OpError('No image given', 'Usage: shot pr-image shot.png [more.png] [--pr 18] [--title "Watchlist"]');
  for (const file of files) {
    if (!fs.existsSync(file)) throw new OpError(`No such file: ${file}`, 'Take one with `shot screenshot <file.png>` first.');
    if (!IMAGE_EXT.test(file)) throw new OpError(`Not an image: ${file}`, 'Publish .png, .jpg, .gif or .webp files only.');
  }

  const repo = await resolveRepoSlug();
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const folder = `${branch.replace(/[^\w.-]+/g, '-')}/${new Date().toISOString().replace(/[:.]/g, '-')}`;

  let commit;
  for (let attempt = 0; attempt < 3 && !commit; attempt++) {
    const parent = await findRemoteAssetHead();
    const candidate = await commitImages(files, folder, parent);
    const pushed = await run('git', ['push', '--quiet', 'origin', `${candidate}:refs/heads/${ASSET_BRANCH}`], { cwd: REPO_ROOT, timeoutMs: 120_000 });
    if (pushed.code === 0) commit = candidate;
  }
  if (!commit) throw new OpError(`Could not push to ${ASSET_BRANCH}`, 'Another push raced this one three times, or push access is missing. Retry, then check `gh auth status`.');

  const images = files.map((file) => {
    const name = path.basename(file);
    return { file, url: `https://github.com/${repo}/blob/${commit}/${folder}/${name}?raw=true`, markdown: `![${flags.title ?? name}](https://github.com/${repo}/blob/${commit}/${folder}/${name}?raw=true)` };
  });
  const markdown = images.map((i) => i.markdown).join('\n\n');

  let comment = null;
  if (flags.pr) {
    const body = `${flags.title ? `### ${flags.title}\n\n` : ''}${markdown}`;
    const posted = await run('gh', ['pr', 'comment', String(flags.pr), '--body', body], { cwd: REPO_ROOT, timeoutMs: 60_000 });
    if (posted.code !== 0) throw new OpError(`gh pr comment failed: ${posted.stderr.trim()}`, 'Images are pushed; paste `markdown` into the PR body by hand.');
    comment = posted.stdout.trim();
  }

  return { branch: ASSET_BRANCH, commit, images, markdown, comment, next: flags.pr ? 'Done.' : 'Paste `markdown` into the PR body (gh pr create/edit --body-file), or rerun with --pr <number>.' };
}

export const commands = {
  'pr-image': {
    summary: 'Push screenshots to the agent-screenshots branch and print PR-ready markdown',
    usage: `
shot pr-image <file.png> [more.png …] [--pr <number>] [--title "Watchlist, desktop"]

gh cannot attach images, so this commits the files to the orphan branch \`${ASSET_BRANCH}\`
on origin (git plumbing only: your checkout, index and branch are untouched) under
<current-branch>/<timestamp>/, and prints markdown with commit-pinned github.com URLs.
They render for anyone who can read the repo. --pr also posts them as a PR comment.

Mask customer PII first: the branch keeps history.`,
    run: publish,
  },
};
