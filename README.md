# ConvergioEdu - La Scuola Che Vorrei

> AI-powered educational platform with personalized voice tutors for students with learning differences

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## The Story

This project was born for **Mario** and all kids like him.

Mario is a child who survived a pediatric stroke at birth, which caused cerebral palsy. Like many children with disabilities, Mario faces daily challenges at school: traditional teaching methods weren't designed for him, the pace is too fast, the methods too rigid.

In 2013, his family founded [FightTheStroke](https://fightthestroke.org) to ensure a better future for young stroke survivors. After 10 years of advocacy, research, and innovation, **ConvergioEdu** was born: the school we wished Mario had.

## The Problem

Traditional schooling doesn't work for everyone:

- **Dyslexia**: difficulty reading and processing text
- **Dyscalculia**: difficulty with numbers and calculations
- **ADHD**: difficulty with concentration and attention management
- **Autism**: need for predictable environments and clear communication
- **Cerebral Palsy**: motor challenges requiring adaptive interfaces

These children don't need less education—they need **different education**.

## The Solution

**17 AI Maestri** (tutors) inspired by great historical figures, each specialized in a subject:

| Maestro | Subject | Inspired by |
|---------|---------|-------------|
| Euclide | Mathematics | Euclid of Alexandria |
| Leonardo | Art | Leonardo da Vinci |
| Darwin | Science | Charles Darwin |
| Shakespeare | English | William Shakespeare |
| Galileo | Astronomy | Galileo Galilei |
| Curie | Chemistry | Marie Curie |
| Mozart | Music | Wolfgang Amadeus Mozart |
| Feynman | Physics | Richard Feynman |
| Lovelace | Computer Science | Ada Lovelace |
| Manzoni | Italian | Alessandro Manzoni |
| Erodoto | History | Herodotus |
| Socrate | Philosophy | Socrates |
| Cicerone | Civic Education | Cicero |
| Humboldt | Geography | Alexander von Humboldt |
| Ippocrate | Physical Education | Hippocrates |
| Smith | Economics | Adam Smith |
| Chris | Storytelling | — |

Each Maestro:
- **Speaks naturally** (Azure OpenAI Realtime API)
- **Adapts** to the student's learning pace and style
- **Creates interactive content**: mind maps, flashcards, quizzes
- **Is patient**: never judges, never tires, repeats as needed

## Features

- **Voice Sessions** - Real-time natural conversations
- **Mind Maps** - Concept visualization with MarkMap
- **FSRS Flashcards** - Scientific spaced repetition
- **Gamification** - XP, levels, badges, streaks
- **Dark/Light Theme** - Visual comfort
- **Full Accessibility** - WCAG 2.1 AA compliant

## Accessibility

Specific support for:

| Condition | Adaptations |
|-----------|-------------|
| **Dyslexia** | OpenDyslexic font, increased spacing, simplified layouts |
| **Dyscalculia** | Number visualization, step-by-step breakdowns |
| **ADHD** | Reduced animations, focus mode, break reminders |
| **Autism** | Predictable layouts, sensory-friendly colors, clear instructions |
| **Cerebral Palsy** | Large targets, keyboard navigation, voice control |

## Quick Start

### Prerequisites

- Node.js 18+
- Azure OpenAI with Realtime API access (for voice)
- Or Ollama for local use (chat only, no voice)

### Installation

```bash
git clone https://github.com/Roberdan/ConvergioEdu.git
cd ConvergioEdu
npm install
cp .env.example .env.local
# Configure your API keys in .env.local
npm run dev
```

Open http://localhost:3000

## Convergio Ecosystem

ConvergioEdu is part of the Convergio ecosystem:

- [**convergio-cli**](https://github.com/Roberdan/convergio-cli) - CLI with complete AI agent ecosystem
- [**MyConvergio**](https://github.com/Roberdan/MyConvergio) - Native macOS/iOS app
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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Contact

- **Email**: roberdan@fightthestroke.org
- **Organization**: [FightTheStroke](https://fightthestroke.org)
- **TED Talk**: [In our baby's illness, a life lesson](https://www.ted.com/talks/roberto_d_angelo_and_francesca_fedeli_in_our_baby_s_illness_a_life_lesson)

## License

MIT - See [LICENSE](LICENSE)

---

*"A birth accident should not dictate these children's future."* — FightTheStroke
