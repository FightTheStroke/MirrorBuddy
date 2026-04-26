"use client";

/**
 * GoogleAccountCard Component
 * ADR 0038 - Google Drive Integration
 *
 * Card showing Google account connection status for Settings page.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Cloud, LogOut, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGoogleDrive } from "./use-google-drive";

interface GoogleAccountCardProps {
  userId: string;
}

export function GoogleAccountCard({ userId }: GoogleAccountCardProps) {
  const t = useTranslations("tools.googleDrive");
  const tCommon = useTranslations("common");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { isConnected, isLoading, connectionStatus, connect, disconnect } =
    useGoogleDrive({ userId });

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    await disconnect();
    setIsDisconnecting(false);
    setShowConfirmDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          {t("googleDrive")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t("loadingCheck")}</span>
          </div>
        ) : isConnected ? (
          <div className="space-y-4">
            {/* Connected status */}
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <div className="flex items-center gap-2">
                {connectionStatus?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={connectionStatus.avatarUrl}
                    alt={
                      connectionStatus?.displayName || "Google account avatar"
                    }
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                )}
                <div>
                  <div className="font-medium">
                    {connectionStatus?.displayName || "Account Google"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {connectionStatus?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Scopes info */}
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                {t("readOnlyAccess")}
              </div>
            </div>

            {/* Disconnect button */}
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isDisconnecting}
              onClick={() => setShowConfirmDialog(true)}
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              {t("disconnectButton")}
            </Button>

            {/* Confirm dialog */}
            <Dialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("disconnectTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("disconnectWarning")}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {t("disconnectConfirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not connected */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">{t("notConnected")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("connectPrompt")}
                </div>
              </div>
            </div>

            {/* What you can do */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{t("capabilities")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t("capabilityPdf")}</li>
                <li>{t("capabilityHomework")}</li>
                <li>{t("capabilityDocuments")}</li>
              </ul>
            </div>

            {/* Privacy notice */}
            <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              <strong>{t("privacy")}</strong> {t("privacyNotice")}
            </div>

            {/* Connect button */}
            <Button onClick={connect} className="w-full">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("connectButton")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
