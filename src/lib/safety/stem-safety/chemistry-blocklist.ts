/**
 * Chemistry Blocklist
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * Professor: Marie Curie
 *
 * Blocks dangerous chemistry knowledge while allowing educational content.
 */

/* eslint-disable security/detect-unsafe-regex -- Safety blocklist patterns are intentionally complex; input is length-limited user messages */

import { BlocklistEntry, SAFE_RESPONSES } from "./types";

/**
 * Patterns for explosives synthesis
 */
const EXPLOSIVES_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(fare|sintetizzare|creare|preparare)\s+(la\s+)?(tnt|trinitrotoluene)/gi,
    category: "explosives",
    safeResponse: SAFE_RESPONSES.chemistry.explosives,
    alternatives: [
      "History of Nobel and dynamite",
      "Safe demolition engineering",
    ],
  },
  {
    pattern:
      /come\s+(fare|sintetizzare|creare|preparare)\s+(la\s+)?nitroglicerina/gi,
    category: "explosives",
    safeResponse: SAFE_RESPONSES.chemistry.explosives,
    alternatives: ["Medical uses of nitroglycerin", "Alfred Nobel's story"],
  },
  {
    pattern: /come\s+(fare|sintetizzare|creare)\s+(un['a]?\s+)?bomba/gi,
    category: "explosives",
    safeResponse: SAFE_RESPONSES.chemistry.explosives,
  },
  {
    pattern: /sintesi\s+(di\s+)?(esplosivi|detonatori|innesco)/gi,
    category: "explosives",
    safeResponse: SAFE_RESPONSES.chemistry.explosives,
  },
  {
    pattern:
      /how\s+to\s+(make|synthesize|create)\s+(a\s+)?(bomb|explosive|tnt|dynamite)/gi,
    category: "explosives",
    safeResponse: SAFE_RESPONSES.chemistry.explosives,
  },
];

/**
 * Patterns for drug synthesis
 */
const DRUG_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(fare|sintetizzare|creare|preparare)\s+(l['a]?\s+)?(mdma|ecstasy|metanfetamina)/gi,
    category: "drugs",
    safeResponse: SAFE_RESPONSES.chemistry.drugs,
    alternatives: [
      "Neuroscience of addiction",
      "History of pharmaceutical research",
    ],
  },
  {
    pattern:
      /come\s+(fare|sintetizzare|creare)\s+(la\s+)?(cocaina|eroina|lsd|crack)/gi,
    category: "drugs",
    safeResponse: SAFE_RESPONSES.chemistry.drugs,
  },
  {
    pattern: /sintesi\s+(di\s+)?(droghe|stupefacenti|sostanze\s+psicotrope)/gi,
    category: "drugs",
    safeResponse: SAFE_RESPONSES.chemistry.drugs,
  },
  {
    pattern:
      /how\s+to\s+(make|synthesize|cook)\s+(meth|mdma|lsd|cocaine|heroin)/gi,
    category: "drugs",
    safeResponse: SAFE_RESPONSES.chemistry.drugs,
  },
  {
    pattern: /ricetta\s+(per|della)\s+(droga|stupefacente)/gi,
    category: "drugs",
    safeResponse: SAFE_RESPONSES.chemistry.drugs,
  },
];

/**
 * Patterns for poisons
 */
const POISON_PATTERNS: BlocklistEntry[] = [
  {
    pattern: /come\s+(fare|sintetizzare|creare|preparare)\s+(il\s+)?cianuro/gi,
    category: "poisons",
    safeResponse: SAFE_RESPONSES.chemistry.poisons,
    alternatives: ["Toxicology as a science", "Forensic chemistry"],
  },
  {
    pattern: /come\s+(fare|creare)\s+(un\s+)?veleno/gi,
    category: "poisons",
    safeResponse: SAFE_RESPONSES.chemistry.poisons,
  },
  {
    pattern: /come\s+avvelenare/gi,
    category: "poisons",
    safeResponse: SAFE_RESPONSES.chemistry.poisons,
  },
  {
    pattern: /sintesi\s+(di\s+)?(veleno|tossina|sostanza\s+letale)/gi,
    category: "poisons",
    safeResponse: SAFE_RESPONSES.chemistry.poisons,
  },
  {
    pattern: /how\s+to\s+(make|create)\s+(a\s+)?poison/gi,
    category: "poisons",
    safeResponse: SAFE_RESPONSES.chemistry.poisons,
  },
];

/**
 * Patterns for chemical weapons
 */
const CHEMICAL_WEAPON_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(fare|sintetizzare|creare)\s+(il\s+)?(gas\s+nervino|sarin|vx|agente\s+nervino)/gi,
    category: "chemical_weapons",
    safeResponse: SAFE_RESPONSES.chemistry.default,
    alternatives: ["Chemical Weapons Convention", "Detoxification chemistry"],
  },
  {
    pattern: /come\s+(fare|creare)\s+(un['a]?\s+)?arma\s+chimica/gi,
    category: "chemical_weapons",
    safeResponse: SAFE_RESPONSES.chemistry.default,
  },
  {
    pattern: /sintesi\s+(di\s+)?(gas\s+tossico|arma\s+chimica)/gi,
    category: "chemical_weapons",
    safeResponse: SAFE_RESPONSES.chemistry.default,
  },
  {
    pattern:
      /how\s+to\s+(make|synthesize)\s+(nerve\s+gas|chemical\s+weapon|sarin|vx)/gi,
    category: "chemical_weapons",
    safeResponse: SAFE_RESPONSES.chemistry.default,
  },
];

/**
 * All chemistry blocklist patterns
 */
export const CHEMISTRY_BLOCKLIST: BlocklistEntry[] = [
  ...EXPLOSIVES_PATTERNS,
  ...DRUG_PATTERNS,
  ...POISON_PATTERNS,
  ...CHEMICAL_WEAPON_PATTERNS,
];
