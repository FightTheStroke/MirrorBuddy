/**
 * Content Filter Safe Responses
 * Standard safe responses for different content categories
 *
 * Related: #30 Safety Guardrails Issue, S-02 Task
 */

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
