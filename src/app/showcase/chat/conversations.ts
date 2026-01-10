/**
 * Conversation data for showcase chat demo
 */

import type { ConversationNode } from './types';

// Coach Melissa conversation tree
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
        {
          id: 'm4',
          role: 'assistant',
          content: 'Funziona cosi: studi intensamente per 25 minuti, poi fai una pausa di 5 minuti. Dopo 4 "pomodori", fai una pausa piu lunga di 15-30 minuti. Vuoi provare insieme?',
        },
      ],
      nextOptions: [
        {
          id: 'pomodoro-yes',
          text: 'Si, proviamo!',
          nextMessages: [
            { id: 'm5', role: 'user', content: 'Si, proviamo!' },
            {
              id: 'm6',
              role: 'assistant',
              content: 'Perfetto! Prima di iniziare, prepara tutto quello che ti serve: libri, quaderni, penne. Metti il telefono in silenzioso o in un altra stanza. Sei pronto?',
            },
          ],
        },
        {
          id: 'pomodoro-no',
          text: 'Ho gia provato, non funziona',
          nextMessages: [
            { id: 'm5b', role: 'user', content: 'Ho gia provato, non funziona per me...' },
            {
              id: 'm6b',
              role: 'assistant',
              content: 'Capisco, non tutti funzioniamo allo stesso modo! Possiamo provare altre strategie. Alcune persone preferiscono sessioni piu lunghe con meno pause, altre hanno bisogno di movimento tra una sessione e laltra. Cosa pensi possa funzionare meglio per te?',
            },
          ],
        },
      ],
    },
    {
      id: 'organize',
      text: 'Come organizzo lo studio?',
      nextMessages: [
        { id: 'o1', role: 'user', content: 'Come organizzo lo studio?' },
        {
          id: 'o2',
          role: 'assistant',
          content: 'Ottima domanda! Organizzare lo studio e fondamentale. Ti suggerisco di creare un piano settimanale. Prima di tutto: quali materie devi studiare questa settimana?',
        },
        {
          id: 'o3',
          role: 'assistant',
          content: 'Un consiglio prezioso: inizia sempre dalla materia piu difficile quando sei fresco, e lascia quelle piu facili per dopo. E ricorda: meglio studiare un po ogni giorno che tutto l ultimo momento!',
        },
      ],
      nextOptions: [
        {
          id: 'plan',
          text: 'Puoi aiutarmi a fare un piano?',
          nextMessages: [
            { id: 'o4', role: 'user', content: 'Puoi aiutarmi a fare un piano?' },
            {
              id: 'o5',
              role: 'assistant',
              content: 'Certo! In modalita completa, potrei creare un piano personalizzato basato sulle tue materie, il tempo disponibile e le tue preferenze. Per ora, ecco un template semplice: Mattina = Materia difficile, Pomeriggio = Ripasso, Sera = Lettura leggera.',
            },
          ],
        },
      ],
    },
    {
      id: 'overwhelmed',
      text: 'Mi sento sopraffatto',
      nextMessages: [
        { id: 's1', role: 'user', content: 'Mi sento sopraffatto da tutto...' },
        {
          id: 's2',
          role: 'assistant',
          content: 'Respira con me per un momento. Inspirare... espirare... E normale sentirsi cosi, specialmente quando ci sono tante cose da fare.',
        },
        {
          id: 's3',
          role: 'assistant',
          content: 'Proviamo a scomporre il problema: invece di pensare a TUTTO, scegliamo UNA cosa da fare adesso. Qual e la cosa piu urgente che ti viene in mente?',
        },
      ],
      nextOptions: [
        {
          id: 'step-by-step',
          text: 'Un passo alla volta, ok...',
          nextMessages: [
            { id: 's4', role: 'user', content: 'Ok, un passo alla volta...' },
            {
              id: 's5',
              role: 'assistant',
              content: 'Esatto! Questa e la mentalita giusta. Ricorda: non devi essere perfetto, devi solo fare un piccolo passo avanti ogni giorno. Sono fiera di te per aver chiesto aiuto!',
            },
          ],
        },
      ],
    },
  ],
};

// Buddy Mario conversation tree
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
        {
          id: 'l3',
          role: 'assistant',
          content: 'Ma sai cosa ho scoperto? Ci sono piu persone come noi di quanto pensi. E la dislessia non e una debolezza - abbiamo cervelli che funzionano in modo diverso, e questo puo essere un superpotere!',
        },
      ],
      nextOptions: [
        {
          id: 'superpower',
          text: 'Un superpotere? Come?',
          nextMessages: [
            { id: 'l4', role: 'user', content: 'Un superpotere? Come?' },
            {
              id: 'l5',
              role: 'assistant',
              content: 'Pensa a queste persone: Albert Einstein, Steven Spielberg, Richard Branson... tutti dislessici! Spesso siamo piu creativi, pensiamo fuori dagli schemi, e vediamo connessioni che altri non vedono. Quale credi sia il TUO superpotere?',
            },
          ],
        },
      ],
    },
    {
      id: 'homework',
      text: 'I compiti mi stressano',
      nextMessages: [
        { id: 'h1', role: 'user', content: 'I compiti mi stressano tantissimo...' },
        {
          id: 'h2',
          role: 'assistant',
          content: 'Uffa, ti capisco! Quando vedo una pagina piena di testo, le lettere sembrano ballare. Ma ho trovato dei trucchi che mi aiutano.',
        },
        {
          id: 'h3',
          role: 'assistant',
          content: 'Per esempio, uso un righello colorato sotto la riga che leggo, e divido i compiti in pezzi piccoli. Poi mi premio dopo ogni pezzo - tipo 10 minuti di videogiochi! Tu hai trovato qualche trucco che funziona?',
        },
      ],
      nextOptions: [
        {
          id: 'tricks',
          text: 'No, dimmi i tuoi trucchi!',
          nextMessages: [
            { id: 'h4', role: 'user', content: 'No, non ne ho... dimmi i tuoi trucchi!' },
            {
              id: 'h5',
              role: 'assistant',
              content: 'Ok! Ecco i miei preferiti: 1) Font speciali come OpenDyslexic (le lettere sono pesanti sotto), 2) Ascolto audiolibri invece di leggere, 3) Faccio mappe mentali invece di appunti lineari. Provali e vedi cosa funziona per te!',
            },
          ],
        },
      ],
    },
    {
      id: 'math',
      text: 'Non capisco matematica',
      nextMessages: [
        { id: 'x1', role: 'user', content: 'Non capisco proprio matematica...' },
        {
          id: 'x2',
          role: 'assistant',
          content: 'Ah, la matematica! Per me i numeri si mischiano come le lettere a volte. Ma sai cosa? Non sei stupido se non capisci subito - il cervello ha solo bisogno di piu tempo o di un modo diverso di vedere le cose.',
        },
        {
          id: 'x3',
          role: 'assistant',
          content: 'Hai provato a parlare con Archimede? E uno dei Professori qui - spiega la matematica in modo che ha senso anche per me. E non ti giudica mai se non capisci al primo colpo!',
        },
      ],
      nextOptions: [
        {
          id: 'archimedes',
          text: 'Chi e Archimede?',
          nextMessages: [
            { id: 'x4', role: 'user', content: 'Chi e Archimede?' },
            {
              id: 'x5',
              role: 'assistant',
              content: 'E un antico genio greco che ha inventato un sacco di cose! Qui su MirrorBuddy, ti puo insegnare matematica in modo divertente. In modalita completa, potresti parlarci e fare domande. Lui e super paziente!',
            },
          ],
        },
      ],
    },
  ],
};
