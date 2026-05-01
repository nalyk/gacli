# Publishing gacli to npm

The repo is now wired for **automated publish on tag push**. This document covers what's
been decided, what's automated, and the one-time setup you do once.

## What's already decided

| Decision | Value | Where |
|---|---|---|
| Package name | `@nalyk/gacli` | `package.json:name` |
| License | MIT | `LICENSE` + `package.json:license` |
| Bin name | `gacli` (unscoped, lives at `~/.local/bin/gacli` after install) | `package.json:bin` |
| First version to publish | `1.0.1` | `package.json:version` |
| Publish trigger | Tag push matching `v*.*.*` | `.github/workflows/release.yml` |
| Provenance | Enabled (`--provenance` + `id-token: write`) | release.yml |
| dist-tag for `vX.Y.Z` | `latest` | release.yml prerelease detection |
| dist-tag for `vX.Y.Z-pre` | `next` | release.yml prerelease detection |

The unscoped name `gacli` is taken on npm by an unrelated, deprecated 1.0.8 package — that's
why we use the scope. If you'd rather use a different scope, edit `package.json:name` and the
`scope: '@nalyk'` value in `release.yml` before tagging.

## One-time user setup

1. **Create an npm account** (if you don't have one) and **enable 2FA** at
   https://www.npmjs.com/settings/<you>/2fa.
2. **Reserve the `@nalyk` scope** by visiting https://www.npmjs.com/org/create or simply
   publishing your first scoped package — npm auto-creates the scope on first publish.
3. **Generate an automation token** (NOT a classic publish token):
   - npmjs.com → Access Tokens → Generate New Token → **Granular Access Token**
   - Permissions: **packages: read+write** scoped to `@nalyk/*` only.
   - Expiration: 1 year (renew via this same workflow).
4. **Add the token to GitHub** (DONE — `NPM_TOKEN` secret is set on `nalyk/gacli`).

## How releases work now

```bash
# 1. Bump version, commit, push to main
pnpm version patch              # or minor|major — also creates the tag locally
git push origin main --follow-tags

# 2. Tag push fires .github/workflows/release.yml, which:
#    - lint + type-check + test + build
#    - pnpm pack
#    - smoke-test the local tarball via `npm install -g`
#    - npm publish --access public --provenance --tag latest
#    - smoke-test the published package via `npm install -g @nalyk/gacli@<version>`
#    - generate release notes (PR/commit log since previous tag)
#    - create GitHub Release with the .tgz attached and install instructions

# 3. Consumers install:
npm install -g @nalyk/gacli
gacli --version
```

For a **prerelease**:

```bash
pnpm version prepatch --preid=beta   # 1.0.1 → 1.0.2-beta.0
git push origin main --follow-tags
# release.yml detects the `-` and publishes under dist-tag `next` instead of `latest`
# and marks the GitHub Release as prerelease
```

## What's verified

- `pnpm verify` runs before publish — lint + type-check + test + build all green or no publish.
- The local pack is `npm install -g`-tested before upload.
- After publish, the registry version is re-installed from the public registry to verify a
  real consumer's install path actually works.
- npm provenance attestation is generated, so consumers can run `npm audit signatures` to
  verify the package was built from this repo at this commit by GitHub Actions.

## What is shipped (`files` allowlist)

Only:

- `dist/` — compiled JS + `.d.ts`
- `README.md`, `help.md` — user-facing docs
- `LICENSE`

NOT shipped: `src/`, `test/`, `.serena/`, `.github/`, `.claude/`, configs, lockfiles.

## Manual fallback

If the workflow ever fails and you need to publish from your machine:

```bash
pnpm verify
pnpm publish --access public --provenance
```

This requires you to be `npm login`-ed locally with a token that can write to `@nalyk/*`.
The provenance flag will work too — npm cli inspects your environment and downgrades to a
non-provenance publish if it can't find one (e.g., outside CI). Prefer the workflow path.

## Unpublishing

You have **72 hours** after publish to `npm unpublish @nalyk/gacli@<version>`. After that
the version is permanent. If you ship a broken release: bump the patch version and publish
the fix, don't try to unpublish.

## Granting collaborators publish access (later)

```bash
npm access grant read-write @nalyk:developers @nalyk/gacli
# or per-user:
npm access grant read-write <username> @nalyk/gacli
```

You retain admin via your scope ownership.
