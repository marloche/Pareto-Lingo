# Pareto-Lingo (repo)

This project's notes, decisions, and rules live in my Obsidian vault. Read these before working. Claude Code loads them automatically; other tools should open them.

@C:/ObsidianVault/CLAUDE.md
@C:/ObsidianVault/10-Projects/Apps/CLAUDE.md
@C:/ObsidianVault/10-Projects/Apps/Pareto-Lingo/CLAUDE.md

Inside this repo, the vault's folder and naming rules don't apply, but its safety rules and my preferences do. Record decisions in `C:/ObsidianVault/10-Projects/Apps/Pareto-Lingo/Pareto-Lingo-Log.md`.

## Repo specifics
- Language / framework: TypeScript + Vite, no UI framework. Installable PWA with a hand-written service worker (`sw.js`, filled in by the plugin in `vite.config.ts`).
- Install: `npm install`
- Run: `npm run dev` (no service worker in dev); `npm run build && npm run preview` for the real thing
- Test: `npm test` (Vitest; study logic in `src/core/` is pure and unit-tested)
- Packs: `npm run packs:fetch` (once, needs `bzip2`), then `npm run packs:build`; read `reports/ru-pack.md` after every build
- Lint / format: none yet; `tsc --noEmit` runs as part of `npm run build`
- Release / deploy: GitHub Pages (always needs my OK)

## Conventions
- Pack scripts in `scripts/` run directly on Node 24 (type stripping): use `import type`, `.ts` import paths, and erasable syntax only (no enums, namespaces or parameter properties). `tsc` doesn't check them, because `@types/node` isn't a dependency.
- Pack and progress meet only by item `id`. Never rename an id; source versions are pinned in `scripts/fetch-ru.ts` so rebuilds keep them.
- Every data source and license goes in `DATA_SOURCES.md` and the pack's `sources`. The hand table (`scripts/lib/ru-extras.ts`) holds only standard forms and glosses of common words, each with a comment saying why; never invented vocabulary.
- Grammar notes in `scripts/lib/ru-grammar.ts` are AI-written: changes go into the review list in the vault.
- `data/raw/` is git-ignored; `public/packs/` and `reports/` are committed.
- Branches and commits: `main` only for now.

<!-- Setup: this assumes the vault is at C:/ObsidianVault. If it moves,
     update the paths above to match.
     The first time Claude Code sees these imports, it asks you to approve them. -->
