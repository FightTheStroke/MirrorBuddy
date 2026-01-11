'use client';

/**
 * @file drawer-search.tsx
 * @brief Search and filter controls for conversation drawer
 */

import { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DateFilter = 'all' | 'today' | 'week' | 'month';

interface DrawerSearchProps {
  onSearchChange: (query: string) => void;
  onDateFilterChange: (filter: DateFilter) => void;
}

export function DrawerSearch({ onSearchChange, onDateFilterChange }: DrawerSearchProps) {
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearchChange]);

  const handleDateChange = (value: string) => {
    const filter = value as DateFilter;
    setDateFilter(filter);
    onDateFilterChange(filter);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cerca conversazioni..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={dateFilter} onValueChange={handleDateChange}>
        <SelectTrigger className="w-full">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Filtra per data" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutte le date</SelectItem>
          <SelectItem value="today">Oggi</SelectItem>
          <SelectItem value="week">Ultima settimana</SelectItem>
          <SelectItem value="month">Ultimo mese</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
