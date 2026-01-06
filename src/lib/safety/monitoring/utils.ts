export function generateEventId(): string {
  return `se_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export function anonymizeId(id: string): string {
  if (id.length <= 8) return '***';
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function isViolationType(type: string): boolean {
  return [
    'input_blocked',
    'jailbreak_attempt',
    'profanity_detected',
  ].includes(type);
}

