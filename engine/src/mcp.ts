#!/usr/bin/env node
/**
 * Graveyard MCP stdio server.
 * Tools: scan_repo, list_graves, get_grave, exorcise
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { headInfo, lsFiles, buildHistoryMap, fileHistory, commitsSince, authorsForPath } from './git.js';
import { runKnip } from './knip.js';
import { findCobwebs } from './cobwebs.js';
import { buildGraveyard } from './build.js';
import { exorcise, ExorciseError } from './exorcise.js';
import { validateGraveyard } from './schema.js';
import type { Graveyard, GraveKind } from './schema.js';

const tools: Tool[] = [
  {
    name: 'scan_repo',
    description: 'Scan a JS/TS git repo and return its graveyard.json. Writes graveyard.json to the repo root.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo root' },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_graves',
    description: 'List graves from a repo\'s graveyard.json, optionally filtered by kind.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo root' },
        kind: {
          type: 'string',
          enum: ['file', 'export', 'dependency'],
          description: 'Optional: filter by grave kind',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_grave',
    description: 'Get a single grave by id from a repo\'s graveyard.json.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo root' },
        id: { type: 'string', description: 'Grave id' },
      },
      required: ['path', 'id'],
    },
  },
  {
    name: 'exorcise',
    description: 'Delete or de-export a dead artifact on a fresh branch. Does NOT push.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repo root' },
        id: { type: 'string', description: 'Grave id to exorcise' },
      },
      required: ['path', 'id'],
    },
  },
];

async function loadGraveyard(repoPath: string): Promise<Graveyard> {
  const raw = await fs.readFile(path.join(repoPath, 'graveyard.json'), 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const result = validateGraveyard(parsed);
  if (!result.ok) throw new Error('graveyard.json is invalid: ' + result.errors.join(', '));
  return parsed as Graveyard;
}

async function runScan(repoPath: string): Promise<Graveyard> {
  const head = await headInfo(repoPath);
  const repo = path.basename(repoPath);
  const historyMap = await buildHistoryMap(repoPath);

  const jsExts = ['*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs'];
  const trackedFiles = await lsFiles(repoPath, jsExts);

  for (const f of trackedFiles) {
    if (!historyMap.has(f)) {
      const h = await fileHistory(f, repoPath).catch(() => null);
      if (h) historyMap.set(f, h);
    }
  }

  const partialGraves = await runKnip(repoPath);

  for (const pg of partialGraves) {
    if (!historyMap.has(pg.path)) {
      const h = await fileHistory(pg.path, repoPath).catch(() => null);
      if (h) historyMap.set(pg.path, h);
    }
  }

  const cobwebs = await findCobwebs(repoPath, head.date);
  const ninetyDaysAgo = new Date(new Date(head.date).getTime() - 90 * 86_400_000).toISOString();
  const commitCounts = await commitsSince(ninetyDaysAgo, repoPath);

  const authorsByPath = new Map<string, Set<string>>();
  const topPaths = [...commitCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([p]) => p);
  for (const p of topPaths) {
    authorsByPath.set(p, await authorsForPath(p, ninetyDaysAgo, repoPath));
  }

  const graveyard = buildGraveyard({
    repo, headSha: head.sha, headDate: head.date,
    partialGraves, historyMap, cobwebs, commitCounts, authorsByPath, trackedFiles,
  });

  const absOut = path.join(repoPath, 'graveyard.json');
  const tmp = absOut + '.tmp.' + process.pid;
  await fs.writeFile(tmp, JSON.stringify(graveyard, null, 2), 'utf8');
  await fs.rename(tmp, absOut);

  return graveyard;
}

const server = new Server(
  { name: 'graveyard', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, string>;

  try {
    if (name === 'scan_repo') {
      const repoPath = path.resolve(a.path ?? '.');
      const g = await runScan(repoPath);
      return { content: [{ type: 'text', text: JSON.stringify(g, null, 2) }] };
    }

    if (name === 'list_graves') {
      const repoPath = path.resolve(a.path ?? '.');
      const g = await loadGraveyard(repoPath);
      const kind = a.kind as GraveKind | undefined;
      const graves = kind ? g.graves.filter((x) => x.kind === kind) : g.graves;
      return { content: [{ type: 'text', text: JSON.stringify(graves, null, 2) }] };
    }

    if (name === 'get_grave') {
      const repoPath = path.resolve(a.path ?? '.');
      const g = await loadGraveyard(repoPath);
      const grave = g.graves.find((x) => x.id === a.id);
      if (!grave) return { content: [{ type: 'text', text: `grave ${a.id} not found` }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(grave, null, 2) }] };
    }

    if (name === 'exorcise') {
      const repoPath = path.resolve(a.path ?? '.');
      const g = await loadGraveyard(repoPath);
      await exorcise(g, a.id, repoPath);
      return { content: [{ type: 'text', text: `exorcised ${a.id}` }] };
    }

    return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
  } catch (err) {
    const msg = err instanceof ExorciseError
      ? `ExorciseError (${err.exitCode}): ${err.message}`
      : String(err);
    return { content: [{ type: 'text', text: msg }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
