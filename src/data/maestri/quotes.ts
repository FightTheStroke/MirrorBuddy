// ============================================================================
// MAESTRI QUOTES - Motivational quotes for each maestro
// ============================================================================

export interface MaestroQuote {
  maestroId: string;
  quotes: string[];
}

export const maestroQuotes: Record<string, string[]> = {
  euclide: [
    'Non ci sono vie regali per la geometria.',
    'La bellezza della matematica sta nella sua precisione.',
    'Ogni problema ha una soluzione, serve solo il giusto ragionamento.',
    'La logica è la chiave che apre ogni porta.',
    'Impara a vedere le forme invisibili del mondo.',
    'La geometria è la musica silenziosa della ragione.',
  ],

  feynman: [
    'La fisica è divertente quando la capisci davvero!',
    'Se non riesci a spiegarlo in modo semplice, non l\'hai capito abbastanza.',
    'Il dubbio è la chiave della scoperta.',
    'La natura non ci inganna mai, siamo noi a ingannarci.',
    'Studia con curiosità, non per obbligo.',
    'Il vero apprendimento inizia con "perché?".',
  ],

  galileo: [
    'Osa dubitare, osa osservare, osa scoprire.',
    'L\'esperimento parla più forte delle parole.',
    'Non credere, verifica!',
    'Il libro della natura è scritto in linguaggio matematico.',
    'La verità emerge dall\'osservazione paziente.',
    'Sii curioso come un bambino, rigoroso come uno scienziato.',
  ],

  curie: [
    'Niente nella vita deve essere temuto, solo compreso.',
    'La scienza richiede pazienza e determinazione.',
    'Il lavoro duro supera qualsiasi talento naturale.',
    'Ogni scoperta inizia con una domanda coraggiosa.',
    'La curiosità è il motore del progresso.',
    'Sii persistente nei tuoi obiettivi.',
  ],

  darwin: [
    'La natura è il più grande insegnante.',
    'Osserva attentamente, la vita racconta storie meravigliose.',
    'L\'adattamento è la chiave della sopravvivenza e dell\'apprendimento.',
    'Ogni creatura ha qualcosa da insegnarci.',
    'La pazienza rivela i segreti della vita.',
    'Non è il più forte che sopravvive, ma il più adattabile.',
  ],

  erodoto: [
    'La storia è maestra di vita.',
    'Viaggia nel passato per comprendere il presente.',
    'Ogni civiltà ha una lezione da insegnare.',
    'Le storie degli uomini sono ponti tra le epoche.',
    'Impara dal passato per costruire il futuro.',
    'La curiosità è la bussola dello storico.',
  ],

  humboldt: [
    'Il mondo è un sistema interconnesso da esplorare.',
    'Ogni viaggio inizia con un passo e una domanda.',
    'La geografia unisce terra, cielo e umanità.',
    'Guarda il mondo con occhi di meraviglia.',
    'La natura non conosce confini.',
    'Esplora con mente aperta e cuore curioso.',
  ],

  manzoni: [
    'La lingua italiana è musica per l\'anima.',
    'Le parole giuste al momento giusto possono cambiare il mondo.',
    'Leggi con il cuore, scrivi con l\'anima.',
    'La bellezza della letteratura è immortale.',
    'Ogni parola ha un peso, sceglila con cura.',
    'La lingua è lo specchio della cultura.',
  ],

  shakespeare: [
    'All the world\'s a stage, and learning is your greatest role.',
    'To study or not to study? The answer is always to study!',
    'The pen is mightier than the sword.',
    'Words are the wings of imagination.',
    'Language is the dress of thought.',
    'In every word lies a universe of meaning.',
  ],

  leonardo: [
    'L\'arte e la scienza sono una cosa sola.',
    'Impara a vedere ciò che gli altri non vedono.',
    'La creatività richiede il coraggio di lasciare andare le certezze.',
    'Osserva, sperimenta, crea.',
    'Ogni dettaglio conta nella ricerca della perfezione.',
    'La curiosità è la madre dell\'innovazione.',
  ],

  mozart: [
    'La musica è la lingua dell\'anima.',
    'Non temere di sbagliare, ogni nota è un passo verso l\'armonia.',
    'Il ritmo della vita è una melodia da scoprire.',
    'La gioia della musica è nel condividerla.',
    'Suona con il cuore, non solo con le mani.',
    'La teoria musicale è la grammatica dell\'emozione.',
  ],

  cicerone: [
    'La cittadinanza è un privilegio e una responsabilità.',
    'Parla con saggezza, ascolta con attenzione.',
    'I diritti si conquistano con i doveri.',
    'La retorica è l\'arte di convincere con la verità.',
    'Un cittadino informato è un cittadino libero.',
    'La giustizia è il fondamento della società.',
  ],

  smith: [
    'L\'economia è ovunque, impara a riconoscerla.',
    'Il mercato è guidato dalla ragione e dall\'interesse.',
    'Comprendi i meccanismi per fare scelte migliori.',
    'La ricchezza non è solo denaro, è conoscenza.',
    'Ogni scelta economica ha conseguenze.',
    'Pensa in modo strategico, agisci in modo razionale.',
  ],

  lovelace: [
    'Il codice è poesia in forma logica.',
    'Programmare significa dare istruzioni al futuro.',
    'Ogni algoritmo inizia con un\'idea chiara.',
    'La logica è creatività strutturata.',
    'Gli errori sono opportunità di apprendimento.',
    'Pensa come una macchina, crea come un artista.',
  ],

  ippocrate: [
    'Fa che il cibo sia la tua medicina.',
    'La prevenzione vale più della cura.',
    'Il corpo e la mente sono un\'unica cosa.',
    'L\'equilibrio è la chiave della salute.',
    'Ascolta il tuo corpo, ti parla sempre.',
    'La salute è il più grande tesoro.',
  ],

  socrate: [
    'So di non sapere, e questa è già saggezza.',
    'La domanda giusta vale più di mille risposte.',
    'Conosci te stesso.',
    'Il dubbio è l\'inizio della conoscenza.',
    'Non accettare nulla senza averlo compreso.',
    'La virtù è conoscenza, l\'ignoranza è vizio.',
  ],
};

/**
 * Get a random quote for a maestro
 */
export function getRandomQuote(maestroId: string): string {
  const quotes = maestroQuotes[maestroId];
  if (!quotes || quotes.length === 0) {
    return 'Insieme scopriremo grandi cose!';
  }
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Get all quotes for a maestro
 */
export function getMaestroQuotes(maestroId: string): string[] {
  return maestroQuotes[maestroId] || [];
}
