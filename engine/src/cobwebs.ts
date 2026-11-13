import type { Cobweb } from './schema.js';
import { run, blameLine } from './git.js';
import { createHash } from 'node:crypto';

const JS_TS_EXTS = ['*.js', '*.jsx', '*.ts', '*.tsx', '*.mjs', '*.cjs'];
const TAG_RE = /\b(TODO|FIXME|HACK)\b[:\s]*(.*)/i;

/** Find all TODO/FIXME/HACK comments ≥ 180 days old in the repo. */
export async function findCobwebs(cwd: string, headDate: string): Promise<Cobweb[]> {
  const headMs = new Date(headDate).getTime();
  const thresholdDays = 180;

  // git grep -n -E "(TODO|FIXME|HACK)" -- *.js *.jsx ...
  let grepOut: string;
  try {
    grepOut = await run(
      ['grep', '-n', '-E', '(TODO|FIXME|HACK)', '--', ...JS_TS_EXTS],
      cwd,
    );
  } catch (err: unknown) {
    // git grep exits 1 when no matches — that's fine
    const e = err as { message?: string };
    if (e.message?.includes('exit 1') || e.message?.includes('exit code 1')) return [];
    throw err;
  }

  const hits: Array<{ path: string; line: number; tag: string; text: string }> = [];

  for (const raw of grepOut.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    // Format: path:linenum:content
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const rest = line.slice(colonIdx + 1);
    const colonIdx2 = rest.indexOf(':');
    if (colonIdx2 === -1) continue;

    const filePath = line.slice(0, colonIdx).replace(/\\/g, '/');
    const lineNum = parseInt(rest.slice(0, colonIdx2), 10);
    const content = rest.slice(colonIdx2 + 1);

    if (isNaN(lineNum)) continue;

    const match = TAG_RE.exec(content);
    if (!match) continue;

    hits.push({
      path: filePath,
      line: lineNum,
      tag: match[1].toUpperCase() as 'TODO' | 'FIXME' | 'HACK',
      text: match[2].trim().slice(0, 140),
    });
  }

  // Blame each hit and filter by age
  const cobwebs: Cobweb[] = [];

  for (const hit of hits) {
    let blame: { author: string; date: string };
    try {
      blame = await blameLine(hit.path, hit.line, cwd);
    } catch {
      continue; // skip if blame fails
    }

    const blameMs = new Date(blame.date).getTime();
    const ageDays = Math.floor((headMs - blameMs) / 86_400_000);

    if (ageDays < thresholdDays) continue;

    const id = createHash('sha1')
      .update(`cobweb\0${hit.path}\0${hit.line}`)
      .digest('hex')
      .slice(0, 10);

    cobwebs.push({
      id,
      path: hit.path,
      line: hit.line,
      tag: hit.tag as 'TODO' | 'FIXME' | 'HACK',
      text: hit.text,
      author: blame.author,
      ageDays,
    });
  }

  // Sort by path, then line
  cobwebs.sort((a, b) => {
    const c = a.path.localeCompare(b.path);
    return c !== 0 ? c : a.line - b.line;
  });

  return cobwebs;
}
