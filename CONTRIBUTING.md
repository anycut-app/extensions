# Submitting an extension

1. Build it in your own public repo, with a README. The [extension template](https://github.com/anycut-app/extension-template) is a good start, and [docs/EXTENSIONS.md](https://github.com/anycut-app/anycut/blob/main/docs/EXTENSIONS.md) explains everything an extension can do.
2. Add what its page shows: a **`cover`** (required: a 16:9 PNG, JPG, WebP or GIF, 1280×720 is ideal, which is its card in AnyCut's Extensions view), an `icon`, a `gallery` of screenshots or GIFs, a `galleryBanner` colour, and a `CHANGELOG.md`. Commit them in the extension; publishing copies them here, so you don't host them anywhere.
3. Publish a GitHub release whose asset is a `.zip` of the extension folder (`package.json` at the zip's root). The template's release workflow does this when you push a `v*` tag, and puts the entry for step 4 (with the SHA-256) in the release notes.
4. Fork this repo and add an entry to `index.json`:

```json
{
  "id": "yourname.your-extension",
  "repo": "yourname/anycut-your-extension",
  "version": "1.0.0",
  "kind": "tool",
  "download": "https://github.com/yourname/anycut-your-extension/releases/download/v1.0.0/your-extension-1.0.0.zip",
  "sha256": "<sha256 of the zip>"
}
```

   - `kind` is `pack` for content only (effects, fonts, looks, caption styles, skills, and no code), otherwise `tool`.
   - Leave out `permissions`, `runsCode`, `assets`, `size`, `published` and `versions`: they are read from your zip when it's published.
   - The `download` must be a release asset of `repo`.

5. Open a pull request using the template. The checks comment on it within a few minutes.

## Updates

Change your entry's `version`, `download` and `sha256` to the new release in a pull request. If the new version asks for no new permissions and adds no code, it merges by itself once the checks pass. Otherwise a person reviews it, and people who have it installed are asked to approve the new permissions.

The publisher name `anycut` is reserved for AnyCut's own extensions, which come from repos in the anycut-app organisation and show as **made by AnyCut**.

## What reviewers check

- It does what it says, and asks only for the permissions it needs.
- Extensions with Node code (`main`): the code is readable, not minified or obfuscated, and runs no downloads it doesn't explain.
- No tracking or data collection the README doesn't disclose.
- Content packs: you have the right to share the fonts, effects, looks and images in them.
