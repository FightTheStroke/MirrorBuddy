'use client';

/**
 * Test page per provare le 4 proposte di layout
 * 
 * Naviga a /test-proposals per vedere tutte le proposte in azione
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaestroSessionProposal1 } from '@/components/maestros/maestro-session-proposal1-all-in-header';
import { MaestroSessionProposal2 } from '@/components/maestros/maestro-session-proposal2-all-in-panel';
import { maestri } from '@/data';
import type { Maestro } from '@/types';

type Proposal = 'proposal1' | 'proposal2';

const PROPOSAL_NAMES: Record<Proposal, string> = {
  proposal1: 'Proposta 1: Tutto nell\'header',
  proposal2: 'Proposta 2: Tutto nella barra della chiamata vocale',
};

export default function TestProposalsPage() {
  const router = useRouter();
  const [selectedProposal, setSelectedProposal] = useState<Proposal>('proposal1');
  const [selectedMaestro, setSelectedMaestro] = useState<Maestro>(maestri[0]);

  const renderProposal = () => {
    const commonProps = {
      maestro: selectedMaestro,
      onClose: () => router.push('/'),
      initialMode: 'voice' as const,
    };

    switch (selectedProposal) {
      case 'proposal1':
        return <MaestroSessionProposal1 {...commonProps} />;
      case 'proposal2':
        return <MaestroSessionProposal2 {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Proposal selector */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Proposta:
            </span>
            {(['proposal1', 'proposal2'] as Proposal[]).map((proposal) => (
              <Button
                key={proposal}
                variant={selectedProposal === proposal ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProposal(proposal)}
                className="text-xs"
              >
                {proposal === 'proposal1' ? 'Header' : 'Panel'}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Maestro:
            </span>
            <select
              value={selectedMaestro.id}
              onChange={(e) => {
                const maestro = maestri.find(m => m.id === e.target.value);
                if (maestro) setSelectedMaestro(maestro);
              }}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {maestri.map((maestro) => (
                <option key={maestro.id} value={maestro.id}>
                  {maestro.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {PROPOSAL_NAMES[selectedProposal]}
          </p>
        </div>
      </div>

      {/* Proposal content */}
      <div className="pt-32 p-8">
        {renderProposal()}
      </div>
    </div>
  );
}
