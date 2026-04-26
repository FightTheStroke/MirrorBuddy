'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { csrfFetch } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { useTranslations } from 'next-intl';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: {
    id: string;
    username: string | null;
    email: string | null;
  };
}

export function ResetPasswordModal({ isOpen, onClose, onSuccess, user }: ResetPasswordModalProps) {
  const t = useTranslations('admin');
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        handleClose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loading],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const response = await csrfFetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setTempPassword(data.tempPassword);
      toast.success(t('resetPasswordSuccess'));
      onSuccess?.();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success(t('passwordCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setTempPassword(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-password-title"
        className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="reset-password-title"
            className="text-lg font-semibold text-slate-900 dark:text-white"
          >
            {t('resetPasswordTitle')}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={loading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {user.username || 'Anonymous User'}
          </p>
          {user.email && <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>}
        </div>

        {tempPassword ? (
          /* Success state: show temp password */
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('tempPasswordLabel')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white select-all break-all">
                {tempPassword}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 min-h-11 min-w-11"
                aria-label={t('copyPassword')}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="mt-6">
              <Button onClick={handleClose} className="w-full min-h-11">
                {t('close')}
              </Button>
            </div>
          </div>
        ) : (
          /* Confirmation state */
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              {t('resetPasswordConfirm')}
            </p>
            <div className="flex flex-wrap gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 min-h-11 min-w-11"
                disabled={loading}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 min-h-11 min-w-11"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('loading')}
                  </>
                ) : (
                  t('resetPassword')
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
