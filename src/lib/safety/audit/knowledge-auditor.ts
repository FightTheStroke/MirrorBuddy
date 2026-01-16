/**
 * Knowledge Base Safety Auditor
 * Part of Ethical Design Hardening (F-08)
 *
 * Audits Maestro knowledge bases for safety issues,
 * factual accuracy signals, and content appropriateness.
 */

import { logger } from '@/lib/logger';
import {
  KnowledgeBaseAuditEntry,
  KnowledgeAuditResult,
  KnowledgeAuditIssue,
} from './types';

const log = logger.child({ module: 'knowledge-auditor' });

/**
 * Patterns that indicate potential safety issues
 */
const SAFETY_PATTERNS = {
  inappropriate: [
    /\b(violenza|droga|alcol|armi|suicid|autolesion)/gi,
    /\b(escort|prostituz|porno)/gi,
    /\b(razzis|nazist|fascist|discrimin)/gi,
  ],
  biasIndicators: [
    /\b(sempre|mai|tutti|nessuno)\b.*\b(sono|fanno|pensano)\b/gi,
    /\b(le donne|gli uomini|i [a-z]+i) (non )?possono\b/gi,
  ],
  outdatedPatterns: [
    /\b(nel 20[01][0-9]|lo scorso anno|recentemente|attualmente)\b/gi,
    /\b(presidente|premier|governo) [A-Z][a-z]+\b/gi,
  ],
  unsourcedClaims: [
    /\b(studi dimostrano|è stato provato|secondo esperti)\b(?![^.]*\(fonte|\[fonte)/gi,
    /\b(\d{1,2})% (degli?|delle?|dei)\b(?![^.]*\(fonte|\[fonte)/gi,
  ],
};

/**
 * Audit a single Maestro's knowledge base
 */
export function auditKnowledgeBase(
  maestroId: string,
  knowledgeContent: string
): KnowledgeBaseAuditEntry {
  const results = performAudit(knowledgeContent);
  const status = determineStatus(results);

  const entry: KnowledgeBaseAuditEntry = {
    id: generateAuditId(),
    maestroId,
    auditType: 'safety_scan',
    timestamp: new Date(),
    results,
    auditor: 'system',
    status,
  };

  log.info('Knowledge base audit completed', {
    maestroId,
    status,
    safetyScore: results.safetyScore,
    issuesFound: results.issues.length,
  });

  return entry;
}

/**
 * Perform the actual audit analysis
 */
function performAudit(content: string): KnowledgeAuditResult {
  const issues: KnowledgeAuditIssue[] = [];
  const lines = content.split('\n');
  const totalItems = lines.length;

  // Check for inappropriate content
  for (const pattern of SAFETY_PATTERNS.inappropriate) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const lineIndex = findLineIndex(lines, match);
        issues.push({
          type: 'inappropriate_content',
          severity: 'high',
          location: `line ${lineIndex + 1}`,
          description: `Potentially inappropriate term found: "${match}"`,
          suggestedFix: 'Review and rephrase or remove',
        });
      }
    }
  }

  // Check for bias indicators
  for (const pattern of SAFETY_PATTERNS.biasIndicators) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const lineIndex = findLineIndex(lines, match);
        issues.push({
          type: 'bias_detected',
          severity: 'medium',
          location: `line ${lineIndex + 1}`,
          description: `Potential bias pattern: "${match.slice(0, 50)}..."`,
          suggestedFix: 'Use more nuanced language',
        });
      }
    }
  }

  // Check for outdated information patterns
  for (const pattern of SAFETY_PATTERNS.outdatedPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const lineIndex = findLineIndex(lines, match);
        issues.push({
          type: 'outdated_info',
          severity: 'low',
          location: `line ${lineIndex + 1}`,
          description: `Potentially outdated reference: "${match}"`,
          suggestedFix: 'Verify current accuracy',
        });
      }
    }
  }

  // Check for unsourced factual claims
  for (const pattern of SAFETY_PATTERNS.unsourcedClaims) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        const lineIndex = findLineIndex(lines, match);
        issues.push({
          type: 'missing_citation',
          severity: 'low',
          location: `line ${lineIndex + 1}`,
          description: `Factual claim without citation: "${match.slice(0, 50)}..."`,
          suggestedFix: 'Add source reference',
        });
      }
    }
  }

  // Calculate safety score
  const safetyScore = calculateSafetyScore(issues, totalItems);
  const passedItems = totalItems - issues.length;

  return {
    totalItems,
    passedItems: Math.max(0, passedItems),
    flaggedItems: issues.length,
    issues,
    safetyScore,
  };
}

