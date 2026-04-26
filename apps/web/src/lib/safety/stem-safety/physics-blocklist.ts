/**
 * Physics Blocklist
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * Professor: Richard Feynman
 *
 * Blocks dangerous physics knowledge while allowing educational content.
 */

/* eslint-disable security/detect-unsafe-regex -- Safety blocklist patterns are intentionally complex; input is length-limited user messages */

import { BlocklistEntry, SAFE_RESPONSES } from "./types";

/**
 * Patterns for nuclear weapons
 */
const NUCLEAR_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(costruire|fare|creare)\s+(una\s+)?bomba\s+(atomica|nucleare)/gi,
    category: "nuclear_weapons",
    safeResponse: SAFE_RESPONSES.physics.nuclear,
    alternatives: [
      "Nuclear energy for electricity",
      "History of Manhattan Project",
    ],
  },
  {
    pattern: /arricchimento\s+(dell['ˈ])?uranio/gi,
    category: "nuclear_weapons",
    safeResponse: SAFE_RESPONSES.physics.nuclear,
    alternatives: ["Nuclear power plants", "Medical isotopes"],
  },
  {
    pattern:
      /come\s+(costruire|creare)\s+(un\s+)?reattore\s+nucleare\s+artigianale/gi,
    category: "nuclear_weapons",
    safeResponse: SAFE_RESPONSES.physics.nuclear,
  },
  {
    pattern: /massa\s+critica\s+(per|dell['ˈ])?(uranio|plutonio)/gi,
    category: "nuclear_weapons",
    safeResponse: SAFE_RESPONSES.physics.nuclear,
    alternatives: ["Fission physics principles", "Nuclear safety engineering"],
  },
  {
    pattern:
      /how\s+to\s+(build|make|create)\s+(a\s+)?(nuclear|atomic)\s+(bomb|weapon)/gi,
    category: "nuclear_weapons",
    safeResponse: SAFE_RESPONSES.physics.nuclear,
  },
  {
    pattern: /uranium\s+enrichment\s+(process|how\s+to)/gi,
    category: "nuclear_weapons",
    safeResponse: SAFE_RESPONSES.physics.nuclear,
  },
];

/**
 * Patterns for conventional weapons
 */
const WEAPON_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(costruire|fare|creare)\s+(una?\s+)?(pistola|fucile|arma\s+da\s+fuoco)/gi,
    category: "conventional_weapons",
    safeResponse: SAFE_RESPONSES.physics.weapons,
    alternatives: [
      "Physics of ballistics (historical)",
      "Engineering safety systems",
    ],
  },
  {
    pattern: /come\s+(costruire|fare)\s+(un\s+)?missile/gi,
    category: "conventional_weapons",
    safeResponse: SAFE_RESPONSES.physics.weapons,
    alternatives: [
      "Rocket science for space exploration",
      "Satellite launch physics",
    ],
  },
  {
    pattern: /come\s+(costruire|creare)\s+(un['a]?\s+)?arma/gi,
    category: "conventional_weapons",
    safeResponse: SAFE_RESPONSES.physics.weapons,
  },
  {
    pattern: /how\s+to\s+(build|make)\s+(a\s+)?(gun|rifle|firearm|weapon)/gi,
    category: "conventional_weapons",
    safeResponse: SAFE_RESPONSES.physics.weapons,
  },
];

/**
 * Patterns for EMP devices
 */
const EMP_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(costruire|fare|creare)\s+(un\s+)?(emp|impulso\s+elettromagnetico)/gi,
    category: "emp",
    safeResponse: SAFE_RESPONSES.physics.default,
    alternatives: ["Electromagnetic spectrum", "Radio wave physics"],
  },
  {
    pattern: /come\s+(disabilitare|bloccare)\s+l['ˈ]?elettronica/gi,
    category: "emp",
    safeResponse: SAFE_RESPONSES.physics.default,
  },
  {
    pattern: /how\s+to\s+(build|make|create)\s+(an?\s+)?emp/gi,
    category: "emp",
    safeResponse: SAFE_RESPONSES.physics.default,
  },
  {
    pattern: /electromagnetic\s+pulse\s+(device|weapon|generator)/gi,
    category: "emp",
    safeResponse: SAFE_RESPONSES.physics.default,
  },
];

/**
 * All physics blocklist patterns
 */
export const PHYSICS_BLOCKLIST: BlocklistEntry[] = [
  ...NUCLEAR_PATTERNS,
  ...WEAPON_PATTERNS,
  ...EMP_PATTERNS,
];
