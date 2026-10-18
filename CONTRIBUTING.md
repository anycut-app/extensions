# Submitting an extension

1. Build it (see [docs/EXTENSIONS.md](https://github.com/anycut-app/anycut/blob/main/docs/EXTENSIONS.md)) in your own public repo, with a README.
2. Publish a GitHub release whose asset is a `.zip` of the extension folder (`package.json` at the zip's root).
3. Fork this repo and add an entry to `index.json`:

```json
{
  "id": "yourname.your-extension",
  "repo": "yourname/anycut-your-extension",
  "version": "1.0.0",
  "kind": "tool",
  "download": "https://github.com/yourname/anycut-your-extension/releases/download/v1.0.0/your-extension.zip",
  "sha256": "<sha256 of the zip>",
  "runsCode": false,
  "permissions": ["timeline.read"]
}
```

4. Open a pull request using the template.

## What reviewers check

- It does what it says, and asks only for the permissions it needs.
- Extensions with Node code (`main`): the code is readable, not minified or obfuscated, and runs no downloads it doesn't explain.
- No tracking or data collection the README doesn't disclose.
- Content packs: you have the right to share the fonts, effects or looks in them.
