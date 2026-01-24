import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Users,
  MessageSquare,
  Activity,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TierAnalytics {
  tierId: string;
  tierCode: string;
  tierName: string;
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  avgMessagesPerUser: number;
  isActive: boolean;
}

export default async function TierAnalyticsPage() {
  const auth = await validateAdminAuth();

  if (!auth.authenticated || !auth.isAdmin) {
    redirect("/login");
  }

  // Get all tiers
  const tiers = await prisma.tierDefinition.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  // Calculate analytics for each tier
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const analytics: TierAnalytics[] = await Promise.all(
    tiers.map(async (tier) => {
      // Total users on this tier
      const totalUsers = await prisma.userSubscription.count({
        where: {
          tierId: tier.id,
          status: "ACTIVE",
        },
      });

      // Active users (those with activity in last 7 days)
      // Using Conversation's lastMessageAt
      const activeUsers = await prisma.userSubscription.count({
        where: {
          tierId: tier.id,
          status: "ACTIVE",
          user: {
            conversations: {
              some: {
                lastMessageAt: {
                  gte: sevenDaysAgo,
                },
              },
            },
          },
        },
      });

      // Total messages from users on this tier
      const messageStats = await prisma.message.aggregate({
        where: {
          conversation: {
            user: {
              subscription: {
                tierId: tier.id,
                status: "ACTIVE",
              },
            },
          },
        },
        _count: {
          id: true,
        },
      });

      const totalMessages = messageStats._count.id || 0;
      const avgMessagesPerUser =
        totalUsers > 0 ? Math.round(totalMessages / totalUsers) : 0;

      return {
        tierId: tier.id,
        tierCode: tier.code,
        tierName: tier.name,
        totalUsers,
        activeUsers,
        totalMessages,
        avgMessagesPerUser,
        isActive: tier.isActive,
      };
    }),
  );

  // Calculate totals
  const totals = analytics.reduce(
    (acc, tier) => ({
      totalUsers: acc.totalUsers + tier.totalUsers,
      activeUsers: acc.activeUsers + tier.activeUsers,
      totalMessages: acc.totalMessages + tier.totalMessages,
    }),
    { totalUsers: 0, activeUsers: 0, totalMessages: 0 },
  );

  const avgMessagesOverall =
    totals.totalUsers > 0
      ? Math.round(totals.totalMessages / totals.totalUsers)
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/tiers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna ai Piani
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Analytics per Piano
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Statistiche di utilizzo aggregate per ciascun piano tariffario
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Utenti Totali
                </p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {totals.totalUsers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tutti i piani
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Utenti Attivi
                </p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {totals.activeUsers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ultimi 7 giorni
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Messaggi Totali
                </p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {totals.totalMessages.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tutte le conversazioni
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Media per Utente
                </p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {avgMessagesOverall}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Messaggi/utente
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <Layers className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio per Piano</CardTitle>
          <CardDescription>
            Statistiche di utilizzo aggregate per ciascun piano tariffario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Piano</TableHead>
                  <TableHead>Codice</TableHead>
                  <TableHead className="text-right">Utenti Totali</TableHead>
                  <TableHead className="text-right">
                    Utenti Attivi (7gg)
                  </TableHead>
                  <TableHead className="text-right">Messaggi Totali</TableHead>
                  <TableHead className="text-right">Media/Utente</TableHead>
                  <TableHead className="text-right">Tasso Attività</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.map((tier) => {
                  const activityRate =
                    tier.totalUsers > 0
                      ? Math.round((tier.activeUsers / tier.totalUsers) * 100)
                      : 0;

                  return (
                    <TableRow key={tier.tierId}>
                      <TableCell className="font-medium">
                        {tier.tierName}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {tier.tierCode}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {tier.totalUsers}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.activeUsers}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.totalMessages.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.avgMessagesPerUser}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            activityRate >= 70
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : activityRate >= 40
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          }`}
                        >
                          {activityRate}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            tier.isActive
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {tier.isActive ? "Attivo" : "Inattivo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {analytics.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessun piano disponibile
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Gli &quot;Utenti Attivi&quot; sono calcolati in
          base all&apos;attività degli ultimi 7 giorni. Il &quot;Tasso di
          Attività&quot; indica la percentuale di utenti del piano che sono
          stati attivi recentemente.
        </p>
      </div>
    </div>
  );
}
