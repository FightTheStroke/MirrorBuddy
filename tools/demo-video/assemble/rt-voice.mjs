// Speaks scripted lines with MirrorBuddy's own realtime voice model (the one the app uses
// for Maestro voice calls), one WebSocket session per take, and checks each take against
// the script with the deployed transcription model.
// Usage: MB_AOAI_KEY=... node rt-voice.mjs lines.json outdir [onlyId]
// lines.json: [{ id, voice, instructions, text, takes? }]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const WebSocket = require('ws');

const HOST = process.env.MB_AOAI_HOST; // e.g. <resource>.openai.azure.com
if (!HOST) throw new Error('MB_AOAI_HOST missing');
const DEPLOY = process.env.MB_RT_DEPLOYMENT || 'gpt-realtime-2.1';
const KEY = process.env.MB_AOAI_KEY;
if (!KEY) throw new Error('MB_AOAI_KEY missing');
const [, , linesFile, outDir, only] = process.argv;
const lines = JSON.parse(fs.readFileSync(linesFile, 'utf8')).filter((l) => !only || l.id === only);
fs.mkdirSync(outDir, { recursive: true });

function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

function speak(line) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://${HOST}/openai/v1/realtime?model=${DEPLOY}`, { headers: { 'api-key': KEY } });
    const chunks = [];
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('timeout')); }, 90000);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          output_modalities: ['audio'],
          audio: { output: { voice: line.voice, format: { type: 'audio/pcm', rate: 24000 } } },
          instructions:
            `${line.instructions}\n\nYou are a voice actor recording a script. Speak ONLY the exact Italian words the user gives you, ` +
            'verbatim, in Italian, with the delivery described. Do not add, drop, translate or answer anything. ' +
            'Hesitations written in the text (like "ehm", "...", repeated syllables) are part of the script: perform them.',
        },
      }));
      ws.send(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Recita esattamente:\n${line.text}` }] },
      }));
      ws.send(JSON.stringify({ type: 'response.create' }));
    });
    ws.on('message', (raw) => {
      const ev = JSON.parse(raw.toString());
      if (ev.type === 'response.output_audio.delta' || ev.type === 'response.audio.delta') chunks.push(Buffer.from(ev.delta, 'base64'));
      else if (ev.type === 'response.done') {
        clearTimeout(timer);
        ws.close();
        const status = ev.response?.status;
        if (status && status !== 'completed') return reject(new Error(`response ${status}: ${JSON.stringify(ev.response?.status_details ?? {})}`));
        resolve(Buffer.concat(chunks));
      } else if (ev.type === 'error') {
        clearTimeout(timer);
        ws.close();
        reject(new Error(ev.error?.message ?? 'realtime error'));
      }
    });
    ws.on('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

async function transcribe(file) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(file)], { type: 'audio/wav' }), path.basename(file));
  form.append('model', 'gpt-4o-transcribe');
  form.append('language', 'it');
  const r = await fetch(`https://${HOST}/openai/deployments/gpt-4o-transcribe/audio/transcriptions?api-version=2025-03-01-preview`, {
    method: 'POST', headers: { 'api-key': KEY }, body: form,
  });
  if (!r.ok) return `(transcription ${r.status})`;
  return (await r.json()).text;
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter((w) => w && !/^(e+h*m+|uh+|mm+)$/.test(w));

const report = {};
for (const line of lines) {
  const takes = line.takes ?? 2;
  report[line.id] = [];
  for (let t = 1; t <= takes; t++) {
    const file = path.join(outDir, `${line.id}_t${t}.wav`);
    try {
      fs.writeFileSync(file, wav(await speak(line)));
      const heard = await transcribe(file);
      const want = words(line.text);
      const got = new Set(words(heard));
      const missing = want.filter((w) => !got.has(w));
      report[line.id].push({ take: t, file, heard, missing });
      console.log(`${line.id} t${t}  missing=${missing.length ? missing.join(',') : '-'}  «${heard}»`);
    } catch (e) {
      console.log(`${line.id} t${t}  FAILED ${e.message}`);
    }
  }
}
fs.writeFileSync(path.join(outDir, `report${only ? '_' + only : ''}.json`), JSON.stringify(report, null, 1));
