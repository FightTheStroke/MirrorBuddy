'use client';

import Link from 'next/link';
import {
  GraduationCap,
  Brain,
  Mic,
  Gamepad2,
  Heart,
  Sparkles,
  ArrowRight,
  Cloud,
  Server,
  CheckCircle2,
} from 'lucide-react';

const features = [
  {
    icon: GraduationCap,
    title: '17 Professori AI',
    description:
      'Impara da figure storiche: Archimede, Leonardo, Galileo, Marie Curie e tanti altri',
  },
  {
    icon: Mic,
    title: 'Conversazioni Vocali',
    description:
      'Parla naturalmente con i tuoi tutor AI, come se fossero nella stanza con te',
  },
  {
    icon: Brain,
    title: 'Mappe Mentali',
    description:
      'Organizza le tue idee visivamente con mappe mentali generate automaticamente',
  },
  {
    icon: Gamepad2,
    title: 'Gamification',
    description:
      'Guadagna XP, sali di livello e mantieni le tue streak di studio',
  },
  {
    icon: Heart,
    title: 'Accessibilita',
    description:
      'Progettato per DSA, ADHD, autismo e paralisi cerebrale con supporto completo',
  },
  {
    icon: Sparkles,
    title: 'Coach e Buddy',
    description:
      'Melissa ti aiuta con i metodi di studio, Mario ti supporta emotivamente',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-32">
          <div className="text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm mb-8 shadow-2xl shadow-purple-500/25 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- Static logo asset */}
              <img src="/logo-brain.png" alt="MirrorBuddy" className="w-20 h-20 object-contain" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              MirrorBuddy
            </h1>

            <p className="text-xl md:text-2xl text-white/80 mb-4">
              La Scuola Che Vorrei
            </p>

            <p className="text-lg text-white/60 max-w-2xl mx-auto mb-12">
              Piattaforma educativa AI per studenti con DSA, ADHD, autismo e
              paralisi cerebrale. Impara con 17 tutor storici, conversazioni
              vocali e gamification.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 transition-all"
              >
                Vai all&apos;App
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/showcase"
                className="flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors"
              >
                Esplora Showcase
              </Link>

              <a
                href="#configurazione"
                className="flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-colors"
              >
                Configura LLM
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 bg-black/20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Cos&apos;e MirrorBuddy?
          </h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-16">
            Una piattaforma completa per l&apos;apprendimento personalizzato
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-colors">
                    <Icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/60">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Configuration Section */}
      <section id="configurazione" className="relative py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Configura il tuo LLM
          </h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-12">
            Per utilizzare tutte le funzionalita AI, configura un provider
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Azure Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-500/30 hover:border-blue-500/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    Azure OpenAI
                  </h3>
                  <p className="text-sm text-blue-300">Consigliato</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Conversazioni vocali in tempo reale
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Modelli GPT-4o potenti
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Affidabilita enterprise
                </li>
              </ul>

              <div className="p-4 rounded-xl bg-black/30 text-xs font-mono text-white/70 mb-4">
                <p className="text-white/50 mb-2"># .env.local</p>
                <p>AZURE_OPENAI_ENDPOINT=https://...</p>
                <p>AZURE_OPENAI_API_KEY=...</p>
                <p>AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o</p>
              </div>

              <a
                href="https://portal.azure.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                Vai ad Azure Portal
              </a>
            </div>

            {/* Ollama Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-500/30 hover:border-green-500/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Server className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Ollama</h3>
                  <p className="text-sm text-green-300">Locale e gratuito</p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Esegui LLM sul tuo computer
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Nessun costo di utilizzo
                </li>
                <li className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  Privacy completa dei dati
                </li>
              </ul>

              <div className="p-4 rounded-xl bg-black/30 text-xs font-mono text-white/70 mb-4">
                <p className="text-white/50 mb-2"># Terminal</p>
                <p>brew install ollama</p>
                <p>ollama pull llama3.2</p>
                <p>ollama serve</p>
              </div>

              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
              >
                Scarica Ollama
              </a>
            </div>
          </div>

          <p className="text-center text-white/40 text-sm mt-8">
            Dopo aver configurato il provider, riavvia l&apos;applicazione
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-white/40 text-sm">
            MirrorBuddy - The school we wished existed
          </p>
        </div>
      </footer>
    </div>
  );
}
