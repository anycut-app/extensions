// Mirrors yt-dlp for AnyCut's Video Downloader, so the extension never downloads anything from a third
// party at runtime: it reads mirrors/yt-dlp.json here and fetches the program from this repo's releases.
//   - looks up yt-dlp's latest release on GitHub
//   - downloads the standalone builds AnyCut uses and checks each against yt-dlp's own SHA2-256SUMS
//   - publishes them, unmodified, as this repo's release "yt-dlp-<version>" (not marked latest)
//   - writes mirrors/yt-dlp.json: the version and, per platform, the file's URL, SHA-256 and size
//
//   node scripts/mirror-yt-dlp.mjs             in GitHub Actions (needs GH_TOKEN and GITHUB_REPOSITORY)
//   node scripts/mirror-yt-dlp.mjs --dry-run   check the latest release locally; publishes nothing
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fetchBytes, readJson, ROOT, sha256 } from './lib.mjs'

const UPSTREAM = 'yt-dlp/yt-dlp'
/** platform key (what the extension asks for) → yt-dlp's release asset */
const BUILDS = { 'win32-x64': 'yt-dlp.exe', darwin: 'yt-dlp_macos', 'linux-x64': 'yt-dlp_linux' }
const MAX = 80 * 1024 * 1024

const dry = process.argv.includes('--dry-run')
const repo = process.env.GITHUB_REPOSITORY ?? 'anycut-app/extensions'
const manifestPath = join(ROOT, 'mirrors', 'yt-dlp.json')

const res = await fetch(`https://api.github.com/repos/${UPSTREAM}/releases/latest`, {
  headers: { accept: 'application/vnd.github+json', ...(process.env.GH_TOKEN ? { authorization: `Bearer ${process.env.GH_TOKEN}` } : {}) },
})
if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${UPSTREAM}'s latest release`)
const release = await res.json()
const version = release.tag_name
const assetUrl = (name) => release.assets.find((a) => a.name === name)?.browser_download_url

const current = existsSync(manifestPath) ? readJson(manifestPath) : null
if (current?.version === version && !dry) {
  console.log(`yt-dlp ${version} is already mirrored`)
  process.exit(0)
}

// yt-dlp's own checksums: "<sha256>  <file name>" per line
const sumsUrl = assetUrl('SHA2-256SUMS')
if (!sumsUrl) throw new Error(`yt-dlp ${version} has no SHA2-256SUMS`)
const sums = new Map(
  Buffer.from(await fetchBytes(sumsUrl, 1024 * 1024))
    .toString('utf8')
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+\*?/))
    .filter(([h, n]) => /^[0-9a-f]{64}$/i.test(h ?? '') && n)
    .map(([h, n]) => [n, h.toLowerCase()]),
)

const tmp = await mkdtemp(join(tmpdir(), 'yt-dlp-'))
const tag = `yt-dlp-${version}`
const files = {}
for (const [platform, name] of Object.entries(BUILDS)) {
  const url = assetUrl(name)
  if (!url) throw new Error(`yt-dlp ${version} has no ${name}`)
  const data = await fetchBytes(url, MAX)
  const got = sha256(data)
  if (got !== sums.get(name)) throw new Error(`${name} doesn't match yt-dlp's SHA2-256SUMS (${got} vs ${sums.get(name)}); not mirrored`)
  await writeFile(join(tmp, name), data)
  files[platform] = { name, url: `https://github.com/${repo}/releases/download/${tag}/${name}`, sha256: got, size: data.length }
  console.log(`${name}: ${data.length} bytes, SHA-256 matches`)
}

if (dry) {
  console.log(`dry run: would publish ${tag} and write mirrors/yt-dlp.json`)
} else {
  const notes = [
    `Unmodified copies of [yt-dlp ${version}](https://github.com/${UPSTREAM}/releases/tag/${version}), checked against its SHA2-256SUMS. AnyCut's Video Downloader installs and updates yt-dlp from here.`,
    '',
    `yt-dlp is released under the [Unlicense](https://github.com/${UPSTREAM}/blob/master/LICENSE). Its standalone builds include Python and other components under their own licences ([THIRD_PARTY_LICENSES](https://github.com/${UPSTREAM}/blob/master/THIRD_PARTY_LICENSES.txt)).`,
  ].join('\n')
  const paths = Object.values(BUILDS).map((n) => join(tmp, n))
  try {
    execFileSync('gh', ['release', 'create', tag, ...paths, '--repo', repo, '--title', `yt-dlp ${version} (mirror)`, '--notes', notes, '--latest=false'], { stdio: 'inherit' })
  } catch {
    // a re-run: the release exists, so replace its files (the same bytes)
    execFileSync('gh', ['release', 'upload', tag, ...paths, '--repo', repo, '--clobber'], { stdio: 'inherit' })
  }
  await mkdir(join(ROOT, 'mirrors'), { recursive: true })
  await writeFile(manifestPath, JSON.stringify({ version, upstream: `https://github.com/${UPSTREAM}/releases/tag/${version}`, mirrored: new Date().toISOString(), files }, null, 2) + '\n')
  console.log(`mirrored yt-dlp ${version}`)
}
await rm(tmp, { recursive: true, force: true })
