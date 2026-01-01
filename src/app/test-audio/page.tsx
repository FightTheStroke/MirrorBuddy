import { AmbientAudioControl } from '@/components/ambient-audio/ambient-audio-control';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TestAudioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Test Audio Ambientale
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Prova le funzionalità di audio ambientale per migliorare la concentrazione
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Music className="w-5 h-5" />
              Funzionalità Disponibili
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-sm mb-1">Rumore Procedurale</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Rumore bianco, rosa e marrone generato in tempo reale
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-sm mb-1">Binaural Beats</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Alpha, Beta, Theta per diversi stati mentali (richiede cuffie)
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-semibold text-sm mb-1">Preset</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Combinazioni predefinite per focus, creatività, relax
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Nota:</strong> I suoni ambientali (pioggia, camino, ecc.) saranno disponibili in un aggiornamento futuro.
                Attualmente sono implementati rumore procedurale e binaural beats.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ambient Audio Control */}
        <AmbientAudioControl />

        {/* Tips Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">💡 Suggerimenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <ul className="list-disc list-inside space-y-1">
              <li>Per i binaural beats, usa le cuffie stereo per un effetto ottimale</li>
              <li>Il rumore marrone è perfetto per mascherare distrazioni esterne</li>
              <li>Alpha waves (8-14 Hz) promuovono focus rilassato - ideale per lo studio</li>
              <li>Beta waves (14-30 Hz) aumentano la concentrazione attiva - ottimo per problem solving</li>
              <li>Theta waves (4-8 Hz) stimolano creatività e meditazione</li>
              <li>Puoi combinare più layer nel mixer avanzato per creare il tuo ambiente perfetto</li>
            </ul>
          </CardContent>
        </Card>

        {/* Research Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">📚 Basi Scientifiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p>
              L&apos;efficacia dell&apos;audio ambientale per lo studio è supportata da ricerche scientifiche:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Rumore Bianco/Rosa:</strong> Maschera le distrazioni, migliora l&apos;attenzione sostenuta (Söderlund et al., 2010)</li>
              <li><strong>Binaural Beats:</strong> Migliorano la ritenzione della memoria, riducono l&apos;ansia (Chaieb et al., 2015)</li>
              <li><strong>Suoni Naturali:</strong> Riducono lo stress, migliorano la concentrazione (Ratcliffe et al., 2013)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Integration Info */}
        <Card className="mt-6 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base text-blue-600 dark:text-blue-400">
              🔗 Prossimi Passi
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-400">
            <p className="mb-2">Questa funzionalità sarà integrata con:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Timer Pomodoro - audio automatico durante le sessioni di focus</li>
              <li>Studio con i Maestri - audio ambientale durante le conversazioni</li>
              <li>Auto-ducking - riduzione automatica del volume durante voice/TTS</li>
              <li>Preferenze salvate - ricorda le tue impostazioni preferite</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
