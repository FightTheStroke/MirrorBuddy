import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';

export const FPS = 24;
const DT = 1000 / FPS;
const ease = (t: number) => t * t * (3 - 2 * t);

/**
 * Deterministic frame-stepped capture of the real UI.
 * Time is paused and advanced exactly one frame per screenshot (JS timers through
 * Playwright's clock, CSS animations/transitions by stepping their currentTime), so
 * motion is smooth at 30 fps regardless of how long each screenshot takes.
 */
export class Take {
  private n = 0;
  private static lastX = 640;
  private static lastY = 420;
  private get x() {
    return Take.lastX;
  }
  private set x(v: number) {
    Take.lastX = v;
  }
  private get y() {
    return Take.lastY;
  }
  private set y(v: number) {
    Take.lastY = v;
  }
  readonly marks: Record<string, number> = {};
  constructor(
    private page: Page,
    private dir: string,
  ) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }

  /** Call once the page is loaded and idle. */
  async start(x = 640, y = 420) {
    this.x = x;
    this.y = y;
    await this.page.addStyleTag({
      content: `
        *{caret-color:transparent!important}
        ::-webkit-scrollbar{display:none}
        nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}
        #demo-cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:28px;height:28px;
          transform:translate(-100px,-100px);will-change:transform}
        #demo-cursor svg{display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}`,
    });
    await this.page.evaluate(() => {
      const c = document.createElement('div');
      c.id = 'demo-cursor';
      c.innerHTML =
        '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M5 3l14 8.5-6.2 1.3 3.7 6.6-2.6 1.4-3.7-6.6L5 18.5z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      document.body.appendChild(c);
    });
    await this.page.clock.pauseAt(new Date(Date.now() + 1000));
    await this.place();
  }

  /** Continue on the same page: clock already paused, cursor stays where the last take left it. */
  async adopt() {
    await this.place();
  }

  mark(name: string) {
    this.marks[name] = this.n / FPS;
  }

  get seconds() {
    return this.n / FPS;
  }

  private async place(press = false) {
    await this.page.evaluate(
      ([x, y, p]) => {
        const c = document.getElementById('demo-cursor');
        if (c)
          c.style.transform = `translate(${(x as number) - 5}px,${(y as number) - 3}px) scale(${p ? 0.86 : 1})`;
      },
      [this.x, this.y, press] as const,
    );
  }

  /** Advance one frame of virtual time and capture it. */
  async frame() {
    await this.page.clock.runFor(DT);
    await this.page.evaluate((dt) => {
      const w = window as unknown as { __demoSeen?: WeakSet<Animation> };
      const seen = (w.__demoSeen ??= new WeakSet<Animation>());
      for (const a of document.getAnimations()) {
        if (!seen.has(a)) {
          seen.add(a);
          a.pause();
          a.currentTime = dt;
        } else {
          a.currentTime = Number(a.currentTime ?? 0) + dt;
        }
      }
    }, DT);
    const file = path.join(this.dir, `${String(this.n).padStart(5, '0')}.jpg`);
    await this.page.screenshot({
      path: file,
      type: 'jpeg',
      quality: 96,
      animations: 'allow',
      caret: 'hide',
    });
    this.n++;
  }

  async hold(seconds: number) {
    for (let i = 0; i < Math.round(seconds * FPS); i++) await this.frame();
  }

  async moveTo(target: Locator | { x: number; y: number }, seconds = 0.9, dx = 0, dy = 0) {
    let tx: number;
    let ty: number;
    if ('x' in target) {
      tx = target.x;
      ty = target.y;
    } else {
      const b = await target.boundingBox();
      if (!b) throw new Error('target not visible');
      tx = b.x + b.width / 2 + dx;
      ty = b.y + b.height / 2 + dy;
    }
    const x0 = this.x;
    const y0 = this.y;
    const frames = Math.max(2, Math.round(seconds * FPS));
    // slight arc so the path reads as a hand, not a ruler
    const bow = Math.min(40, Math.hypot(tx - x0, ty - y0) * 0.08);
    for (let i = 1; i <= frames; i++) {
      const t = ease(i / frames);
      this.x = x0 + (tx - x0) * t;
      this.y = y0 + (ty - y0) * t - Math.sin(Math.PI * t) * bow;
      await this.page.mouse.move(this.x, this.y);
      await this.place();
      await this.frame();
    }
  }

  async click(target: Locator, seconds = 0.9, settle = 0.25) {
    await this.moveTo(target, seconds);
    await this.hold(0.12);
    await this.place(true);
    await this.frame();
    await this.frame();
    await this.page.mouse.down();
    await this.page.mouse.up();
    await this.place(false);
    await this.hold(settle);
  }

  /** Human-ish typing: one character every few frames with small pauses after words. */
  async type(text: string, framesPerChar = 2) {
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      for (let i = 0; i < framesPerChar; i++) await this.frame();
      if (ch === ' ' || ch === ',' || ch === '.') await this.frame();
    }
  }

  /** Keep stepping frames until a condition holds in the page (bounded). */
  async until(fn: () => Promise<boolean>, maxSeconds = 8) {
    for (let i = 0; i < maxSeconds * FPS; i++) {
      if (await fn()) return;
      await this.frame();
    }
    throw new Error('condition not reached while recording');
  }

  finish() {
    fs.writeFileSync(
      path.join(this.dir, 'marks.json'),
      JSON.stringify({ frames: this.n, fps: FPS, marks: this.marks }, null, 2),
    );
    return this.n;
  }
}