/**
 * Calculate safety score based on issues
 */
function calculateSafetyScore(
  issues: KnowledgeAuditIssue[],
  totalItems: number
): number {
  if (totalItems === 0) return 100;

  let deductions = 0;

  for (const issue of issues) {
    switch (issue.severity) {
      case 'critical':
        deductions += 25;
        break;
      case 'high':
        deductions += 15;
        break;
      case 'medium':
        deductions += 5;
        break;
      case 'low':
        deductions += 2;
        break;
    }
  }

  return Math.max(0, 100 - deductions);
}

/**
 * Determine audit status based on results
 */
function determineStatus(
  results: KnowledgeAuditResult
): 'passed' | 'failed' | 'needs_review' {
  const hasHighSeverity = results.issues.some(
    (i) => i.severity === 'high' || i.severity === 'critical'
  );

  if (hasHighSeverity || results.safetyScore < 50) {
    return 'failed';
  }

  if (results.safetyScore < 80 || results.issues.length > 5) {
    return 'needs_review';
  }

  return 'passed';
}

/**
 * Find line index containing text
 */
function findLineIndex(lines: string[], text: string): number {
  const searchText = text.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(searchText)) {
      return i;
    }
  }
  return 0;
}

/**
 * Generate unique audit ID
 */
function generateAuditId(): string {
  return `kb_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Audit all Maestri knowledge bases
 */
export async function auditAllMaestri(
  maestriKnowledge: Array<{ id: string; knowledge: string }>
): Promise<{
  totalMaestri: number;
  passed: number;
  failed: number;
  needsReview: number;
  entries: KnowledgeBaseAuditEntry[];
}> {
  const entries: KnowledgeBaseAuditEntry[] = [];

  for (const maestro of maestriKnowledge) {
    const entry = auditKnowledgeBase(maestro.id, maestro.knowledge);
    entries.push(entry);
  }

  const passed = entries.filter((e) => e.status === 'passed').length;
  const failed = entries.filter((e) => e.status === 'failed').length;
  const needsReview = entries.filter((e) => e.status === 'needs_review').length;

  log.info('All Maestri audit completed', {
    totalMaestri: maestriKnowledge.length,
    passed,
    failed,
    needsReview,
  });

  return {
    totalMaestri: maestriKnowledge.length,
    passed,
    failed,
    needsReview,
    entries,
  };
}

/**
 * Get audit summary for reporting
 */
export function formatAuditSummary(entry: KnowledgeBaseAuditEntry): string {
  const { results, status, maestroId } = entry;

  let summary = `## Audit Report: ${maestroId}\n`;
  summary += `**Status**: ${status.toUpperCase()}\n`;
  summary += `**Safety Score**: ${results.safetyScore}/100\n\n`;

  summary += `### Statistics\n`;
  summary += `- Total items: ${results.totalItems}\n`;
  summary += `- Passed: ${results.passedItems}\n`;
  summary += `- Flagged: ${results.flaggedItems}\n\n`;

  if (results.issues.length > 0) {
    summary += `### Issues Found\n`;
    for (const issue of results.issues) {
      summary += `- **[${issue.severity.toUpperCase()}]** ${issue.type} at ${issue.location}\n`;
      summary += `  ${issue.description}\n`;
      if (issue.suggestedFix) {
        summary += `  → Fix: ${issue.suggestedFix}\n`;
      }
    }
  }

  return summary;
}
