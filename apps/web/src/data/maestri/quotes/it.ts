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

  // --------------------------------------------------------------------------
  // Maestri whose own words are in the public domain and were checked against
  // a primary text before shipping. Every source below names the work, the
  // locus and — where the words belong to a character rather than the author —
  // who says them, because "Molière wrote it" and "Molière thought it" are not
  // the same claim. Faust's «Grau, teurer Freund» is absent on purpose: it is
  // Mephistopheles speaking, impersonating Faust.
  // --------------------------------------------------------------------------

  omero: [
    {
      text: 'Raccontami, Musa, l’uomo dalle mille astuzie.',
      source: 'Omero, Odissea, libro I verso 1',
    },
    'Ogni viaggio lungo è fatto di giorni normali.',
    {
      text: 'Resisti, cuore mio: hai già sopportato di peggio.',
      source: 'Omero, Odissea, libro XX verso 18 — Odisseo parla a se stesso',
    },
    'Le storie si imparavano a memoria prima che si scrivessero.',
    'Un eroe ha paura. Poi va avanti lo stesso.',
    'Racconta ad alta voce: i poemi sono nati così.',
  ],

  moliere: [
    {
      text: 'Vivo di buona minestra, non di bel linguaggio.',
      source: 'Molière, Le donne saccenti, atto II scena 7, 1672 — parla Crisalo',
    },
    'Il francese si impara meglio ridendo.',
    {
      text: 'Bisogna mangiare per vivere, non vivere per mangiare.',
      source: 'Molière, L’avaro, atto III scena 1, 1668 — Valerio la cita come detto di un antico',
    },
    'Guarda come parla la gente: il teatro nasce da lì.',
    'Una parola detta male fa ridere, non fa danno.',
    'Dì la frase a voce alta, come su un palco.',
  ],

  goethe: [
    {
      text: 'Chi non conosce le lingue straniere non sa nulla della propria.',
      source: 'Goethe, Massime e riflessioni, n. 91, pubblicata dal 1821',
    },
    'Il tedesco è fatto di pezzi: impara a vedere dove si attaccano.',
    {
      text: 'Non basta sapere: bisogna applicare. Non basta volere: bisogna fare.',
      source:
        'Goethe, Gli anni di pellegrinaggio di Wilhelm Meister, «Dall’archivio di Makarie», 1829',
    },
    'Una parola lunga è solo tante parole corte messe insieme.',
    'Leggi una poesia ad alta voce prima ancora di capirla.',
    'Impara dieci parole al giorno, non cento in un giorno solo.',
  ],

  cervantes: [
    {
      text: 'Chi molto legge e molto cammina, molto vede e molto sa.',
      source: 'Cervantes, Don Chisciotte, parte II capitolo 25, 1615 — parla don Chisciotte',
    },
    'Un libro può essere un’avventura, non solo un compito.',
    {
      text: 'La diligenza è madre della buona sorte.',
      source:
        'Cervantes, Don Chisciotte, parte II capitolo 43, 1615 — don Chisciotte consiglia Sancio',
    },
    'Chi legge storie impara a immaginare le persone.',
    'Anche sbagliare strada è un modo di conoscere il mondo.',
    'Le lingue vicine si somigliano: fidati, ma controlla sempre.',
  ],

  turing: [
    {
      text: 'Riusciamo a vedere solo poco più avanti, ma già lì c’è molto da fare.',
      source:
        'Alan Turing, «Computing Machinery and Intelligence», rivista Mind, 1950 — ultima frase',
    },
    'Un computer fa solo quello che gli dici. Il difficile è dirglielo bene.',
    'Prima fai il conto a mano, poi scrivi la regola.',
    'Un algoritmo è una ricetta: un passo, poi un altro, poi un altro.',
    'Se il programma sbaglia, non sei tu a essere sbagliato.',
    'Prova con un esempio piccolo prima di uno grande.',
  ],

  austen: [
    {
      text: 'Tre o quattro famiglie in un villaggio di campagna: ecco la cosa giusta su cui lavorare.',
      source: 'Jane Austen, lettera alla nipote Anna Austen, 9 settembre 1814',
    },
    'Leggi una frase sola, con calma: dice più di quanto sembra.',
    {
      text: 'Abbiamo tutti dentro di noi una guida migliore di qualsiasi altra persona, se solo la ascoltassimo.',
      source: 'Jane Austen, Mansfield Park, capitolo 42, 1814 — parla Fanny Price',
    },
    'Chiedi sempre chi sta parlando, e perché proprio con quelle parole.',
    'A volte un personaggio dice il contrario di quello che pensa.',
    'Le storie piccole raccontano le cose grandi.',
  ],

  nightingale: [
    {
      text: 'La lezione pratica più importante che si possa dare alle infermiere è insegnare loro che cosa osservare, e come osservare…',
      source: 'Florence Nightingale, Notes on Nursing, cap. XIII, 1859 — frase abbreviata',
    },
    'Prima di decidere, chiediti: come lo so?',
    {
      text: 'Subito dopo il bisogno di aria fresca viene, per i malati, il bisogno di luce.',
      source: 'Florence Nightingale, Notes on Nursing, cap. IX, 1859 — frase abbreviata',
    },
    'Contare le cose è già un modo di prendersene cura.',
    'Aria e luce fanno più di quanto sembri.',
    'Un numero messo in un disegno si capisce meglio.',
  ],

  // --------------------------------------------------------------------------
  // Maestri who carry no quotations at all, and the reason for each.
  //
  // A card line in quotation marks is a claim that a person said those words.
  // For a living person, a character still in copyright, or an author whose
  // work is recent enough to be protected, that claim is both a truthfulness
  // risk and a legal one, in a product used by minors. Every line below is
  // written by MirrorBuddy in the maestro's spirit, and is rendered without
  // quotation marks (DATA-GOVERNANCE-SOP.md, G-7).
  // --------------------------------------------------------------------------

  // Chris — a MirrorBuddy character, named in honour of a living person
  // (Chris Anderson). Nothing here is his; nothing here is quoted.
  chris: [
    'Una storia comincia sempre da una persona, non da un\u2019idea.',
    'Parla piano: chi ti ascolta ha bisogno di tempo.',
    'Se la voce ti trema, vuol dire che ti importa.',
    'Racconta una cosa vera e piccola: funziona meglio di mille parole grandi.',
    'Guarda una persona alla volta, non tutta la sala.',
    'Non devi essere perfetto. Devi essere chiaro.',
  ],

  // Álex Pina — living author. No quotation, and no line from his series.
  'alex-pina': [
    'Una serie ti insegna la lingua perché vuoi sapere come va a finire.',
    'Guarda la stessa scena due volte: la prima per la storia, la seconda per le parole.',
    'Impara le frasi che i personaggi ripetono: sono quelle che userai.',
    'Non tradurre tutto. Segui la storia e la lingua ti viene dietro.',
    'Lo spagnolo entra prima dalle orecchie che dagli occhi.',
    'Sbaglia ad alta voce: si comincia a parlare così.',
  ],

  // Conte Mascetti — a character from Amici miei (1975), still in copyright.
  // Written in his spirit; no line of the film is reproduced.
  mascetti: [
    'Ridere è una cosa seria: da allegri si impara meglio.',
    'Se una parola ti sembra difficile, dilla lo stesso.',
    'Le parole si possono giocare, non solo studiare.',
    'Un errore detto con eleganza è quasi una figura.',
    'Chi si prende troppo sul serio non impara niente.',
    'Prendi la vita come viene, ma prendila.',
  ],

  // Simone Barlaam — living athlete. Nothing attributed to him.
  simone: [
    'In acqua non conta quanto sei forte: conta quanto insisti.',
    'Il tuo corpo non è un problema da risolvere.',
    'Comincia dalla vasca che sai fare, non da quella che vorresti.',
    'Ogni allenamento sembra inutile, finché un giorno non lo è più.',
    "Perdere fa parte dell'allenamento. Serve anche quello.",
    'Muoviti come puoi tu: è quello il modo giusto.',
  ],

  // Antonio Cassese (1937–2011) — his writings are recent and protected.
  cassese: [
    'Il diritto serve a proteggere chi non ha potere.',
    'Nessuno è al di sopra della legge. Nessuno.',
    'Un diritto scritto e mai difeso resta soltanto carta.',
    'Prima di giudicare, ascolta tutte e due le parti.',
    'Le regole fra i popoli nascono dopo le guerre, per non rifarle.',
    'La giustizia è lenta perché deve essere precisa.',
  ],

  // Rita Levi-Montalcini (1909–2012) — her writings are recent and protected.
  'levi-montalcini': [
    'Il tuo cervello cambia mentre impari. Sta succedendo adesso.',
    'Le cellule si parlano fra loro: la biologia è fatta di messaggi.',
    'Non serve un grande laboratorio: serve una domanda precisa.',
    'Un laboratorio può stare in una stanza, se la domanda è buona.',
    'Guarda una cosa viva con calma: ti racconta come funziona.',
    'Chiedi perché ogni volta: è così che la mente cresce.',
  ],

  // Fratello Loto — a MirrorBuddy character, not a historical person.
  loto: [
    'Respira. Poi ricomincia da dove eri.',
    'Puoi fermarti un minuto. Il compito ti aspetta.',
    'Non devi svuotare la testa: basta accorgersi di cosa c’è.',
    'Anche stare fermi è una cosa che si impara.',
    'Se la mente va via, riportala. Ogni volta va bene.',
    'Un respiro alla volta è già abbastanza.',
  ],

  // Emmy Noether (1882–1935) — public domain, and deliberately unquoted. The
  // only lines traceable to a primary record are a remark on method in a 1931
  // letter to Helmut Hasse and one on proof technique reported by Hermann Weyl
  // in 1935; neither means anything to a child. No inspirational aphorism of
  // hers survives in the primary record, so none is invented here.
  noether: [
    'Piega un foglio a metà: qualcosa cambia, qualcosa resta uguale.',
    'La matematica cerca ciò che non cambia mentre tutto si muove.',
    'Una simmetria è una cosa che puoi spostare senza rovinarla.',
    'Non contano i numeri: contano le regole che li tengono insieme.',
    'Se una strada è chiusa, cambia domanda, non talento.',
    'Guarda che cosa resta uguale: lì c’è la risposta.',
  ],

  // Frida Kahlo (1907–1954) — her diary and letters were published in 1995 and
  // are actively enforced by her estate. No quotation from them.
  kahlo: [
    'Disegna quello che senti, non quello che vedi allo specchio.',
    'Il colore dice quello che le parole non dicono.',
    'Non serve saper disegnare per cominciare.',
    'Il tuo corpo può stare in un quadro così com’è.',
    'Un autoritratto è una domanda: chi sono oggi?',
    'Nel disegno metti anche i giorni difficili: fanno parte di te.',
  ],
};
