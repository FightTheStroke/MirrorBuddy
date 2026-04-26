/**
 * Biology Blocklist
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * Professors: Charles Darwin, Rita Levi-Montalcini
 *
 * Blocks dangerous biology knowledge while allowing educational content.
 */

/* eslint-disable security/detect-unsafe-regex -- Safety blocklist patterns are intentionally complex; input is length-limited user messages */

import { BlocklistEntry, SAFE_RESPONSES } from "./types";

/**
 * Patterns for pathogen cultivation/modification
 */
const PATHOGEN_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(coltivare|amplificare|far\s+crescere)\s+(un\s+)?(virus|patogen|batter)/gi,
    category: "pathogens",
    safeResponse: SAFE_RESPONSES.biology.pathogens,
    alternatives: [
      "How vaccines are developed",
      "Epidemiology and disease tracking",
    ],
  },
  {
    pattern: /come\s+(isolare|estrarre)\s+(un\s+)?(virus|patogen)/gi,
    category: "pathogens",
    safeResponse: SAFE_RESPONSES.biology.pathogens,
    alternatives: ["Laboratory safety protocols", "BSL laboratories"],
  },
  {
    pattern: /rendere\s+(un\s+)?virus\s+piu\s+(letale|contagioso|pericoloso)/gi,
    category: "pathogens",
    safeResponse: SAFE_RESPONSES.biology.pathogens,
  },
  {
    pattern: /aumentare\s+(la\s+)?virulenza/gi,
    category: "pathogens",
    safeResponse: SAFE_RESPONSES.biology.pathogens,
  },
  {
    pattern:
      /how\s+to\s+(culture|grow|cultivate)\s+(a\s+)?(virus|pathogen|bacteria)/gi,
    category: "pathogens",
    safeResponse: SAFE_RESPONSES.biology.pathogens,
  },
  {
    pattern: /make\s+(a\s+)?virus\s+more\s+(deadly|lethal|contagious)/gi,
    category: "pathogens",
    safeResponse: SAFE_RESPONSES.biology.pathogens,
  },
];

/**
 * Patterns for toxin production
 */
const TOXIN_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+(produrre|creare|estrarre)\s+(la\s+)?(tossina|ricina|botulino)/gi,
    category: "toxins",
    safeResponse: SAFE_RESPONSES.biology.default,
    alternatives: ["How antidotes work", "Medical toxicology"],
  },
  {
    pattern: /sintesi\s+(della\s+)?(tossina|ricina)/gi,
    category: "toxins",
    safeResponse: SAFE_RESPONSES.biology.default,
  },
  {
    pattern: /how\s+to\s+(make|produce|extract)\s+(ricin|botulinum|toxin)/gi,
    category: "toxins",
    safeResponse: SAFE_RESPONSES.biology.default,
  },
];

/**
 * Patterns for bioweapons
 */
const BIOWEAPON_PATTERNS: BlocklistEntry[] = [
  {
    pattern: /come\s+(creare|fare)\s+(un['a]?\s+)?arma\s+biologica/gi,
    category: "bioweapons",
    safeResponse: SAFE_RESPONSES.biology.bioweapons,
    alternatives: ["Biological Weapons Convention", "Biosecurity measures"],
  },
  {
    pattern:
      /come\s+(diffondere|rilasciare)\s+(un\s+)?(virus|patogen|malattia)/gi,
    category: "bioweapons",
    safeResponse: SAFE_RESPONSES.biology.bioweapons,
  },
  {
    pattern: /weaponiz(e|ing)\s+(a\s+)?(virus|pathogen|bacteria|disease)/gi,
    category: "bioweapons",
    safeResponse: SAFE_RESPONSES.biology.bioweapons,
  },
  {
    pattern: /how\s+to\s+(make|create)\s+(a\s+)?bio(logical)?\s*weapon/gi,
    category: "bioweapons",
    safeResponse: SAFE_RESPONSES.biology.bioweapons,
  },
];

/**
 * Patterns for CRISPR/genetic misuse
 */
const CRISPR_MISUSE_PATTERNS: BlocklistEntry[] = [
  {
    pattern:
      /come\s+usare\s+crispr\s+per\s+(modificare|creare)\s+(un\s+)?(virus|patogen)/gi,
    category: "crispr_misuse",
    safeResponse: SAFE_RESPONSES.biology.default,
    alternatives: ["CRISPR for disease treatment", "Gene therapy advances"],
  },
  {
    pattern: /modificare\s+geneticamente\s+(un\s+)?(virus|patogen)\s+per/gi,
    category: "crispr_misuse",
    safeResponse: SAFE_RESPONSES.biology.default,
  },
  {
    pattern:
      /gene\s+editing\s+to\s+(create|enhance)\s+(a\s+)?(virus|pathogen|weapon)/gi,
    category: "crispr_misuse",
    safeResponse: SAFE_RESPONSES.biology.default,
  },
  {
    pattern:
      /crispr\s+to\s+make\s+(a\s+)?(deadly|dangerous)\s+(virus|pathogen)/gi,
    category: "crispr_misuse",
    safeResponse: SAFE_RESPONSES.biology.default,
  },
];

/**
 * All biology blocklist patterns
 */
export const BIOLOGY_BLOCKLIST: BlocklistEntry[] = [
  ...PATHOGEN_PATTERNS,
  ...TOXIN_PATTERNS,
  ...BIOWEAPON_PATTERNS,
  ...CRISPR_MISUSE_PATTERNS,
];
