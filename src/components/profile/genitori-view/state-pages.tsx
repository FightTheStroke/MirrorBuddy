/**
 * State page components for GenitoriView
 */

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
  Trash2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState() {
  const t = useTranslations("settings.profile.genitori");
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{t("loadingProfile")}</p>
    </div>
  );
}

interface ErrorStateProps {
  error: string | null;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations("settings.profile.genitori");
  return (
    <div className="flex flex-col items-center gap-4 text-center py-8">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <h3 className="font-semibold text-lg text-foreground">{t("error")}</h3>
        <p className="text-muted-foreground mt-1">{error}</p>
      </div>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {t("retry")}
      </Button>
    </div>
  );
}

interface WelcomeBannerProps {
  highContrast?: boolean;
}

/**
 * Welcome banner shown when no profile data exists yet.
 * Displays above the empty dashboard to explain the current state.
 */
export function WelcomeBanner({ highContrast = false }: WelcomeBannerProps) {
  const t = useTranslations("settings.profile.genitori");
  return (
    <div
      className={cn(
        "rounded-xl p-4 mb-6 border",
        highContrast
          ? "bg-yellow-400/10 border-yellow-400"
          : "bg-primary/5 border-primary/20",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
            highContrast ? "bg-yellow-400 text-black" : "bg-card shadow-sm",
          )}
        >
          <Sparkles
            className={cn(
              "h-5 w-5",
              highContrast ? "text-black" : "text-primary",
            )}
          />
        </div>
        <div>
          <h2
            className={cn(
              "font-semibold",
              highContrast ? "text-yellow-400" : "text-foreground",
            )}
          >
            {t("welcomeTitle")}
          </h2>
          <p
            className={cn(
              "text-sm mt-1",
              highContrast ? "text-yellow-200" : "text-muted-foreground",
            )}
          >
            {t("welcomeDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}

interface NeedsConsentStateProps {
  onConsent: () => void;
}

export function NeedsConsentState({ onConsent }: NeedsConsentStateProps) {
  const t = useTranslations("settings.profile.genitori");
  return (
    <Card className="border-border">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-foreground">{t("consentTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {t("consentDescription")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onConsent} className="w-full">
          <Shield className="h-4 w-4 mr-2" />
          {t("consentButton")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function DeletionPendingState() {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Trash2 className="h-5 w-5" />
          Cancellazione Richiesta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          I dati verranno eliminati entro 30 giorni, come previsto dal GDPR.
        </p>
      </CardContent>
    </Card>
  );
}
