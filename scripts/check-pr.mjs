// Checks a pull request's changes to index.json, for the "Check" workflow.
//
//   node scripts/check-pr.mjs --base <git ref | file> [--head index.json] [--work work] [--report report.md] [--local]
//
// --local (development) allows downloads that aren't GitHub release assets (files next to a local index).
//
// For every new or changed entry: downloads the zip, checks its SHA-256, unpacks it, validates package.json,
// works out whether it runs code and what it may do, and for an update compares it with the version
// before it (permissions, code, every file that changed, with a diff). Then it decides:
//   needs-review   a first version, more permissions, code where there was none, a new repo, or a
//                  blocklist/removal change: a person reviews it, and installed users re-consent
//   auto-merge-ok  an update that adds neither permissions nor code
// Exits 1 when an entry is wrong (bad SHA-256, invalid manifest, fields that don't match the zip).
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { inspectEntry, readJson, ROOT } from './lib.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const headPath = resolve(args.head ?? join(ROOT, 'index.json'))
const work = resolve(args.work ?? join(ROOT, 'work'))
const reportPath = resolve(args.report ?? join(ROOT, 'report.md'))
const localMode = process.argv.includes('--local')
// relative downloads resolve against their own index
const headDir = dirname(headPath)
const baseDir = args.base && existsSync(args.base) ? dirname(resolve(args.base)) : ROOT

function baseIndex(ref) {
  if (!ref) return { version: 1, extensions: [], blocklist: [] }
  if (existsSync(ref)) return readJson(ref)
  try {
    return JSON.parse(execFileSync('git', ['show', `${ref}:index.json`], { cwd: ROOT, encoding: 'utf8' }))
  } catch {
    return { version: 1, extensions: [], blocklist: [] }
  }
}

const parts = (v) => v.split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0)
function compareVersions(a, b) {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1
  return 0
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const releaseOf = (repo) => `https://github.com/${repo}/releases/download/`

/** A diff of two unpacked versions (git diff --no-index, run beside them for short paths), trimmed for the report; the full one goes to work/. */
function diffDirs(a, b, out) {
  let text = ''
  try {
    text = execFileSync('git', ['diff', '--no-index', '--no-color', '--stat=120', '--patch', '--', basename(a), basename(b)], { cwd: dirname(a), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (e) {
    // exit code 1 just means "there are differences"
    text = e.stdout?.toString() ?? ''
  }
  writeFileSync(out, text)
  const lines = text.split('\n')
  return lines.length > 400 ? `${lines.slice(0, 400).join('\n')}\n… ${lines.length - 400} more lines in the workflow's artifact` : text
}

const base = baseIndex(args.base)
const head = readJson(headPath)
const report = ['## Catalog check', '']
const errors = []
const review = []

// the index itself
const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
const validIndex = ajv.compile(readJson(join(ROOT, 'schema', 'catalog.schema.json')))
if (!validIndex(head)) errors.push(`index.json doesn't match schema/catalog.schema.json: ${validIndex.errors.slice(0, 5).map((e) => `${e.instancePath} ${e.message}`).join('; ')}`)
const ids = head.extensions?.map((e) => e.id) ?? []
for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) errors.push(`${id} is listed twice`)
if (!same(base.blocklist, head.blocklist)) review.push('the blocklist changed (maintainers only)')
for (const old of base.extensions ?? []) if (!ids.includes(old.id)) review.push(`${old.id} was removed`)

mkdirSync(work, { recursive: true })
for (const entry of head.extensions ?? []) {
  const prev = base.extensions?.find((e) => e.id === entry.id)
  if (prev && same(prev, entry)) continue
  const lines = [`### ${entry.id} ${entry.version}${prev ? ` (update from ${prev.version})` : ' (new)'}`, '']
  try {
    // a new version comes from the author's own GitHub release; publishing mirrors it here
    if (!localMode && !entry.download.startsWith(releaseOf(entry.repo)) && !(prev && entry.download === prev.download)) {
      errors.push(`${entry.id}: download must be a release asset of ${entry.repo} (${releaseOf(entry.repo)}…)`)
    }
    const now = await inspectEntry(entry, { work, base: headDir })
    for (const p of now.problems) errors.push(`${entry.id}: ${p}`)
    lines.push(`- SHA-256 matches: \`${entry.sha256}\``, `- ${now.facts.kind}${now.facts.runsCode ? ', **runs code** (`main`)' : ', no code'}`, `- permissions: ${now.facts.permissions.map((p) => `\`${p}\``).join(', ') || 'none'}`)
    if (!prev) {
      review.push(`${entry.id}: a first version is always reviewed by a person`)
    } else {
      if (compareVersions(entry.version, prev.version) <= 0) errors.push(`${entry.id}: version ${entry.version} is not newer than ${prev.version}`)
      if (entry.repo !== prev.repo) review.push(`${entry.id}: the repo changed from ${prev.repo} to ${entry.repo}`)
      const old = await inspectEntry(prev, { work, base: baseDir }).catch((e) => {
        lines.push(`- (couldn't read the previous version: ${e.message})`)
        return null
      })
      if (old) {
        const added = now.facts.permissions.filter((p) => !old.facts.permissions.includes(p))
        const removed = old.facts.permissions.filter((p) => !now.facts.permissions.includes(p))
        if (added.length) review.push(`${entry.id}: asks for more: ${added.join(', ')}`)
        if (now.facts.runsCode && !old.facts.runsCode) review.push(`${entry.id}: now runs code`)
        if (added.length || removed.length) lines.push(`- permissions: ${added.map((p) => `+${p}`).concat(removed.map((p) => `-${p}`)).join(' ')}`)
        const changed = [...now.files.keys()].filter((p) => !old.files.has(p) || Buffer.compare(Buffer.from(old.files.get(p)), Buffer.from(now.files.get(p))) !== 0)
        const gone = [...old.files.keys()].filter((p) => !now.files.has(p))
        lines.push(`- files: ${changed.length} added or changed, ${gone.length} removed`)
        const diff = diffDirs(old.dir, now.dir, join(work, `${entry.id}-${prev.version}-${entry.version}.diff`))
        if (diff.trim()) lines.push('', '<details><summary>Diff</summary>', '', '```diff', diff, '```', '</details>')
      }
    }
  } catch (e) {
    errors.push(`${entry.id}: ${e.message}`)
  }
  report.push(...lines, '')
}

const label = review.length ? 'needs-review' : 'auto-merge-ok'
report.splice(2, 0, errors.length ? `**Failed.**\n\n${errors.map((e) => `- ${e}`).join('\n')}\n` : `**Result: \`${label}\`**${review.length ? `\n\n${review.map((r) => `- ${r}`).join('\n')}` : ' — an update with no new permissions and no new code'}\n`)
const md = report.join('\n')
writeFileSync(reportPath, md)
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `label=${label}\nfailed=${errors.length ? 'true' : 'false'}\n`)
console.log(md)
process.exit(errors.length ? 1 : 0)
