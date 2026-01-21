"use client";

import { cn } from "@/lib/utils";
import type { KeyboardLayout } from "@/types/tools";

interface FingerPlacementProps {
  currentKey: string;
  layout: KeyboardLayout;
  showHands?: boolean;
  size?: "sm" | "md" | "lg";
}

const FINGER_COLORS = {
  left: {
    pinky: "bg-pink-400",
    ring: "bg-purple-400",
    middle: "bg-blue-400",
    index: "bg-green-400",
    thumb: "bg-gray-400",
  },
  right: {
    pinky: "bg-pink-400",
    ring: "bg-purple-400",
    middle: "bg-blue-400",
    index: "bg-green-400",
    thumb: "bg-gray-400",
  },
};

const KEY_FINGER_DETAILED: Record<
  string,
  { hand: "left" | "right"; finger: keyof typeof FINGER_COLORS.left }
> = {
  q: { hand: "left", finger: "pinky" },
  w: { hand: "left", finger: "ring" },
  e: { hand: "left", finger: "middle" },
  r: { hand: "left", finger: "index" },
  t: { hand: "left", finger: "index" },
  y: { hand: "right", finger: "index" },
  u: { hand: "right", finger: "index" },
  i: { hand: "right", finger: "middle" },
  o: { hand: "right", finger: "ring" },
  p: { hand: "right", finger: "pinky" },
  a: { hand: "left", finger: "pinky" },
  s: { hand: "left", finger: "ring" },
  d: { hand: "left", finger: "middle" },
  f: { hand: "left", finger: "index" },
  g: { hand: "left", finger: "index" },
  h: { hand: "right", finger: "index" },
  j: { hand: "right", finger: "index" },
  k: { hand: "right", finger: "middle" },
  l: { hand: "right", finger: "ring" },
  ";": { hand: "right", finger: "pinky" },
  "'": { hand: "right", finger: "pinky" },
  z: { hand: "left", finger: "pinky" },
  x: { hand: "left", finger: "ring" },
  c: { hand: "left", finger: "middle" },
  v: { hand: "left", finger: "index" },
  b: { hand: "right", finger: "index" },
  n: { hand: "right", finger: "index" },
  m: { hand: "right", finger: "index" },
  ",": { hand: "right", finger: "middle" },
  ".": { hand: "right", finger: "ring" },
  "/": { hand: "right", finger: "pinky" },
  " ": { hand: "left", finger: "thumb" },
};

const sizeClasses = {
  sm: "w-48 h-32",
  md: "w-64 h-40",
  lg: "w-80 h-48",
};

export function FingerPlacement({
  currentKey,
  layout: _layout,
  showHands = true,
  size = "md",
}: FingerPlacementProps) {
  const fingerInfo = KEY_FINGER_DETAILED[currentKey.toLowerCase()];
  const activeColor = fingerInfo
    ? FINGER_COLORS[fingerInfo.hand][fingerInfo.finger]
    : null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        sizeClasses[size],
      )}
      role="img"
      aria-label={`Finger placement for key ${currentKey}`}
    >
      {showHands && (
        <HandsVisualization
          activeFinger={fingerInfo}
          activeColor={activeColor}
        />
      )}
      {currentKey && (
        <div className="mt-4 text-2xl font-bold">
          <kbd className="px-3 py-1 bg-muted rounded border border-border">
            {currentKey}
          </kbd>
        </div>
      )}
      {fingerInfo && (
        <div className="text-sm text-muted-foreground mt-2">
          {fingerInfo.hand === "left" ? "Left" : "Right"} {fingerInfo.finger}
        </div>
      )}
    </div>
  );
}

interface HandsVisualizationProps {
  activeFinger?: {
    hand: "left" | "right";
    finger: keyof typeof FINGER_COLORS.left;
  };
  activeColor?: string | null;
}

function HandsVisualization({
  activeFinger,
  activeColor,
}: HandsVisualizationProps) {
  return (
    <div className="flex gap-4 items-center">
      <HandSide
        side="left"
        activeFinger={activeFinger}
        activeColor={activeColor}
      />
      <div className="text-muted-foreground text-sm">or</div>
      <HandSide
        side="right"
        activeFinger={activeFinger}
        activeColor={activeColor}
      />
    </div>
  );
}

function HandSide({
  side,
  activeFinger,
  activeColor,
}: {
  side: "left" | "right";
  activeFinger?: {
    hand: "left" | "right";
    finger: keyof typeof FINGER_COLORS.left;
  };
  activeColor?: string | null;
}) {
  const isActive = activeFinger?.hand === side;
  const colors = FINGER_COLORS[side];

  return (
    <div
      className={cn(
        "flex gap-1",
        side === "left" ? "flex-row-reverse" : "flex-row",
      )}
    >
      {Object.entries(colors).map(([finger, color]) => {
        const isFingerActive = isActive && activeFinger?.finger === finger;
        const backgroundColor =
          isFingerActive && activeColor ? activeColor : color;

        return (
          <div
            key={finger}
            className={cn(
              "w-4 h-8 sm:w-5 sm:h-10 rounded-sm transition-all duration-200",
              backgroundColor,
              isFingerActive ? "ring-2 ring-primary scale-110" : "opacity-60",
            )}
            aria-label={`${side} ${finger} finger`}
          />
        );
      })}
    </div>
  );
}
