// Aligns canonical narration text (correct branding) with transcript word-level
// timestamps (accurate timing). Outputs captions.json — phrase groups with the
// text WE wrote and timings that MATCH what the voice actually says.

import fs from 'node:fs';

const transcript = JSON.parse(fs.readFileSync('transcript.json', 'utf8'));

// Canonical narration in the order the voice speaks it. Each line is one
// caption group as it should appear on screen.
const SCRIPT_GROUPS = [
  'Four ways to get paid.',
  'One URL.',
  'The Stripe of USDC on Arc',
  'For humans and AI agents.',
  'Mode one. Tips.',
  'Every tweet gets a tip button.',
  'Chrome extension injects it next to reply and retweet.',
  'Mode two. Subscriptions.',
  'Like Substack, but creators keep 98%.',
  'Per-second accrual, prorated refunds.',
  'Mode three. Content paywall.',
  'Gumroad with an on-chain receipt.',
  'Pay once, own forever.',
  'Mode four. Pay-per-call.',
  'Prepay 100 inference credits in one transaction.',
  'Every call after that is a wallet signature.',
  'x402, ERC-8183.',
  '2% protocol fee.',
  '0.5s settlement. Native USDC gas.',
  'Start building. npm create arc-app.',
];

// Tokenize each group into "comparable" words (lowercase, alphanumerics only).
// Needed because transcript word like "PM" → "PM" but our group has "npm".
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

// Build a flat list of canonical words (with their group index).
const flat = [];
SCRIPT_GROUPS.forEach((g, gi) => {
  g.split(/\s+/).forEach((w) => {
    const n = norm(w);
    if (n) flat.push({ groupIdx: gi, word: w, n });
  });
});

// Greedy align: walk transcript words, try to match in flat list order.
// For each canonical word, scan forward in transcript for a token that contains
// the canonical letters (or vice versa).
let ti = 0; // transcript index
const matches = []; // { groupIdx, transcriptIdx, start, end }
for (let fi = 0; fi < flat.length; fi++) {
  const target = flat[fi].n;
  let found = -1;
  // Try exact match within next 4 transcript words
  for (let look = 0; look < 4 && ti + look < transcript.length; look++) {
    const tw = norm(transcript[ti + look].text);
    if (tw === target) { found = ti + look; break; }
  }
  // Fallback: look for substring
  if (found === -1) {
    for (let look = 0; look < 4 && ti + look < transcript.length; look++) {
      const tw = norm(transcript[ti + look].text);
      if (tw.includes(target) || target.includes(tw)) { found = ti + look; break; }
    }
  }
  // Fallback: just take next transcript word
  if (found === -1) found = ti;
  matches.push({
    groupIdx: flat[fi].groupIdx,
    word: flat[fi].word,
    start: transcript[found].start,
    end: transcript[found].end,
  });
  ti = found + 1;
  if (ti >= transcript.length) ti = transcript.length - 1;
}

// Build per-group time spans
const groups = SCRIPT_GROUPS.map((text, gi) => {
  const ms = matches.filter((m) => m.groupIdx === gi);
  if (!ms.length) return { t: text, s: 0, e: 0 };
  return {
    t: text,
    s: +ms[0].start.toFixed(2),
    e: +ms[ms.length - 1].end.toFixed(2),
  };
});

fs.writeFileSync('captions.json', JSON.stringify(groups, null, 2));
console.log(`Built ${groups.length} caption groups aligned to transcript`);
groups.forEach((g) => console.log(`  ${String(g.s).padStart(6)}–${String(g.e).padStart(6)}  ${g.t}`));
