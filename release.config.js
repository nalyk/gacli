/**
 * semantic-release configuration.
 *
 * Drives the entire release pipeline from Conventional Commits on `main`:
 *   1. commit-analyzer        — decides next version (patch/minor/major) from commit messages
 *   2. release-notes-generator — builds release notes (conventionalcommits preset)
 *   3. changelog              — prepends notes to CHANGELOG.md
 *   4. npm                    — bumps package.json + `npm publish` (uses OIDC trusted publishing
 *                                because the workflow grants id-token: write)
 *   5. git                    — commits the bumped package.json + CHANGELOG.md back to main as
 *                                `chore(release): vX.Y.Z [skip ci]`
 *   6. github                 — creates the GitHub Release and attaches the .tgz asset
 *
 * The `[skip ci]` marker in the release commit prevents the workflow from re-triggering
 * itself; the auto-release workflow also short-circuits on `chore(release):` commits.
 *
 * Conventional Commits in use here:
 *   feat:        → minor
 *   fix:         → patch
 *   perf:        → patch
 *   refactor:    → patch (configured below)
 *   chore:       → no release
 *   docs:/test:/ci:/build:/style: → no release
 *   BREAKING CHANGE in body → major
 */
export default {
  branches: [
    'main',
    // Pre-release channels:
    { name: 'next', prerelease: true }, // push to `next` branch → x.y.z-next.N on the @next dist-tag
    { name: 'beta', prerelease: true },
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'refactor', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'docs', scope: 'readme', release: 'patch' },
          // Anything not listed here defaults to "no release" (chore, docs, test, ci, build, style).
        ],
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: 'Features' },
            { type: 'fix', section: 'Bug Fixes' },
            { type: 'perf', section: 'Performance' },
            { type: 'refactor', section: 'Refactoring' },
            { type: 'docs', section: 'Documentation', hidden: false },
            { type: 'ci', section: 'CI', hidden: true },
            { type: 'chore', section: 'Chores', hidden: true },
            { type: 'test', section: 'Tests', hidden: true },
            { type: 'build', section: 'Build', hidden: true },
            { type: 'style', section: 'Style', hidden: true },
          ],
        },
      },
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle:
          '# Changelog\n\nAll notable changes to `@nalyk/gacli` are documented here.\n\nThe format is based on [Conventional Commits](https://www.conventionalcommits.org/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Generated automatically by [semantic-release](https://github.com/semantic-release/semantic-release) on every push to `main`.',
      },
    ],
    [
      '@semantic-release/npm',
      {
        // npmPublish: true (default). Uses OIDC trusted publishing because the
        // workflow declares id-token: write and npm CLI is upgraded to >= 11.5.1.
        // No NPM_TOKEN required.
        npmPublish: true,
        tarballDir: 'dist-pack',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [{ path: 'dist-pack/*.tgz', label: 'npm tarball' }],
      },
    ],
  ],
};
