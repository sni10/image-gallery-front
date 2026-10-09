# Project instructions

## Commit messages: Conventional Commits, always

Every commit message (and PR title) MUST follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>)<optional !>: <description>

<optional body>

<optional footer, e.g. BREAKING CHANGE: ...>
```

- Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`.
- Scopes used here: `gallery`, `catalog`, `account`, `auth`, `i18n`, `ssr`, `api`, `deploy`, `ci`.
- Header ≤ 150 chars, lower-case type, no trailing period.
- Breaking change: `!` after the type/scope **and** a `BREAKING CHANGE:` footer.
- No `Co-Authored-By` / "Generated with Claude" lines — the message only.

Why: messages drive automatic releases on `main` (python-semantic-release, `releaserc.toml`):
`fix`/`perf` → patch, `feat` → minor, breaking → major (minor while the version is `0.x`). Other types don't release.
CI rejects non-conforming commits on push and pull requests to `main` (`commitlint.config.mjs`).
Check a message locally: `echo "feat(gallery): ..." | npx -p @commitlint/cli@21 -p @commitlint/config-conventional@21 commitlint`.

Commit or push only when the user explicitly asks for it.

## Dev server

The user keeps the dev server running. Never start `vite` / `npm run dev` / `npm run preview` yourself; ask for the URL instead.
Local API address: `http://localhost:8080` only.

## Deploy

Production runs as the `front` service of the backend's stack (`/srv/artai` on the server, `compose.prod.yaml` in ../image-gallery).
`bash deploy/deploy.sh <full commit sha>` deploys or rolls back the image `ghcr.io/sni10/image-gallery-front:<sha>` built by CI.
