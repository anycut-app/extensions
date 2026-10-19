# AnyCut extension catalog

The list of community extensions available inside [AnyCut](https://github.com/anycut-app/anycut). AnyCut reads `index.json` and shows these extensions in its Extensions view, with their pages (screenshots, README, changelog) before you install.

## How it works

- Every extension lives in **its author's own GitHub repo** and publishes a release `.zip`.
- To list it, open a pull request adding one entry to [`index.json`](index.json): its id, repo, the exact version, the zip's download URL and its SHA-256. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Checks run on every pull request** ([`check.yml`](.github/workflows/check.yml)):
  - the zip's SHA-256 matches the entry;
  - `package.json` is a valid AnyCut manifest with a cover, and its id, version and kind match the entry;
  - the `anycut` publisher only from repos in anycut-app (AnyCut's own extensions, shown as made by AnyCut);
  - what it may do (permissions) and whether it runs code (`main`), read from the zip;
  - for an update, a comparison with the version before it: new or dropped permissions, new code, and a diff of every file that changed;
  - a ClamAV malware scan.

  The result is posted on the pull request, which is labelled `needs-review` or `auto-merge-ok`.
- **The first version is reviewed by a person.** An **update** that adds no permissions and no code merges by itself. One that asks for more goes back to a person, and people who have it installed are asked to approve the new permissions before it updates.
- **Publishing** ([`publish.yml`](.github/workflows/publish.yml)) mirrors each reviewed zip into this repo's releases, so it can't change or disappear after review, publishes its store-page files (cover, icon, gallery, README, changelog) under `assets/<id>/<version>/`, which AnyCut loads from GitHub, and fills in the entry (`download` points at the mirror, plus `assets`, `size`, `published`, `permissions`, `runsCode` and earlier `versions`, kept in `history.json`).
- AnyCut downloads the mirrored zip and **refuses it if its SHA-256 differs** from the entry, or if what's inside isn't what the catalog says (another id or version, more permissions, code it didn't declare).
- If something harmful slips through, its id goes on the **`blocklist`** (optionally only some versions, e.g. `"versions": "<1.2.0"`), and AnyCut turns it off everywhere on its next check.

## AnyCut's own extensions

The ones AnyCut makes (publisher `anycut`, shown as made by AnyCut) go through this catalog like everyone else's, and AnyCut ships none built in. Their zips are released here, from AnyCut's repo, with `node scripts/release-official.mjs <extension folder> --pr`, which opens the pull request that adds the entry.

## yt-dlp mirror

AnyCut's Video Downloader runs [yt-dlp](https://github.com/yt-dlp/yt-dlp). So that it never downloads anything from a third party at runtime, [`yt-dlp.yml`](.github/workflows/yt-dlp.yml) copies yt-dlp's newest release here once a day: the Windows, macOS and Linux builds, unmodified and checked against yt-dlp's own SHA-256 sums, as the release `yt-dlp-<version>`. [`mirrors/yt-dlp.json`](mirrors/yt-dlp.json) names the version and each file's URL and SHA-256; the extension installs and updates from there, checking the SHA-256 again. yt-dlp is released under the Unlicense.

To build an extension, start from the [extension template](https://github.com/anycut-app/extension-template) and read [docs/EXTENSIONS.md](https://github.com/anycut-app/anycut/blob/main/docs/EXTENSIONS.md).

## Trying a catalog locally

`scripts/publish.mjs --local` builds a self-contained catalog (index, zips and store-page files) from this index plus any extension folders you add, and AnyCut reads it instead of this one when started with `ANYCUT_CATALOG`:

```powershell
npm ci
node scripts/publish.mjs --local local-catalog --add ..\my-extension
$env:ANYCUT_CATALOG = "$PWD\local-catalog\index.json"   # then start AnyCut (pnpm dev) from the same shell
```

Run the pull-request checks locally with `node scripts/check-pr.mjs --base origin/main` (add `--local` to allow downloads that aren't GitHub release assets).

## Want an extension that doesn't exist?

[Open an extension request](../../issues/new?template=extension-request.yml).
