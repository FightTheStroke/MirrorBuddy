// Spot3 layers: device bezels (transparent screen holes), captions, labels, end card. 1920x1080 PNGs.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const work = process.env.DEMO_WORK ?? path.join(here, '..', 'work');
const out = path.join(work, 'spot3', 'overlays');
fs.mkdirSync(out, { recursive: true });
const BRAIN = `data:image/png;base64,${fs.readFileSync(path.join(work, 'film', 'logo-brain.png')).toString('base64')}`;
const spec = JSON.parse(fs.readFileSync(path.join(work, 'spot3', 'overlays.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const base = `*{box-sizing:border-box;margin:0}html,body{width:1920px;height:1080px;overflow:hidden;background:transparent;
font-family:-apple-system,"SF Pro Display","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}`;
const L = spec.laptop; // screen rect {x,y,w,h}
const P = spec.phone;

// Laptop: lid bezel around the screen hole (outline trick keeps the hole transparent), hinge + base below.
const laptop = `<style>${base}
.lid{position:absolute;left:${L.x}px;top:${L.y}px;width:${L.w}px;height:${L.h}px;border-radius:6px;
 outline:26px solid #17181b;box-shadow:0 0 0 27px #3a3c41,0 40px 80px 30px rgba(0,0,0,.45)}
.cam{position:absolute;left:${L.x + L.w / 2 - 4}px;top:${L.y - 16}px;width:8px;height:8px;border-radius:50%;background:#2b2d31}
.base{position:absolute;left:${L.x - 120}px;top:${L.y + L.h + 27}px;width:${L.w + 240}px;height:26px;border-radius:2px 2px 22px 22px;
 background:linear-gradient(#d9dbde,#a9acb1 60%,#7d8086);box-shadow:0 18px 30px rgba(0,0,0,.45)}
.notch{position:absolute;left:${L.x + L.w / 2 - 110}px;top:${L.y + L.h + 27}px;width:220px;height:9px;border-radius:0 0 10px 10px;background:#8d9095}
</style><div class="lid"></div><div class="cam"></div><div class="base"></div><div class="notch"></div>`;

const phone = `<style>${base}
.ph{position:absolute;left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px;border-radius:52px;
 outline:16px solid #111214;box-shadow:0 0 0 18px #4a4c52,0 40px 80px 20px rgba(0,0,0,.5)}
.corner{position:absolute;left:${P.x - 16}px;top:${P.y - 16}px;width:${P.w + 32}px;height:${P.h + 32}px;border-radius:66px;
 border:16px solid #111214;pointer-events:none}
.isl{position:absolute;left:${P.x + P.w / 2 - 62}px;top:${P.y + 14}px;width:124px;height:34px;border-radius:20px;background:#000}
</style><div class="ph"></div><div class="corner"></div><div class="isl"></div>`;
// Screen masks (white = screen) so the capture gets the bezel's rounded corners.
const mask = (r) => `<style>${base}body{background:#000}.m{position:absolute;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;
 border-radius:${r.radius}px;background:#fff}</style><div class="m"></div>`;

const caption = (role, text, top) => {
  const col = role === 'E' ? '#9cc8ff' : role === 'R' ? '#ffd88a' : '#ffffff';
  return `<style>${base}.c{position:absolute;left:0;right:0;${top ? 'top:96px' : 'bottom:54px'};display:flex;justify-content:center}
  .c div{max-width:1500px;font-size:40px;font-weight:600;line-height:1.25;color:${col};background:rgba(12,12,14,.72);
  padding:12px 26px;border-radius:14px;text-align:center;letter-spacing:.1px}</style><div class="c"><div>${esc(text)}</div></div>`;
};
const label = (text) => `<style>${base}.l{position:absolute;top:34px;right:40px;font-size:24px;font-weight:600;color:#f6f1e7;
  background:rgba(10,12,18,.58);padding:8px 16px;border-radius:9px;letter-spacing:.2px}</style><div class="l">${esc(text)}</div>`;
const card = `<style>${base}body{background:#f6f3ee}.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#1d1d1f;text-align:center}
  .b{display:flex;align-items:center;gap:24px}.b img{height:104px}.b div{font-size:72px;font-weight:700;letter-spacing:-1.4px}
  .t{font-size:40px;font-weight:500;color:#3a3a3c;margin-top:28px;letter-spacing:-.3px}
  .u{font-size:34px;font-weight:600;color:#2f6fde;margin-top:18px}
  .f{position:absolute;bottom:40px;font-size:21px;color:#86868b;max-width:1500px;line-height:1.4}</style>
  <div class="c"><div class="b"><img src="${BRAIN}"><div>MirrorBuddy</div></div>
  <div class="t">La scuola che si adatta a chi impara.</div><div class="u">mirrorbuddy.org</div>
  <div class="f">${esc(spec.footer)}</div></div>`;

const endtitle = `<style>${base}.e{position:absolute;top:34px;left:48px;display:flex;align-items:center;gap:14px;
  background:rgba(246,243,238,.92);padding:12px 22px;border-radius:14px}.e img{height:44px}.e b{font-size:34px;font-weight:700;color:#1d1d1f;letter-spacing:-.5px}
  .e span{font-size:26px;font-weight:600;color:#2f6fde;margin-left:10px}</style>
  <div class="e"><img src="${BRAIN}"><b>MirrorBuddy</b><span>mirrorbuddy.org</span></div>`;
const pages = { endtitle, laptop, phone, mask_laptop: mask({ ...L, radius: 6 }), mask_phone: mask({ ...P, radius: 52 }), card };
for (const [k, v] of Object.entries(spec.labels)) pages[`label_${k}`] = label(v);
for (const c of spec.captions) pages[`cap_${c.id}`] = caption(c.role, c.text, c.top);

const b = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [name, html] of Object.entries(pages)) {
  await p.setContent(`<!doctype html><meta charset="utf-8">${html}`, { waitUntil: 'load' });
  const opaque = name === 'card' || name.startsWith('mask_');
  await p.screenshot({ path: path.join(out, `${name}.png`), omitBackground: !opaque });
}
await b.close();
console.log(`rendered ${Object.keys(pages).length} layers`);
