/**
 * Countries and Maestri tables components
 */

import { Globe, GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CountryMetric,
  MaestroMetric,
} from "@/lib/admin/business-kpi-types";

interface CountriesTableProps {
  countries: CountryMetric[];
}

interface MaestriTableProps {
  maestri: MaestroMetric[];
}

const FLAG_EMOJI: Record<string, string> = {
  IT: "🇮🇹",
  DE: "🇩🇪",
  FR: "🇫🇷",
  ES: "🇪🇸",
  GB: "🇬🇧",
  CH: "🇨🇭",
  AT: "🇦🇹",
  NL: "🇳🇱",
  XX: "🌍",
};

export function CountriesTable({ countries }: CountriesTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("it-IT").format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Countries</CardTitle>
          <Globe className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardDescription>Users and revenue by country</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-sm font-medium text-muted-foreground pb-2">
                  Country
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-2">
                  Users
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-2">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {countries.map((country) => (
                <tr
                  key={country.countryCode}
                  className="border-b last:border-0"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {FLAG_EMOJI[country.countryCode] || FLAG_EMOJI.XX}
                      </span>
                      <span className="font-medium">{country.country}</span>
                    </div>
                  </td>
                  <td className="text-right font-medium">
                    {formatNumber(country.users)}
                  </td>
                  <td className="text-right font-medium">
                    {formatCurrency(country.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {countries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No country data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MaestriTable({ maestri }: MaestriTableProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("it-IT").format(value);
  };

  const formatDuration = (minutes: number) => {
    return `${minutes.toFixed(1)} min`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Maestri</CardTitle>
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardDescription>Most popular AI teachers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left text-sm font-medium text-muted-foreground pb-2">
                  Maestro
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-2">
                  Sessions
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-2">
                  Avg Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {maestri.map((maestro, index) => (
                <tr
                  key={`${maestro.name}-${index}`}
                  className="border-b last:border-0"
                >
                  <td className="py-3">
                    <div>
                      <div className="font-medium">{maestro.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {maestro.subject}
                      </div>
                    </div>
                  </td>
                  <td className="text-right font-medium">
                    {formatNumber(maestro.sessions)}
                  </td>
                  <td className="text-right font-medium">
                    {formatDuration(maestro.avgDuration)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {maestri.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No maestri data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
