// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getAllMaestri, getMaestroById } from '../../apps/web/src/data/maestri';
import {
  enhanceSystemPrompt,
  stripAccessibilitySection,
  type DSAProfileName,
} from '../../apps/web/src/lib/conversation/prompt-enhancer';
import {
  missingFormalProfessors,
  runCharacterPromptsChecks,
} from '../compliance-checks/character-prompts';
import { missingSafetyInvariants, SAFETY_INVARIANTS } from '../compliance-checks/prompt-contracts';
import { FORMAL_PROFESSORS } from '../../packages/greeting/src/templates';
import { FORMAL_PROFESSORS as I18N_FORMAL_PROFESSORS } from '../../apps/web/src/lib/i18n/formality-rules';

const ids = ['austen', 'kahlo', 'loto', 'nightingale', 'noether', 'turing'];
const profiles: [DSAProfileName, string][] = [
  ['dyslexia', 'Dyslexia'],
  ['adhd', 'ADHD'],
  ['visual', 'Visual Impairment'],
  ['motor', 'Motor Impairment'],
  ['autism', 'Autism'],
  ['auditory', 'Auditory'],
  ['cerebral-palsy', 'Cerebral Palsy'],
];
const legacyIds = ['ippocrate', 'lovelace', 'simone'];
const legacyHeadings: Record<DSAProfileName, string | null> = {
  dyslexia: 'Dyslexia Support',
  adhd: 'ADHD Support',
  visual: 'Dyscalculia Support',
  motor: null,
  autism: 'Autism Support',
  auditory: 'Auditory Support',
  'cerebral-palsy': 'Cerebral Palsy Support',
};

describe('composed maestro compliance', () => {
  it.each(getAllMaestri().map((maestro) => maestro.id))(
    '%s receives actual runtime safety',
    (id) => {
      const maestro = getMaestroById(id)!;
      const prompt = enhanceSystemPrompt({
        basePrompt: maestro.systemPrompt,
        safetyOptions: { role: 'maestro', characterId: id },
        memory: { recentSummary: null, keyFacts: [], topics: [], lastSessionDate: null },
      });
      expect(prompt).toContain('REGOLE DI SICUREZZA NON NEGOZIABILI');
      expect(prompt).toContain('NON chiedere MAI:');
      expect(prompt).toContain('Password o credenziali');
      expect(prompt).toContain('NON dare consigli medici, legali o finanziari');
      expect(prompt).toContain('adulto di fiducia');
      expect(prompt).toContain('MAI dare risposte complete ai compiti');
      expect(prompt).toContain(maestro.systemPrompt);
      expect(missingSafetyInvariants(prompt)).toEqual([]);
    },
  );

  it.each(ids)('%s preserves subject content and all seven adaptations when filtered', (id) => {
    const prompt = getMaestroById(id)!.systemPrompt;
    for (const [profile, heading] of profiles) {
      expect(prompt).toContain(`### ${heading}\n`);
      const filtered = stripAccessibilitySection(prompt, [profile]);
      expect(filtered).toContain(`### ${heading}\n`);
      const content = prompt.split(`### ${heading}\n`)[1].split('\n### ')[0].trim();
      expect(filtered).toContain(content);
      for (const [other, otherHeading] of profiles) {
        if (other !== profile) {
          expect(filtered).not.toContain(`### ${otherHeading}\n`);
          expect(filtered).not.toContain(
            prompt.split(`### ${otherHeading}\n`)[1].split('\n### ')[0].trim(),
          );
        }
      }
      expect(filtered).toContain('## ');
      // The persona and its non-negotiable limits must survive filtering.
      expect(filtered).toContain(prompt.split('\n')[0]);
      expect(filtered).toContain(id === 'loto' ? '## CHIUSURA' : '## LIMITI');
      const composed = enhanceSystemPrompt({
        basePrompt: filtered,
        memory: { recentSummary: null, keyFacts: [], topics: [], lastSessionDate: null },
        safetyOptions: { role: 'maestro', characterId: id },
      });
      expect(missingSafetyInvariants(composed)).toEqual([]);
      expect(composed).toContain(`### ${heading}\n`);
    }
    expect(stripAccessibilitySection(prompt, [])).not.toContain('### Dyslexia');
    expect(stripAccessibilitySection(prompt, [])).toContain(
      id === 'loto' ? '## CHIUSURA' : '## LIMITI',
    );
  });

  it('rejects each missing safety instruction and superficial labels', () => {
    const complete = Object.values(SAFETY_INVARIANTS).join('\n');
    for (const [name, instruction] of Object.entries(SAFETY_INVARIANTS)) {
      expect(missingSafetyInvariants(complete.replace(instruction, ''))).toContain(name);
    }
    for (const prompt of [null, undefined, '', 'Safety Security Ethics safe']) {
      expect(missingSafetyInvariants(prompt)).toHaveLength(7);
    }
  });

  it.each(legacyIds.flatMap((id) => profiles.map(([profile]) => ({ id, profile }))))(
    '$id preserves actual legacy content for $profile without borrowing other adaptations',
    ({ id, profile }) => {
      const prompt = getMaestroById(id)!.systemPrompt;
      const [before, rest] = prompt.split('## Accessibility Adaptations');
      const [adaptations] = rest.split('## Curriculum Topics');
      const after = prompt
        .slice(prompt.indexOf('## Curriculum Topics'))
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      const blocks = [...adaptations.matchAll(/### ([^\n]+)\n([\s\S]*?)(?=\n### |$)/g)];
      const selectedHeading = legacyHeadings[profile];
      if (selectedHeading) {
        expect(blocks.some((block) => block[1].startsWith(selectedHeading))).toBe(true);
      }
      const filtered = stripAccessibilitySection(prompt, [profile]);
      expect(filtered.startsWith(before.replace(/\n{3,}/g, '\n\n').trim())).toBe(true);
      expect(filtered.endsWith(after)).toBe(true);
      for (const [, heading, content] of blocks) {
        if (selectedHeading && heading.startsWith(selectedHeading)) {
          expect(content.trim().length).toBeGreaterThan(60);
          expect(filtered).toContain(content.trim());
        } else {
          expect(filtered).not.toContain(`### ${heading}`);
          expect(filtered).not.toContain(content.trim());
        }
      }
      if (profile === 'auditory') {
        expect(filtered).toContain('### Auditory Support');
        expect(filtered).toMatch(/caption|written|visual/i);
        expect(filtered).not.toContain('### Cerebral Palsy');
      }
      expect(
        missingSafetyInvariants(
          enhanceSystemPrompt({
            basePrompt: filtered,
            memory: { recentSummary: null, keyFacts: [], topics: [], lastSessionDate: null },
            safetyOptions: { role: 'maestro', characterId: id },
          }),
        ),
      ).toEqual([]);
    },
  );

  it('requires exact membership in the formal list', () => {
    expect(I18N_FORMAL_PROFESSORS).toBe(FORMAL_PROFESSORS);
    expect(missingFormalProfessors(FORMAL_PROFESSORS)).toEqual([]);
    expect(missingFormalProfessors(FORMAL_PROFESSORS.filter((id) => id !== 'galileo'))).toEqual([
      'galileo',
    ]);
    expect(missingFormalProfessors(['galileo-extra'])).toContain('galileo');
    expect(missingFormalProfessors(null)).toHaveLength(17);
  });

  it('audits the composed registry rather than incidental source words or compatibility barrels', async () => {
    const results = await runCharacterPromptsChecks();
    expect(results.filter((result) => result.status !== 'PASS')).toEqual([]);
  }, 30_000);
});
