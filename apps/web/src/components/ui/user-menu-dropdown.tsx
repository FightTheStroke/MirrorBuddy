'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { User, Key, Settings, LogOut } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { logoutClient, type LogoutScope } from '@/lib/auth/client-auth';
import { useClientIdentity } from '@/lib/auth/identity-provider';
import { cn } from '@/lib/utils';

interface UserMenuDropdownProps {
  userName?: string;
  className?: string;
}

export function UserMenuDropdown({ userName, className }: UserMenuDropdownProps) {
  const t = useTranslations('common');
  const identity = useClientIdentity();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const logoutGuardRef = useRef(false);

  const handleLogout = async (scope: LogoutScope) => {
    if (logoutGuardRef.current) return;
    logoutGuardRef.current = true;
    setIsLoggingOut(true);
    setLogoutFailed(false);
    try {
      await logoutClient(scope);
      setOpen(false);
      window.location.assign('/login');
    } catch {
      setLogoutFailed(true);
    } finally {
      setIsLoggingOut(false);
      logoutGuardRef.current = false;
    }
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'text-sm text-slate-600 dark:text-slate-400',
            'hover:bg-slate-100 dark:hover:bg-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-accent-themed focus:ring-offset-2',
            'transition-colors',
            className,
          )}
          aria-label={t('userMenu.greeting')}
        >
          {userName ? (
            <>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t('userMenu.greeting')}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {userName}
              </span>
            </>
          ) : (
            <User className="h-5 w-5" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'min-w-[220px] bg-white dark:bg-slate-800',
            'rounded-lg shadow-lg border border-slate-200 dark:border-slate-700',
            'p-1 z-50',
            'animate-in fade-in-0 zoom-in-95',
          )}
          align="end"
          sideOffset={8}
        >
          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md',
              'text-sm text-slate-700 dark:text-slate-300',
              'hover:bg-slate-100 dark:hover:bg-slate-700',
              'focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700',
              'cursor-pointer transition-colors',
            )}
            onSelect={() => router.push('/settings')}
          >
            <User className="h-4 w-4" />
            <span>{t('userMenu.profile')}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md',
              'text-sm text-slate-700 dark:text-slate-300',
              'hover:bg-slate-100 dark:hover:bg-slate-700',
              'focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700',
              'cursor-pointer transition-colors',
            )}
            onSelect={() => router.push('/change-password')}
          >
            <Key className="h-4 w-4" />
            <span>{t('userMenu.changePassword')}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md',
              'text-sm text-slate-700 dark:text-slate-300',
              'hover:bg-slate-100 dark:hover:bg-slate-700',
              'focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700',
              'cursor-pointer transition-colors',
            )}
            onSelect={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4" />
            <span>{t('userMenu.settings')}</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
          {identity.status === 'authenticated' && identity.legacyOrigin && (
            <p className="max-w-xs px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
              {t('session.legacyFamily')}
            </p>
          )}
          {logoutFailed && (
            <p role="alert" className="max-w-xs px-3 py-2 text-red-700 dark:text-red-300">
              {t('session.logoutFailed')}
            </p>
          )}

          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md',
              'text-sm text-red-600 dark:text-red-400',
              'hover:bg-red-50 dark:hover:bg-red-900/20',
              'focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/20',
              'cursor-pointer transition-colors',
              isLoggingOut && 'opacity-50 cursor-not-allowed',
            )}
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout('current');
            }}
            disabled={isLoggingOut || identity.status === 'pending'}
          >
            <LogOut className="h-4 w-4" />
            <span>{t('session.logoutCurrent')}</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-red-700 focus:bg-red-50 focus:outline-none dark:text-red-300 dark:focus:bg-slate-700"
            disabled={isLoggingOut || identity.status !== 'authenticated'}
            onSelect={(event) => {
              event.preventDefault();
              void handleLogout('all');
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>{t('session.logoutAll')}</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
