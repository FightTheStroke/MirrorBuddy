import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  FileText,
  Settings,
  Activity,
  ScrollText,
  Shield,
  Languages,
  Mail,
  Send,
  Heart,
  Server,
  Key,
  FunnelIcon as Funnel,
  BookOpen,
  Palette,
  Coins,
  Receipt,
  CreditCard,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: 'amber' | 'red' | 'blue';
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export function createNavSections(t: (key: string) => string): NavSection[] {
  return [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      items: [
        {
          id: 'dashboard',
          label: t('sidebar.dashboard'),
          href: '/admin',
          icon: LayoutDashboard,
        },
        {
          id: 'analytics',
          label: t('sidebar.analytics'),
          href: '/admin/analytics',
          icon: BarChart3,
        },
        { id: 'funnel', label: 'Funnel', href: '/admin/funnel', icon: Funnel },
      ],
    },
    {
      id: 'management',
      label: 'Management',
      icon: Users,
      items: [
        {
          id: 'users',
          label: t('sidebar.users'),
          href: '/admin/users',
          icon: Users,
        },
        {
          id: 'invites',
          label: t('betaRequests'),
          href: '/admin/invites',
          icon: UserPlus,
        },
        {
          id: 'characters',
          label: 'Characters',
          href: '/admin/characters',
          icon: Palette,
        },
        {
          id: 'knowledge',
          label: 'Knowledge',
          href: '/admin/knowledge',
          icon: BookOpen,
        },
        {
          id: 'tiers',
          label: t('sidebar.tiers'),
          href: '/admin/tiers',
          icon: BarChart3,
        },
        {
          id: 'locales',
          label: 'Locales',
          href: '/admin/locales',
          icon: Languages,
        },
      ],
    },
    {
      id: 'communications',
      label: 'Communications',
      icon: Mail,
      items: [
        {
          id: 'templates',
          label: 'Templates',
          href: '/admin/communications/templates',
          icon: Mail,
        },
        {
          id: 'campaigns',
          label: 'Campaigns',
          href: '/admin/communications/campaigns',
          icon: Send,
        },
        {
          id: 'stats',
          label: 'Statistics',
          href: '/admin/communications/stats',
          icon: BarChart3,
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Settings,
      items: [
        {
          id: 'health',
          label: 'Health',
          href: '/admin/mission-control/health',
          icon: Heart,
        },
        {
          id: 'infra',
          label: 'Infrastructure',
          href: '/admin/mission-control/infra',
          icon: Server,
        },
        {
          id: 'service-limits',
          label: t('sidebar.serviceLimits'),
          href: '/admin/service-limits',
          icon: Activity,
        },
        {
          id: 'safety',
          label: t('sidebar.safety'),
          href: '/admin/safety',
          icon: Shield,
        },
        {
          id: 'audit-log',
          label: t('sidebar.auditLog'),
          href: '/admin/audit',
          icon: ScrollText,
        },
        {
          id: 'revenue',
          label: 'Revenue',
          href: '/admin/revenue',
          icon: Coins,
        },
        {
          id: 'tax',
          label: 'Tax',
          href: '/admin/tax',
          icon: Receipt,
        },
        {
          id: 'stripe',
          label: 'Stripe',
          href: '/admin/stripe',
          icon: CreditCard,
        },
        {
          id: 'key-vault',
          label: 'Key Vault',
          href: '/admin/mission-control/key-vault',
          icon: Key,
        },
        {
          id: 'settings',
          label: t('sidebar.settings'),
          href: '/admin/settings',
          icon: Settings,
        },
        { id: 'tos', label: t('terms'), href: '/admin/tos', icon: FileText },
      ],
    },
  ];
}
