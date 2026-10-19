// Publishes reviewed entries, for the "Publish" workflow (on merge, hourly, or by hand):
//   - downloads each new entry's zip and checks its SHA-256 again
//   - mirrors the zip into this repo's releases, so what was reviewed can't change or disappear
//   - publishes its store-page files (package.json, README, CHANGELOG, icon, gallery) under assets/<id>/<version>/
//   - rewrites the entry: the mirror as `download`, `assets`, `size`, `published`, the permissions and
//     runsCode read from the zip, and earlier `versions` (kept in history.json)
//
//   node scripts/publish.mjs                       in GitHub Actions (needs GH_TOKEN and GITHUB_REPOSITORY)
//   node scripts/publish.mjs --local <dir> [--from index.json] [--add <extension folder>]…
//       development: writes a self-contained catalog to <dir> (zips/, assets/, index.json) for AnyCut's
//       ANYCUT_CATALOG=<dir>/index.json; --add zips an extension folder and lists it
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { zipSync } from 'fflate'
import { describe, inspectEntry, readJson, ROOT, sha256 } from './lib.mjs'

const argv = process.argv.slice(2)
const opt = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}
const adds = argv.flatMap((a, i) => (a === '--add' ? [argv[i + 1]] : []))
const local = opt('local') ? resolve(opt('local')) : null
const from = resolve(opt('from') ?? join(ROOT, 'index.json'))
const out = local ?? ROOT
const repo = process.env.GITHUB_REPOSITORY ?? 'anycut-app/extensions'
const branch = process.env.CATALOG_BRANCH ?? 'main'
const MAX_IMAGE = 5 * 1024 * 1024

const index = readJson(from)
const historyPath = join(out, 'history.json')
const history = existsSync(historyPath) ? readJson(historyPath) : existsSync(join(dirname(from), 'history.json')) ? readJson(join(dirname(from), 'history.json')) : {}

const mirrorPrefix = local ? 'zips/' : `https://github.com/${repo}/releases/download/`
const isPublished = (e) => !!e.assets && e.download.startsWith(mirrorPrefix)

/** Zip an extension folder (package.json at the root), for --add. */
function zipFolder(dir) {
  const files = {}
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (name === '.git' || name === 'node_modules' || name.endsWith('.zip')) continue
      const p = join(d, name)
      if (statSync(p).isDirectory()) walk(p)
      else files[relative(dir, p).replace(/\\/g, '/')] = new Uint8Array(readFileSync(p))
    }
  }
  walk(dir)
  return zipSync(files, { level: 9 })
}

async function mirror(entry, zip) {
  const file = `${entry.id}-${entry.version}.zip`
  if (local) {
    await mkdir(join(out, 'zips'), { recursive: true })
    await writeFile(join(out, 'zips', file), zip)
    return `zips/${file}`
  }
  const tag = `${entry.id}-v${entry.version}`
  const tmp = await mkdtemp(join(tmpdir(), 'catalog-'))
  await writeFile(join(tmp, file), zip)
  const notes = `${entry.id} ${entry.version} from ${entry.repo}, as reviewed.\n\nSHA-256: ${entry.sha256}`
  try {
    execFileSync('gh', ['release', 'create', tag, join(tmp, file), '--repo', repo, '--title', `${entry.id} ${entry.version}`, '--notes', notes], { stdio: 'inherit' })
  } catch {
    // a re-run: the release exists, so replace the asset (same bytes, same SHA-256)
    execFileSync('gh', ['release', 'upload', tag, join(tmp, file), '--repo', repo, '--clobber'], { stdio: 'inherit' })
  }
  await rm(tmp, { recursive: true, force: true })
  return `https://github.com/${repo}/releases/download/${encodeURIComponent(tag)}/${file}`
}

/** The store-page files, at their paths in the extension. */
async function publishAssets(entry, files, manifest) {
  const dir = join(out, 'assets', entry.id, entry.version)
  await rm(dir, { recursive: true, force: true })
  const wanted = new Map([
    ['package.json', 256 * 1024],
    ['README.md', 1024 * 1024],
    ['CHANGELOG.md', 1024 * 1024],
  ])
  if (typeof manifest.icon === 'string' && /\.(svg|png|jpe?g|webp)$/i.test(manifest.icon)) wanted.set(manifest.icon.replace(/^\.?\//, ''), 1024 * 1024)
  for (const g of manifest.gallery ?? []) wanted.set(String(g.path).replace(/^\.?\//, ''), MAX_IMAGE)
  for (const [path, max] of wanted) {
    const data = files.get(path)
    if (!data || data.length > max) continue
    await mkdir(dirname(join(dir, path)), { recursive: true })
    await writeFile(join(dir, path), data)
  }
  return local ? `assets/${entry.id}/${entry.version}` : `https://raw.githubusercontent.com/${repo}/${branch}/assets/${entry.id}/${entry.version}`
}

// development: list extension folders
for (const folder of adds) {
  const zip = zipFolder(resolve(folder))
  const manifest = JSON.parse(readFileSync(join(resolve(folder), 'package.json'), 'utf8'))
  const facts = describe(manifest)
  const tmp = join(await mkdtemp(join(tmpdir(), 'catalog-add-')), `${facts.id}-${facts.version}.zip`)
  await writeFile(tmp, zip)
  const entry = { id: facts.id, repo: `local/${manifest.name}`, version: facts.version, kind: facts.kind, download: tmp, sha256: sha256(zip) }
  index.extensions = [...index.extensions.filter((e) => e.id !== entry.id), entry]
}

let changed = 0
for (const entry of index.extensions) {
  if (isPublished(entry)) continue
  const { zip, files, manifest, facts, problems } = await inspectEntry(entry, { base: dirname(from) })
  if (problems.length) throw new Error(`${entry.id} ${entry.version} can't be published: ${problems.join('; ')}`)
  const download = await mirror(entry, zip)
  const assets = await publishAssets(entry, files, manifest)
  const published = new Date().toISOString()
  const earlier = (history[entry.id] ?? []).filter((v) => v.version !== entry.version)
  history[entry.id] = [{ version: entry.version, published, download, sha256: entry.sha256 }, ...earlier].slice(0, 100)
  Object.assign(entry, {
    download,
    assets,
    size: zip.length,
    published,
    runsCode: facts.runsCode,
    permissions: facts.permissions,
    versions: earlier.map(({ version, published: p }) => ({ version, published: p })),
  })
  changed++
  console.log(`published ${entry.id} ${entry.version}`)
}

if (changed || local) {
  await mkdir(out, { recursive: true })
  await writeFile(join(out, 'index.json'), JSON.stringify(index, null, 2) + '\n')
  await writeFile(historyPath, JSON.stringify(history, null, 2) + '\n')
}
console.log(changed ? `${changed} published` : 'nothing new to publish')
