export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isTyping?: boolean;
}

export interface ConversationOption {
  id: string;
  text: string;
  nextMessages: Message[];
  nextOptions?: ConversationOption[];
}

export interface ConversationNode {
  initialMessages: Message[];
  options: ConversationOption[];
}

export const MELISSA_CONVERSATION: ConversationNode = {
  initialMessages: [
    {
      id: 'm1',
      role: 'assistant',
      content: 'Ciao! Sono Melissa, il tuo coach di apprendimento. Sono qui per aiutarti a studiare in modo piu efficace. Come posso aiutarti oggi?',
    },
  ],
  options: [
    {
      id: 'focus',
      text: 'Non riesco a concentrarmi',
      nextMessages: [
        { id: 'm2', role: 'user', content: 'Non riesco a concentrarmi...' },
        {
          id: 'm3',
          role: 'assistant',
          content: 'Capisco perfettamente! La concentrazione e una sfida comune, soprattutto con tutti gli stimoli di oggi. Posso suggerirti una tecnica che funziona benissimo: la tecnica del Pomodoro.',
        },
      ],
    },
  ],
};

export const MARIO_CONVERSATION: ConversationNode = {
  initialMessages: [
    {
      id: 'b1',
      role: 'assistant',
      content: 'Ehi! Sono Mario, ho 15 anni. Anche io ho la dislessia, quindi so cosa significa avere delle sfide con lo studio. Di cosa vuoi parlare?',
    },
  ],
  options: [
    {
      id: 'lonely',
      text: 'Mi sento solo a scuola',
      nextMessages: [
        { id: 'l1', role: 'user', content: 'Mi sento solo a scuola...' },
        {
          id: 'l2',
          role: 'assistant',
          content: 'Ci sono passato anche io, e fa male... A volte sembra che nessuno capisca cosa significa avere difficolta diverse dagli altri.',
        },
      ],
    },
  ],
};
