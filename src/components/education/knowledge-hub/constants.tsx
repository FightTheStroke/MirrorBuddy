/**
 * Knowledge Hub Constants
 */

import {
  FolderTree,
  LayoutGrid,
  Calendar,
  Clock,
} from 'lucide-react';
import type { ViewOption } from './knowledge-hub/types';

export const VIEW_OPTIONS: ViewOption[] = [
  {
    id: 'explorer',
    label: 'Esplora',
    icon: <FolderTree className="w-4 h-4" />,
    description: 'Vista a cartelle con navigazione gerarchica',
  },
  {
    id: 'gallery',
    label: 'Galleria',
    icon: <LayoutGrid className="w-4 h-4" />,
    description: 'Griglia con anteprime grandi',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: <Clock className="w-4 h-4" />,
    description: 'Materiali ordinati cronologicamente',
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: <Calendar className="w-4 h-4" />,
    description: 'Vista calendario per data',
  },
];
