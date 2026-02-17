'use client';

import type { RecipientFilters, CampaignSource } from '@/lib/email/campaign-service';
import { useTranslations } from 'next-intl';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterConfiguratorProps {
  filters: RecipientFilters;
  onFilterChange: (key: keyof RecipientFilters, value: unknown) => void;
  onTierToggle: (tier: string) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
}

const SOURCE_OPTIONS: { value: CampaignSource; labelKey: string }[] = [
  { value: 'users', labelKey: 'sourceUsers' },
  { value: 'waitlist', labelKey: 'sourceWaitlist' },
  { value: 'both', labelKey: 'sourceBoth' },
];

export function FilterConfigurator({
  filters,
  onFilterChange,
  onTierToggle,
  onBack,
  onNext,
  isLoading,
}: FilterConfiguratorProps) {
  const t = useTranslations('admin.communications.campaigns');

  const source: CampaignSource = filters.recipientSource ?? 'users';
  const showUsers = source === 'users' || source === 'both';
  const showWaitlist = source === 'waitlist' || source === 'both';

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t('configureFilters')}</h2>
      <div className="space-y-6">
        {/* Recipient Source selector */}
        <div>
          <label htmlFor="recipientSource" className="block text-sm font-medium mb-2">
            {t('recipientSource')}
          </label>
          <select
            id="recipientSource"
            className="w-full border rounded px-3 py-2"
            value={source}
            onChange={(e) => onFilterChange('recipientSource', e.target.value as CampaignSource)}
            aria-label={t('recipientSource')}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* User-specific filters */}
        {showUsers && (
          <>
            {/* Tier checkboxes */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('tiers')}</label>
              <div className="space-y-2">
                {['TRIAL', 'BASE', 'PRO'].map((tier) => (
                  <label key={tier} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.tiers?.includes(tier) || false}
                      onChange={() => onTierToggle(tier)}
                      className="mr-2"
                      aria-label={tier}
                    />
                    <span>{tier}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Role filter */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                {t('role')}
              </label>
              <select
                id="role"
                className="w-full border rounded px-3 py-2"
                onChange={(e) => onFilterChange('roles', e.target.value ? [e.target.value] : [])}
              >
                <option value="">{t('allRoles')}</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            {/* Include disabled users */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="disabled"
                checked={filters.disabled || false}
                onChange={(e) => onFilterChange('disabled', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="disabled">{t('includeDisabled')}</label>
            </div>

            {/* Include test data */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="testData"
                checked={filters.isTestData || false}
                onChange={(e) => onFilterChange('isTestData', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="testData">{t('includeTestData')}</label>
            </div>
          </>
        )}

        {/* Waitlist-specific filters */}
        {showWaitlist && (
          <>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="verifiedOnly"
                checked={filters.verifiedOnly || false}
                onChange={(e) => onFilterChange('verifiedOnly', e.target.checked)}
                className="mr-2"
                aria-label={t('verifiedOnly')}
              />
              <label htmlFor="verifiedOnly">{t('verifiedOnly')}</label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="marketingConsentOnly"
                checked={filters.marketingConsentOnly || false}
                onChange={(e) => onFilterChange('marketingConsentOnly', e.target.checked)}
                className="mr-2"
                aria-label={t('marketingConsentOnly')}
              />
              <label htmlFor="marketingConsentOnly">{t('marketingConsentOnly')}</label>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('back')}
        </Button>
        <Button onClick={onNext} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1" />
          )}
          {t('next')}
        </Button>
      </div>
    </div>
  );
}
