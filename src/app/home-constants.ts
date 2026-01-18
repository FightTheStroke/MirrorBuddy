// Character info for sidebar display
export const COACH_INFO = {
  melissa: { name: "Melissa", avatar: "/avatars/melissa.jpg" },
  roberto: { name: "Roberto", avatar: "/avatars/roberto.webp" },
  chiara: { name: "Chiara", avatar: "/avatars/chiara.webp" },
  andrea: { name: "Andrea", avatar: "/avatars/andrea.webp" },
  favij: { name: "Favij", avatar: "/avatars/favij.jpg" },
} as const;

export const BUDDY_INFO = {
  mario: { name: "Mario", avatar: "/avatars/mario.jpg" },
  noemi: { name: "Noemi", avatar: "/avatars/noemi.webp" },
  enea: { name: "Enea", avatar: "/avatars/enea.webp" },
  bruno: { name: "Bruno", avatar: "/avatars/bruno.webp" },
  sofia: { name: "Sofia", avatar: "/avatars/sofia.webp" },
} as const;

// DEBUG: All pages in the project
export type DebugPage = {
  href: string;
  note: string;
  status?: "ok" | "dead" | "redirect" | "inline";
  external?: boolean;
};

export const debugPages: DebugPage[] = [
  // MAIN PAGES (visible in sidebar)
  { href: "/", note: "Home - I Professori", status: "ok" },
  { href: "/supporti", note: "Zaino - materiali salvati", status: "ok" },

  // REDIRECT PAGES
  {
    href: "/astuccio",
    note: "Redirect -> /?view=astuccio",
    status: "redirect",
  },
  { href: "/archivio", note: "Redirect -> /supporti", status: "redirect" },
  {
    href: "/study-kit",
    note: "Redirect -> /?view=astuccio",
    status: "redirect",
  },

  // ORPHANED PAGES
  {
    href: "/welcome",
    note: "Onboarding (auto-redirect if not completed)",
    status: "ok",
  },
  {
    href: "/landing",
    note: "Redirect -> /welcome (backwards compat)",
    status: "redirect",
  },

  // SHOWCASE (demo pages - not linked)
  { href: "/showcase", note: "Showcase home", status: "dead" },
  { href: "/showcase/maestri", note: "Showcase - Professori", status: "dead" },
  {
    href: "/showcase/accessibility",
    note: "Showcase - Accessibilita",
    status: "dead",
  },
  {
    href: "/showcase/flashcards",
    note: "Showcase - Flashcards",
    status: "dead",
  },
  { href: "/showcase/quiz", note: "Showcase - Quiz", status: "dead" },
  { href: "/showcase/mindmaps", note: "Showcase - Mindmaps", status: "dead" },
  { href: "/showcase/chat", note: "Showcase - Chat", status: "dead" },
  {
    href: "/showcase/solar-system",
    note: "Showcase - Solar System demo",
    status: "dead",
  },

  // ADMIN
  {
    href: "/admin/analytics",
    note: "Analytics admin (dev only)",
    status: "dead",
  },
];
