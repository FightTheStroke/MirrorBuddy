# ConvergioEdu - La Scuola Che Vorrei 🎓

> Piattaforma educativa AI con tutor vocali personalizzati per studenti con difficoltà di apprendimento

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## La Storia

Questo progetto nasce per **Mario** e per tutti i ragazzi come lui.

Mario è un bambino sopravvissuto a un ictus pediatrico alla nascita, che gli ha causato una paralisi cerebrale. Come molti bambini con disabilità, Mario affronta sfide quotidiane a scuola: la didattica tradizionale non è pensata per lui, i tempi sono troppo stretti, i metodi troppo rigidi.

Nel 2013, la sua famiglia ha fondato [FightTheStroke](https://fightthestroke.org) per garantire un futuro migliore ai giovani sopravvissuti all'ictus. Dopo 10 anni di battaglie, ricerca e innovazione, nasce **ConvergioEdu**: la scuola che avremmo voluto per Mario.

## Il Problema

La scuola tradizionale non funziona per tutti:

- **Dislessia**: difficoltà nella lettura e nell'elaborazione del testo
- **Discalculia**: difficoltà con numeri e calcoli
- **ADHD**: difficoltà di concentrazione e gestione dell'attenzione
- **Autismo**: necessità di ambienti prevedibili e comunicazione chiara
- **Paralisi Cerebrale**: sfide motorie che richiedono interfacce adattive

Questi ragazzi non hanno bisogno di meno istruzione, ma di **un'istruzione diversa**.

## La Soluzione

**14 Maestri AI** ispirati a grandi figure storiche, ciascuno specializzato in una materia:

| Maestro | Materia | Ispirato a |
|---------|---------|------------|
| Euclide | Matematica | Euclide di Alessandria |
| Leonardo | Arte | Leonardo da Vinci |
| Darwin | Scienze | Charles Darwin |
| Shakespeare | Inglese | William Shakespeare |
| Galileo | Astronomia | Galileo Galilei |
| Curie | Chimica | Marie Curie |
| Mozart | Musica | Wolfgang Amadeus Mozart |
| ... | ... | ... |

Ogni Maestro:
- **Parla con voce naturale** (Azure OpenAI Realtime API)
- **Si adatta** al ritmo e allo stile di apprendimento dello studente
- **Crea contenuti interattivi**: mappe mentali, flashcard, quiz
- **È paziente**: non giudica, non si stanca, ripete finché serve

## Caratteristiche

- 🎙️ **Sessioni vocali** - Conversazioni naturali in tempo reale
- 🧠 **Mappe mentali** - Visualizzazione dei concetti con MarkMap
- 📚 **Flashcard FSRS** - Ripetizione spaziata scientifica
- 🎮 **Gamification** - XP, livelli, badge, streak
- 🌙 **Tema scuro/chiaro** - Comfort visivo
- ♿ **Accessibilità totale** - WCAG 2.1 AA compliant

## Accessibilità

Supporto specifico per:

| Condizione | Adattamenti |
|------------|-------------|
| **Dislessia** | Font OpenDyslexic, spaziatura aumentata, layout semplificati |
| **Discalculia** | Visualizzazione numeri, breakdown step-by-step |
| **ADHD** | Animazioni ridotte, modalità focus, promemoria pause |
| **Autismo** | Layout prevedibili, colori sensoriali, istruzioni chiare |
| **Paralisi Cerebrale** | Target grandi, navigazione tastiera, controllo vocale |

## Quick Start

### Prerequisiti

- Node.js 18+
- Azure OpenAI con accesso Realtime API (per voce)
- Oppure Ollama per uso locale (solo chat, no voce)

### Installazione

```bash
git clone https://github.com/Roberdan/ConvergioEdu.git
cd ConvergioEdu
npm install
cp .env.example .env.local
# Configura le tue chiavi API in .env.local
npm run dev
```

Apri http://localhost:3000

## Ecosistema Convergio

ConvergioEdu fa parte dell'ecosistema Convergio:

- [**convergio-cli**](https://github.com/Roberdan/convergio-cli) - CLI con ecosistema completo di agenti AI
- [**MyConvergio**](https://github.com/Roberdan/MyConvergio) - App macOS/iOS nativa
- [**Convergio**](https://github.com/Roberdan/Convergio) - Core framework

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **Voice**: Azure OpenAI Realtime API
- **Diagrams**: Mermaid.js + MarkMap
- **Math**: KaTeX
- **Database**: Prisma + SQLite/PostgreSQL

## Contribuire

Vedi [CONTRIBUTING.md](CONTRIBUTING.md)

## Contatti

- **Email**: roberdan@fightthestroke.org
- **Organizzazione**: [FightTheStroke](https://fightthestroke.org)
- **TED Talk**: [The birth of a movement](https://www.ted.com/talks/roberto_d_angelo_and_francesca_fedeli_in_our_baby_s_illness_a_life_lesson)

## Licenza

MIT - Vedi [LICENSE](LICENSE)

---

*"Un incidente alla nascita non dovrebbe dettare il futuro di questi bambini."* — FightTheStroke
