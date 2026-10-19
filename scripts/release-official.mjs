// Releases one of AnyCut's own extensions (publisher "anycut") into this repo, the way any author
// releases theirs: a GitHub release holding the zip, then a pull request adding its entry to index.json,
// which goes through the same checks. AnyCut's source repo is private, so its extensions' zips live here.
//
//   node scripts/release-official.mjs <extension folder> [--pr] [--dry-run]
//     --pr       also open the pull request (a branch off origin/main with the entry)
//     --dry-run  check and zip it, print the entry, release nothing
// Needs the GitHub CLI signed in to an account that can write to this repo (GH_TOKEN works too).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, manifestProblems, ROOT, sha256, zipFolder, zipFiles } from './lib.mjs'

const REPO = 'anycut-app/extensions'
const args = process.argv.slice(2)
const folder = args.find((a) => !a.startsWith('--'))
if (!folder) throw new Error('usage: node scripts/release-official.mjs <extension folder> [--pr] [--dry-run]')
const dry = args.includes('--dry-run')
const pr = args.includes('--pr')
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim()
const gh = (...a) => execFileSync('gh', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()

const dir = resolve(folder)
const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
const facts = describe(manifest)
if (!facts.id.startsWith('anycut.')) throw new Error(`${facts.id} isn't one of AnyCut's own (publisher "anycut"); other authors release from their own repo`)
const problems = manifestProblems(manifest)
const zip = zipFolder(dir)
const files = zipFiles(zip)
if (manifest.cover && !files.has(manifest.cover.replace(/^\.?\//, ''))) problems.push(`the cover ${manifest.cover} is missing`)
if (problems.length) throw new Error(`${facts.id} ${facts.version} isn't ready: ${problems.join('; ')}`)

const tag = `${facts.id}-v${facts.version}`
const file = `${facts.id}-${facts.version}.zip`
const entry = {
  id: facts.id,
  repo: REPO,
  version: facts.version,
  kind: facts.kind,
  download: `https://github.com/${REPO}/releases/download/${tag}/${file}`,
  sha256: sha256(zip),
}
console.log(JSON.stringify(entry, null, 2))
if (dry) process.exit(0)

// the release (the same tag and file name the Publish workflow mirrors to, so it finds them in place)
const tmp = await mkdtemp(join(tmpdir(), 'release-'))
await writeFile(join(tmp, file), zip)
gh('release', 'create', tag, join(tmp, file), '--repo', REPO, '--title', `${manifest.displayName} ${facts.version}`, '--notes', `${manifest.displayName} ${facts.version}, by AnyCut.\n\nSHA-256: \`${entry.sha256}\``, '--latest=false')
await rm(tmp, { recursive: true, force: true })
console.log(`released ${tag}`)

if (pr) {
  const branch = `release/${facts.id}-${facts.version}`
  const start = git('rev-parse', '--abbrev-ref', 'HEAD')
  git('fetch', 'origin', 'main')
  git('checkout', '-b', branch, 'origin/main')
  try {
    const indexPath = join(ROOT, 'index.json')
    const index = JSON.parse(readFileSync(indexPath, 'utf8'))
    index.extensions = [...index.extensions.filter((e) => e.id !== entry.id), entry].sort((a, b) => a.id.localeCompare(b.id))
    writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n')
    git('add', 'index.json')
    git('commit', '-m', `${manifest.displayName} ${facts.version}`)
    git('push', '-u', 'origin', branch)
    const url = gh('pr', 'create', '--repo', REPO, '--base', 'main', '--head', branch, '--title', `${manifest.displayName} ${facts.version}`, '--body', `AnyCut's own extension, released with \`scripts/release-official.mjs\`.\n\n\`\`\`json\n${JSON.stringify(entry, null, 2)}\n\`\`\``)
    console.log(url)
  } finally {
    git('checkout', start)
  }
}
