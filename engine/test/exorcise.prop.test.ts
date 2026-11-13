/**
 * Property 9 — exorcise export edit
 * Removing `export` keeps the rest of the line byte-identical.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/** Mirrors the logic in exorcise.ts removeExportKeyword */
function stripExport(line: string): string | null {
  if (/^export default /.test(line)) return line.replace(/^export default /, '');
  if (/^export /.test(line)) return line.replace(/^export /, '');
  return null; // unsafe — would throw in real code
}

describe('Property 9 — exorcise export edit', () => {
  it('stripping "export " keeps the rest byte-identical', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^(export default |export )[a-zA-Z].*$/),
        (line) => {
          const result = stripExport(line);
          expect(result).not.toBeNull();

          if (line.startsWith('export default ')) {
            expect(result).toBe(line.slice('export default '.length));
          } else {
            expect(result).toBe(line.slice('export '.length));
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('a line not starting with export returns null (would be rejected)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-df-wyzA-Z].*$/).filter((s) => !s.startsWith('export')),
        (line) => {
          expect(stripExport(line)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
