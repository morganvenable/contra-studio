#!/usr/bin/env node
// Ship the working tree to the live site in one step: stage the real changes
// (not line-ending noise in regenerated dances), commit, open a pull request,
// squash-merge it, and wait for the Pages deploy (about two minutes; the
// slow motion suite keeps running in CI after that).
//
//   node scripts/ship.mjs "Short title" ["Longer description"]
//
// Run `npm run check` first.
import { execSync } from 'node:child_process';

const [title, body = ''] = process.argv.slice(2);
if (!title) {
  console.error('usage: node scripts/ship.mjs "Short title" ["Longer description"]');
  process.exit(2);
}
const REPO = 'morganvenable/contra-studio';
const ATTRIBUTION = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';
const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts }).trim();
const git = (args) => sh(`git -c safe.directory=* ${args}`);
const quote = (s) => `"${s.replace(/(["\\$`])/g, '\\$1')}"`;

// Branch from the current work, named after the title.
const branch = `ship/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}-${Date.now().toString(36).slice(-4)}`;
git(`checkout -q -b ${branch}`);

// Real changes only: tracked files that differ beyond whitespace, and new files.
const tracked = git('-c core.autocrlf=true diff --ignore-all-space --name-only').split('\n').filter(Boolean);
const added = git('ls-files --others --exclude-standard').split('\n').filter(Boolean).filter((f) => !f.startsWith('feedback-inbox/'));
const files = [...new Set([...tracked, ...added])];
if (!files.length && !git('diff --cached --name-only')) {
  console.error('Nothing to ship.');
  process.exit(1);
}
for (let i = 0; i < files.length; i += 100) git(`add -- ${files.slice(i, i + 100).map(quote).join(' ')}`);
// Drop what is left (line endings rewritten by the library rebuild).
try { git('checkout -- public docs'); } catch { /* Nothing to drop. */ }
const message = `${title}\n\n${body ? `${body}\n\n` : ''}${ATTRIBUTION}\n${process.env.CLAUDE_SESSION ? `Claude-Session: ${process.env.CLAUDE_SESSION}\n` : ''}`;
sh(`git -c safe.directory=* commit -q -F -`, { input: message });
console.log(`committed ${files.length} files on ${branch}`);

git(`push -q -u origin ${branch}`);
const prBody = `${body || title}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)${process.env.CLAUDE_SESSION ? `\n\n${process.env.CLAUDE_SESSION}` : ''}`;
const url = sh(`gh pr create --repo ${REPO} --head ${branch} --title ${quote(title)} --body-file -`, { input: prBody });
sh(`gh pr merge --repo ${REPO} ${branch} --squash --delete-branch`);
const sha = sh(`gh pr view --repo ${REPO} ${branch} --json mergeCommit -q .mergeCommit.oid`);
console.log(`merged ${url} (${sha.slice(0, 8)})`);

// Wait for this commit's deploy job only.
const started = Date.now();
for (;;) {
  if (Date.now() - started > 15 * 60_000) {
    console.log('deploy not finished after 15 minutes; check the Actions tab');
    process.exit(1);
  }
  const runId = sh(`gh run list --repo ${REPO} --workflow pages.yml --branch main --commit ${sha} --limit 1 --json databaseId -q ".[0].databaseId"`);
  if (runId) {
    const jobs = JSON.parse(sh(`gh run view ${runId} --repo ${REPO} --json jobs`)).jobs;
    const deploy = jobs.find((j) => j.name === 'deploy');
    if (deploy?.status === 'completed') {
      console.log(deploy.conclusion === 'success'
        ? `live: https://morganvenable.github.io/contra-studio/ (${((Date.now() - started) / 1000).toFixed(0)}s after merge; motion tests still running: https://github.com/${REPO}/actions/runs/${runId})`
        : `deploy ${deploy.conclusion}: https://github.com/${REPO}/actions/runs/${runId}`);
      process.exit(deploy.conclusion === 'success' ? 0 : 1);
    }
    const failed = jobs.find((j) => j.name === 'verify' && j.conclusion === 'failure');
    if (failed) {
      console.log(`build failed, not published: https://github.com/${REPO}/actions/runs/${runId}`);
      process.exit(1);
    }
  }
  await new Promise((r) => setTimeout(r, 15_000));
}
