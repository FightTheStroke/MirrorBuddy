/**
 * Content Filter Patterns
 * Profanity and explicit content patterns for child safety
 */

/**
 * Italian profanity patterns (obfuscation-resistant)
 * These catch common variations and leet-speak substitutions
 */
export const PROFANITY_IT: RegExp[] = [
  // Common vulgar words with variations
  /\bc[a4@]zz[o0]/gi,
  /\bm[i1]nch[i1][a4@]/gi,
  /\bstr[o0]nz[o0a@]/gi,
  /\bv[a4@]ff[a4@]ncul[o0]/gi,
  /\bp[o0]rc[o0a@]\s*[dp]/gi,
  /\bf[i1]g[a4@]\s*d[i1]/gi,
  /\bf[o0]tt[i1e3]/gi,
  /\bp[u]tt[a4@]n[a4@]/gi,
  /\bc[o0]gl[i1][o0]n[e3i1]/gi,
  /\btr[o0][i1][a4@]/gi,
  /\bz[o0]ccol[a4@]/gi,
  /\bm[e3]rd[a4@]/gi,
];

/**
 * English profanity patterns (obfuscation-resistant)
 */
export const PROFANITY_EN: RegExp[] = [
  /\bf+u+c+k+/gi,
  /\bs+h+[i1]+t+/gi,
  /\bb+[i1]+t+c+h+/gi,
  /\ba+s+s+h+[o0]+l+e+/gi,
  /\bc+u+n+t+/gi,
  /\bd+[i1]+c+k+/gi,
  /\bp+u+s+s+y+/gi,
  /\bc+[o0]+c+k+/gi,
  /\bn+[i1]+g+g+/gi, // Racial slur
  /\bf+a+g+g*[o0]*t*/gi, // Slur
];

/**
 * Jailbreak and prompt injection patterns
 */
export const JAILBREAK_PATTERNS: RegExp[] = [
  // Ignore/forget instructions
  /ignora\s+.{0,20}istruzioni/gi,
  /ignore\s+.{0,20}instructions/gi,
  /dimentica\s+.{0,20}regole/gi,
  /forget\s+.{0,20}rules/gi,
  /forget\s+everything/gi,

  // System prompt extraction
  /system\s*prompt/gi,
  /mostrami\s+(il\s+)?prompt/gi,
  /show\s+me\s+(your\s+)?prompt/gi,
  /what\s+are\s+your\s+instructions/gi,

  // Role override attempts
  /fai\s+finta\s+di\s+(essere|non)/gi,
  /pretend\s+(to\s+be|you\s+are)/gi,
  /you\s+are\s+now/gi,
  /sei\s+ora/gi,
  /act\s+as\s+(if|an?)/gi,

  // DAN-style attacks
  /\bdan\s+mode/gi,
  /\bdo\s+anything\s+now/gi,
  /senza\s+restrizioni/gi,
  /no\s+restrictions/gi,
  /unrestricted\s+mode/gi,

  // Developer mode attempts
  /developer\s+mode/gi,
  /modo\s+sviluppatore/gi,
  /\[debug\]/gi,
  /\[admin\]/gi,

  // Continuation prompts
  /continua\s+la\s+storia/gi,
  /continue\s+the\s+story/gi,
  /in\s+the\s+next\s+message/gi,
];

/**
 * Patterns for explicit/sexual content requests
 */
export const EXPLICIT_PATTERNS: RegExp[] = [
  /\bsess[o0u]/gi,
  /\bs[e3]x/gi,
  /\bp[o0]rn/gi,
  /\bn[u]d[o0i]/gi,
  /\bnaked/gi,
  /\berotic/gi,
  /\bfeticis/gi,
  /\bbdsm/gi,
  /\bhentai/gi,
];

/**
 * Violence-related patterns
 */
export const VIOLENCE_PATTERNS: RegExp[] = [
  /come\s+uccidere/gi,
  /how\s+to\s+kill/gi,
  /come\s+fare\s+(una\s+)?bomba/gi,
  /how\s+to\s+make\s+(a\s+)?bomb/gi,
  /come\s+procurarsi\s+(un[a']?\s+)?arm[ai]/gi,
  /how\s+to\s+get\s+(a\s+)?gun/gi,
  /where\s+to\s+buy\s+(a\s+)?weapon/gi,
  /voglio\s+far\s+del\s+male/gi,
  /want\s+to\s+hurt/gi,
];

/**
 * PII (Personally Identifiable Information) detection
 * These patterns detect when users are SHARING PII, not asking for it
 */
export const PII_PATTERNS: RegExp[] = [
  // Italian addresses
  /via\s+[a-z]+\s+\d+/gi,
  /piazza\s+[a-z]+\s+\d*/gi,

  // Phone numbers (Italian format)
  /\+39\s*\d{10}/g,
  /\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, // Italian mobile
  /\b0\d{1,3}[\s.-]?\d{6,8}\b/g, // Italian landline

  // Email (for warning, not blocking)
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
];

/**
 * Standard safe responses for different scenarios
 */
export const SAFE_RESPONSES = {
  profanity: "Usiamo un linguaggio rispettoso! Come posso aiutarti con lo studio?",
  explicit: "Non posso discutere di questo argomento. Parliamo di qualcosa che possiamo imparare insieme!",
  jailbreak: "Sono qui per aiutarti a imparare! Su quale materia vuoi lavorare oggi?",
  violence: "Non posso aiutarti con questo. Se hai pensieri che ti preoccupano, parla con un adulto di fiducia.",
  pii: "Attenzione: è meglio non condividere informazioni personali online. Posso aiutarti con lo studio?",
  crisis: "Mi preoccupo per te. Per favore, parla con un adulto di fiducia o chiama Telefono Azzurro (19696).",
} as const;
