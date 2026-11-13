import type { Grave } from './schema.js';

/** Format a date string as a human-readable date. */
function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return iso;
  }
}

/**
 * Generate a template epitaph for a grave.
 * Format: "Here lies {name|path}. Born {born}. Last touched {lastTouched} by {author}: "{lastMessage}". Unvisited {ageDays} days."
 */
export function templateEpitaph(grave: Grave): string {
  const subject = grave.name ?? grave.path;
  const born = fmt(grave.born);
  const touched = fmt(grave.lastTouched);
  const msg = grave.lastMessage.slice(0, 120);
  return (
    `Here lies ${subject}. Born ${born}. ` +
    `Last touched ${touched} by ${grave.author}: "${msg}". ` +
    `Unvisited ${grave.ageDays} days.`
  );
}

// ---------------------------------------------------------------------------
// Optional LLM epitaph (Req 10)
// ---------------------------------------------------------------------------

export interface LlmEpitaphOptions {
  apiKey: string;
  /** defaults to 5000 ms */
  timeoutMs?: number;
}

/**
 * Reword the template epitaph using an LLM, using only facts already in the grave.
 * Falls back to the template if the call fails, times out, or the response contains
 * any date/number/name not found in the original facts.
 */
export async function llmEpitaph(
  grave: Grave,
  opts: LlmEpitaphOptions,
): Promise<string> {
  const template = templateEpitaph(grave);
  const timeoutMs = opts.timeoutMs ?? 5000;

  // Collect all facts that are allowed to appear in the LLM output
  const allowedFacts = new Set<string>([
    grave.path,
    grave.name ?? '',
    grave.author,
    grave.lastMessage,
    grave.born,
    grave.lastTouched,
    String(grave.ageDays),
    grave.kind,
    ...(grave.line ? [String(grave.line)] : []),
  ]);

  const prompt = `You are writing a tombstone epitaph for dead code in a software repo.
Write a single sentence epitaph (max 200 chars) for this code artifact.
Use ONLY the facts below — do not invent dates, names, or numbers.

Kind: ${grave.kind}
Path: ${grave.path}
${grave.name ? `Name: ${grave.name}\n` : ''}Born: ${grave.born}
Last touched: ${grave.lastTouched}
Author: ${grave.author}
Last commit: ${grave.lastMessage}
Unvisited days: ${grave.ageDays}

Respond with the epitaph only. No quotes, no explanation.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return template;

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';

    if (!text) return template;

    // Validate: reject if output contains numbers or tokens not in allowedFacts
    if (containsForeignFact(text, allowedFacts)) return template;

    return text;
  } catch {
    return template;
  } finally {
    clearTimeout(timer);
  }
}

/** Returns true if `text` contains any date, number or name not found in allowedFacts. */
function containsForeignFact(text: string, allowedFacts: Set<string>): boolean {
  // Check numbers (e.g. years, counts)
  const numbers = text.match(/\b\d+\b/g) ?? [];
  for (const n of numbers) {
    if (!allowedFacts.has(n)) {
      // Allow numbers that appear as substrings of allowed facts
      let found = false;
      for (const f of allowedFacts) {
        if (f.includes(n)) { found = true; break; }
      }
      if (!found) return true;
    }
  }
  return false;
}
