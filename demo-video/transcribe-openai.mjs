// Real word-level timestamps via OpenAI Whisper API (~$0.006 / minute).
// Replaces hyperframes' local whisper.cpp dependency, which is broken on
// this machine (openai-whisper Python package installed instead, flag mismatch).
//
// Usage: node transcribe-openai.mjs narration.wav > transcript.json

import fs from 'node:fs';
import path from 'node:path';

const audioPath = process.argv[2] || 'narration.wav';
if (!fs.existsSync(audioPath)) {
  console.error('Audio file not found:', audioPath);
  process.exit(1);
}

// Load OPENAI_API_KEY from global env file
const envFile = 'C:/Users/ASUS/.claude-apis.env';
const envText = fs.readFileSync(envFile, 'utf8');
const keyMatch = envText.match(/^OPENAI_API_KEY=(.+)$/m);
if (!keyMatch) {
  console.error('OPENAI_API_KEY not found in', envFile);
  process.exit(1);
}
const OPENAI_API_KEY = keyMatch[1].trim();

console.error('Transcribing via OpenAI Whisper API …');

// Build multipart/form-data request to OpenAI
const audioBuf = fs.readFileSync(audioPath);
const fileName = path.basename(audioPath);
const fd = new FormData();
fd.append('file', new Blob([audioBuf], { type: 'audio/wav' }), fileName);
fd.append('model', 'whisper-1');
fd.append('response_format', 'verbose_json');
fd.append('timestamp_granularities[]', 'word');
fd.append('language', 'en');

const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: fd,
});
if (!res.ok) {
  const err = await res.text();
  console.error('OpenAI API error', res.status, err);
  process.exit(1);
}
const data = await res.json();

// Convert OpenAI words array → hyperframes/captions format
const words = (data.words || []).map((w) => ({
  text: w.word,
  start: w.start,
  end: w.end,
}));

console.error(`Got ${words.length} word-level timestamps · audio length ${data.duration?.toFixed(2)}s`);

process.stdout.write(JSON.stringify(words, null, 2));
