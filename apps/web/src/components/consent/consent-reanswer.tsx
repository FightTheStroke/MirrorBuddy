'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { ConsentPurpose } from '@/lib/consent/unified-consent';

export function ConsentReanswer({
  purpose,
  busy,
  onSave,
}: {
  purpose: ConsentPurpose;
  busy: boolean;
  onSave: (accepted: boolean) => void;
}) {
  const t = useTranslations('consent');
  const [accepted, setAccepted] = useState(false);
  const id = useId();
  const terms = purpose === 'terms';
  return (
    <section
      data-testid={`consent-reanswer-${purpose}`}
      className="space-y-3 rounded-lg border p-3"
    >
      <h3 className="font-medium">{t('sync.newDecision')}</h3>
      {terms && (
        <div className="flex flex-wrap gap-3 text-sm underline">
          <Link href="/terms" target="_blank" rel="noopener">
            {t('unified.links.full')}
          </Link>
          <Link href="/privacy" target="_blank" rel="noopener">
            {t('unified.links.privacy')}
          </Link>
        </div>
      )}
      <label htmlFor={id} className="flex min-h-11 items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={accepted}
          disabled={busy}
          onChange={(event) => setAccepted(event.target.checked)}
          className="h-5 w-5 shrink-0"
        />
        {t(terms ? 'unified.tosCheckbox.label' : 'inline.analyticsLabel')}
      </label>
      <Button
        type="button"
        disabled={busy || (terms && !accepted)}
        onClick={() => onSave(accepted)}
        className="h-auto min-h-11 whitespace-normal"
      >
        {t(terms ? 'terms.modal.buttons.accept' : 'sync.saveNewChoice')}
      </Button>
    </section>
  );
}
