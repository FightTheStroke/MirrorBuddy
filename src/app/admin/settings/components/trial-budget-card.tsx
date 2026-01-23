import { Euro } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

/**
 * TrialBudgetCard - Displays the trial budget limit configured via environment variable
 * This is a read-only display component for the admin settings page.
 * The budget is controlled via TRIAL_BUDGET_LIMIT_EUR environment variable.
 */
export function TrialBudgetCard() {
  const budgetLimit = process.env.TRIAL_BUDGET_LIMIT_EUR || "100";

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-green-600" />
            <CardTitle>Trial Budget</CardTitle>
          </div>
        </div>
        <CardDescription>Limite di budget per utenti in prova</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Amount Display */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">
            €{budgetLimit}
          </span>
          <span className="text-lg text-muted-foreground">/mese</span>
        </div>

        {/* Configuration Info */}
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Configurato via env var
          </p>
          <code className="block text-xs bg-background rounded px-2 py-1 text-muted-foreground font-mono">
            TRIAL_BUDGET_LIMIT_EUR={budgetLimit}
          </code>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          Questo importo definisce il limite massimo di budget mensile per gli
          utenti in prova. Il valore è letto dalla variabile di ambiente e non
          può essere modificato da questa interfaccia.
        </p>
      </CardContent>
    </Card>
  );
}
