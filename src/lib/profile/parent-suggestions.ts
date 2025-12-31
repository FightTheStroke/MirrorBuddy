/**
 * Parent Suggestions Generator
 *
 * Generates actionable suggestions for parents based on Maestro observations.
 * Each observation category has specific home activities and communication advice.
 *
 * Part of Issue #57: Teacher Diary (Diario dei Professori)
 */

import type { ObservationCategory } from '@/types';

export interface ParentSuggestion {
  homeActivity: string;
  communicationTip: string;
  environmentTip: string;
}

/**
 * Detailed parent suggestions for each observation category.
 * These are shown in the Teacher Diary alongside Maestro observations.
 */
export const PARENT_SUGGESTIONS: Record<ObservationCategory, ParentSuggestion[]> = {
  logical_reasoning: [
    {
      homeActivity: 'Giocate insieme a giochi da tavolo strategici come scacchi, dama, o puzzle logici. Questi rafforzano il pensiero sequenziale.',
      communicationTip: 'Quando spiegate qualcosa, usate la struttura "prima... poi... infine..." per mostrare i passaggi logici.',
      environmentTip: 'Create uno spazio di studio ordinato dove ogni cosa ha il suo posto - questo riflette il pensiero organizzato.',
    },
    {
      homeActivity: 'Proponete enigmi e indovinelli durante i pasti o in auto. Iniziate con quelli semplici e aumentate la difficolta.',
      communicationTip: 'Fate domande come "Perche pensi che sia successo?" invece di dare risposte dirette.',
      environmentTip: 'Appendete un calendario visivo con le attivita della settimana per sviluppare la pianificazione.',
    },
  ],
  mathematical_intuition: [
    {
      homeActivity: 'Coinvolgete vostro figlio in cucina: misurare ingredienti, dividere porzioni, calcolare tempi di cottura.',
      communicationTip: 'Usate la matematica nella vita quotidiana: "Abbiamo 12 biscotti, quanti ne spettano a ciascuno?"',
      environmentTip: 'Tenete in vista un metro, una bilancia da cucina, e orologi analogici per familiarizzare con i numeri.',
    },
    {
      homeActivity: 'Fate la spesa insieme e chiedete di stimare il totale o calcolare gli sconti.',
      communicationTip: 'Celebrate gli errori come opportunita: "Interessante! Vediamo insieme dove e andato diversamente."',
      environmentTip: 'Create un "angolo matematico" con oggetti contabili: bottoni, perline, monete finte.',
    },
  ],
  critical_thinking: [
    {
      homeActivity: 'Guardate insieme un telegiornale per ragazzi e discutete: "Cosa pensi di questa notizia?"',
      communicationTip: 'Evitate di dire "hai ragione/torto" - chiedete invece "Cosa ti fa pensare cosi?"',
      environmentTip: 'Esponete diverse fonti di informazione: libri, riviste, documentari su temi di interesse.',
    },
    {
      homeActivity: 'Proponete dilemmi etici adatti all\'eta: "Cosa faresti se trovassi un portafoglio per terra?"',
      communicationTip: 'Mostrate che anche gli adulti cambiano idea: "Prima pensavo X, ma ora penso Y perche..."',
      environmentTip: 'Create uno spazio per il "dibattito familiare" settimanale su temi scelti insieme.',
    },
  ],
  study_method: [
    {
      homeActivity: 'Create insieme un piano di studio settimanale visivo, con adesivi per i compiti completati.',
      communicationTip: 'Chiedete "Come preferisci studiare oggi?" per sviluppare l\'auto-consapevolezza.',
      environmentTip: 'Preparate una postazione di studio con tutto il necessario a portata di mano.',
    },
    {
      homeActivity: 'Insegnate la tecnica Pomodoro: 25 minuti di studio, 5 di pausa. Usate un timer visivo.',
      communicationTip: 'Celebrate il processo, non solo il risultato: "Hai studiato con impegno!"',
      environmentTip: 'Eliminate le distrazioni: telefono lontano, notifiche silenziose durante lo studio.',
    },
  ],
  verbal_expression: [
    {
      homeActivity: 'Organizzate serate di "racconta la tua giornata" dove ognuno ha 3 minuti per parlare senza interruzioni.',
      communicationTip: 'Aspettate qualche secondo prima di rispondere - date tempo di elaborare il pensiero.',
      environmentTip: 'Create opportunita di socializzazione: invitate amici, partecipate a gruppi di interesse.',
    },
    {
      homeActivity: 'Fate giochi di ruolo: "Fai finta di essere il venditore e io il cliente."',
      communicationTip: 'Evitate di completare le frasi - lasciate che finisca di parlare.',
      environmentTip: 'Leggete ad alta voce insieme, alternandovi nei dialoghi dei personaggi.',
    },
  ],
  linguistic_ability: [
    {
      homeActivity: 'Giocate a giochi di parole: Scarabeo, Paroliere, o inventate rime insieme.',
      communicationTip: 'Introducete nuove parole naturalmente: "Questo si chiama X, significa..."',
      environmentTip: 'Tenete dizionari e vocabolari accessibili, anche in versione app.',
    },
    {
      homeActivity: 'Leggete insieme ogni sera, anche solo 10 minuti. Alternate lettura ad alta voce.',
      communicationTip: 'Parlate delle parole nuove incontrate: "Hai mai sentito questa parola?"',
      environmentTip: 'Create una "parete delle parole nuove" dove appendere vocaboli interessanti.',
    },
  ],
  creativity: [
    {
      homeActivity: 'Dedicate tempo settimanale all\'arte libera: disegno, pittura, collage senza istruzioni.',
      communicationTip: 'Evitate "Bello!" generico - chiedete "Raccontami cosa hai creato."',
      environmentTip: 'Allestite un angolo creativo con materiali sempre disponibili.',
    },
    {
      homeActivity: 'Proponete sfide creative: "Costruisci qualcosa usando solo questi 5 oggetti."',
      communicationTip: 'Valorizzate le idee originali: "Non ci avevo pensato, e un\'idea interessante!"',
      environmentTip: 'Esponete le creazioni in casa - mostrate che il loro lavoro ha valore.',
    },
  ],
  artistic_sensitivity: [
    {
      homeActivity: 'Visitate musei o mostre insieme. Chiedete: "Quale opera ti piace di piu e perche?"',
      communicationTip: 'Condividete le vostre emozioni davanti all\'arte: "Questo quadro mi fa sentire..."',
      environmentTip: 'Mettete musica di sottofondo durante le attivita quotidiane.',
    },
    {
      homeActivity: 'Ascoltate generi musicali diversi e discutetene: "Che immagini ti vengono in mente?"',
      communicationTip: 'Rispettate le preferenze artistiche anche se diverse dalle vostre.',
      environmentTip: 'Esponete immagini belle in casa: stampe d\'arte, fotografie, poster.',
    },
  ],
  scientific_curiosity: [
    {
      homeActivity: 'Fate semplici esperimenti a casa: vulcano con bicarbonato, crescita di piante, cristalli di sale.',
      communicationTip: 'Rispondete alle domande con altre domande: "Tu cosa pensi? Come potremmo scoprirlo?"',
      environmentTip: 'Create un "laboratorio" con lenti, magneti, contenitori per esperimenti.',
    },
    {
      homeActivity: 'Guardate documentari naturalistici insieme e discutetene.',
      communicationTip: 'Ammettete quando non sapete qualcosa: "Non lo so, cerchiamolo insieme!"',
      environmentTip: 'Tenete enciclopedie e libri scientifici accessibili.',
    },
  ],
  experimental_approach: [
    {
      homeActivity: 'Proponete progetti STEM: costruire un ponte con cannucce, programmare con Scratch.',
      communicationTip: 'Incoraggiate il fallimento come apprendimento: "Cosa hai scoperto da questo tentativo?"',
      environmentTip: 'Fornite materiali da costruzione: LEGO, kit elettronici per ragazzi, materiali di riciclo.',
    },
    {
      homeActivity: 'Create un "diario degli esperimenti" dove annotare ipotesi, metodi e risultati.',
      communicationTip: 'Chiedete "Come potresti verificarlo?" quando esprimono un\'opinione.',
      environmentTip: 'Dedicate uno spazio dove e permesso "fare disordine" per sperimentare.',
    },
  ],
  spatial_memory: [
    {
      homeActivity: 'Costruite modelli 3D: puzzle tridimensionali, origami, costruzioni.',
      communicationTip: 'Usate descrizioni spaziali: "E a destra del frigorifero, sotto il secondo ripiano."',
      environmentTip: 'Appendete mappe geografiche e fate giochi tipo "trova il paese".',
    },
    {
      homeActivity: 'Giocate a giochi di memoria visiva: Memory, "Cosa manca?", ricordi di percorsi.',
      communicationTip: 'Quando date indicazioni, fatele visualizzare: "Immagina di essere li..."',
      environmentTip: 'Organizzate la camera con logica spaziale chiara, etichette con immagini.',
    },
  ],
  historical_understanding: [
    {
      homeActivity: 'Raccontate storie di famiglia: nonni, bisnonni, eventi che avete vissuto.',
      communicationTip: 'Collegate il passato al presente: "Sai che ai tempi dei nonni non c\'era internet?"',
      environmentTip: 'Create un album di famiglia commentato con date e storie.',
    },
    {
      homeActivity: 'Visitate luoghi storici locali: castelli, musei, centri storici.',
      communicationTip: 'Chiedete "Secondo te, come vivevano i bambini 100 anni fa?"',
      environmentTip: 'Appendete una linea del tempo in camera con eventi storici importanti.',
    },
  ],
  philosophical_depth: [
    {
      homeActivity: 'Leggete insieme miti e favole, poi discutete il significato nascosto.',
      communicationTip: 'Fate domande aperte senza risposta giusta: "Cosa significa essere coraggiosi?"',
      environmentTip: 'Create momenti di tranquillita per la riflessione, senza stimoli esterni.',
    },
    {
      homeActivity: 'Tenete un "diario dei pensieri" dove scrivere domande e riflessioni.',
      communicationTip: 'Prendete sul serio le domande filosofiche dei bambini, non minimizzatele.',
      environmentTip: 'Offrite libri di storie con temi profondi adatti all\'eta.',
    },
  ],
  physical_awareness: [
    {
      homeActivity: 'Fate attivita fisica insieme: passeggiate, nuoto, giochi all\'aperto.',
      communicationTip: 'Chiedete "Come si sente il tuo corpo oggi?" per sviluppare consapevolezza.',
      environmentTip: 'Garantite pause di movimento ogni 30-45 minuti di studio.',
    },
    {
      homeActivity: 'Praticate insieme semplici esercizi di respirazione e rilassamento.',
      communicationTip: 'Normalizzate l\'ascolto del corpo: "Hai fame? Sei stanco? Cosa ti dice il corpo?"',
      environmentTip: 'Create routine di movimento: stretching mattutino, passeggiata post-cena.',
    },
  ],
  environmental_awareness: [
    {
      homeActivity: 'Iniziate insieme un piccolo orto o delle piante da curare.',
      communicationTip: 'Discutete le conseguenze delle scelte quotidiane sull\'ambiente.',
      environmentTip: 'Implementate pratiche sostenibili visibili: riciclo, risparmio acqua.',
    },
    {
      homeActivity: 'Fate passeggiate naturalistiche osservando piante, animali, cambiamenti stagionali.',
      communicationTip: 'Collegate le azioni alle conseguenze: "Se buttiamo questo, dove finisce?"',
      environmentTip: 'Esponete poster sulla natura, documentari naturalistici.',
    },
  ],
  narrative_skill: [
    {
      homeActivity: 'Inventate storie insieme: uno inizia, l\'altro continua.',
      communicationTip: 'Chiedete "E poi cosa e successo?" per incoraggiare l\'elaborazione.',
      environmentTip: 'Fornite libri illustrati senza testo per inventare storie.',
    },
    {
      homeActivity: 'Create fumetti o storyboard di avventure inventate.',
      communicationTip: 'Ascoltate le storie che inventa senza correggerle troppo.',
      environmentTip: 'Allestite un "angolo lettura" accogliente con cuscini e buona luce.',
    },
  ],
  collaborative_spirit: [
    {
      homeActivity: 'Organizzate giochi di squadra in famiglia o con amici.',
      communicationTip: 'Lodatelo quando aiuta gli altri: "Ho visto che hai aiutato tuo fratello, bel gesto!"',
      environmentTip: 'Create opportunita di progetti condivisi: cucinare insieme, costruire qualcosa.',
    },
    {
      homeActivity: 'Assegnate responsabilita condivise: "Tu e papa siete responsabili di..."',
      communicationTip: 'Discutete i conflitti come team: "Come possiamo risolvere questo insieme?"',
      environmentTip: 'Organizzate spazi condivisi che richiedono cooperazione.',
    },
  ],
};

