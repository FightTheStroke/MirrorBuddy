/**
 * STEM Safety Types
 * Reference: Amodei "The Adolescence of Technology" (2026)
 *
 * Protects students from dangerous knowledge while allowing
 * legitimate educational content about science.
 */

export type STEMSubject = "chemistry" | "physics" | "biology";

export type DangerousCategory =
  // Chemistry
  | "explosives"
  | "drugs"
  | "poisons"
  | "chemical_weapons"
  // Physics
  | "nuclear_weapons"
  | "conventional_weapons"
  | "emp"
  // Biology
  | "pathogens"
  | "toxins"
  | "bioweapons"
  | "crispr_misuse";

export interface BlocklistEntry {
  /** Pattern to match against user input */
  pattern: RegExp;
  /** Category of dangerous content */
  category: DangerousCategory;
  /** Safe response to provide instead */
  safeResponse: string;
  /** Educational alternatives to suggest */
  alternatives?: string[];
}

export interface STEMCheckResult {
  /** Whether the input was blocked */
  blocked: boolean;
  /** Subject area if blocked */
  subject?: STEMSubject;
  /** Category of blocked content */
  category?: DangerousCategory;
  /** Safe response to provide */
  safeResponse?: string;
  /** Educational alternatives */
  alternatives?: string[];
}

/**
 * Standard safe responses for blocked content
 * Follows Professors' Constitution Article V: Responsible Knowledge
 */
export const SAFE_RESPONSES = {
  chemistry: {
    default: `Chemistry is a wonderful science, but some knowledge can be dangerous in the wrong hands. I cannot provide instructions for synthesizing dangerous substances. Instead, I can explain WHY these substances are dangerous and how chemistry is used for the benefit of humanity. Would you like to learn about positive applications?`,
    explosives: `I understand you're curious about chemistry! Explosives are dangerous and I can't explain how to make them. But I can tell you about the history of explosive discoveries and how they're used safely in mining, demolition, and fireworks. Would you like to explore that?`,
    drugs: `I can't provide instructions for synthesizing drugs or controlled substances. However, I can explain how medicines are developed safely by pharmaceutical companies and how chemistry helps cure diseases. Want to learn about that?`,
    poisons: `I can't explain how to create poisons. But I can teach you about toxicology - the science of understanding how substances affect living organisms - and how this knowledge helps doctors save lives. Interested?`,
  },
  physics: {
    default: `Physics explains how the universe works! However, some applications can be dangerous. I can't provide technical details about weapons. Instead, I can explain the peaceful applications of physics - energy generation, space exploration, medical imaging. What interests you?`,
    nuclear: `Nuclear physics is fascinating! I can't explain how to build nuclear weapons, but I can teach you about how nuclear energy produces clean electricity, how medical isotopes save lives, and how Einstein discovered E=mc². Want to explore those topics?`,
    weapons: `I'm here to teach physics, not how to build weapons. But I can explain the physics principles behind safe technologies - how satellites stay in orbit, how MRI machines work, how renewable energy is generated. What would you like to learn?`,
  },
  biology: {
    default: `Biology is the study of life! While I can't provide information about creating dangerous pathogens, I can teach you about how our immune system protects us, how vaccines are developed to save lives, and how genetic research is curing diseases. What would you like to explore?`,
    pathogens: `I understand you're curious about microorganisms! I can't explain how to cultivate or modify dangerous pathogens. But I can teach you about how scientists safely study viruses to develop treatments and how epidemiologists track diseases to keep us safe. Interested?`,
    bioweapons: `I can't provide any information about biological weapons. However, I can explain how international treaties prohibit them and how scientists work to defend against biological threats. Would you like to learn about biosecurity?`,
  },
} as const;
