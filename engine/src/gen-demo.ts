#!/usr/bin/env node
/**
 * Generates synthetic-but-realistic demo graveyard.json files.
 * Run once to populate web/public/demo/.
 * Uses real repo metadata (names, dates) plus fabricated dead code.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Graveyard, Grave, Cobweb, HauntedHouse, Plot } from './schema.js';
import { schemaVersion } from './schema.js';
import { graveId } from './build.js';
import { templateEpitaph } from './epitaph.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../web/public/demo');

function iso(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
}

function cobwebId(p: string, line: number) {
  return createHash('sha1').update(`cobweb\0${p}\0${line}`).digest('hex').slice(0, 10);
}

function makeGrave(
  kind: Grave['kind'],
  filePath: string,
  name: string | undefined,
  line: number | undefined,
  born: string,
  lastTouched: string,
  author: string,
  lastMessage: string,
  headDate: string,
): Grave {
  const ageDays = Math.max(0, Math.floor(
    (new Date(headDate).getTime() - new Date(lastTouched).getTime()) / 86_400_000,
  ));
  const g: Grave = {
    id: graveId(kind, filePath, name),
    kind,
    path: filePath,
    ...(name !== undefined ? { name } : {}),
    ...(line !== undefined ? { line } : {}),
    born,
    lastTouched,
    ageDays,
    author,
    lastMessage,
    epitaph: '',
  };
  g.epitaph = templateEpitaph(g);
  return g;
}

// ---------------------------------------------------------------------------
// Demo 1 — sindresorhus/got (HTTP client)
// ---------------------------------------------------------------------------

function makeGot(): Graveyard {
  const headDate = iso(2026, 10, 30);
  const headSha = '6b5aafc1cd538998728be6f45c65b0f80bae01b2';

  const graves: Grave[] = [
    makeGrave('file', 'source/as-promise/legacy.ts', undefined, undefined,
      iso(2020, 3, 12), iso(2021, 8, 4), 'Sindre Sorhus', 'refactor: move promise logic', headDate),
    makeGrave('file', 'source/core/utils/deprecated-options.ts', undefined, undefined,
      iso(2019, 11, 20), iso(2022, 1, 15), 'Szabolcs Dávid', 'feat: add v12 options shim', headDate),
    makeGrave('export', 'source/types.ts', 'GotReturnType', 150,
      iso(2020, 6, 1), iso(2022, 6, 30), 'Sindre Sorhus', 'types: add GotReturnType alias', headDate),
    makeGrave('export', 'source/types.ts', 'GotStream', 192,
      iso(2020, 6, 1), iso(2023, 2, 11), 'Szabolcs Dávid', 'types: export GotStream', headDate),
    makeGrave('export', 'source/core/index.ts', 'defaultHandlerCount', 88,
      iso(2021, 4, 10), iso(2023, 9, 20), 'Sindre Sorhus', 'refactor: handler registry', headDate),
    makeGrave('dependency', 'package.json', '@types/cacheable-request', undefined,
      iso(2019, 7, 1), iso(2023, 11, 5), 'Sindre Sorhus', 'chore: bump deps', headDate),
    makeGrave('export', 'source/as-promise/create-rejection.ts', 'createRejection', 12,
      iso(2020, 9, 3), iso(2024, 1, 20), 'Sindre Sorhus', 'fix: rejection helper', headDate),
  ];
  graves.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));

  const cobwebs: Cobweb[] = [
    { id: cobwebId('source/core/index.ts', 42), path: 'source/core/index.ts', line: 42, tag: 'TODO' as const, text: 'Remove when Node 16 drops — use native AbortSignal', author: 'Sindre Sorhus', ageDays: 820 },
    { id: cobwebId('source/core/index.ts', 198), path: 'source/core/index.ts', line: 198, tag: 'FIXME' as const, text: 'Race condition when stream is destroyed before connect', author: 'Szabolcs Dávid', ageDays: 644 },
    { id: cobwebId('source/as-promise/index.ts', 77), path: 'source/as-promise/index.ts', line: 77, tag: 'HACK' as const, text: 'Force-cast because typings for cacheable-request are wrong', author: 'Sindre Sorhus', ageDays: 710 },
    { id: cobwebId('source/core/utils/timed-out.ts', 15), path: 'source/core/utils/timed-out.ts', line: 15, tag: 'TODO' as const, text: 'Align with Fetch timeout semantics once spec finalises', author: 'Sindre Sorhus', ageDays: 580 },
    { id: cobwebId('source/as-promise/legacy.ts', 3), path: 'source/as-promise/legacy.ts', line: 3, tag: 'TODO' as const, text: 'Delete this whole file — it is dead', author: 'Sindre Sorhus', ageDays: 980 },
    { id: cobwebId('source/core/index.ts', 311), path: 'source/core/index.ts', line: 311, tag: 'FIXME' as const, text: 'maxRedirects should count per-origin, not globally', author: 'Szabolcs Dávid', ageDays: 735 },
    { id: cobwebId('test/helpers/server.ts', 88), path: 'test/helpers/server.ts', line: 88, tag: 'TODO' as const, text: 'Replace with @hapi/lab when it supports ESM', author: 'Sindre Sorhus', ageDays: 601 },
  ].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);

  const haunted: HauntedHouse[] = [
    { path: 'source/core/index.ts', commits90d: 28, authors: 3 },
    { path: 'source/as-promise/index.ts', commits90d: 17, authors: 2 },
    { path: 'test/got.ts', commits90d: 14, authors: 2 },
    { path: 'source/core/options.ts', commits90d: 11, authors: 2 },
  ];

  const plots: Plot[] = [
    { dir: 'source', files: 24, deadFiles: 2, fog: 0.08 },
    { dir: 'test', files: 18, deadFiles: 0, fog: 0 },
  ];

  return { schemaVersion, repo: 'got', headSha, headDate, scannedAt: new Date().toISOString(), graves, cobwebs, haunted, plots };
}

// ---------------------------------------------------------------------------
// Demo 2 — chalk/chalk (terminal colours)
// ---------------------------------------------------------------------------

function makeChalk(): Graveyard {
  const headDate = iso(2026, 10, 15);
  const headSha = 'a3c0a30f1e3e5e5e5e5e5e5e5e5e5e5e5e5e5e5e';

  const graves: Grave[] = [
    makeGrave('file', 'source/vendor/ansi-styles-legacy.js', undefined, undefined,
      iso(2018, 5, 10), iso(2020, 3, 1), 'Sindre Sorhus', 'vendor: bundle ansi-styles for CJS', headDate),
    makeGrave('export', 'source/index.js', 'supportsColor', 44,
      iso(2019, 2, 14), iso(2023, 7, 22), 'Sindre Sorhus', 'feat: re-export supportsColor', headDate),
    makeGrave('export', 'source/utilities.js', 'stringEncaseCRLFWithFirstIndex', 8,
      iso(2020, 11, 5), iso(2024, 2, 10), 'Josh Junon', 'perf: internal CRLF helper', headDate),
    makeGrave('dependency', 'package.json', 'ansi-styles', undefined,
      iso(2018, 1, 1), iso(2024, 3, 1), 'Sindre Sorhus', 'chore: bump to ansi-styles 5', headDate),
  ];
  graves.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));

  const cobwebs: Cobweb[] = [
    { id: cobwebId('source/index.js', 15), path: 'source/index.js', line: 15, tag: 'TODO' as const, text: 'Remove CJS compat layer once Node 14 EOL', author: 'Sindre Sorhus', ageDays: 920 },
    { id: cobwebId('source/index.js', 88), path: 'source/index.js', line: 88, tag: 'FIXME' as const, text: 'Level detection is unreliable in multiplexed terminals', author: 'Sindre Sorhus', ageDays: 480 },
    { id: cobwebId('source/vendor/ansi-styles-legacy.js', 1), path: 'source/vendor/ansi-styles-legacy.js', line: 1, tag: 'TODO' as const, text: 'This whole file should be deleted — vendor copy is dead', author: 'Josh Junon', ageDays: 1050 },
  ].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);

  const haunted: HauntedHouse[] = [
    { path: 'source/index.js', commits90d: 9, authors: 2 },
    { path: 'readme.md', commits90d: 5, authors: 2 },
  ];

  const plots: Plot[] = [
    { dir: 'source', files: 6, deadFiles: 2, fog: 0.33 },
    { dir: '.', files: 2, deadFiles: 0, fog: 0 },
  ];

  return { schemaVersion, repo: 'chalk', headSha, headDate, scannedAt: new Date().toISOString(), graves, cobwebs, haunted, plots };
}

// ---------------------------------------------------------------------------
// Demo 3 — socket.io/socket.io (real-time server)
// ---------------------------------------------------------------------------

function makeSocketIo(): Graveyard {
  const headDate = iso(2026, 10, 25);
  const headSha = 'c7e5e1a9f3b8d2f1e0c9a8b7d6e5f4a3b2c1d0e9';

  const graves: Grave[] = [
    makeGrave('file', 'lib/broadcast-operator.ts', undefined, undefined,
      iso(2021, 3, 1), iso(2022, 11, 10), 'Damien Arrachequesne', 'feat: broadcast operator', headDate),
    makeGrave('file', 'lib/contrib/legacy-namespace.ts', undefined, undefined,
      iso(2019, 6, 20), iso(2021, 4, 15), 'Damien Arrachequesne', 'compat: v2 namespace shim', headDate),
    makeGrave('export', 'lib/index.ts', 'SocketReservedEventsMap', 23,
      iso(2021, 8, 5), iso(2023, 10, 1), 'Damien Arrachequesne', 'types: reserved events map', headDate),
    makeGrave('export', 'lib/index.ts', 'ExtendedError', 48,
      iso(2020, 12, 1), iso(2024, 1, 20), 'Damien Arrachequesne', 'types: export ExtendedError', headDate),
    makeGrave('export', 'lib/socket.ts', 'RESERVED_EVENTS', 110,
      iso(2021, 5, 10), iso(2024, 3, 5), 'Damien Arrachequesne', 'refactor: reserved events const', headDate),
    makeGrave('export', 'lib/namespace.ts', 'NamespaceReservedEventsMap', 15,
      iso(2021, 8, 5), iso(2023, 12, 10), 'Damien Arrachequesne', 'types: namespace events', headDate),
    makeGrave('dependency', 'package.json', 'debug', undefined,
      iso(2016, 1, 1), iso(2024, 2, 20), 'Damien Arrachequesne', 'chore: remove debug dep', headDate),
    makeGrave('dependency', 'package.json', '@types/debug', undefined,
      iso(2020, 5, 1), iso(2024, 2, 20), 'Damien Arrachequesne', 'chore: remove debug types', headDate),
    makeGrave('file', 'lib/contrib/msgpack-parser.ts', undefined, undefined,
      iso(2020, 9, 15), iso(2022, 7, 30), 'Damien Arrachequesne', 'contrib: msgpack parser plugin', headDate),
    makeGrave('export', 'lib/socket.ts', 'DisconnectReason', 85,
      iso(2021, 3, 20), iso(2024, 5, 10), 'Damien Arrachequesne', 'types: disconnect reason', headDate),
  ];
  graves.sort((a, b) => a.path.localeCompare(b.path) || a.kind.localeCompare(b.kind));

  const cobwebs: Cobweb[] = [
    { id: cobwebId('lib/socket.ts', 44), path: 'lib/socket.ts', line: 44, tag: 'TODO' as const, text: 'Replace binary detection with structured clone when Node 17+ is baseline', author: 'Damien Arrachequesne', ageDays: 870 },
    { id: cobwebId('lib/socket.ts', 212), path: 'lib/socket.ts', line: 212, tag: 'FIXME' as const, text: 'Handshake ack can fire twice on reconnect with volatile events', author: 'Damien Arrachequesne', ageDays: 745 },
    { id: cobwebId('lib/namespace.ts', 88), path: 'lib/namespace.ts', line: 88, tag: 'TODO' as const, text: 'Deprecate string-based event matching in favour of typed events', author: 'Damien Arrachequesne', ageDays: 620 },
    { id: cobwebId('lib/namespace.ts', 155), path: 'lib/namespace.ts', line: 155, tag: 'HACK' as const, text: 'Force-cast because Socket<L,R> inference breaks with deep partials', author: 'Damien Arrachequesne', ageDays: 560 },
    { id: cobwebId('lib/contrib/legacy-namespace.ts', 7), path: 'lib/contrib/legacy-namespace.ts', line: 7, tag: 'TODO' as const, text: 'Remove entire file — v2 compat shim is no longer needed', author: 'Damien Arrachequesne', ageDays: 1240 },
    { id: cobwebId('lib/server.ts', 310), path: 'lib/server.ts', line: 310, tag: 'FIXME' as const, text: 'Race condition: engine.io handshake vs WS upgrade in clustered mode', author: 'Damien Arrachequesne', ageDays: 820 },
    { id: cobwebId('lib/server.ts', 450), path: 'lib/server.ts', line: 450, tag: 'TODO' as const, text: 'Expose graceful drain option for serverless platforms', author: 'Damien Arrachequesne', ageDays: 680 },
    { id: cobwebId('lib/adapter.ts', 22), path: 'lib/adapter.ts', line: 22, tag: 'TODO' as const, text: 'Replace in-memory rooms with pluggable store interface', author: 'Damien Arrachequesne', ageDays: 910 },
    { id: cobwebId('lib/adapter.ts', 78), path: 'lib/adapter.ts', line: 78, tag: 'HACK' as const, text: 'Defensive copy to avoid mutation across namespaces sharing adapter', author: 'Damien Arrachequesne', ageDays: 590 },
    { id: cobwebId('lib/contrib/msgpack-parser.ts', 3), path: 'lib/contrib/msgpack-parser.ts', line: 3, tag: 'TODO' as const, text: 'Move msgpack to separate published package', author: 'Damien Arrachequesne', ageDays: 780 },
  ].sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);

  const haunted: HauntedHouse[] = [
    { path: 'lib/socket.ts', commits90d: 34, authors: 4 },
    { path: 'lib/server.ts', commits90d: 28, authors: 3 },
    { path: 'lib/namespace.ts', commits90d: 22, authors: 3 },
    { path: 'lib/index.ts', commits90d: 18, authors: 2 },
    { path: 'lib/adapter.ts', commits90d: 15, authors: 2 },
    { path: 'test/socket.ts', commits90d: 13, authors: 3 },
    { path: 'test/server.ts', commits90d: 11, authors: 2 },
    { path: 'lib/broadcast-operator.ts', commits90d: 9, authors: 2 },
  ];

  const plots: Plot[] = [
    { dir: 'lib', files: 18, deadFiles: 5, fog: 0.28 },
    { dir: 'test', files: 12, deadFiles: 0, fog: 0 },
    { dir: '.', files: 2, deadFiles: 0, fog: 0 },
  ];

  return { schemaVersion, repo: 'socket.io', headSha, headDate, scannedAt: new Date().toISOString(), graves, cobwebs, haunted, plots };
}

// ---------------------------------------------------------------------------
// Write all three
// ---------------------------------------------------------------------------

await fs.mkdir(OUT_DIR, { recursive: true });

const demos = [
  { name: 'got', data: makeGot() },
  { name: 'chalk', data: makeChalk() },
  { name: 'socket.io', data: makeSocketIo() },
];

for (const { name, data } of demos) {
  const file = path.join(OUT_DIR, `${name}.graveyard.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  console.log(`wrote ${file} — ${data.graves.length} graves, ${data.cobwebs.length} cobwebs`);
}
