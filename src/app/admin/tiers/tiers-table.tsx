"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Eye, EyeOff } from "lucide-react";
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

interface Tier {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceEur: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function TiersTable({ tiers }: { tiers: Tier[] }) {
  const [search, setSearch] = useState("");

  const filteredTiers = tiers.filter((tier) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tier.code.toLowerCase().includes(q) ||
      tier.name.toLowerCase().includes(q) ||
      tier.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Cerca per codice, nome o descrizione..."
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
              <TableHead>Codice</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Prezzo Mensile</TableHead>
              <TableHead>Posizione</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTiers.map((tier) => (
              <TableRow key={tier.id}>
                <TableCell className="font-mono text-sm">{tier.code}</TableCell>
                <TableCell className="font-medium">{tier.name}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-slate-600 dark:text-slate-400">
                  {tier.description || "-"}
                </TableCell>
                <TableCell>
                  {tier.monthlyPriceEur !== null
                    ? `€${tier.monthlyPriceEur.toFixed(2)}`
                    : "-"}
                </TableCell>
                <TableCell>{tier.sortOrder}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      tier.isActive
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tier.isActive ? (
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
                  <Link href={`/admin/tiers/${tier.id}/edit`}>
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

        {filteredTiers.length === 0 && (
          <TableEmpty>Nessun piano trovato</TableEmpty>
        )}
      </div>

      {/* Summary */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        {filteredTiers.length} di {tiers.length} piani
      </div>
    </div>
  );
}
