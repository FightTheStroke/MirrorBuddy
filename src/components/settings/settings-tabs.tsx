import {
  User,
  Accessibility,
  Palette,
  Bell,
  Shield,
  BarChart3,
  Users,
  UserCircle,
  Bot,
  Volume2,
  Music,
  Wrench,
} from 'lucide-react';

export type SettingsTab = 'profile' | 'characters' | 'accessibility' | 'appearance' | 'ai' | 'audio' | 'ambient-audio' | 'notifications' | 'telemetry' | 'privacy' | 'genitori' | 'diagnostics';

export interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
}

export const SETTINGS_TABS: SettingsTabDef[] = [
  { id: 'profile', label: 'Profilo', icon: <User className="w-5 h-5" /> },
  { id: 'characters', label: 'Personaggi', icon: <Users className="w-5 h-5" /> },
  { id: 'accessibility', label: 'Accessibilita', icon: <Accessibility className="w-5 h-5" /> },
  { id: 'appearance', label: 'Aspetto', icon: <Palette className="w-5 h-5" /> },
  { id: 'ai', label: 'AI Provider', icon: <Bot className="w-5 h-5" /> },
  { id: 'audio', label: 'Audio/Video', icon: <Volume2 className="w-5 h-5" /> },
  { id: 'ambient-audio', label: 'Audio Ambientale', icon: <Music className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-5 h-5" /> },
  { id: 'telemetry', label: 'Statistiche', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'privacy', label: 'Privacy', icon: <Shield className="w-5 h-5" /> },
  { id: 'genitori', label: 'Genitori', icon: <UserCircle className="w-5 h-5" /> },
  { id: 'diagnostics', label: 'Diagnostica', icon: <Wrench className="w-5 h-5" /> },
];
