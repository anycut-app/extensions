// Shared by the catalog's checks (check-pr.mjs) and publishing (publish.mjs). Plain Node 22 + fflate.
// Zips are only downloaded, hashed, unpacked into a work folder and read: nothing in them is ever run.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { unzipSync } from 'fflate'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}\.[a-z0-9][a-z0-9-]{0,39}$/
export const MAX_ZIP = 200 * 1024 * 1024
export const LIMITS = { files: 5000, bytes: 300 * 1024 * 1024 }
/** What a content pack may contain; anything with code, tabs, views or tools is a tool. */
export const PACK_KINDS = ['effects', 'fonts', 'looks', 'captionStyles', 'skills']

export const sha256 = (data) => createHash('sha256').update(data).digest('hex')

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** A file from disk (a local catalog) or an https download, refusing anything over `max` bytes. */
export async function fetchBytes(ref, max = MAX_ZIP, base = ROOT) {
  if (!/^https:\/\//i.test(ref)) {
    const path = ref.startsWith('file:') ? fileURLToPath(ref) : resolve(base, ref)
    const data = await readFile(path)
    if (data.length > max) throw new Error(`${ref} is larger than ${Math.round(max / 1048576)} MB`)
    return new Uint8Array(data)
  }
  const res = await fetch(ref, { redirect: 'follow', signal: AbortSignal.timeout(180_000) })
  if (!res.ok) throw new Error(`${ref} answered ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.length > max) throw new Error(`${ref} is larger than ${Math.round(max / 1048576)} MB`)
  return buf
}

/** The files of an extension zip (same rules as AnyCut's installer): no unsafe paths, package.json at the root or in one top folder. */
export function zipFiles(zip) {
  let total = 0
  let count = 0
  const raw = unzipSync(zip, {
    filter: (f) => {
      if (++count > LIMITS.files) throw new Error(`more than ${LIMITS.files} files`)
      total += f.originalSize
      if (total > LIMITS.bytes) throw new Error(`unpacks to more than ${LIMITS.bytes / 1048576} MB`)
      return true
    },
  })
  const files = new Map()
  for (const [name, data] of Object.entries(raw)) {
    const path = name.replace(/\\/g, '/')
    if (path.endsWith('/')) continue
    if (/^([a-zA-Z]:|\/)/.test(path) || path.split('/').some((p) => p === '..' || p === '.')) throw new Error(`unsafe path in the zip: ${name}`)
    files.set(path, data)
  }
  if (files.has('package.json')) return files
  const tops = new Set([...files.keys()].map((p) => p.split('/')[0]))
  const [top] = tops
  if (tops.size !== 1 || !files.has(`${top}/package.json`)) throw new Error('no package.json at the root of the zip')
  return new Map([...files].map(([p, d]) => [p.slice(top.length + 1), d]))
}

/** Write a zip's files into `dir` (for inspection, diffs and the malware scan). */
export async function unpack(files, dir) {
  for (const [path, data] of files) {
    const target = resolve(dir, path)
    const rel = relative(resolve(dir), target)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`unsafe path in the zip: ${path}`)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, data)
  }
}

let validateManifest
/** Problems with a package.json as an AnyCut extension manifest (schema from the app, plus the rules the schema can't say). */
export function manifestProblems(m) {
  if (!validateManifest) {
    const ajv = new Ajv2020({ allErrors: true, strict: false })
    addFormats(ajv)
    validateManifest = ajv.compile(readJson(join(ROOT, 'schema', 'extension.schema.json')))
  }
  const out = []
  if (!validateManifest(m)) for (const e of validateManifest.errors.slice(0, 10)) out.push(`${e.instancePath || '(root)'} ${e.message}`)
  if (m && typeof m === 'object') {
    if (!ID_RE.test(`${m.publisher}.${m.name}`)) out.push('publisher and name must be lowercase letters, digits and dashes')
    if (m.contributes?.tools?.length && !m.main) out.push('tools need "main"')
  }
  return out
}

/** What the zip actually is: its id, version, whether it runs code, its permissions, and tool or pack. */
export function describe(m) {
  const c = m.contributes ?? {}
  const ui = ['editors', 'views', 'panels', 'inspector', 'menus', 'tools', 'commands'].some((k) => c[k]?.length)
  const packs = PACK_KINDS.filter((k) => c[k])
  return {
    id: `${m.publisher}.${m.name}`,
    version: m.version,
    runsCode: !!m.main,
    permissions: [...new Set(m.permissions ?? [])].sort(),
    kind: !m.main && !ui && packs.length ? 'pack' : 'tool',
  }
}

/** Download, check and unpack one entry. */
export async function inspectEntry(entry, { work, base } = {}) {
  const zip = await fetchBytes(entry.download, MAX_ZIP, base)
  const sum = sha256(zip)
  if (sum !== entry.sha256) throw new Error(`SHA-256 is ${sum}, but the entry says ${entry.sha256}`)
  const files = zipFiles(zip)
  let manifest
  try {
    manifest = JSON.parse(Buffer.from(files.get('package.json')).toString('utf8'))
  } catch (e) {
    throw new Error(`package.json is not valid JSON: ${e.message}`)
  }
  const problems = manifestProblems(manifest)
  const facts = describe(manifest)
  if (facts.id !== entry.id) problems.push(`the zip is ${facts.id}, not ${entry.id}`)
  if (facts.version !== entry.version) problems.push(`the zip is version ${facts.version}, not ${entry.version}`)
  if (facts.kind !== entry.kind) problems.push(`the zip is a ${facts.kind}, but the entry says ${entry.kind}`)
  if (entry.runsCode !== undefined && entry.runsCode !== facts.runsCode) problems.push(`runsCode should be ${facts.runsCode}`)
  if (entry.permissions !== undefined && JSON.stringify([...entry.permissions].sort()) !== JSON.stringify(facts.permissions)) problems.push(`permissions should be ${JSON.stringify(facts.permissions)}`)
  let dir
  if (work) {
    dir = join(work, entry.id, entry.version)
    await unpack(files, dir)
  }
  return { zip, files, manifest, facts, problems, dir }
}

export const exists = (p) => existsSync(p)
