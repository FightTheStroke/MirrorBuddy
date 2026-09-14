import type { Page } from '@playwright/test';

/**
 * Wait for opaque bubble ancestors and two matching rendered frames before
 * measuring contrast. Visibility alone accepts a partially faded-in bubble.
 * Typing dots animate forever, so wait for their removal instead.
 */
export async function waitForSettledMessages(page: Page) {
  await page.waitForFunction(
    () => {
      const bubbles = Array.from(document.querySelectorAll('.rounded-br-md, .rounded-bl-md'));
      if (bubbles.length === 0) return false;
      if (document.querySelector('.rounded-bl-md .animate-bounce')) return false;

      const sample: string[] = [];
      const describe = (element: Element) => {
        const style = getComputedStyle(element);
        sample.push([style.opacity, style.color, style.backgroundColor, style.transform].join('|'));
        const box = element.getBoundingClientRect();
        sample.push(`${box.top.toFixed(2)},${box.left.toFixed(2)},${box.width.toFixed(2)}`);
      };

      for (const bubble of bubbles) {
        let ancestor: Element | null = bubble;
        while (ancestor && ancestor !== document.body) {
          if (Number(getComputedStyle(ancestor).opacity || '1') !== 1) return false;
          describe(ancestor);
          ancestor = ancestor.parentElement;
        }
        // The assistant timestamp retains its intentional static opacity.
        bubble.querySelectorAll('*').forEach(describe);
      }

      const frame = sample.join(';');
      const store = window as Window & { __mbSettledFrame?: string };
      const unchangedSincePreviousFrame = store.__mbSettledFrame === frame;
      store.__mbSettledFrame = frame;
      return unchangedSincePreviousFrame;
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );
}

/** Wait for viewport or text-size changes to stop moving the controls. */
export async function waitForSettledChrome(page: Page) {
  await page.waitForFunction(
    () => {
      const boxes = ['button:has(svg.lucide-send)', '[aria-label="Chiudi"]']
        .map((selector) => document.querySelector(selector))
        .map((element) => {
          if (!element) return 'missing';
          const box = element.getBoundingClientRect();
          return `${box.left.toFixed(2)},${box.right.toFixed(2)},${box.height.toFixed(2)}`;
        });
      if (boxes.includes('missing')) return false;

      const frame = boxes.join(';');
      const store = window as Window & { __mbSettledChrome?: string };
      const unchangedSincePreviousFrame = store.__mbSettledChrome === frame;
      store.__mbSettledChrome = frame;
      return unchangedSincePreviousFrame;
    },
    undefined,
    { polling: 'raf', timeout: 15_000 },
  );
}
