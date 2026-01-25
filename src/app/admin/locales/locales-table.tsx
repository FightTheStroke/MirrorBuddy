"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Eye, EyeOff, Globe } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface LocaleConfig {
  id: string;
  countryName: string;
  primaryLocale: string;
  primaryLanguageMaestroId: string;
  secondaryLocales: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function LocalesTable({ locales }: { locales: LocaleConfig[] }) {
  const [search, setSearch] = useState("");

  const filteredLocales = locales.filter((locale) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      locale.id.toLowerCase().includes(q) ||
      locale.countryName.toLowerCase().includes(q) ||
      locale.primaryLocale.toLowerCase().includes(q) ||
      locale.primaryLanguageMaestroId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Cerca per codice paese, nome, locale o maestro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice Paese</TableHead>
              <TableHead>Nome Paese</TableHead>
              <TableHead>Locale Primario</TableHead>
              <TableHead>Maestro Lingua</TableHead>
              <TableHead>Locali Secondari</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLocales.map((locale) => (
              <TableRow key={locale.id}>
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    {locale.id}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {locale.countryName}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {locale.primaryLocale}
                </TableCell>
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {locale.primaryLanguageMaestroId}
                </TableCell>
                <TableCell>
                  {locale.secondaryLocales.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {locale.secondaryLocales.map((loc) => (
                        <span
                          key={loc}
                          className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono"
                        >
                          {loc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      locale.enabled
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {locale.enabled ? (
                      <>
                        <Eye className="w-3 h-3" />
                        Attivo
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        Inattivo
                      </>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/locales/${locale.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="w-4 h-4 mr-1" />
                      Modifica
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredLocales.length === 0 && (
          <TableEmpty>Nessuna configurazione locale trovata</TableEmpty>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        {filteredLocales.length} di {locales.length} configurazioni
      </div>
    </div>
  );
}
