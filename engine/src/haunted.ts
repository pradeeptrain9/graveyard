import type { HauntedHouse } from './schema.js';

export interface CommitInfo {
  path: string;
  /** authors who committed in the window */
  authors: Set<string>;
  commits: number;
}

/**
 * Pure function: rank the most-churned files.
 *
 * @param commitCounts - map of path → commit count in the 90-day window
 * @param authorsByPath - map of path → set of distinct authors in the window
 * @returns top 10 HauntedHouse entries, sorted by commits90d desc, path asc
 */
export function rankHaunted(
  commitCounts: Map<string, number>,
  authorsByPath: Map<string, Set<string>>,
): HauntedHouse[] {
  const entries: HauntedHouse[] = [];

  for (const [path, commits90d] of commitCounts) {
    if (commits90d === 0) continue;
    const authSet = authorsByPath.get(path) ?? new Set<string>();
    entries.push({ path, commits90d, authors: authSet.size });
  }

  // Sort by commits90d desc, ties broken by path asc
  entries.sort((a, b) => {
    if (b.commits90d !== a.commits90d) return b.commits90d - a.commits90d;
    return a.path.localeCompare(b.path);
  });

  return entries.slice(0, 10);
}
