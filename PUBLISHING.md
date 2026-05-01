# Publishing gacli to npm

This document covers user-side actions you must take to publish gacli. The repo is now
publish-ready (scripts, file allowlist, prepublishOnly verify gate, CI checks), but
publishing itself requires your credentials and decisions.

## One-time setup

1. **Pick a name.** `gacli` may be taken on npm; if so, pick a scope (`@<your-org>/gacli`)
   and update `package.json:name`.
2. **`npm login`** (or `pnpm login`). Use a token-protected account with 2FA enabled —
   npm requires 2FA-on-publish for new packages by default.
3. **Add an `LICENSE` file.** I haven't picked one for you. MIT or Apache-2.0 are the
   common choices. Add a `"license": "MIT"` field to `package.json` once decided.
4. **Pin the version.** Bump `package.json:version` from `1.0.0` if you've shipped before.

## Pre-publish verification

```bash
pnpm verify        # lint + type-check + test + build
pnpm publint       # validates package.json shape against ecosystem norms
pnpm attw          # @arethetypeswrong/cli — flags consumer-side resolution problems
pnpm pack --dry-run   # see exactly what will be uploaded — confirm dist/ + README + help.md only
```

`prepublishOnly` runs `pnpm verify` automatically on `npm publish`, so a failing test
or lint will abort the upload. Don't bypass it.

## Publishing

```bash
# First publish:
npm publish --access public          # required for scoped packages

# Subsequent releases:
pnpm version patch|minor|major       # bumps version + tags + commits
git push && git push --tags
npm publish
```

## Provenance (recommended)

Publish with provenance attestation so consumers can verify the package was built from
this repo via GitHub Actions:

```yaml
# Add to .github/workflows/release.yml — left as a follow-up.
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Requires `id-token: write` permission on the workflow and an `NPM_TOKEN` secret with
publish rights.

## What is shipped

The `files` allowlist in `package.json` ships only:

- `dist/` — compiled JS + `.d.ts`
- `README.md`, `help.md` — user-facing docs
- `LICENSE` — when you add it

NOT shipped (intentional): `src/`, `test/`, `.serena/`, `.github/`, `.claude/`, configs,
lockfiles. If you need to ship the source for debug, add `"src"` to the `files` array.

## Why I didn't publish for you

Three reasons, all blockers I cannot resolve:

1. I don't have your npm credentials, and you should never give them to a tool.
2. Choosing the package name (with/without scope) is a product decision.
3. License selection is yours — committing one without your input is presumptuous.

Once you handle (1)–(3), the actual publish is one command.
