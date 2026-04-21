// Convert captions.json (phrase groups with start/end seconds) into a .srt file
// for upload alongside the YouTube video. YouTube uses uploaded .srt as the
// official subtitle track instead of auto-generated captions.

import fs from 'node:fs';

const captions = JSON.parse(fs.readFileSync('captions.json', 'utf8'));

function fmt(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

const lines = [];
captions.forEach((c, i) => {
  lines.push(String(i + 1));
  lines.push(`${fmt(c.s)} --> ${fmt(c.e)}`);
  lines.push(c.t);
  lines.push('');
});

fs.writeFileSync('narration.srt', lines.join('\n'));
console.log(`Wrote narration.srt — ${captions.length} cues, ${captions[captions.length - 1].e.toFixed(1)}s total`);