/**
 * Maestro to subject mapping for display
 */
export const MAESTRO_SUBJECTS: Record<string, string> = {
  archimede: 'Matematica',
  pitagora: 'Matematica',
  euclide: 'Geometria',
  leonardo: 'Arte e Scienze',
  dante: 'Italiano',
  cicerone: 'Latino e Retorica',
  omero: 'Letteratura',
  socrate: 'Filosofia',
  aristotele: 'Filosofia',
  galileo: 'Fisica',
  darwin: 'Scienze Naturali',
  plinio: 'Scienze Naturali',
  cleopatra: 'Storia',
  giulio_cesare: 'Storia',
  alessandro_magno: 'Storia',
  marco_polo: 'Geografia',
  montessori: 'Metodo di Studio',
  mozart: 'Musica',
  ippocrate: 'Scienze',
};

/**
 * Category to Maestro mapping
 */
export const CATEGORY_TO_MAESTRO: Record<ObservationCategory, string[]> = {
  logical_reasoning: ['archimede', 'euclide'],
  mathematical_intuition: ['pitagora', 'archimede'],
  critical_thinking: ['socrate', 'aristotele'],
  study_method: ['montessori'],
  verbal_expression: ['cicerone', 'dante'],
  linguistic_ability: ['dante', 'cicerone'],
  creativity: ['leonardo'],
  artistic_sensitivity: ['mozart', 'leonardo'],
  scientific_curiosity: ['darwin', 'galileo'],
  experimental_approach: ['galileo'],
  spatial_memory: ['marco_polo'],
  historical_understanding: ['cleopatra', 'giulio_cesare'],
  philosophical_depth: ['aristotele', 'socrate'],
  physical_awareness: ['ippocrate'],
  environmental_awareness: ['plinio', 'darwin'],
  narrative_skill: ['omero', 'dante'],
  collaborative_spirit: ['alessandro_magno'],
};

/**
 * Get a random parent suggestion for a category
 */
export function getParentSuggestion(category: ObservationCategory): ParentSuggestion {
  const suggestions = PARENT_SUGGESTIONS[category];
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

/**
 * Get the subject for a Maestro
 */
export function getMaestroSubject(maestroId: string): string {
  const normalized = maestroId.toLowerCase().replace(/-/g, '_');
  return MAESTRO_SUBJECTS[normalized] || 'Studio Generale';
}
