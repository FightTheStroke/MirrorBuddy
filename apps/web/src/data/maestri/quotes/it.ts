import type { MaestroQuoteSet } from './types';

/** Italian — the reference set. Every other locale mirrors these keys exactly. */
export const quotesIt: MaestroQuoteSet = {
  euclide: [
    {
      text: 'Non ci sono vie regali per la geometria.',
      source: 'Euclide, riportato da Proclo, Commento al I libro degli Elementi',
    },
    'La bellezza della matematica sta nella sua precisione.',
    'Ogni problema ha una soluzione, serve solo il giusto ragionamento.',
    'La logica è la chiave che apre ogni porta.',
    'Impara a vedere le forme invisibili del mondo.',
    'La geometria è la musica silenziosa della ragione.',
  ],

  feynman: [
    'La fisica è divertente quando la capisci davvero!',
    // Was: "Se non riesci a spiegarlo in modo semplice, non l'hai capito
    // abbastanza." Widely attributed to Feynman, absent from his lectures and
    // writings; the documented root is a remark of Rutherford's.
    'Non accontentarti di una spiegazione che non hai capito: chiedila di nuovo.',
    'Il dubbio è la chiave della scoperta.',
    'La natura non ci inganna mai, siamo noi a ingannarci.',
    'Studia con curiosità, non per obbligo.',
    'Il vero apprendimento inizia con "perché?".',
  ],

  galileo: [
    'Osa dubitare, osa osservare, osa scoprire.',
    "L'esperimento parla più forte delle parole.",
    'Non credere, verifica!',
    {
      text: 'Il libro della natura è scritto in linguaggio matematico.',
      source: 'parafrasi da Galileo Galilei, Il Saggiatore, 1623',
    },
    "La verità emerge dall'osservazione paziente.",
    'Sii curioso come un bambino, rigoroso come uno scienziato.',
  ],

  curie: [
    {
      text: 'Niente nella vita deve essere temuto, solo compreso.',
      source: 'Marie Curie',
    },
    'La scienza richiede pazienza e determinazione.',
    'Il lavoro duro supera qualsiasi talento naturale.',
    'Ogni scoperta inizia con una domanda coraggiosa.',
    'La curiosità è il motore del progresso.',
    'Sii persistente nei tuoi obiettivi.',
  ],

  darwin: [
    'La natura è il più grande insegnante.',
    'Osserva attentamente, la vita racconta storie meravigliose.',
    "L'adattamento è la chiave della sopravvivenza e dell'apprendimento.",
    'Ogni creatura ha qualcosa da insegnarci.',
    'La pazienza rivela i segreti della vita.',
    // Was: "Non è il più forte che sopravvive, ma il più adattabile." Written by
    // Leon C. Megginson in 1963 as a paraphrase; the Darwin Correspondence
    // Project lists it among things Darwin never said.
    'Adattarsi non è arrendersi: è il modo in cui la vita impara.',
  ],

  erodoto: [
    // Was: "La storia è maestra di vita." That is Cicero, De Oratore II, 36
    // (historia magistra vitae), four centuries after Herodotus.
    'Il passato è pieno di persone che avevano i tuoi stessi dubbi.',
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
    "La lingua italiana è musica per l'anima.",
    'Le parole giuste al momento giusto possono cambiare il mondo.',
    "Leggi con il cuore, scrivi con l'anima.",
    'La bellezza della letteratura è immortale.',
    'Ogni parola ha un peso, sceglila con cura.',
    'La lingua è lo specchio della cultura.',
  ],

  shakespeare: [
    // Was: "All the world's a stage, and learning is your greatest role." The
    // first half is his; the second was welded on inside the same quotation
    // marks.
    {
      text: 'Tutto il mondo è un palcoscenico.',
      source: 'William Shakespeare, Come vi piace, atto II scena VII',
    },
    'Studiare o non studiare? La risposta è sempre studiare!',
    // Was: "The pen is mightier than the sword." Edward Bulwer-Lytton,
    // Richelieu, 1839 — 223 years after Shakespeare.
    'Le parole restano più a lungo di chi le pronuncia.',
    "Le parole sono le ali dell'immaginazione.",
    // Was: "Language is the dress of thought." Samuel Johnson, The Rambler
    // n. 60, 1750.
    'Ogni parola che impari è un modo nuovo di pensare.',
    'In ogni parola vive un universo di significato.',
  ],

  leonardo: [
    "L'arte e la scienza sono una cosa sola.",
    'Impara a vedere ciò che gli altri non vedono.',
    'La creatività richiede il coraggio di lasciare andare le certezze.',
    'Osserva, sperimenta, crea.',
    'Ogni dettaglio conta nella ricerca della perfezione.',
    "La curiosità è la madre dell'innovazione.",
  ],

  mozart: [
    "La musica è la lingua dell'anima.",
    "Non temere di sbagliare, ogni nota è un passo verso l'armonia.",
    'Il ritmo della vita è una melodia da scoprire.',
    'La gioia della musica è nel condividerla.',
    'Suona con il cuore, non solo con le mani.',
    "La teoria musicale è la grammatica dell'emozione.",
  ],

  cicerone: [
    'La cittadinanza è un privilegio e una responsabilità.',
    'Parla con saggezza, ascolta con attenzione.',
    'I diritti si conquistano con i doveri.',
    "La retorica è l'arte di convincere con la verità.",
    'Un cittadino informato è un cittadino libero.',
    'La giustizia è il fondamento della società.',
  ],

  smith: [
    "L'economia è ovunque, impara a riconoscerla.",
    "Il mercato è guidato dalla ragione e dall'interesse.",
    'Comprendi i meccanismi per fare scelte migliori.',
    'La ricchezza non è solo denaro, è conoscenza.',
    'Ogni scelta economica ha conseguenze.',
    'Pensa in modo strategico, agisci in modo razionale.',
  ],

  lovelace: [
    'Il codice è poesia in forma logica.',
    'Programmare significa dare istruzioni al futuro.',
    "Ogni algoritmo inizia con un'idea chiara.",
    'La logica è creatività strutturata.',
    'Gli errori sono opportunità di apprendimento.',
    'Pensa come una macchina, crea come un artista.',
  ],

  ippocrate: [
    // Was: "Fa che il cibo sia la tua medicina." Universally attributed to
    // Hippocrates and absent from the whole Hippocratic Corpus; a modern
    // formulation, documented by Diana Cardenas (2013).
    'Il corpo guarisce, il medico lo accompagna.',
    'La prevenzione vale più della cura.',
    "Il corpo e la mente sono un'unica cosa.",
    "L'equilibrio è la chiave della salute.",
    'Ascolta il tuo corpo, ti parla sempre.',
    'La salute è il più grande tesoro.',
  ],

  socrate: [
    {
      text: 'So di non sapere, e questa è già saggezza.',
      source: 'parafrasi da Platone, Apologia di Socrate',
    },
    'La domanda giusta vale più di mille risposte.',
    {
      text: 'Conosci te stesso.',
      source: 'massima iscritta nel tempio di Delfi, che Socrate fece propria',
    },
    "Il dubbio è l'inizio della conoscenza.",
    'Non accettare nulla senza averlo compreso.',
    "La virtù è conoscenza, l'ignoranza è vizio.",
  ],
};
