---
inclusion: always
---

# Graveyard — structure

```
graveyard/
├── .kiro/                 # specs, steering, hooks — committed, never gitignored
├── engine/
│   ├── src/
│   │   ├── schema.ts      # Graveyard JSON types + schemaVersion (single source of truth)
│   │   ├── git.ts         # execFile wrappers: log, blame, first-commit, status
│   │   ├── knip.ts        # run knip, adapt its JSON into Grave[]
│   │   ├── cobwebs.ts     # find TODO/FIXME/HACK + blame age
│   │   ├── haunted.ts     # churn ranking
│   │   ├── build.ts       # pure: facts -> Graveyard
│   │   ├── epitaph.ts     # template epitaph (+ optional LLM reword)
│   │   ├── exorcise.ts    # branch + delete + commit
│   │   ├── cli.ts         # `graveyard scan|exorcise`
│   │   └── mcp.ts         # MCP server exposing scan/get_grave/exorcise
│   └── test/              # *.test.ts, *.prop.test.ts, fixtures/
├── web/
│   ├── public/demo/       # prebuilt graveyard.json files for the hosted demo
│   └── src/
│       ├── App.tsx        # repo picker, view toggle (Cemetery | Ledger)
│       ├── layout.ts      # pure: Graveyard -> plot/stone positions
│       ├── Cemetery.tsx   # SVG scene, lantern, fog
│       ├── Epitaph.tsx    # detail panel
│       └── Ledger.tsx     # accessible table view
├── LICENSE
└── README.md
```

- Pure logic (`build.ts`, `layout.ts`, `epitaph.ts` template) has no I/O.
- Test files sit in `engine/test/` and next to `web/src/*.ts` as `*.test.ts`.
