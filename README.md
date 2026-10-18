# AnyCut extension catalog

The list of community extensions available inside [AnyCut](https://github.com/anycut-app/anycut). AnyCut reads `index.json` and shows these extensions in its Extensions view.

> Status: the catalog is being set up. AnyCut doesn't read it yet; the list is empty.

## How it works

- Every extension lives in **its author's own GitHub repo** and publishes a release `.zip`.
- To list it, open a pull request adding one entry to [`index.json`](index.json): its id, repo, the exact version, the zip's download URL and its SHA-256.
- The **first version is reviewed by a person.** On approval, the zip is mirrored into this repo's releases, and AnyCut downloads that copy and checks its SHA-256, so nothing can change after review.
- **Updates** are PRs that bump the version. Checks run automatically. An update that adds no permissions and no Node code can merge without a full review. One that asks for more goes back to a person, and users are asked to approve the new permissions.
- If something harmful slips through, its id goes on the `blocklist`, and AnyCut disables it everywhere.

See [CONTRIBUTING.md](CONTRIBUTING.md) to submit, and [docs/EXTENSIONS.md](https://github.com/anycut-app/anycut/blob/main/docs/EXTENSIONS.md) to build one.

## Want an extension that doesn't exist?

[Open an extension request](../../issues/new?template=extension-request.yml).
