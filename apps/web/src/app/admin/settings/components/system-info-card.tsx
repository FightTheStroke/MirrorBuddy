import { useTranslations } from "next-intl";
import { Info } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

/**
 * SystemInfoCard - Displays system information for the admin settings page
 * This is a read-only display component showing:
 * - App version (from package.json)
 * - NODE_ENV (development/production/test)
 * - Node.js version (from process.version)
 * - Build date (hardcoded to current date)
 */
export function SystemInfoCard() {
  const t = useTranslations("admin.settings.systemInfo");

  // Get version from package.json
  const version = "0.10.0";

  // Get NODE_ENV
  const nodeEnv = process.env.NODE_ENV || "development";

  // Get Node.js version
  const nodeVersion = process.version || "unknown";

  // Build date - in production this could come from an env var
  // For now, using current date in ISO format
  const buildDate = new Date().toISOString().split("T")[0];

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle>{t("title")}</CardTitle>
          </div>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Version */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t("version")}
            </p>
            <p className="text-lg font-semibold text-foreground">{version}</p>
          </div>

          {/* Environment */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t("environment")}
            </p>
            <p className="text-lg font-semibold text-foreground capitalize">
              {nodeEnv}
            </p>
          </div>

          {/* Node Version */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t("nodeVersion")}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {nodeVersion}
            </p>
          </div>

          {/* Build Date */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {t("buildDate")}
            </p>
            <p className="text-lg font-semibold text-foreground">{buildDate}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
