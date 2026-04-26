/**
 * Confetti Animation Module
 * Renders confetti particles using canvas for celebration effects
 */

import { useAccessibilityStore } from "@/lib/accessibility";

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/**
 * Check if animations should be shown based on accessibility settings
 */
function shouldShowConfetti(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const store = useAccessibilityStore.getState();
  const settings = store.settings;

  // Respect prefers-reduced-motion (also set by autism profile)
  if (settings.reducedMotion) {
    return false;
  }

  return true;
}

/**
 * Create and play confetti animation
 * @param options Configuration for confetti animation
 */
export function playConfetti(
  options: {
    duration?: number;
    particleCount?: number;
    colors?: string[];
  } = {},
): void {
  if (!shouldShowConfetti()) {
    return;
  }

  const {
    duration = 2000,
    particleCount = 40,
    colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"],
  } = options;

  // Create canvas element
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Style canvas
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    pointerEvents: "none",
    zIndex: "9999",
  });

  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  // Initialize particles
  const particles: ConfettiParticle[] = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 5 + 5,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.2,
      life: 0,
      maxLife: duration,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    });
  }

  const startTime = Date.now();

  function animate(): void {
    if (!ctx) return;
    const elapsed = Date.now() - startTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    let hasAlive = false;

    particles.forEach((p) => {
      p.life = elapsed;

      if (p.life < p.maxLife) {
        hasAlive = true;

        // Apply gravity
        p.vy += 0.2;

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.angularVelocity;

        // Calculate opacity
        const progress = p.life / p.maxLife;
        const opacity = Math.max(0, 1 - progress);

        // Draw particle (square rotated by angle)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (hasAlive) {
      requestAnimationFrame(animate);
    } else {
      // Clean up
      canvas.remove();
    }
  }

  animate();
}

/**
 * Play a subtle celebration animation (fewer, smaller particles)
 */
export function playSubtleConfetti(): void {
  playConfetti({
    duration: 1500,
    particleCount: 20,
    colors: ["#FFD700", "#FFA07A"],
  });
}

/**
 * Play a grand celebration animation (more, larger particles)
 */
export function playGrandConfetti(): void {
  playConfetti({
    duration: 3000,
    particleCount: 60,
    colors: [
      "#FFD700",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F38181",
    ],
  });
}
