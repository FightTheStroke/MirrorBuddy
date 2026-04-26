/**
 * Knowledge Base Content
 * Detailed content for each knowledge category
 */

import type { KnowledgeCategory } from './knowledge-base-types';

export const KNOWLEDGE_CONTENT: Record<KnowledgeCategory, string> = {
  maestri: `**16 Maestri Storici**
Tutori AI basati su figure storiche. Dalla home, scegli un Maestro per iniziare.
- Euclide (Matematica), Marie Curie (Chimica), Feynman (Fisica)
- Galileo (Astronomia), Darwin (Scienze), Manzoni (Italiano)
- Shakespeare (Inglese), Erodoto (Storia), Humboldt (Geografia)
- Da Vinci (Arte), Mozart (Musica), Ada Lovelace (Informatica)
- Adam Smith (Economia), Socrate (Filosofia), Cicerone (Ed. Civica)
- Ippocrate (Ed. Fisica)
Ogni Maestro ha stile unico. Possono creare flashcard, mappe, quiz durante le lezioni.`,

  voice: `**Chiamate Vocali**
Parla a voce con i Maestri via Azure Realtime API.
Come usare: Durante lezione > icona telefono > parla > telefono rosso per terminare.
Tips: Usa cuffie, parla chiaramente, trascrizione in chat.
Problemi: Controlla permessi microfono, HTTPS richiesto, ricarica pagina se lento.`,

  tools: `**Strumenti Didattici**
I Maestri possono creare durante le lezioni:
- Flashcard FSRS: ripetizione spaziata
- Mappe Mentali: concetti visuali
- Quiz: verifica comprensione
- Demo: simulazioni interattive
Chiedi al Maestro: "Fammi una mappa su...", "Fammi un quiz su..."`,

  flashcards: `**Flashcard FSRS**
Sistema ripetizione spaziata con algoritmo FSRS-5.
Dove: Menu > Flashcard | Create dal Maestro
Come: Clicca Ripassa, valuta (Difficile/OK/Facile/Perfetto).
L'algoritmo calcola quando rivedere. 5 XP per carta ripetuta.`,

  mindmaps: `**Mappe Mentali**
Mappe concettuali interattive, modificabili anche a voce.
Dove: Create dal Maestro | Menu > I Miei Materiali
Comandi vocali: "Aggiungi Roma sotto Italia", "Espandi Liguria"
Clicca nodi per espandere/collassare.`,

  quizzes: `**Quiz Interattivi**
Quiz a risposta multipla per verificare comprensione.
Chiedi al Maestro: "Fammi un quiz su..."
XP in base a risposte corrette. Puoi ripetere quiz salvati.`,

  coach: `**Coach (Melissa/Roberto/Chiara/Andrea/Favij)**
Coach di metodo di studio. Aiutano con organizzazione e strategie.
5 coach disponibili con personalita' diverse.
Obiettivo: sviluppare AUTONOMIA, non dipendenza.
Scelgi il tuo preferito in Impostazioni.`,

  buddy: `**Buddy (Mario/Maria)**
Compagno virtuale che condivide le tue difficolta'.
Per supporto emotivo, non accademico.
Stessa eta', non giudica, sempre dalla tua parte.
Scegli Mario/Maria in Impostazioni.`,

  gamification: `**Sistema MirrorBucks e Stagioni**
Guadagna MirrorBucks (MB) studiando - stile Fortnite/Duolingo!

Come guadagnare MB:
- Conversazione attiva: 5 MB/minuto
- Quiz completato: 30 MB (50 MB se perfetto)
- Mappa mentale: 20 MB
- Flashcard ripetute: 5 MB/carta
- Pomodoro completato: 15 MB

**Stagioni (Trimestri scolastici)**
Ogni stagione ha 100 livelli da sbloccare. Alla fine del trimestre il livello si resetta ma i tuoi achievement restano!
- Stagione Autunno (Set-Nov)
- Stagione Inverno (Dic-Feb)
- Stagione Primavera (Mar-Mag)
- Stagione Estate (Giu-Ago)

**Achievement/Badge**
Sblocca badge speciali per traguardi come streak, livelli, esplorazione di materie.

Vai alla Dashboard (/dashboard) per vedere tutti i tuoi progressi!`,

  navigation: `**Navigazione Zaino/Astuccio**

**Zaino** (/zaino)
Il tuo archivio di materiali di studio! Qui trovi tutto cio' che hai creato:
- Mappe mentali, quiz, flashcard, demo, riassunti
- Naviga per Materia, Data o Tipo
- Ricerca vocale: "Trova le mappe di matematica"

**Astuccio** (/astuccio)
I tuoi strumenti creativi! Scegli uno strumento per creare nuovi materiali:
- Mappa Mentale: visualizza concetti
- Quiz: verifica comprensione
- Demo: simulazioni interattive
- Flashcard: memorizzazione spaziata
- Riassunto: sintesi strutturate
- Study Kit: carica PDF e genera materiali

**Dashboard** (/dashboard)
Statistiche complete: tempo studio, livelli, trend, costi Azure (se configurato).`,

  pomodoro: `**Timer Pomodoro**
25 min studio + 5 min pausa. Ogni 4 pomodori: pausa 15 min.
Dove: Barra in alto (icona timer) | Settings > ADHD
15 XP per pomodoro completato. Tempi personalizzabili.
Attiva notifiche browser per promemoria.`,

  scheduler: `**Calendario Settimanale**
Pianifica sessioni di studio.
Dove: Menu > Piano di Studio
Clicca giorno > aggiungi sessione > materia, orario, durata.
Collega a Maestro specifico. Attiva promemoria.`,

  notifications: `**Notifiche Smart**
Promemoria per studio, streak, flashcard.
Dove: Settings > Notifiche
Imposta ore di silenzio. Melissa puo' leggere a voce (TTS).
Se non arrivano: verifica permessi browser.`,

  ambient_audio: `**Audio Ambientale**
Suoni per concentrazione, generati dal browser.
Dove: Barra in alto (icona cuffie) | Settings > Audio
Preset: Focus (alpha), Deep Work (beta+marrone), Pioggia, Natura, Biblioteca, Caffe.
Si ferma durante chiamate vocali. Integrazione Pomodoro disponibile.
Usa cuffie per binaural beats.`,

  accessibility: `**Accessibilita'**
7 profili rapidi: Dislessia, ADHD, Autismo, Visivo, Uditivo, Motorio.
Dove: Settings > Accessibilita'
- Font OpenDyslexic per dislessia
- Modalita' ADHD: riduce distrazioni, timer Pomodoro
- Alto contrasto per problemi visivi
- Text-to-Speech per lettura ad alta voce`,

  account: `**Profilo Studente**
Dove: Settings > Profilo
Modifica nome, eta', anno scolastico.
Indica difficolta' di apprendimento.
Dashboard Genitori: richiede consenso GDPR, dati aggregati.`,

  privacy: `**Privacy (GDPR)**
Dove: Settings > Privacy
- Esporta dati: JSON o PDF
- Cancella dati: eliminati entro 30 giorni
- Revoca consenso genitori in qualsiasi momento
I genitori vedono solo progressi aggregati, mai conversazioni.`,

  troubleshooting: `**Problemi Comuni**
App non carica: Ricarica (Cmd+R), svuota cache, altro browser.
Login: Verifica email, usa "Password dimenticata".
Audio/Voce: Permessi microfono, cuffie, HTTPS richiesto.
Progressi persi: Verifica login, ricarica pagina.
Notifiche: Abilita nel browser, controlla ore silenzio.`,
};
