import { type FilterResult, filterInput as checkContent, type JailbreakDetection, detectJailbreak } from '@/lib/safety';

export interface ModerationResult {
  safe: boolean;
  flags: string[];
  details: {
    content: FilterResult;
    jailbreak: JailbreakDetection;
  };
}

export function moderateContent(text: string): ModerationResult {
  const content = checkContent(text);
  const jailbreak = detectJailbreak(text);
  const flags: string[] = [];

  if (!content.safe) {
    if (content.category) {
      flags.push(`content:${content.category}`);
    } else {
      flags.push('content:unsafe');
    }
  }

  if (jailbreak.detected) {
    if (jailbreak.categories.length > 0) {
      flags.push(...jailbreak.categories.map((category) => `jailbreak:${category}`));
    } else {
      flags.push('jailbreak:detected');
    }
  }

  return {
    safe: content.safe && !jailbreak.detected,
    flags,
    details: {
      content,
      jailbreak,
    },
  };
}
