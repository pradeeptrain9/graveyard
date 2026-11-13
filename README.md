# 🪦 Graveyard

Walk your codebase's cemetery. Graveyard scans a JavaScript/TypeScript git repo and shows dead files, unused exports, orphaned dependencies, rotting TODOs and churn hotspots as a haunted graveyard. Every spooky element maps to a real, measured fact. One command "exorcises" a grave, deleting it on a fresh branch for review.

Kiroween 2026 entry, **Costume Contest** category. Built with [Kiro](https://kiro.dev): see [`.kiro/`](.kiro) for the spec, steering and hooks.

| You see | It means |
|---|---|
| Tombstone (taller = older) | Unused file / export / dependency |
| Epitaph | Born, last touched, by whom, last commit message |
| Cobweb | TODO/FIXME/HACK older than 180 days |
| Haunted house | Top-10 most-changed file in last 90 days |
| Fog | Share of a directory that is dead |

## Status
🚧 In progress. See [`.kiro/specs/graveyard/tasks.md`](.kiro/specs/graveyard/tasks.md).

## Built on
- [knip](https://github.com/webpro-nl/knip) (ISC) for unused file/export/dependency detection. Graveyard adds git history, epitaphs, cobwebs, churn, the cemetery UI, safe exorcism and an MCP server on top.

## License
MIT. See [LICENSE](LICENSE).
