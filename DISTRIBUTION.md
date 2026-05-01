# Distribution channels for gacli

## 1. npm (recommended for developers)

See `PUBLISHING.md`. Once shipped, install with `pnpm install -g gacli` or
`npx gacli ...`.

## 2. Single-executable application (SEA) — for end-users without Node

Node 22+ ships a stable single-executable feature. `scripts/build-sea.sh` produces a
self-contained binary that bundles your gacli build + the Node runtime, so users don't
need Node installed.

### Build locally

```bash
pnpm build
./scripts/build-sea.sh
# produces dist/gacli-<platform>-<arch>
```

### What this DOESN'T solve

- **Cross-platform binaries.** Each platform (linux-x64, linux-arm64, darwin-x64,
  darwin-arm64, win-x64) requires building on that exact platform. You cannot build
  a darwin binary from linux. Use a GitHub Actions matrix:

  ```yaml
  strategy:
    matrix:
      include:
        - { os: ubuntu-latest, target: linux-x64 }
        - { os: ubuntu-24.04-arm, target: linux-arm64 }
        - { os: macos-13, target: darwin-x64 }
        - { os: macos-14, target: darwin-arm64 }
        - { os: windows-latest, target: win-x64 }
  ```

- **Code signing.** macOS Gatekeeper will reject unsigned binaries; users will see
  "cannot verify developer." Real distribution needs an Apple Developer ID signing
  certificate ($99/year) and notarization. Windows SmartScreen has the same friction
  without an Authenticode cert.

- **Installer UX.** SEA produces one binary, not an installer. For Homebrew taps,
  Scoop manifests, or `.deb`/`.rpm` packages, additional tooling is required.

### Why I scaffolded this and didn't build it

Multi-platform binaries require:
1. Build runners I don't have access to (macOS / Windows hosts).
2. Decisions you should make: which platforms to ship, signing strategy, hosting.
3. A non-trivial GH Actions workflow that's better authored once you've made (1)
   and (2).

Ship `gacli` to npm first. Add SEA only when end-user feedback shows Node-install
friction is a real distribution problem.

## 3. Homebrew tap (later)

Once binaries exist, a tap formula is ~30 lines. Skip until you have signed
binaries and a release workflow producing them with stable URLs.
