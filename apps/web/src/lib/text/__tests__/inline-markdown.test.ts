import { describe, expect, it } from 'vitest';
import { parseReplyText, plainReplyText } from '../inline-markdown';

describe('parseReplyText', () => {
  it.each([
    ['plain text', 'Ciao, come stai?', ['Ciao, come stai?']],
    [
      'bold and italic citation',
      'Ha **sette specchi** (*Appunti.pdf*, p. 2).',
      [
        'Ha ',
        { type: 'strong', children: ['sette specchi'] },
        ' (',
        { type: 'em', children: ['Appunti.pdf'] },
        ', p. 2).',
      ],
    ],
    [
      'underscore emphasis but not inside words',
      '__Nota__: il file_nome.pdf è _importante_',
      [
        { type: 'strong', children: ['Nota'] },
        ': il file_nome.pdf è ',
        { type: 'em', children: ['importante'] },
      ],
    ],
    ['multiplication stays text', '2 * 3 * 4 = 24 e 5*3*2 = 30', ['2 * 3 * 4 = 24 e 5*3*2 = 30']],
    [
      'italic inside bold',
      '**Il *Cinque maggio***',
      [{ type: 'strong', children: ['Il ', { type: 'em', children: ['Cinque maggio'] }] }],
    ],
    ['inline code', 'Usa `x = 2`.', ['Usa ', { type: 'code', children: ['x = 2'] }, '.']],
    ['unclosed marker stays text', 'Un **inizio senza fine', ['Un **inizio senza fine']],
    [
      'heading line becomes bold without hashes',
      '### Riassunto\nTesto',
      [{ type: 'strong', children: ['Riassunto'] }, '\nTesto'],
    ],
    ['bullets become dots', '- primo\n* secondo', ['• primo\n• secondo']],
  ])('%s', (_name, input, expected) => {
    expect(parseReplyText(input)).toEqual(expected);
  });

  it('never produces markup from HTML in the text', () => {
    expect(parseReplyText('<img src=x onerror=alert(1)> **ok**')).toEqual([
      '<img src=x onerror=alert(1)> ',
      { type: 'strong', children: ['ok'] },
    ]);
  });

  it('handles empty and missing input', () => {
    expect(parseReplyText('')).toEqual([]);
    expect(parseReplyText(undefined as unknown as string)).toEqual([]);
  });
});

describe('plainReplyText', () => {
  it('removes formatting marks so speech does not read asterisks', () => {
    expect(plainReplyText('### Titolo\n- Ha **sette specchi** (*Appunti.pdf*, p. 2).')).toBe(
      'Titolo\nHa sette specchi (Appunti.pdf, p. 2).',
    );
  });
});
